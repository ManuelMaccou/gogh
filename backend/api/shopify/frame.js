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

const logActionToCSV = async (fid, storeId, currentProduct, page) => {
    const now = new Date().toISOString();
    const productName = currentProduct.title.replace(/,/g, '');
    const data = `${fid},${now},${productName},${page}`;

    appendToCSV(storeId, data);
};


router.post('/:storeId', async (req, res) => {

    const { storeId } = req.params;
    // let { productIndex = 0, variantIndex = 0 } = req.query;

    let productIndex = parseInt(req.query.productIndex) || 0;
    let variantIndex = parseInt(req.query.variantIndex) || 0;

    console.log("Product index at beginning:", productIndex)

    // productIndex = parseInt(productIndex, 10);
    // variantIndex = parseInt(variantIndex, 10);


    const buttonIndex = req.body.untrustedData.buttonIndex;
    const fid = req.body.untrustedData.fid
    let frameType = req.query.frameType;
    let initial = req.query.initial === 'true';
    let cartUrlParams = req.query.cartUrlParams || '';
    
    let variantQuantity = parseInt(req.body.untrustedData.inputText, 10);
    if (isNaN(variantQuantity) || variantQuantity < 1) {
        variantQuantity = 1;
    }

    try {
        const store = await ShopifyStore.findById(storeId);
        if (!store || !store.products || productIndex >= store.products.length || productIndex < 0) {
            return res.status(404).send('Store not found or invalid index for product.');
        }

        let product = store.products[productIndex];

        console.log('Current product beginning of function:', product.title)

        if (!product.variants || variantIndex >= product.variants.length || variantIndex < 0) {
            return res.status(404).send('Product found, but invalid index for variant.');
        }

        let variant = product.variants[variantIndex];


        const totalProducts = store.products.length;
        const totalVariants = product.variants.length;

        // Log initial view of the store
        if (initial) {
            frameType = 'productFrame';
            
            console.log('product name 1:', product.title);
            console.log('variant name 1:', variant.title);
        } else {
            
            // User is browsing products
            if (frameType === 'productFrame') {
                if (buttonIndex === 1) { // 'prev' button
                    productIndex = (productIndex - 1 + totalProducts) % totalProducts;

                    console.log('product name 2:', product.title);
                    console.log('variant name 2:', variant.title);
                
                } else if (buttonIndex === 2) { // 'next' button
                    productIndex = (productIndex + 1) % totalProducts;

                    console.log('Product index after change 3:', productIndex)

                    console.log('product name 3:', product.title);
                    console.log('variant name 3:', variant.title);

                } else if (buttonIndex === 3 && totalVariants > 1) { // User clicks "product info" button
                    frameType = 'variantFrame'
                    variantIndex = 0

                    console.log('Product index after change 3:', productIndex)

                    console.log('product name 4:', product.title);
                    console.log('variant name 4:', variant.title);
                } else if (buttonIndex === 3 && totalVariants === 1) { // Only one option, have the user go right to the cart
                    frameType = 'cartFrame';
                    const variantId = product.variants[variantIndex].shopifyVariantId;

                    console.log('Product index after change 3:', productIndex)

                    if (cartUrlParams) {
                        cartUrlParams += `,${variantId}:${variantQuantity}`;

                        console.log('Product index after change 3:', productIndex)

                    } else {
                        cartUrlParams = `${variantId}:${variantQuantity}`;

                        console.log('Product index after change 3:', productIndex)
                    }
                    console.log('product name 5:', product.title);
                    console.log('variant name 5:', variant.title);

                    console.log('Product index after change 3:', productIndex)
                } 

            } else if (frameType === 'variantFrame') {
                if (buttonIndex === 1) { // 'back' button
                    frameType = 'productFrame';

                    console.log('Product index after change 3:', productIndex)

                    console.log('product name 6:', product.title);
                    console.log('variant name 6:', variant.title);

                } else if (buttonIndex === 2 ) { // 'add to cart' button
                    frameType = 'cartFrame';
                    const variantId = product.variants[variantIndex].shopifyVariantId;

                    console.log('Product index after change 3:', productIndex)

                    console.log('product name 7:', product.title);
                    console.log('variant name 7:', variant.title);

                    // Constructing cartUrlParams
                    if (cartUrlParams) {
                        cartUrlParams += `,${variantId}:${variantQuantity}`;

                        console.log('Product index after change 3:', productIndex)

                    } else {
                        cartUrlParams = `${variantId}:${variantQuantity}`;

                        console.log('Product index after change 3:', productIndex)
                    }
                
                } else if (buttonIndex === 3) { // 'previous option' button
                    variantIndex = (variantIndex - 1 + totalVariants) % totalVariants;

                    console.log('Product index after change 3:', productIndex)

                    console.log('product name 8:', product.title);
                    console.log('variant name 8:', variant.title);

                } else if (buttonIndex === 4) { // 'next' button
                    variantIndex = (variantIndex + 1) % totalVariants;

                    console.log('Product index after change 3:', productIndex)

                    console.log('product name 9:', product.title);
                    console.log('variant name 9:', variant.title);
                }
            
            } else if (frameType === 'cartFrame') {
                if (buttonIndex === 1) { // 'keep shopping' button
                    frameType = 'productFrame';
                    variantIndex = 0;

                    console.log('Product index after change 3:', productIndex)

                    console.log('product name 10:', product.title);
                    console.log('variant name 10:', variant.title);
                
                } else if (buttonIndex === 2) { // 'check out' button

                    console.log('Product index after change 3:', productIndex)

                    console.log('product name 11:', product.title);
                    console.log('variant name 11:', variant.title);
                }
            }
        }

        console.log('Final product Frame Image:', product.frameImage);
        console.log('Final variant Frame Image:', variant.frameImage);

        console.log('FINAL Product index after change 3:', productIndex)

        product = store.products[productIndex];
        variant = product.variants[variantIndex];

        console.log('FINAL product after change 3:', product)

        res.status(200).send(generateFrameHtml(currentProduct, variant, storeId, productIndex, variantIndex, frameType, cartUrlParams, totalProducts, totalVariants));
    } catch (err) {
        console.error('Error in POST /frame/:uniqueId', err);
        res.status(500).send('Internal Server Error');
    }
});

