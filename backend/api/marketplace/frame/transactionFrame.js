// https://gogh.shopping/api/marketplace/frame/transactionFrame/65e8789f156969abddbbcf88

import { Router } from 'express';
import fetch from 'node-fetch';
import { existsSync, mkdirSync, appendFile } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import Image from '../../../models/image.js';
import Product from '../../../models/marketplace/product.js';
import { validateMessage } from '../../../utils/validateFrameMessage.js'

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

const logActionToCSV = async (fid, productId, productTitle, action) => {
    const now = new Date().toISOString();
    const productTitleCsv = productTitle.replace(/,/g, '');
    const data = `${now},${productTitleCsv},${action},${fid}`;

    appendToCSV(productId, data);
};


async function storeImage(imageBuffer, contentType) {
    const image = new Image({
        data: imageBuffer,
        contentType: contentType,
    });
    await image.save();
    return image._id;
}

router.post('/:productId', async (req, res) => {
    const { productId } = req.params;

    const isProduction = process.env.NODE_ENV === 'production';

    let buttonIndex, fid;

    // Validate frame interaction first
    if (isProduction) {
        try {
            const messageBytes = req.body.trustedData.messageBytes;
            const validatedFrameData = await validateMessage(messageBytes);
            // Extract data from the validatedFrameData for production
            buttonIndex = validatedFrameData.action?.tapped_button?.index;
            fid = validatedFrameData.action?.interactor?.fid;
        } catch (error) {
            console.error('Error validating message:', error);
            return res.status(500).send('An error occurred during message validation.');
        }
    } else {
        // Directly use untrustedData in development, with a different data structure
        buttonIndex = req.body.untrustedData.buttonIndex;
        fid = req.body.untrustedData.fid;
    }

    try {
        let product;
        product = await Product.findById(productId);
        if (!product) {
            return res.status(404).send('Product not found.');
        }

        try {
            await logActionToCSV(fid, product._id, product.title, "Started purchase");
        } catch (error) {
            console.error("Failed to log 'started purchase' to CSV:", error);
        }
        



        res.status(200).send(generateFrameHtml(product));
    } catch (err) {
        console.error('Error in POST /frame/:uniqueId', err);
        res.status(500).send('Internal Server Error');
    }
});

function generateFrameHtml(product) {
    
    const htmlResponse = `
    <!DOCTYPE html>
    <html>
        <head>
        <title>Gogh Marketplace</title>
            <meta name="description" content="Sell your items locally with Gogh">
            <meta property="og:url" content="https://">
            <meta property="og:image" content="${product.image}">
            <meta property="fc:frame" content="vNext" />
            <meta name="fc:frame:post_url" content="${process.env.BASE_URL}/api/marketplace/frame/send_transaction/${product._id}">
            <meta property="fc:frame:image" content="${product.image}">
            <meta property="fc:frame:image:aspect_ratio" content="" />
            <meta property="fc:frame:button:1" content="Start Shopping" />
        </head>
    </html>
    `;

    return htmlResponse;
}

export default router;