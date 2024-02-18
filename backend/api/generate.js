import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import auth from '../middleware/auth.js';
import Product from '../models/product.js';
import Merchant from '../models/merchant.js';
import Store from '../models/store.js';

const router = Router();

const findMerchantByUserId = async (userId) => {
    return Merchant.findOne({ user: userId }).populate('user');
};

router.post('/', auth, async (req, res) => {
    try {
        const userId = req.user;
        const uniqueId = uuidv4();

        const merchant = await findMerchantByUserId(userId);

        if (!merchant) {
            return res.status(404).json({ message: "Merchant not found" });
        }

        // Fetch the store associated with the user
        const store = await Store.findOne({ storeAdmin: merchant });
        if (!store) {
            return res.status(404).send('Store not found');
        }

        const storeName = store.storeName;

        const products = await Product.find({ user: userId });
        if (products.length === 0) {
            return res.status(404).send('No products found');
        }
        const product = products[0];

        const pageHtml = `
        <!DOCTYPE html>
        <html>
            <head>
            <title>${storeName}</title>
                <meta name="description" content="${storeName}">
                <meta property="og:url" content="${product.url}">
                <meta property="og:image" content="${store.image}">
                <meta property="fc:frame" content="vNext" />
                <meta name="fc:frame:post_url" content="${process.env.BASE_URL}/api/frames/frame/${uniqueId}?initial=true">
                <meta property="fc:frame:image" content="${store.image}">
                <meta property="fc:frame:image:aspect_ratio" content="" />
                <meta property="fc:frame:button:1" content="Start Shopping" />
            </head>
        </html>
        `;

        await Merchant.findByIdAndUpdate(userId, 
            { 
                $set: { 
                    pageId: uniqueId,
                    pageHtml: pageHtml
                }
            },
            { new: true }
        );

        res.json({ url: `${process.env.BASE_URL}/product-page/${uniqueId}` });
    } catch (err) {
        console.error('Error in generate-page:', err);
        res.status(500).send('Server error');
    }
});

export default router;