function generateFrameHtml(currentProduct, variant, storeId, productIndex, variantIndex, frameType, cartUrlParams, totalProducts, totalVariants) {

    let metadata = constructMetadata(frameType, currentProduct, variant, storeId, productIndex, variantIndex, cartUrlParams, totalProducts, totalVariants);

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
        <title>${currentProduct ? currentProduct.title : 'Product Page'}</title>
        ${metaTags}
    </head>
</html>
    `;

    return htmlResponse;
}

function constructMetadata(frameType, currentProduct, variant, storeId, productIndex, variantIndex, cartUrlParams, totalProducts, totalVariants) {

    const baseUrl = process.env.BASE_URL;
    const checkoutUrl = `${process.env.NOUNS_SHOPIFY_STORE_URL}/cart/${cartUrlParams}?utm_source=gogh&utm_medium=farcaster`;

    let metadata = {
        "og:url": "https://www.gogh.shopping",
        "fc:frame": "vNext",
        "fc:frame:post_url": `${baseUrl}/api/shopify/frame/${storeId}?initial=false&productIndex=${productIndex}&variantIndex=${variantIndex}&frameType=${frameType}&cartUrlParams=${cartUrlParams}`,
    };

    const variantImageUrl = variant.frameImage
    const productImageUrl = currentProduct.frameImage

    console.log('current product name', currentProduct.title);
    console.log('current variant name', variant.title);
    console.log('total products:', totalProducts);
    console.log('total variants:', totalVariants);



    switch (frameType) {
        case 'productFrame':
            metadata["og:image"] = metadata["fc:frame:image"] = productImageUrl;
            metadata["fc:frame:image:aspect_ratio"] = "1.91:1";
            metadata["fc:frame:button:1"] = "Previous";
            metadata["fc:frame:button:2"] = "Next";
            metadata["fc:frame:button:3"] = totalVariants === 1 ? "Add to Cart" : "View Options";
            break;

        case 'variantFrame':
            metadata["og:image"] = metadata["fc:frame:image"] = variantImageUrl;
            metadata["fc:frame:image:aspect_ratio"] = "1.91:1";
            metadata["fc:frame:input:text"] = "Enter quantity";
            metadata["fc:frame:button:1"] = "Back";
            metadata["fc:frame:button:2"] = "Add to Cart";
            metadata["fc:frame:button:3"] = "Prev option";
            metadata["fc:frame:button:4"] = "Next option";
            break;

        case 'cartFrame':
            metadata["og:image"] = metadata["fc:frame:image"] = variantImageUrl;
            metadata["fc:frame:image:aspect_ratio"] = "1.91:1";
            metadata["fc:frame:input:text"] = "Enter quantity";
            metadata["fc:frame:button:1"] = "Keep shopping";
            metadata["fc:frame:button:2"] = "Checkout";
            metadata["fc:frame:button:2:action"] = "link";
            metadata["fc:frame:button:2:target"] = checkoutUrl;
            break;
    }
    return metadata;
}

export default router;