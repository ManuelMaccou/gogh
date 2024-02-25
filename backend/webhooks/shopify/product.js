import { Router } from 'express';
import { captureRawBody, verifyShopifyWebhook } from '../../middleware/shopify.js';

const router = Router();

// Add products from webhook
router.post('/create', captureRawBody, verifyShopifyWebhook, async (req, res) => {

    try {
        console.log('Received webhook:', req.body);

        res.status(200).send('Webhook received');
    } catch (error) {
        console.error('Error processing webhook:', error);
        res.status(500).send('An error occurred');
    }
});



// Update products from webhook
router.post('/update/:productId', async (req, res) => { 




});


// Delete products from webhook
router.post('/delete/:productId', async (req, res) => { 




});

export default router;