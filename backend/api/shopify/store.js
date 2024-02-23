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

// Update store image
router.post('/update', async (req, res) => {

    const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ message: "Authorization header is missing." });
        }

    const token = authHeader.split(' ')[1]; // Bearer Token
    const decoded = verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    async function storeImage(imageBuffer, contentType) {
        const image = new Image({
        data: imageBuffer,
        contentType: contentType,
    });
        await image.save();
        return image._id; // Returns the MongoDB ID of the saved image
      }

    const { storeImage: storeImageUrlFromReq } = req.body;

    try {
        // Fetch the image from the provided URL
        const response = await axios.get(storeImageUrlFromReq, {
            responseType: 'arraybuffer',
            // Limit the response size to 1MB
            maxContentLength: 1 * 1024 * 1024,
        });

        // After fetching the image, define `mimeType` from the response headers
        const mimeType = response.headers['content-type'];

        // Check if the MIME type is supported
        if (!["image/jpeg", "image/png", "image/gif"].includes(mimeType)) {
            return res.status(400).json({ message: "Unsupported image format." });
        }

        let imageBuffer = Buffer.from(response.data, 'binary');

        // Resize the image if it's larger than 150KB
        if (Buffer.byteLength(imageBuffer) > 225 * 1024) {
            imageBuffer = await sharp(imageBuffer)
                .resize({ width: 800 }) // Adjust this as needed
                .toBuffer();
        }

        // Store the resized image and get an ID or path
        const storeImageId = await storeImage(imageBuffer, mimeType);
        const storeImageUrl = `${process.env.BASE_URL}/image/${storeImageId}`;

        // Find the merchant associated with the user
        const merchant = await Merchant.findOne({ user: userId });
        if (!merchant) {
            return res.status(404).json({ message: "Merchant not found." });
        }

        // Update the Shopify store document with the new image URL
        const updatedStore = await ShopifyStore.findOneAndUpdate(
            { storeAdmin: merchant._id },
            { $set: { 'image': storeImageUrl } },
            { new: true }
        );

        if (!updatedStore) {
            return res.status(404).json({ message: 'Store not found.' });
        }

        res.json({ message: 'Store image updated successfully.', storeImage: storeImageUrl });
    } catch (error) {
        if (axios.isAxiosError(error) && error.response.status === 400) {
            return res.status(400).json({ message: "Image URL is too large. Please use an image less than 1MB." });
        }
        console.error('Error updating store image:', error);
        res.status(500).json({ message: 'Failed to update store image.' });
    }

});
export default router;