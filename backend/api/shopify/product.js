import { Router } from 'express';
import pkg from 'jsonwebtoken';
import Merchant from '../../models/merchant.js';
import ShopifyStore from '../../models/shopify/store.js';

const router = Router();
const { verify } = pkg;


async function updateFrameImage(product, productId) {
    try {
        // Generate frame image for the product
        const generatedProductFrameBuffer = await createProductFrame(product);
        const productImageId = await storeImage(generatedProductFrameBuffer, 'image/jpeg');
        
        // Update the product with the new frameImage URL
        await ShopifyStore.findOneAndUpdate(
            { 'products.shopifyProductId': productId },
            { $set: { 'products.$.frameImage': `${process.env.BASE_URL}/image/${productImageId}` }},
            { new: true }
        );
        
        console.log(`Frame images updated for product ${productId}`);
    } catch (error) {
        console.error(`Error generating frame images for product ${productId}:`, error);
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
router.put('/update/:productId', async (req, res) => {
    const { productId } = req.params;
    const { description } = req.body;
    
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: "No authorization token provided." });
    }

    const token = authHeader.split(' ')[1];
    let userId;

    try {
        const decoded = verify(token, process.env.JWT_SECRET);
        userId = decoded.userId;
    } catch (error) {
        return res.status(401).json({ message: "Invalid or expired token." });
    }

    const merchant = await Merchant.findOne({ user: userId });
    if (!merchant) {
        return res.status(404).json({ message: "Merchant not found." });
    }
    
    const storeAdminId = merchant._id;

    try {
        const updateStore = await ShopifyStore.findOneAndUpdate(
            { storeAdmin: storeAdminId, 'products.shopifyProductId': productId },
            { $set: { 'products.$.description': description }},
            { new: true }
        );

        if (!updateStore) {
            return res.status(404).json({ message: 'Product or store not found.' });
        }

        const updatedProduct = updateStore.products.find(p => p.shopifyProductId === productId);

        updateFrameImage(updatedProduct, productId);

        res.json(updatedProduct || { message: 'Product updated successfully, but unable to retrieve updated details.' });
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ message: 'Failed to update product.' });
    }
});

// Add products via the webhook
router.post('/webhook/add', async (req, res) => { 




});



// Update products via received webhook
router.post('/webhook/update/:productId', async (req, res) => { 




});

export default router;
