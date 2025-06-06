import { Router } from 'express';
import pkg from 'jsonwebtoken';
import Image from '../../models/image.js';
import Merchant from '../../models/merchant.js';
import ShopifyStore from '../../models/shopify/store.js';
import User from '../../models/user.js';
import createProductFrame from '../../utils/shopify/createProductFrame.js';
import auth from '../../middleware/auth.js';


const router = Router();
const { verify } = pkg;

async function storeImage(imageBuffer, contentType) {
    const image = new Image({
        data: imageBuffer,
        contentType: contentType,
    });
    await image.save();
    return image._id; // Returns the MongoDB ID of the saved image
}


async function updateFrameImage(updatedProduct) {
    try {
        // Generate frame image for the product
        const generatedProductFrameBuffer = await createProductFrame(updatedProduct);
        const productImageId = await storeImage(generatedProductFrameBuffer, 'image/jpeg');
        const productId = updatedProduct._id
        
        // Update the product with the new frameImage URL
        await ShopifyStore.findOneAndUpdate(
            { 'products._id': productId },
            { $set: { 'products.$.frameImage': `${process.env.BASE_URL}/images/${productImageId}.jpg` }},
            { new: true }
        );
        
        console.log(`Frame images updated for product ${productId}`);
    } catch (error) {
        console.error('Error generating frame images', error);
    }
}


// Fetch all products from database to show on page
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
        const store = await ShopifyStore.findOne({ storeAdmin: merchant._id }).populate('products');
        if (!store) {
            return res.status(404).json({ message: "Store not found." });
        }
  
        // Return the products associated with the store
        res.json(store.products);
    } catch (error) {
        if (error.name === "JsonWebTokenError") {
            return res.status(401).json({ message: "Invalid or expired token." });
        }
        console.error("Error fetching products:", error);
        res.status(500).json({ message: "Internal server error." });
    }

});


// Update products via form for things like description and title
router.put('/update/:productId', auth, async (req, res) => {
    const { productId } = req.params;
    const { simulateFid } = req.body;
    const { description } = req.body.updatedProductData;
    const userId = req.user;

    console.log('updateing product');
    console.log('update productId:', productId);
    console.log('update description:', description);
    console.log('update simulatefid:', simulateFid);
    console.log('update user ID:', userId);

    try {
        const authUser = await User.findOne({ privyId: userId });
        if (!authUser) {
            return res.status(404).json({ message: "Authenticated user not found." });
        }

        let targetUser = authUser;

        // Check if the authenticated user is an admin and simulateFid is provided
        if (authUser.fid === '8587' && simulateFid) {
            const simulatedUser = await User.findOne({ fid: simulateFid });
            if (!simulatedUser) {
                return res.status(404).json({ message: "Simulated user not found." });
            }
            targetUser = simulatedUser; // Use simulated user's details for further operations
        }

        const merchant = await Merchant.findOne({ user: targetUser._id });
        if (!merchant) {
            return res.status(404).json({ message: "Merchant not found." });
        }

        const updateStore = await ShopifyStore.findOneAndUpdate(
            { storeAdmin: merchant._id, 'products._id': productId },
            { $set: { 'products.$.description': description } },
            { new: true }
        );

        if (!updateStore) {
            return res.status(404).json({ message: 'Product or store not found.' });
        }

        const updatedProduct = updateStore.products.find(p => p._id.toString() === productId);
        console.log('updated product description:', updatedProduct.description);

        updateFrameImage(updatedProduct);

        res.json(updatedProduct || { message: 'Product updated successfully, but unable to retrieve updated details.' });
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ message: 'Failed to update product.' });
    }
});

export default router;
