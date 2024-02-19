import { Router } from 'express';
import Store from '../models/store.js';
import { existsSync, mkdirSync, appendFile } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Function to sanitize uniqueId
const isValidUuid = (uuid) => {
    const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return regex.test(uuid);
};

// Get a specific product by index for a user
async function getStore(uniqueId, productIndex) {
    const store = await Store.findOne({ pageId: uniqueId }).populate('products');
    if (!store) {
        // console.error(`User not found with pageId: ${uniqueId}`);
        return { product: null };
    }

    if (!store.products || store.products.length === 0 || !store.products[productIndex]) {
        // console.error(`Product not found or out of index range for user: ${uniqueId}`);
        return { product: null };
    }

    return { product: store.products[productIndex] };
}

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

const logActionToCSV = async (fid, uniqueId, product, page) => {
    const now = new Date().toISOString();
    const productName = product.title.replace(/,/g, '');
    const data = `${fid},${now},${productName},${page}`;

    appendToCSV(uniqueId, data);
};

/*
router.get('/frame/:uniqueId', async (req, res) => {
    const productIndex = 0; // Always show the first product initially
    const { product, username } = await getStore(req.params.uniqueId, productIndex);

    if (!product) {
        return res.status(404).send('No products found');
    }

    res.send(generateFrameHtml(product, username, req.params.uniqueId, productIndex));
});
*/


router.post('/frame/:uniqueId', async (req, res) => {
    const uniqueId = req.params.uniqueId;

    // Validate uniqueId as a UUID at the beginning of your route handler
    if (!isValidUuid(uniqueId)) {
        return res.status(400).send('Invalid uniqueId format');
    }

    const buttonIndex = req.body.untrustedData.buttonIndex;
    const fid = req.body.untrustedData.fid
    let productIndex = parseInt(req.query.index) || 0;
    let frameType = req.query.frameType;
    let initial = req.query.initial === 'true';

    try {
        const store = await Store.findOne({ pageId: uniqueId }).populate('products');
        if (!store) {
            return res.status(404).send('Store not found');
        }
        const totalProducts = store.products.length;
        const storeName = store.storeName;

        let { product } = await getStore(uniqueId, productIndex);
        if (!product) {
            return res.status(404).send('Product not found');
        }

        // Log initial view of the store
        if (initial) {
            productIndex = 0;
            try {
                await logActionToCSV(fid, uniqueId, product, "Opened store");
            } catch (error) {
                console.error("Failed to log initial view to CSV:", error);
            }
        } else {
        
            if (frameType === 'descriptionFrame') {
                if (buttonIndex === 1) { // 'back' button
                    frameType = 'productFrame';
                
                } else if (buttonIndex === 2) { // 'buy' button
                    const redirectUrl = `${process.env.BASE_URL}/api/products/redirect/${product._id}`;
                    if (product.url) {
                        res.setHeader('Location', redirectUrl);

                        try {
                            await logActionToCSV(fid, uniqueId, product, "Buy");
                        } catch (error) {
                            console.error("Failed to log buy action to CSV:", error);
                        }

                        return res.status(302).send();
                    } else {
                        return res.status(404).send('Redirect URL not found');
                    }
                }

            } else {

                // frameType is productFrame
                if (buttonIndex === 1) { // 'prev' button
                    productIndex = (productIndex - 1 + totalProducts) % totalProducts;

                } else if (buttonIndex === 3) { // 'next' button
                    productIndex = (productIndex + 1) % totalProducts;

                }
                frameType = 'productFrame';

                let updatedProductData = await getStore(uniqueId, productIndex);
                product = updatedProductData.product;

                if (!product) {
                    return res.status(404).send('Product not found');
                }

                // Handling the 'more info' button
                if (buttonIndex === 2) {
                    frameType = 'descriptionFrame'

                    try {
                        await logActionToCSV(fid, uniqueId, product, "More info");
                    } catch (error) {
                        console.error("Failed to log more info action to CSV:", error);
                    }
                }
            }
        }
        res.status(200).send(generateFrameHtml(product, storeName, uniqueId, productIndex, frameType));
    } catch (err) {
        console.error('Error in POST /frame/:uniqueId', err);
        res.status(500).send('Internal Server Error');
    }
});

// Helper function to generate frame HTML
function generateFrameHtml(product, storeName, uniqueId, productIndex, frameType = 'productFrame') {
    const postUrl = `${process.env.BASE_URL}/api/frames/frame/${uniqueId}?index=${productIndex}&frameType=${frameType}`;
    

    // Determine which frame to show based on the frameType parameter
    const frameContent = frameType === 'descriptionFrame' ? product.descriptionFrame : product.productFrame;

    // Dynamically set buttons based on the frameType
    let buttonsHtml = '';
    if (frameType === 'descriptionFrame') {
        // Define buttons for descriptionFrame
        buttonsHtml = `
            <meta property="fc:frame:button:1" content="back" />
            <meta property="fc:frame:button:2" content="buy" />
            <meta property="fc:frame:button:2:action" content="post_redirect" />
        `;
    } else {
        // Default button set for productFrame
        buttonsHtml = `
            <meta property="fc:frame:button:1" content="prev" />
            <meta property="fc:frame:button:2" content="more info" />
            <meta property="fc:frame:button:3" content="next" />
            <meta property="fc:frame:image:aspect_ratio" content="1:1" />
        `;
    }

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>${storeName}</title>
            <meta property="og:url" content="${product.url}">
            <meta property="og:image" content="${product.image}">
            <meta property="fc:frame" content="vNext" />
            <meta property="fc:frame:post_url" content="${postUrl}">
            <meta property="fc:frame:image" content="${frameContent}">
            ${buttonsHtml}
        </head>
        </html>
    `;
}

export default router;