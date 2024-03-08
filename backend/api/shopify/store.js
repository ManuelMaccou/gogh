import { Router } from 'express';
import axios from 'axios';
import pkg from 'jsonwebtoken';
import Merchant from '../../models/merchant.js';
import ShopifyStore from '../../models/shopify/store.js';
import Image from '../../models/image.js';

const router = Router();
const { verify } = pkg;



// Get store info
router.get('/', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ message: "Authorization header is missing." });
        }

        const token = authHeader.split(' ')[1]; // Bearer Token
        const decoded = verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId;
  
        // Find the merchant associated with the user
        const merchant = await Merchant.findOne({ user: userId });
        if (!merchant) {
            return res.status(404).json({ message: "Merchant not found." });
        }
  
        // Find the store associated with the merchant
        const store = await ShopifyStore.findOne({ storeAdmin: merchant._id })

        if (!store) {
            return res.status(404).json({ message: "Store not found." });
        }

        res.json(store);
    } catch (error) {
        if (error.name === "JsonWebTokenError") {
            return res.status(401).json({ message: "Invalid or expired token." });
        }
        console.error("Error fetching products:", error);
        res.status(500).json({ message: "Internal server error." });
    }
});

// Update store details
router.post('/update', async (req, res) => {

    const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ message: "Authorization header is missing." });
        }

    const token = authHeader.split(' ')[1]; // Bearer Token
    const decoded = verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    const merchant = await Merchant.findOne({ user: userId });
    if (!merchant) {
        return res.status(404).json({ message: "Merchant not found." });
    }

    const store = await ShopifyStore.findOne({ storeAdmin: merchant._id });
    if (!store) {
        return res.status(404).json({ message: "Store not found." });
    }

    async function storeImage(imageBuffer, contentType) {
        const image = new Image({
        data: imageBuffer,
        contentType: contentType,
    });
        await image.save();
        return image._id;
      }

    const { storeImage: storeImageUrlFromReq } = req.body;

    try {
        // Fetch the image from the provided URL
        const response = await axios.get(storeImageUrlFromReq, {
            responseType: 'arraybuffer',
            // Limit the response size to 1MB
            maxContentLength: 1 * 1024 * 1024,
        });

        const mimeType = response.headers['content-type'];

        if (!["image/jpeg", "image/png", "image/gif"].includes(mimeType)) {
            return res.status(400).json({ message: "Unsupported image format." });
        }

        let imageBuffer = Buffer.from(response.data, 'binary');

        if (Buffer.byteLength(imageBuffer) > 225 * 1024) {
            imageBuffer = await sharp(imageBuffer)
                .resize({ width: 800 }) 
                .toBuffer();
        }

        const storeImageId = await storeImage(imageBuffer, mimeType);
        const storeImageUrl = `${process.env.BASE_URL}/image/${storeImageId}`;

        const pageHtml = `
        <!DOCTYPE html>
        <html>
            <head>
            <title></title>
                <meta name="description" content="">
                <meta property="og:url" content="${store.shopifyStoreUrl}">
                <meta property="og:image" content="${storeImageUrl}">
                <meta property="fc:frame" content="vNext">
                <meta name="fc:frame:post_url" content="${process.env.BASE_URL}/api/shopify/frame/${store._id}?initial=true">
                <meta property="fc:frame:image" content="${storeImageUrl}">
                <meta property="fc:frame:image:aspect_ratio" content="">
                <meta property="fc:frame:button:1" content="Start Shopping">
            </head>
        </html>
        `;

        const frameUrl = `${process.env.BASE_URL}/product-page/shopify/${store._id}`;

        const updatedStore = await ShopifyStore.findOneAndUpdate(store._id,
            { $set: { 
                'image': storeImageUrl,
                'pageHtml': pageHtml,
                'frameUrl': frameUrl
            } },
            { new: true }
        );

        if (!updatedStore) {
            return res.status(404).json({ message: 'Store not found.' });
        }

        res.json({ message: 'Store image and pageHtml updated successfully.', storeImage: storeImageUrl, pageHtml, frameUrl });
    } catch (error) {
        // Check if this is an AxiosError
        if (axios.isAxiosError(error)) {
            if (error.response && error.response.status === 400) {
                return res.status(400).json({ message: "Image URL is too large. Please use an image less than 1MB." });
            }
            console.error('Error updating store image:', error);
            res.status(500).json({ message: 'Failed to update store image.' });
        }
    }

});
export default router;