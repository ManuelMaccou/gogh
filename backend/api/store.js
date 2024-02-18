import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import auth from '../middleware/auth.js';
import Store from '../models/store.js';
import Merchant from '../models/merchant.js';
import Product from '../models/product.js';

const router = Router();

const findMerchantByUserId = async (userId) => {
    return Merchant.findOne({ user: userId }).populate('user');
};

router.post('/create', auth, async (req, res) => {
    const userId = req.user;
    const { image, storeName, storeDescription } = req.body;

    try {

        const merchant = await findMerchantByUserId(userId);
        if (!merchant) {
            return res.status(404).json({ message: "Merchant not found" });
        }

        console.log("Creating store with merchat.id as storeAdmin:", merchant._id);
        const newStore = await Store.create({
            storeName,
            storeDescription,
            image,
            storeAdmin: merchant._id
        });

        res.json({ success: true, store: newStore });
    } catch (error) {
        console.error("Error creating store:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});


router.post('/update', auth, async (req, res) => {
    try {
        const userId = req.user;
        const uniqueId = uuidv4();

        const merchant = await findMerchantByUserId(userId);
        console.log('merchant:', merchant);
        if (!merchant) {
            return res.status(404).json({ message: "Merchant not found" });
        }

        if (!merchant) {
            return res.status(404).json({ message: "Merchant not found" });
        }

        // Fetch the store associated with the user
        const store = await Store.findOne({ storeAdmin: merchant._id });
        console.log('store:', store);
        if (!store) {
            return res.status(404).send('Store not found');
        }

        const storeName = store.storeName;

        const product = store.products[0];

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

        await Store.findByIdAndUpdate(store._id, 
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

router.get('/books', async (req, res) => {

    const htmlContent = `
    <!DOCTYPE html>
    <html>
        <head>
        <title>Gogh Books</title>
            <meta name="description" content="A collection of books in the Gogh Mall" />
            <meta property="og:url" content="https://www.gogh.shopping" />
            <meta property="og:image" content="https://aef8cbb778975f3e4df2041ad0bae1ca.cdn.bubble.io/f1708021185091x477780439670159040/book-store-frame_2.jpg" />
            <meta property="fc:frame" content="vNext" />
            <meta name="fc:frame:post_url" content="${process.env.BASE_URL}/api/search/books?initial=true" />
            <meta property="fc:frame:image" content="https://aef8cbb778975f3e4df2041ad0bae1ca.cdn.bubble.io/f1708021185091x477780439670159040/book-store-frame_2.jpg" />
            <meta property="fc:frame:image:aspect_ratio" content="" />
            <meta property="fc:frame:input:text" content="Describe a book or topic" />
            <meta property="fc:frame:button:1" content="Search" />
            <meta property="fc:frame:button:2" content="Recommend a book" />
        </head>
    </html>
    `;

    res.send(htmlContent);

});

export default router;