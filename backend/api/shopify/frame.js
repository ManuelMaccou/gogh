import { Router } from 'express';
import { existsSync, mkdirSync, appendFile } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import ShopifyStore from '../../models/shopify/store.js';

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = join(__dirname, '..', 'data');

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

const logActionToCSV = async (fid, storeId, product, page) => {
    const now = new Date().toISOString();
    const productName = product.title.replace(/,/g, '');
    const data = `${fid},${now},${productName},${page}`;

    appendToCSV(storeId, data);
};


router.post('/:storeId', async (req, res) => {

    const { storeId } = req.params;
    let { productIndex = 0, variantIndex = 0 } = req.query;
    productIndex = parseInt(productIndex, 10);
    variantIndex = parseInt(variantIndex, 10);


    const buttonIndex = req.body.untrustedData.buttonIndex;
    const fid = req.body.untrustedData.fid
    let frameType = req.query.frameType;
    let initial = req.query.initial === 'true';
    let cartUrlParams = req.query.cartUrlParams; // Should have the strucutre of VARIANT_ID:QUANTITY,VARIANT_ID:QUANTITY
    
    let variantQuantity = parseInt(req.body.inputText, 10);
    if (isNaN(variantQuantity) || variantQuantity < 1) {
        variantQuantity = 1;
    }

    try {
        const store = await ShopifyStore.findById(storeId);
        if (!store || !store.products || productIndex >= store.products.length || productIndex < 0) {
            return res.status(404).send('Store not found or invalid index for product.');
        }

        const product = store.products[productIndex];
        if (!product.variants || variantIndex >= product.variants.length || variantIndex < 0) {
            return res.status(404).send('Product found, but invalid index for variant.');
        }

        const variant = product.variants[variantIndex];


        const totalProducts = store.products.length;
        const totalVariants = product.variants.length;


        // Log initial view of the store
        if (initial) {
            productIndex = 0;
            frameType = 'productFrame';
            /*
            try {
                await logActionToCSV(fid, storeId, "null", "Opened store");
            } catch (error) {
                console.error("Failed to log initial view to CSV:", error);
            }
            */
        } else {
            
            // User is browsing products
            if (frameType === 'productFrame') {
                if (buttonIndex === 1) { // 'prev' button
                    productIndex = (productIndex - 1 + totalProducts) % totalProducts;

                } else if (buttonIndex === 2) { // 'next' button
                    productIndex = (productIndex + 1) % totalProducts;

                }
                frameType = 'productFrame';

                if (buttonIndex === 3 && totalVariants > 1) { // User clicks "product info" button
                    frameType = 'variantFrame'
                    variantIndex = 0

                    /*
                    try {
                        await logActionToCSV(fid, storeId, product._id, "Product info");
                    } catch (error) {
                        console.error("Failed to log product info action to CSV:", error);
                    }
                    */
                } else { // Only one option, have the user go right to the cart
                    if (buttonIndex === 3 && totalVariants === 1) {
                        frameType = 'cartFrame';
                        const variantId = product.variants[variantIndex].shopifyVariantId;
                        if (cartUrlParams) {
                            cartUrlParams += `,${variantId}:${variantQuantity}`;
                        } else {
                            cartUrlParams = `${variantId}:${variantQuantity}`;
                        }
                    }
                }

        } else {

            // User is looking at options of a single product
            if (frameType === 'variantFrame') {
                if (buttonIndex === 1) { // 'back' button
                    frameType = 'productFrame';
                    variantIndex = 0;

                } else if (buttonIndex === 2 ) { // 'add to cart' button
                    frameType = 'cartFrame';
                    const variantId = product.variants[variantIndex].shopifyVariantId;

                    /*
                    try {
                        await logActionToCSV(fid, storeId, product, "Add to cart");
                    } catch (error) {
                        console.error("Failed to log add to cart action to CSV:", error);
                    }
                    */

                    // Constructing cartUrlParams
                    if (cartUrlParams) {
                        cartUrlParams += `,${variantId}:${variantQuantity}`;
                    } else {
                        cartUrlParams = `${variantId}:${variantQuantity}`;
                    }
                
                } else if (buttonIndex === 3) { // 'previous option' button
                    variantIndex = (variantIndex - 1 + totalVariants) % totalVariants;
                } else if (buttonIndex === 4) { // 'next' button
                    variantIndex = (variantIndex + 1) % totalVariants;
                }
            
            } else {

            // User is on the cart page
            if (frameType === 'cartFrame') {
                if (buttonIndex === 1) { // 'keep shopping' button
                    frameType = 'productFrame';
                    variantIndex = '';
                
                } else if (buttonIndex === 2) { // 'check out' button
                    /*
                    try {
                        await logActionToCSV(fid, storeId, product, "Check out");
                    } catch (error) {
                        console.error("Failed to log the checkoug action to CSV:", error);
                    }
                    */
                }
            }
        }
    }

    }
    res.status(200).send(generateFrameHtml(product, variant, storeId, productIndex, variantIndex, frameType, cartUrlParams));
    } catch (err) {
        console.error('Error in POST /frame/:uniqueId', err);
        res.status(500).send('Internal Server Error');
    }
});

