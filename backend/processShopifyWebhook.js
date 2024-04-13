import ShopifyStore from './models/shopify/store.js';
import createOptionsFrame from './utils/shopify/createOptionsFrame.js';
import createProductFrame from './utils/shopify/createProductFrame.js';
import Image from './models/image.js';

async function storeImage(imageBuffer, contentType) {
    const image = new Image({
      data: imageBuffer,
      contentType: contentType,
    });
    await image.save();
    return image._id; // Returns the MongoDB ID of the saved image
}

async function createNewProduct(productData, store) {
    const { id, title, body_html, image, images, variants } = productData;

    // Filter variants with inventory_quantity greater than 0
    const filteredVariants = variants.filter(variant => variant.inventory_quantity > 0 || variant.inventory_management === null);
    if (filteredVariants.length === 0) {
        console.log('No variants with inventory to add');
        return; // Exit if no variants meet the criteria
    }

    try {
        const newProduct = {
            shopifyProductId: id.toString(),
            title: title,
            image: image ? image.src : null,
            originalDescription: body_html,
            currency: store.currency,
            variants: filteredVariants.map(variant => ({
                shopifyVariantId: variant.id.toString(),
                title: variant.title,
                image: variant.image_id ? images.find(image => image.id === variant.image_id)?.src : image?.src,
                price: variant.price.toString(),
            })),
        };

        // Create new product frame
        try {
            const generatedProductFrameBuffer = await createProductFrame(newProduct);
            const productImageId = await storeImage(generatedProductFrameBuffer, 'image/jpeg');

            newProduct.frameImage = `${process.env.BASE_URL}/images/${productImageId}.jpg`;
            console.log(`Frame images created for product ${newProduct.shopifyProductId}`);
        } catch (error) {
            console.error('Failed to generate product frame:', error);
        }

        // Create new variants frames
        for (const variant of newProduct.variants) {
            try {
                const generatedOptionsFrameBuffer = await createOptionsFrame(newProduct, variant);
                const variantImageId = await storeImage(generatedOptionsFrameBuffer, 'image/jpeg');
                variant.frameImage = `${process.env.BASE_URL}/images/${variantImageId}.jpg`;
                console.log(`Frame image created for variant ${variant.shopifyVariantId}`);
            } catch (error) {
                console.error(`Failed to generate option frame for variant ${variant.shopifyVariantId}:`, error);
                // Decide whether to continue, return, or throw based on your error handling policy
            }
        }

        // Save the product in the database
        store.products.push(newProduct);
        await store.save();
        console.log('Product created successfully');
    } catch (error) {
        console.error('Error processing create product webhook:', error);
    }
}



