import { Router } from 'express';
import bodyParser from 'body-parser';
import { verifyShopifyWebhook, rawBodyBuffer } from '../../middleware/shopify.js';
import ShopifyStore from '../../models/shopify/store.js';
import { client } from '../../redis.js';

const router = Router();

async function deleteProduct(productId) {
    try {
        // First, check if any store contains the product to be deleted
        const storeContainingProduct = await ShopifyStore.findOne({ 'products.shopifyProductId': productId.toString() });

        if (!storeContainingProduct) {
            console.log('No store found with the product or product not found in any store');
            return false; // Product does not exist in any store
        }

        // If the product exists, proceed with deletion
        const result = await ShopifyStore.updateMany(
            { 'products.shopifyProductId': productId.toString() },
            { $pull: { products: { shopifyProductId: productId.toString() } } }
        );

        console.log(`Product ${productId} deleted successfully`);
        return true;
    } catch (error) {
        console.error('Error deleting product:', error);
        return false; // Indicating failure to delete the product
    }
}

// Update products from webhook
router.post('/update', bodyParser.json({ verify: rawBodyBuffer }), verifyShopifyWebhook, async (req, res) => {
    console.log('Received product update webhook with request body:', req.body);
    res.status(200).send('Webhook received');

    const shopifyWebhookId = req.headers['x-shopify-webhook-id'];
    console.log('shopifyWebhookId:', shopifyWebhookId);

    const webhookData = JSON.stringify({
        shopifyWebhookId,
        shopifyDomain: req.headers['x-shopify-shop-domain'],
        payload: req.body
    });

    try {
        const pushResult = await client.lPush('shopifyUpdatesQueue', webhookData);
        console.log('Webhook payload queued successfully, result:', pushResult);
    } catch (error) {
        console.error('Error queuing webhook data:', error);
    }
});

// Delete products from webhook
router.post('/delete', bodyParser.json({ verify: rawBodyBuffer }), verifyShopifyWebhook, async (req, res) => {
    console.log('Received product delete webhook:', req.body);
    res.status(200).send('Webhook received');    

    const { id } = req.body;
    const success = await deleteProduct(id);

    if (success) {
        console.log(`Product ${id} deletion processed successfully.`);
    } else {
        console.log(`Failed to process deletion for Product ${id}.`);
    }
});

export default router;