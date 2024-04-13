import { Router } from 'express';
import Store from '../models/store.js';
import ShopifyStore from '../models/shopify/store.js';


const router = Router();

router.get('/:uniqueId', async (req, res) => {
    try {
        const uniqueId = req.params.uniqueId;
        console.log("Requested Unique ID:", uniqueId);

        const store = await Store.findOne({ pageId: uniqueId });
        
        if (!store) {
            console.log("No store found for Unique ID:", uniqueId);
            return res.status(404).send('User not found');
        }

        // Check if pageHtml is specifically undefined or null
        if (store.pageHtml === undefined || store.pageHtml === null) {
            console.log("Store found but no pageHtml for Unique ID:", uniqueId);
            return res.status(404).send('Page HTML not found');
        }

        res.send(store.pageHtml);
    } catch (err) {
        console.error('Error in GET /:uniqueId', err);
        res.status(500).send('Server error');
    }
});

// Response to generate frame for a store
router.get('/shopify/:storeId', async (req, res) => {
    try {
        const storeId = req.params.storeId;

        console.log("Requested store ID:", storeId);

        const store = await ShopifyStore.findOne({ _id: storeId });
        
        if (!store) {
            console.log("No Shopify store found for this ID:", storeId);
            return res.status(404).send('Shopify store not found');
        }

        // Check if pageHtml is specifically undefined or null
        if (store.pageHtml === undefined || store.pageHtml === null) {
            console.log("Shopify store found but no pageHtml for Store ID:", storeId);
            return res.status(404).send('Page HTML not found');
        }
        
        res.send(store.pageHtml);
    } catch (err) {
        console.error('Error in GET /:uniqueId', err);
        res.status(500).send('Server error');
    }
});

// Response to generate frame for a product within a specific store
router.get('/shopify/:storeId/:productId', async (req, res) => {
    try {
        const storeId = req.params.storeId;
        const productId = req.params.productId;

        const storeWithProduct = await ShopifyStore.findOne({ 
            _id: storeId, 
            'products._id': productId 
        }, {
            'products.$': 1
        });
    
        if (!storeWithProduct) {
            return res.status(404).send('Product not found in the specified store');
        }
    
        const product = storeWithProduct.products[0];
        const totalVariants = product.variants.length;
        let pageHtml;

        if (totalVariants === 1) {
        
        pageHtml = `
        <!DOCTYPE html>
        <html>
            <head>
            <title>Gogh Marketplace</title>
                <meta name="description" content="Sell your items locally with Gogh">
                <meta property="og:url" content="https://">
                <meta property="og:image" content="${product.frameImage}" />
                <meta property="fc:frame" content="vNext">
                <meta name="fc:frame:post_url" content="${process.env.BASE_URL}/api/shopify/singleProductFrame/${storeId}/${productId}?frameType=productFrame">
                <meta property="fc:frame:image" content="${product.frameImage}">
                <meta property="fc:frame:image:aspect_ratio" content="">
                <meta property="fc:frame:button:1" content="Add to cart">
                <meta property="fc:frame:button:2" content="View cart">
            </head>
        </html>
        `;

        } else {
            pageHtml = `
        <!DOCTYPE html>
        <html>
            <head>
            <title>Gogh Marketplace</title>
                <meta name="description" content="Sell your items locally with Gogh">
                <meta property="og:url" content="https://">
                <meta property="og:image" content="${product.frameImage}" />
                <meta property="fc:frame" content="vNext">
                <meta name="fc:frame:post_url" content="${process.env.BASE_URL}/api/shopify/singleProductFrame/${storeId}/${productId}?frameType=productFrame">
                <meta property="fc:frame:image" content="${product.frameImage}">
                <meta property="fc:frame:image:aspect_ratio" content="">
                <meta property="fc:frame:button:1" content="Options">
                <meta property="fc:frame:button:2" content="View cart">
            </head>
        </html>
        `;
        }
        
        res.status(200).send(pageHtml);
    } catch (err) {
        console.error('Error in GET /:uniqueId', err);
        res.status(500).send('Server error');
    }
});

export default router;