export async function processShopifyWebhook(webhookData) {
    const { shopifyDomain, payload } = webhookData;
    const { id, title, image, images, variants, status } = payload;

    console.log ('webhook data:', webhookData);
    console.log ('payload:', payload);
    console.log ('payload-status:', status);

    try {
        // Find the relevant store
        const store = await ShopifyStore.findOne({ shopifyStoreUrl: shopifyDomain });
        if (!store) {
            console.log('Store not found for Shopify Domain:', shopifyDomain);
            return;
        }

        console.log('Store found for Shopify Domain:', shopifyDomain);

        // Check if the product exists
        const productIndex = store.products.findIndex(product => product.shopifyProductId === id.toString());

        if (productIndex !== -1 && store.products[productIndex].hasOwnProperty('sync') && store.products[productIndex].sync === false) {
            console.log(`Sync is disabled for product ${id}. Update aborted.`);
            return;
        }

        if (status === 'draft') {
            if (productIndex !== -1) {
                const productToRemove = store.products[productIndex];
                console.log(`Removing draft product with _id: ${productToRemove._id} and Shopify ID: ${id} from the store.`);
                
                store.products.splice(productIndex, 1);
                await store.save();
                console.log(`Draft product ${id} removed from the store.`);
            } else {
                console.log(`Draft product ${id} ignored.`);
            }
            return;
            
        } else if (status === 'active') {
            if (productIndex === -1) {
                // If the status is "active" and the product doesn't exist, add it
                console.log('Product not found, creating new product');
                await createNewProduct({ id, title, body_html: payload.body_html, image, images, variants }, store);
            } else {

                console.log(`Product ${id} with status "active" already exists. Checking for updates...`);

                // Product exists, check for updates and add new variants
                let productUpdated = false;
                let needsNewProductFrame = false;
                const existingProduct = store.products[productIndex];

                // Only keep variants with inventory or are unmanaged.
                const variantsToKeep = variants.filter(variant =>
                    variant.inventory_quantity > 0 || variant.inventory_management === null
                );

                // Check if product should be deleted
                if (variants.length > 0 && variantsToKeep.length === 0) {
                    // All variants have inventory_quantity <= 0 and inventory_management is not null
                    const deleteSuccess = await deleteProduct(id);
                    if (deleteSuccess) {
                        console.log(`Product ${id} deleted as all variants are out of stock.`);
                    } else {
                        console.log(`Failed to delete Product ${id}.`);
                    }
                    return; // Stop further processing
                }

                // Check and update product title
                if (title && title !== existingProduct.title) {
                    existingProduct.title = title;
                    productUpdated = true;
                    needsNewProductFrame = true;
                }

                // Check and update product image
                const newImageSrc = image ? image.src : null;
                if (newImageSrc !== null && newImageSrc !== existingProduct.image) {
                    existingProduct.image = newImageSrc || existingProduct.image; // Fallback to existing image if newImageSrc is null
                    productUpdated = true;
                    needsNewProductFrame = true;
                }

                // Update productFrame if necessary
                if (needsNewProductFrame) {
                    try {
                        // Generate frame image for the product
                        const generatedProductFrameBuffer = await createProductFrame(existingProduct);
                        const productImageId = await storeImage(generatedProductFrameBuffer, 'image/jpeg');

                        existingProduct.frameImage = `${process.env.BASE_URL}/images/${productImageId}.jpg`;
                        console.log('Frame images updated for product');
                    } catch (error) {
                    console.error(`Error generating frame images for product ${product.shopifyProductId}:`, error);
                    }
                }

                // Prepare a list of variant IDs from the webhook with inventory_quantity > 0
                const variantIdsWithPositiveInventory = variants
                .filter(variant => variant.inventory_quantity > 0 || variant.inventory_management === null)
                .map(variant => variant.id.toString());

                // Filter out variants that no longer exist or have inventory_quantity of 0
                const filteredVariants = existingProduct.variants.filter(existingVariant =>
                    variantIdsWithPositiveInventory.includes(existingVariant.shopifyVariantId) ||
                    variants.some(variant => variant.id.toString() === existingVariant.shopifyVariantId && variant.inventory_quantity > 0 || variant.inventory_management === null)
                );

                // Check if any variants were removed based on the inventory quantity
                if (existingProduct.variants.length !== filteredVariants.length) {
                    existingProduct.variants = filteredVariants;
                    productUpdated = true;
                }

                // Update variants
                for (const variant of variants) {
                    let needsNewVariantFrame = false;

                    const variantIndex = existingProduct.variants.findIndex(v => v.shopifyVariantId === variant.id.toString());
                    if (variantIndex !== -1) {
                        // Existing variant found, update it
                        let existingVariant = existingProduct.variants[variantIndex];
                        let variantUpdated = false;
                
                        // Update variant title if it has changed
                        if (variant.title && variant.title !== existingVariant.title) {
                            if (variant.title === "Default Title") {
                                existingVariant.title = "Only option"
                            } else {
                                existingVariant.title = variant.title;
                            }
                            variantUpdated = true;
                            needsNewVariantFrame = true;
                        }
                
                        // Update variant image if it has changed
                        const variantImageSrc = variant.image_id ? images.find(image => image.id === variant.image_id)?.src : existingVariant.image;
                        if (variantImageSrc !== null && variantImageSrc !== existingVariant.image) {
                            existingVariant.image = variantImageSrc || existingVariant.image; // Fallback to existing image if variantImageSrc is null
                            variantUpdated = true;
                            needsNewVariantFrame = true;
                        }
                
                        // Update variant inventory quantity if it has changed
                        if (variant.inventory_quantity !== undefined && variant.inventory_quantity !== existingVariant.inventory_quantity) {
                            existingVariant.inventory_quantity = variant.inventory_quantity;
                            variantUpdated = true;
                            needsNewVariantFrame = true;
                        }

                        // Update variantFrame if necessary
                        if (variantUpdated && needsNewVariantFrame) {
                            try {
                                // Generate frame images for each variant
                                const generatedVariantFrameBuffer = await createOptionsFrame(existingProduct, existingVariant);
                                const variantImageId = await storeImage(generatedVariantFrameBuffer, 'image/jpeg');
                                existingVariant.frameImage = `${process.env.BASE_URL}/images/${variantImageId}.jpg`;
                                console.log('Frame images updated for variant');
                            } catch (error) {
                            console.error('Error generating frame images for variant', error);
                            }
                        }
                
                        // Mark the product as updated if any variant was updated
                        if (variantUpdated) {
                            productUpdated = true;
                        }
                    } else if (variant.inventory_quantity > 0 || variant.inventory_management === null) {
                        // Add the new variant with positive inventory if it doesn't already exist
                        existingProduct.variants.push({
                            shopifyVariantId: variant.id.toString(),
                            title: variant.title,
                            image: variant.image_id ? images.find(image => image.id === variant.image_id)?.src : existingProduct.image,
                            price: variant.price.toString(),
                        });
                        productUpdated = true;
                    }
                }

                if (productUpdated) {
                    await store.save();
                    console.log('Product updated successfully');
                } else {
                    console.log('No updates detected');
                }
            }
        }
        
    } catch (error) {
        console.error('Error processing product update webhook:', error);
    }
}