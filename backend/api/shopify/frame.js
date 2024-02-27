import { Router } from 'express';
import fetch from 'node-fetch';
import { existsSync, mkdirSync, appendFile } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import createCartFrame from '../../utils/shopify/createCartFrame.js';
import ShopifyStore from '../../models/shopify/store.js';
import Image from '../../models/image.js';
import { validateMessage } from '../../utils/shopify/validateFrameMessage.js'

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = join(__dirname, '..', 'data');

const getImageUrl = (imageId) => `${process.env.BASE_URL}/image/${imageId}`;

const ensureDirectoryExists = (dirPath) => {
    if (!existsSync(dirPath)) {
        mkdirSync(dirPath, { recursive: true });
    }
};

const appendToCSV = async (filename, data) => {
    ensureDirectoryExists(DATA_DIR);
    const csvPath = join(DATA_DIR, `${filename}.csv`);
    
    try {
        await new Promise((resolve, reject) => {
            appendFile(csvPath, `${data}\n`, (err) => {
                if (err) {
                    console.error('Error appending to CSV:', err);
                    reject(err); // Reject the promise on error
                } else {
                    console.log('Data appended to CSV:', csvPath);
                    console.log('Data:', data);
                    resolve(); // Resolve the promise on success
                }
            });
        });
    } catch (error) {
        console.error("Error appending to CSV:", error);
    }
};

const logActionToCSV = async (fid, storeName, storeId, productName, page) => {
    const now = new Date().toISOString();
    const storeNameCsv = storeName.replace(/,/g, '');
    const productNameCsv = productName.replace(/,/g, '');
    const data = `${now},${storeNameCsv},${productNameCsv},${page},${fid}`;

    appendToCSV(storeId, data);
};


async function storeImage(imageBuffer, contentType) {
    const image = new Image({
        data: imageBuffer,
        contentType: contentType,
    });
    await image.save();
    return image._id; // Returns the MongoDB ID of the saved image
}

