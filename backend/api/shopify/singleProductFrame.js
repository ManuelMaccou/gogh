// https://www.gogh.shopping/product-page/shopify/65fc35ffc72d259502652886/660b4ceef18d6c25a1e69914

import { Router } from 'express';
import createCartFrame from '../../utils/shopify/createCartFrame.js';
import ShopifyStore from '../../models/shopify/store.js';
import Image from '../../models/image.js';
import { validateMessage } from '../../utils/validateFrameMessage.js'

const router = Router();

const getImageUrl = (imageId) => `${process.env.BASE_URL}/images/${imageId}.jpg`;

async function storeImage(imageBuffer, contentType) {
    const image = new Image({
        data: imageBuffer,
        contentType: contentType,
    });
    await image.save();
    return image._id;
}

router.post('/:storeId/:productId', async (req, res) => {
    const storeId = req.params.storeId;
    const productId = req.params.productId;

    let frameType = req.query.frameType;
    let cartUrlParams = req.query.cartUrlParams || '';
    let cartImageUrl = null;

    let variantIndex = parseInt(req.query.variantIndex) || 0;

    const isProduction = process.env.NODE_ENV === 'production';

    let buttonIndex, fid, variantQuantity;

    const storeWithProduct = await ShopifyStore.findOne({ 
        _id: storeId, 
        'products._id': productId 
    });

    if (!storeWithProduct) {
        return res.status(404).send('Product not found in the specified store');
    }

    const product = storeWithProduct.products.find(p => p._id.toString() === productId);

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

        if (!product.variants || variantIndex >= product.variants.length || variantIndex < 0) {
            return res.status(404).send('Product found, but invalid index for variant.');
        }

        let variant = product.variants[variantIndex];

        const totalVariants = product.variants.length;

        if (frameType === "productFrame") {
            if (buttonIndex === 1 && totalVariants === 1) {
                frameType = 'addToCartFrame';
                variant = product.variants[variantIndex];
    
                const variantId = product.variants[variantIndex].shopifyVariantId;
    
                if (cartUrlParams) {
                    cartUrlParams += `${variantId}:${variantQuantity}`;
                } else {
                    cartUrlParams = `${variantId}:${variantQuantity}`;
                }

            } else if (buttonIndex === 1 && totalVariants > 1) { // User clicks "product info" button
                frameType = 'variantFrame'
                variantIndex = 0
                variant = product.variants[variantIndex];

            } else if (buttonIndex === 2) { // 'View cart' button
                frameType = 'cartFrame';

                variant = product.variants[variantIndex];

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
                variant = product.variants[variantIndex];

            } else if (buttonIndex === 2 ) { // 'add to cart' button
                frameType = 'addToCartFrame';
                variant = product.variants[variantIndex];

                const variantId = product.variants[variantIndex].shopifyVariantId;

                // Constructing cartUrlParams
                if (cartUrlParams) {
                    cartUrlParams += `,${variantId}:${variantQuantity}`;
                } else {
                    cartUrlParams = `${variantId}:${variantQuantity}`;
                }
            
            } else if (buttonIndex === 3) { // 'previous option' button
                variantIndex = (variantIndex - 1 + totalVariants) % totalVariants;
                variant = product.variants[variantIndex];

            } else if (buttonIndex === 4) { // 'next' button
                variantIndex = (variantIndex + 1) % totalVariants;
                variant = product.variants[variantIndex];
            }
            
        } else if (frameType === 'addToCartFrame') {
            if (buttonIndex === 1) { // 'keep shopping' button
                frameType = 'productFrame';
                variantIndex = 0;
                variant = product.variants[variantIndex];
            
            } else if (buttonIndex === 2) { // 'check out' button

            }
        } else if (frameType === 'cartFrame') {
            const variantId = product.variants[variantIndex].shopifyVariantId;
            variant = product.variants[variantIndex];

            if (cartUrlParams) {
                cartUrlParams += `${variantId}:${variantQuantity}`;
            } else {
                cartUrlParams = `${variantId}:${variantQuantity}`;
            }


            if (buttonIndex === 1) { // 'Keep shopping' button
                frameType = "productFrame";
                variantIndex = 0;
            } else if (buttonIndex === 2) { // 'Empty cart' button.
                frameType = "productFrame";
                variantIndex = 0;
                cartUrlParams = '';
            } else if (buttonIndex === 3) { 

            }
        }

    variant = product.variants[variantIndex];

    res.status(200).send(generateFrameHtml(storeWithProduct, product, variant, storeId, productId, variantIndex, frameType, cartUrlParams, totalVariants, cartImageUrl));
    } catch (err) {
        console.error('Error in POST /frame/:uniqueId', err);
        res.status(500).send('Internal Server Error');
    }
});

function generateFrameHtml(storeWithProduct, product, variant, storeId, productId, variantIndex, frameType, cartUrlParams, totalVariants, cartImageUrl) {

    let metadata = constructMetadata(storeWithProduct, frameType, product, variant, storeId, productId, variantIndex, cartUrlParams, totalVariants, cartImageUrl);

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

function constructMetadata(storeWithProduct, frameType, product, variant, storeId, productId, variantIndex, cartUrlParams, totalVariants, cartImageUrl) {

    const baseUrl = process.env.BASE_URL;
    const checkoutUrl = `https://${storeWithProduct.shopifyStoreUrl}/cart/${cartUrlParams}?utm_source=gogh&utm_medium=farcaster`;

    let metadata = {
        "og:url": "https://www.gogh.shopping",
        "fc:frame": "vNext",
        "fc:frame:post_url": `${baseUrl}/api/shopify/singleProductFrame/${storeId}/${productId}?variantIndex=${variantIndex}&frameType=${frameType}&cartUrlParams=${cartUrlParams}`,
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
                metadata["og:image"] = metadata["fc:frame:image"] = productImageUrl;
                metadata["fc:frame:image:aspect_ratio"] = "1.91:1";
                metadata["fc:frame:input:text"] = "Enter quantity";
                metadata["fc:frame:button:1"] = "Add to Cart";
                metadata["fc:frame:button:2"] = "View cart";
            } else {
                metadata["og:image"] = metadata["fc:frame:image"] = productImageUrl;
                metadata["fc:frame:image:aspect_ratio"] = "1.91:1";
                metadata["fc:frame:button:1"] = "Options";
                metadata["fc:frame:button:2"] = "View cart";
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
            if (totalVariants === 1) {
                metadata["og:image"] = metadata["fc:frame:image"] = productImageUrl;
            } else {
                metadata["og:image"] = metadata["fc:frame:image"] = variantImageUrl;
            }
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