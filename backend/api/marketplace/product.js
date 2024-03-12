import { Router } from 'express';
import Image from '../../models/image.js';
import pkg from 'jsonwebtoken';
import sharp from 'sharp';
import multer from 'multer';
// import createProductPreview from '../../utils/marketplace/createProductPreview.js';
import MarketplaceProduct from'../../models/marketplace/product.js';
import createMarketplaceProductFrame from '../../utils/marketplace/createMarketplaceProductFrame.js';
import auth from '../../middleware/auth.js';


const router = Router();
const { verify } = pkg;

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

async function storeImage(imageBuffer, contentType) {
    const image = new Image({
      data: imageBuffer,
      contentType: contentType,
    });
    await image.save();
    return image._id; // Returns the MongoDB ID of the saved image
}

router.post('/add', auth, upload.single('image'), async (req, res) => {
    if (!req.user) {
        return res.status(401).send('User not authenticated');
    }

    if (!req.file) {
        return res.status(400).send('No image uploaded');
    }

    try {
        const {location, title, description, price, walletAddress, email } = req.body;
        
        const processedImageBuffer = await sharp(req.file.buffer)
            .resize(800, 800, {
                fit: sharp.fit.inside,
                withoutEnlargement: true
            })
            .jpeg()
            .toBuffer();
        
        // Process user submitted image
        const processedImage = await storeImage(processedImageBuffer, 'image/jpeg');
        const imageUrl = `${process.env.BASE_URL}/images/${processedImage}.jpg`;

        // Create sharable frame
        const generatedProductFrameBuffer = await createMarketplaceProductFrame(location, title, description, price, imageUrl);
        const productImageId = await storeImage(generatedProductFrameBuffer, 'image/jpeg');
        const productFrame = `${process.env.BASE_URL}/image/${productImageId}`;


        console.log('image after processing:', imageUrl)
        
        const product = new MarketplaceProduct({
            location,
            title,
            description,
            productFrame,
            imageUrl,
            price,
            walletAddress,
            email,
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