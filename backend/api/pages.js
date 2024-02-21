import { Router } from 'express';
import Store from '../models/store.js';
import ShopifyStore from '../models/shopify/newShopifyModel.js';


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

export default router;
