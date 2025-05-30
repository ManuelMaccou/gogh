import { Router } from 'express';
import fetch from 'node-fetch';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import auth_old from '../middleware/auth.js';
import Store from '../models/store.js';
import Merchant from '../models/merchant.js';
import Image from '../models/image.js';

const router = Router();

const findMerchantByUserId = async (userId) => {
    return Merchant.findOne({ user: userId }).populate('user');
};

const processImageFromUrl = async (imageUrl) => {
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error(`Failed to fetch the image: ${response.statusText}`);
    const imageBuffer = await response.buffer();

    // Use sharp to resize, convert to JPEG, and compress the image
    return sharp(imageBuffer)
        .resize(800, 800, { // Resize to 800x800 max, keeping aspect ratio
            fit: sharp.fit.inside,
            withoutEnlargement: true
        })
        .jpeg({ quality: 80 }) // Convert to JPEG with 80% quality
        .toBuffer(); // Return the processed image as a Buffer
};

async function storeImage(imageBuffer, contentType) {
    const image = new Image({
      data: imageBuffer,
      contentType: contentType,
    });
    await image.save();
    return image._id; // Returns the MongoDB ID of the saved image
}
  

router.post('/create', auth_old, async (req, res) => {
    const userId = req.user;
    const { image: imageUrl, storeName, storeDescription } = req.body;

    try {

        const merchant = await findMerchantByUserId(userId);
        if (!merchant) {
            return res.status(404).json({ message: "Merchant not found" });
        }

        const processedImageBuffer = await processImageFromUrl(imageUrl);

        const storeImageId = await storeImage(processedImageBuffer, 'image/jpeg');
        const storeImageUrl = `${req.protocol}://${req.headers.host}/images/${storeImageId}.jpg`;

        console.log("Creating store with merchat.id as storeAdmin:", merchant._id);
        const newStore = await Store.create({
            storeName,
            storeDescription,
            image: storeImageUrl,
            storeAdmin: merchant._id
        });

        res.json({ success: true, store: newStore });
    } catch (error) {
        console.error("Error creating store:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});


router.post('/update', auth_old, async (req, res) => {
    try {
        const userId = req.user;
        const uniqueId = uuidv4();

        const merchant = await findMerchantByUserId(userId);
        if (!merchant) {
            return res.status(404).json({ message: "Merchant not found" });
        }

        if (!merchant) {
            return res.status(404).json({ message: "Merchant not found" });
        }

        // Fetch the store associated with the merchant
        const store = await Store.findOne({ storeAdmin: merchant._id });
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