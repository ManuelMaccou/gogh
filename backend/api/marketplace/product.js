import { Router } from 'express';
import Image from '../../models/image.js';
import pkg from 'jsonwebtoken';
import sharp from 'sharp';
import createProductFrame from '../../utils/shopify/createProductFrame.js';
import MarketplaceProduct from'../../models/marketplace/product.js';
import auth from '../../middleware/auth.js';


const router = Router();
const { verify } = pkg;

const processImageFromUrl = async (imageUrl) => {
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error(`Failed to fetch the image: ${response.statusText}`);
    const imageBuffer = await response.arrayBuffer();

    // convert to JPEG, and compress the image
    return sharp(imageBuffer)
        .resize(800, 800, { // Resize to 800x800 max, keeping aspect ratio
            fit: sharp.fit.inside,
            withoutEnlargement: true
        })
        .jpeg()
        .toBuffer();
};

async function storeImage(imageBuffer, contentType) {
    const image = new Image({
      data: imageBuffer,
      contentType: contentType,
    });
    await image.save();
    return image._id; // Returns the MongoDB ID of the saved image
}

router.post('/add', auth, async (req, res) => {
    if (!req.user) {
        return res.status(401).send('User not authenticated');
    }

    try {
        const {location, title, description, image, price } = req.body;
        console.log('image before processing:', image)
        
        const processedImageBuffer = await processImageFromUrl(image);
        const processedImage = await storeImage(processedImageBuffer, 'image/jpeg');
        const imageUrl = `${process.env.BASE_URL}/image/${processedImage}`;

        console.log('image after processing:', imageUrl)
        
        const product = new MarketplaceProduct({
            location,
            title,
            description,
            imageUrl,
            price,
            user: req.user
        });

        await product.save();
        res.status(201).json(product);
    } catch (error) {
        console.error('Failed to create product:', error.response || error);
        res.status(500).json({ message: 'Failed to create product' });
    }
});

router.get('/', async (req, res) => {
    try {
        const products = await MarketplaceProduct.find({})
            .populate('user', 'fc_username fc_pfp fc_profile')
            .exec();

        res.json(products);
    } catch (error) {
        console.error('Failed to fetch products:', error);
        res.status(500).json({ message: 'Failed to fetch products' });
    }
});

export default router;