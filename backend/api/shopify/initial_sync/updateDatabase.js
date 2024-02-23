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

export async function findOrCreateStore(baseUrl) {
  try {
      let store = await ShopifyStore.findOne({ shopifyStoreUrl: baseUrl });

      if (!store) {
          console.log('Creating store without pageHtml and frameUrl');

          // Create and save store without pageHtml and frameUrl
          store = new ShopifyStore({
              shopifyStoreUrl: baseUrl,
              products: []
          });
          await store.save();

          // Construct pageHtml and frameUrl with store._id
          const pageHtml = `
          <!DOCTYPE html>
          <html>
              <head>
              <title></title>
                  <meta name="description" content="">
                  <meta property="og:url" content="">
                  <meta property="og:image" content="">
                  <meta property="fc:frame" content="vNext">
                  <meta name="fc:frame:post_url" content="${process.env.BASE_URL}/api/shopify/frame/${store._id}?initial=true">
                  <meta property="fc:frame:image" content="">
                  <meta property="fc:frame:image:aspect_ratio" content="">
                  <meta property="fc:frame:button:1" content="Start Shopping">
              </head>
          </html>
          `;

          const frameUrl = `${process.env.BASE_URL}/product-page/shopify/${store._id}`;

          // Update the store with pageHtml and frameUrl
          store = await ShopifyStore.findByIdAndUpdate(store._id, {
              $set: { pageHtml: pageHtml, frameUrl: frameUrl }
          }, { new: true }); // Option { new: true } will return the updated document

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

  // Map through productsData to transform it into the structure needed for storage
  const products = productsData.map(productData => ({
    shopifyProductId: productData.id.toString(),
    title: productData.title,
    originalDescription: productData.body_html,
    image: productData.image ? productData.image.src : null,
    // Initially, do not include frameImage
    variants: productData.variants.map(variant => ({
      shopifyVariantId: variant.id.toString(),
      title: variant.title,
      price: variant.price,
      image: variant.image_id ? productData.images.find(image => image.id === variant.image_id)?.src : productData.image?.src,
      // Initially, do not include frameImage for variants either
    }))
  }));

  // Update the store with embedded products
  store.products.push(...products);
  await store.save();

  console.log('Products and variants added successfully to store:', storeId);
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
      product.frameImage = `${process.env.BASE_URL}/image/${productImageId}`;

      for (const variant of product.variants) {
        // Generate frame images for each variant
        const generatedVariantFrameBuffer = await createOptionsFrame(product, variant);
        const variantImageId = await storeImage(generatedVariantFrameBuffer, 'image/jpeg');
        variant.frameImage = `${process.env.BASE_URL}/image/${variantImageId}`;
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