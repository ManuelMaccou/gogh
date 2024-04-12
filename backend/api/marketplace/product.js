import { Router } from 'express';
import Image from '../../models/image.js';
import pkg from 'jsonwebtoken';
import sharp from 'sharp';
import multer from 'multer';
import MarketplaceProduct from'../../models/marketplace/product.js';
import User from'../../models/user.js';
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
    return image._id;
}

router.post('/add', auth, upload.fields([
    { name: 'featuredImage', maxCount: 1 },
    { name: 'images', maxCount: 3 }
]), async (req, res) => {
    if (!req.user) {
        return res.status(401).send('User not authenticated');
    }

    if (!req.files['featuredImage'] || req.files['featuredImage'].length === 0) {
        return res.status(400).send('Featured image is required');
    }

    try {
        const { location, farcon, title, description, price, walletAddress, email } = req.body;

        const featuredImageFile = req.files['featuredImage'][0];
        const processedFeaturedImageBuffer = await sharp(featuredImageFile.buffer)
            .rotate()
            .resize(800, 800, {
                fit: sharp.fit.inside,
                withoutEnlargement: true
            })
            .jpeg()
            .toBuffer();

        const processedFeaturedImage = await storeImage(processedFeaturedImageBuffer, 'image/jpeg');
        const featuredImage = `${process.env.BASE_URL}/images/${processedFeaturedImage}.jpg`;

        // Create sharable frame with the featured image
        const generatedProductFrameBuffer = await createMarketplaceProductFrame(location, title, description, price, featuredImage);
        const productImageId = await storeImage(generatedProductFrameBuffer, 'image/jpeg');
        const productFrame = `${process.env.BASE_URL}/images/${productImageId}.jpg`;

        let additionalImageUrls = [];
        if (req.files['images']) {
            for (const file of req.files['images']) {
                const processedImageBuffer = await sharp(file.buffer)
                    .resize(800, 800, {
                        fit: sharp.fit.inside,
                        withoutEnlargement: true
                    })
                    .jpeg()
                    .toBuffer();
                
                const processedImage = await storeImage(processedImageBuffer, 'image/jpeg');
                const imageUrl = `${process.env.BASE_URL}/images/${processedImage}.jpg`;
                additionalImageUrls.push(imageUrl);
            }
        }

        const user = await User.findOne({ privyId: req.user });
        if (!user) {
            return res.status(404).send('User not found');
        }
        
        const product = new MarketplaceProduct({
            location,
            farcon,
            title,
            description,
            productFrame,
            featuredImage,
            additionalImages: additionalImageUrls,
            price,
            walletAddress,
            email,
            user,
        });

        await product.save();

        user.marketplaceProductListings.push(product._id);
        await user.save();

        res.status(201).json(product);
    } catch (error) {
            const errorMessage = error.response ? (error.response.data.message || "Failed to create product.") : error.message;
            console.error('Failed to create product:', errorMessage);
        res.status(500).json({ message: 'Failed to create product.' });
    }
});

router.get('/', async (req, res) => {
    try {
        const products = await MarketplaceProduct.find({})
            .sort({_id: -1}) 
            .populate('user', 'fc_username fc_pfp fc_url fc_bio walletAddress')
            .exec();

        res.json(products);
    } catch (error) {
        console.error('Failed to fetch products:', error);
        res.status(500).json({ message: 'Failed to fetch products' });
    }
});

router.get('/single/:productId', async (req, res) => {
    try {
        const productId = req.params.productId;
        const product = await MarketplaceProduct.findOne({ _id: productId }).populate('user');
        
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        };

        res.json(product);
    } catch (error) {
        console.error('Failed to fetch single product:', error);
        res.status(500).json({ message: 'Failed to fetch single product' });
    }
});

export default router;