router.post('/:storeId', async (req, res) => {
    const { storeId } = req.params;
    let frameType = req.query.frameType;
    let initial = req.query.initial === 'true';
    let cartUrlParams = req.query.cartUrlParams || '';
    let cartImageUrl = null;

    let productIndex = parseInt(req.query.productIndex) || 0;
    let variantIndex = parseInt(req.query.variantIndex) || 0;

    const isProduction = process.env.NODE_ENV === 'production';

    let buttonIndex, fid, variantQuantity;

    // Validate frame interaction first
    if (isProduction) {
        try {
            const messageBytes = req.body.trustedData.messageBytes;
            const validatedFrameData = await validateMessage(messageBytes);
            // Extract data from the validatedFrameData for production
            buttonIndex = validatedFrameData.action?.tapped_button?.index;
            fid = validatedFrameData.action?.interactor?.fid;
            variantQuantity = parseInt(validatedFrameData.action?.input?.text, 10);
        } catch (error) {
            console.error('Error validating message:', error);
            return res.status(500).send('An error occurred during message validation.');
        }
    } else {
        // Directly use untrustedData in development, with a different data structure
        buttonIndex = req.body.untrustedData.buttonIndex;
        fid = req.body.untrustedData.fid;
        variantQuantity = parseInt(req.body.untrustedData.inputText, 10);
    }
    
    if (isNaN(variantQuantity) || variantQuantity < 1) {
        variantQuantity = 1;
    }

    try {
        let store;
        store = await ShopifyStore.findById(storeId);
        if (!store || !store.products || productIndex >= store.products.length || productIndex < 0) {
            return res.status(404).send('Store not found or invalid index for product.');
        }

        let product = store.products[productIndex];

        if (!product.variants || variantIndex >= product.variants.length || variantIndex < 0) {
            return res.status(404).send('Product found, but invalid index for variant.');
        }

        let variant = product.variants[variantIndex];


        let totalProducts = store.products.length;
        let totalVariants = product.variants.length;

        // Log initial view of the store
        if (initial) {

            frameType = 'productFrame';

            try {
                await logActionToCSV(fid, store.storeName, store._id, product.title, "Opened store");
            } catch (error) {
                console.error("Failed to log initial view to CSV:", error);
            }
            
        } else {
            
            // User is browsing products
            if (frameType === 'productFrame') {
                if (buttonIndex === 1) { // 'prev' button
                    productIndex = (productIndex - 1 + totalProducts) % totalProducts;
                    product = store.products[productIndex];
                    variant = product.variants[variantIndex];
                    totalProducts = store.products.length;
                    totalVariants = product.variants.length;
                
                } else if (buttonIndex === 2) { // 'next' button
                    productIndex = (productIndex + 1) % totalProducts;
                    product = store.products[productIndex];
                    variant = product.variants[variantIndex];
                    totalProducts = store.products.length;
                    totalVariants = product.variants.length;

                } else if (buttonIndex === 3 && totalVariants > 1) { // User clicks "product info" button
                    frameType = 'variantFrame'
                    variantIndex = 0
                    product = store.products[productIndex];
                    variant = product.variants[variantIndex];
                    totalProducts = store.products.length;
                    totalVariants = product.variants.length;

                    try {
                        await logActionToCSV(fid, store.storeName, store._id, product.title, "Viewed product");
                    } catch (error) {
                        console.error("Failed to log 'viewed product' to CSV:", error);
                    }

                } else if (buttonIndex === 3 && totalVariants === 1) { // If only one variant, let user add to cart
                    frameType = 'addToCartFrame';
                    product = store.products[productIndex];
                    variant = product.variants[variantIndex];
                    totalProducts = store.products.length;
                    totalVariants = product.variants.length;

                    const variantId = product.variants[variantIndex].shopifyVariantId;

                    if (cartUrlParams) {
                        cartUrlParams += `,${variantId}:${variantQuantity}`;
                    } else {
                        cartUrlParams = `${variantId}:${variantQuantity}`;
                    }

                    try {
                        await logActionToCSV(fid, store.storeName, store._id, product.title, "Added product to cart");
                    } catch (error) {
                        console.error("Failed to log 'Added product to cart' to CSV:", error);
                    }

                } else if (buttonIndex === 4) { // 'View cart' button
                    frameType = 'cartFrame';

                    product = store.products[productIndex];
                    variant = product.variants[variantIndex];
                    totalProducts = store.products.length;
                    totalVariants = product.variants.length;

                    if (cartUrlParams) {                        
                        try {
                            const cartFrameImageBuffer = await createCartFrame(cartUrlParams, store);
                            const contentType = 'image/jpeg'; 
                
                            // Store the image buffer in DB
                            const imageId = await storeImage(cartFrameImageBuffer, contentType);
                
                            // Generate URL for the stored image
                            cartImageUrl = getImageUrl(imageId);
                
                        } catch (error) {
                            console.error('Failed to generate cart frame image:', error);
                            cartImageUrl = 'https://aef8cbb778975f3e4df2041ad0bae1ca.cdn.bubble.io/f1708806196513x879260076400543000/cart-error.jpg';
                        }
                    } else {
                        cartImageUrl = 'https://aef8cbb778975f3e4df2041ad0bae1ca.cdn.bubble.io/f1708805708015x538517546794712300/empty_cart.jpg';
                    }
                }

            } else if (frameType === 'variantFrame') {
                if (buttonIndex === 1) { // 'back' button
                    frameType = 'productFrame';
                    product = store.products[productIndex];
                    variant = product.variants[variantIndex];
                    totalProducts = store.products.length;
                    totalVariants = product.variants.length;

                } else if (buttonIndex === 2 ) { // 'add to cart' button
                    frameType = 'addToCartFrame';
                    product = store.products[productIndex];
                    variant = product.variants[variantIndex];
                    totalProducts = store.products.length;
                    totalVariants = product.variants.length;

                    const variantId = product.variants[variantIndex].shopifyVariantId;

                    try {
                        await logActionToCSV(fid, store.storeName, store._id, product.title, "Added product to cart");
                    } catch (error) {
                        console.error("Failed to log 'Added product to cart' to CSV:", error);
                    }

                    // Constructing cartUrlParams
                    if (cartUrlParams) {
                        cartUrlParams += `,${variantId}:${variantQuantity}`;
                    } else {
                        cartUrlParams = `${variantId}:${variantQuantity}`;
                    }
                
                } else if (buttonIndex === 3) { // 'previous option' button
                    variantIndex = (variantIndex - 1 + totalVariants) % totalVariants;
                    product = store.products[productIndex];
                    variant = product.variants[variantIndex];
                    totalProducts = store.products.length;
                    totalVariants = product.variants.length;

                } else if (buttonIndex === 4) { // 'next' button
                    variantIndex = (variantIndex + 1) % totalVariants;
                    product = store.products[productIndex];
                    variant = product.variants[variantIndex];
                    totalProducts = store.products.length;
                    totalVariants = product.variants.length;
                }
            
            } else if (frameType === 'addToCartFrame') {
                if (buttonIndex === 1) { // 'keep shopping' button
                    frameType = 'productFrame';
                    variantIndex = 0;
                    product = store.products[productIndex];
                    variant = product.variants[variantIndex];
                    totalProducts = store.products.length;
                    totalVariants = product.variants.length;
                
                } else if (buttonIndex === 2) { // 'check out' button

                    try {
                        await logActionToCSV(fid, store.storeName, store._id, product.title, "Went to Shopify checkout page");
                    } catch (error) {
                        console.error("Failed to log 'Went to Shopify checkout page' to CSV:", error);
                    }
                }
            } else if (frameType === 'cartFrame') {
                const variantId = product.variants[variantIndex].shopifyVariantId;
                product = store.products[productIndex];
                variant = product.variants[variantIndex];
                totalProducts = store.products.length;
                totalVariants = product.variants.length;


                if (buttonIndex === 1) { // 'Keep shopping' button
                    frameType = "productFrame";
                    variantIndex = 0;
                } else if (buttonIndex === 2) { // 'Empty cart' button.
                    frameType = "productFrame";
                    variantIndex = 0;
                    cartUrlParams = '';
                } else if (buttonIndex === 3) { 
                    try {
                        await logActionToCSV(fid, store.storeName, store._id, product.title, "Emptied cart");
                    } catch (error) {
                        console.error("Failed to log 'Emptied cart' to CSV:", error);
                    }
                }
            }
        }

        product = store.products[productIndex];
        variant = product.variants[variantIndex];
        totalProducts = store.products.length;
        totalVariants = product.variants.length;

        res.status(200).send(generateFrameHtml(store, product, variant, storeId, productIndex, variantIndex, frameType, cartUrlParams, totalProducts, totalVariants, cartImageUrl));
    } catch (err) {
        console.error('Error in POST /frame/:uniqueId', err);
        res.status(500).send('Internal Server Error');
    }
});