function generateFrameHtml(product, variant, storeId, productIndex, variantIndex, frameType, cartUrlParams) {

    let metadata = constructMetadata(frameType, variant, storeId, productIndex, variantIndex, cartUrlParams);

    // Generate meta tags from metadata
    let metaTags = Object.keys(metadata).map(key => {
        const value = metadata[key];
        return `<meta property="${key}" content="${value}">`;
    }).join('\n');

    // Construct the HTML with the meta tags embedded
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

function constructMetadata(frameType, variant, storeId, productIndex, variantIndex, cartUrlParams) {

    const baseUrl = process.env.BASE_URL;
    const checkoutUrl = `${process.env.DEFAULT_SHOPIFY_STORE_URL}/cart/${cartUrlParams}?utm_source=gogh&utm_medium=farcaster`;

    let metadata = {
        "og:url": "https://www.gogh.shopping",
        "fc:frame": "vNext",
        "fc:frame:post_url": `${baseUrl}/api/shopify/frame/${storeId}?initial=false&productIndex=${productIndex}&variantIndex=${variantIndex}&frameType=${frameType}&cartUrlParams=${cartUrlParams}`,
    };

    const variantImageUrl = variant.image


    switch (frameType) {
        case 'productFrame':
            metadata["og:image"] = metadata["fc:frame:image"] = variantImageUrl;
            metadata["fc:frame:image:aspect_ratio"] = "1.91:1";
            metadata["fc:frame:button:1"] = "Previous";
            metadata["fc:frame:button:2"] = "Next";
            metadata["fc:frame:button:3"] = totalVariants === 1 ? "Add to Cart" : "View Options";
            break;

        case 'variantFrame':
            metadata["og:image"] = metadata["fc:frame:image"] = variantImageUrl;
            metadata["fc:frame:image:aspect_ratio"] = "1.91:1";
            metadata["fc:frame:button:1"] = "Back";
            metadata["fc:frame:button:2"] = "Add to Cart";
            metadata["fc:frame:button:3"] = "Prev option";
            metadata["fc:frame:button:4"] = "Next option";
            break;

        case 'cartFrame':
            metadata["og:image"] = metadata["fc:frame:image"] = variantImageUrl;
            metadata["fc:frame:image:aspect_ratio"] = "1:1";
            metadata["fc:frame:input:text"] = "Enter quantity";
            metadata["fc:frame:button:1"] = "Keep shopping";
            metadata["fc:frame:button:2"] = "Checkout";
            metadata["fc:frame:button:2:action"] = "Link";
            metadata["fc:frame:button:2:target"] = checkoutUrl;
            break;
    }
    return metadata;
}

export default router;