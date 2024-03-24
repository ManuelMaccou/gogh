import ShopifyStore from '../../../models/shopify/store.js';
import createOptionsFrame from '../../../utils/shopify/createOptionsFrame.js';
import createProductFrame from '../../../utils/shopify/createProductFrame.js';
import Image from '../../../models/image.js';

async function storeImage(imageBuffer, contentType) {
  const image = new Image({
    data: imageBuffer,
    contentType: contentType,
  });
  await image.save();
  return image._id; // Returns the MongoDB ID of the saved image
}

export async function findOrCreateStore(baseUrl, storeName, defaultProductImage) {
  try {
      let store = await ShopifyStore.findOne({ shopifyStoreUrl: baseUrl });

      if (!store) {
          console.log('Creating store without pageHtml and frameUrl');

          // Create and save store without pageHtml and frameUrl
          store = new ShopifyStore({
              shopifyStoreUrl: baseUrl,
              storeName: storeName,
              defaultProductImage: defaultProductImage,
              products: []
          });
          await store.save();

          console.log('Store created with pageHtml and frameUrl:', store);
      } else {
          console.log('Existing store found.');
      }

      return store;
  } catch (error) {
      console.error("Error finding or creating store:", error);
      throw error; // Rethrow to handle it in the calling function
  }
}


export async function storeProductData(productsData, storeId) {

  const store = await ShopifyStore.findById(storeId);

  if (!store) {
      console.error("Store not found:", storeId);
      return;
  }

  // Filter products by vendor and status before mapping
  const filteredProducts = productsData.filter(product => 
    // product.vendor === store.storeName && product.status === 'active'
    product.status === 'active'
  );

  const defaultProductImageSrc = store.defaultProductImage;

  const products = filteredProducts.reduce((acc, productData) => {
    const productImageSrc = productData.image ? productData.image.src : defaultProductImageSrc;

    const filteredVariants = productData.variants.filter(variant => 
      variant.inventory_management === null || variant.inventory_quantity > 0
    );

    // Ensure product is added only if it doesn't result in an empty variants array
    if (filteredVariants.length > 0) {
      const productToAdd = {
        shopifyProductId: productData.id.toString(),
        title: productData.title,
        originalDescription: productData.body_html,
        image: productImageSrc,
        variants: filteredVariants.map(variant => {
          const variantImageSrc = variant.image_id 
            ? productData.images.find(image => image.id === variant.image_id)?.src 
            : productImageSrc;

          const variantTitle = variant.title === "Default Title" ? "Only option" : variant.title;

          return {
            shopifyVariantId: variant.id.toString(),
            title: variantTitle,
            price: variant.price,
            image: variantImageSrc,
          };
        })
      };
      acc.push(productToAdd);
    }
    return acc;
  }, []);

  if (products.length > 0) {
    store.products.push(...products);
    await store.save();
    console.log('Products and variants added successfully to store:', storeId);
  } else {
    console.log('No matching products found to add for store:', storeId);
  }
}

export async function updateProductFrames(storeId) {
  const store = await ShopifyStore.findById(storeId);

  if (!store) {
    console.error("Store not found:", storeId);
    return;
  }

  for (const product of store.products) {
    try {
      // Generate frame image for the product
      const generatedProductFrameBuffer = await createProductFrame(product);
      const productImageId = await storeImage(generatedProductFrameBuffer, 'image/jpeg');
      product.frameImage = `${process.env.BASE_URL}/images/${productImageId}.jpg`;

      for (const variant of product.variants) {
        // Generate frame images for each variant
        const generatedVariantFrameBuffer = await createOptionsFrame(product, variant);
        const variantImageId = await storeImage(generatedVariantFrameBuffer, 'image/jpeg');
        variant.frameImage = `${process.env.BASE_URL}/images/${variantImageId}.jpg`;
      }
      
      console.log(`Frame images updated for product ${product.shopifyProductId}`);
    } catch (error) {
      console.error(`Error generating frame images for product ${product.shopifyProductId}:`, error);
    }
  }

  // Save the store after updating all product and variant frames
  await store.save();
  console.log('Frame images for all products and variants have been updated successfully.');
}