function generateFrameHtml(store, product, variant, storeId, productIndex, variantIndex, frameType, cartUrlParams, totalProducts, totalVariants, cartImageUrl) {

    let metadata = constructMetadata(store, frameType, product, variant, storeId, productIndex, variantIndex, cartUrlParams, totalProducts, totalVariants, cartImageUrl);

    // Generate meta tags from metadata
    let metaTags = Object.keys(metadata).map(key => {
        const value = metadata[key];
        return `<meta property="${key}" content="${value}">`;
    }).join('\n');

    const htmlResponse = `
<!DOCTYPE html>
<html>
    <head>
        <title>${product ? product.title : 'Product Page'}</title>
        ${metaTags}
    </head>
</html>
    `;

    return htmlResponse;
}

function constructMetadata(store, frameType, product, variant, storeId, productIndex, variantIndex, cartUrlParams, totalProducts, totalVariants, cartImageUrl) {

    const baseUrl = process.env.BASE_URL;
    const checkoutUrl = `${store.shopifyStoreUrl}/cart/${cartUrlParams}?utm_source=gogh&utm_medium=farcaster`;

    let metadata = {
        "og:url": "https://www.gogh.shopping",
        "fc:frame": "vNext",
        "fc:frame:post_url": `${baseUrl}/api/shopify/frame/${storeId}?initial=false&productIndex=${productIndex}&variantIndex=${variantIndex}&frameType=${frameType}&cartUrlParams=${cartUrlParams}`,
    };

    let cartFrameImage;
    if (frameType === 'cartFrame' && cartImageUrl) {
        cartFrameImage = cartImageUrl;
    } else {
        cartFrameImage = 'https://aef8cbb778975f3e4df2041ad0bae1ca.cdn.bubble.io/f1708805708015x538517546794712300/empty_cart.jpg';
    }

    const variantImageUrl = variant.frameImage
    const productImageUrl = product.frameImage

    switch (frameType) { 
        case 'productFrame':
            if (totalVariants === 1) {
                metadata["og:image"] = metadata["fc:frame:image"] = variantImageUrl;
                metadata["fc:frame:image:aspect_ratio"] = "1.91:1";
                metadata["fc:frame:input:text"] = "Enter quantity";
                metadata["fc:frame:button:1"] = "Previous";
                metadata["fc:frame:button:2"] = "Next";
                metadata["fc:frame:button:3"] = "Add to Cart";
                metadata["fc:frame:button:4"] = "View cart";
            } else {
                metadata["og:image"] = metadata["fc:frame:image"] = productImageUrl;
                metadata["fc:frame:image:aspect_ratio"] = "1.91:1";
                metadata["fc:frame:button:1"] = "Previous";
                metadata["fc:frame:button:2"] = "Next";
                metadata["fc:frame:button:3"] = "View Options";
                metadata["fc:frame:button:4"] = "View cart";
            }
            break;

        case 'variantFrame':
            if (totalVariants === 1) {
                metadata["og:image"] = metadata["fc:frame:image"] = productImageUrl;
            } else {
                metadata["og:image"] = metadata["fc:frame:image"] = variantImageUrl;
            }
                metadata["fc:frame:image:aspect_ratio"] = "1.91:1";
                metadata["fc:frame:input:text"] = "Enter quantity";
                metadata["fc:frame:button:1"] = "Back";
                metadata["fc:frame:button:2"] = "Add to Cart";
                metadata["fc:frame:button:3"] = "Prev option";
                metadata["fc:frame:button:4"] = "Next option";
            break;

        case 'addToCartFrame':
            metadata["og:image"] = metadata["fc:frame:image"] = variantImageUrl;
            metadata["fc:frame:image:aspect_ratio"] = "1.91:1";
            metadata["fc:frame:button:1"] = "Keep shopping";
            metadata["fc:frame:button:2"] = "Checkout";
            metadata["fc:frame:button:2:action"] = "link";
            metadata["fc:frame:button:2:target"] = checkoutUrl;
            break;

        case 'cartFrame': 
            metadata["og:image"] = metadata["fc:frame:image"] = cartFrameImage;
            if (!cartUrlParams) {
                metadata["fc:frame:image:aspect_ratio"] = "1.91:1";
                metadata["fc:frame:button:1"] = "Keep shopping";
            } else {
                metadata["fc:frame:image:aspect_ratio"] = "1:1";
                metadata["fc:frame:button:1"] = "Keep shopping";
                metadata["fc:frame:button:2"] = "Empty cart";
                metadata["fc:frame:button:3"] = "Checkout";
                metadata["fc:frame:button:3:action"] = "link";
                metadata["fc:frame:button:3:target"] = checkoutUrl;
            }
           

    }
    return metadata;
}

export default router;