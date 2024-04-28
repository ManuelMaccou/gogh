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
        const { location, shipping, farcon, title, description, price, walletAddress, email } = req.body;

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
        const generatedProductFrameBuffer = await createMarketplaceProductFrame(location, shipping, title, description, price, featuredImage);
        const productImageId = await storeImage(generatedProductFrameBuffer, 'image/jpeg');
        const productFrame = `${process.env.BASE_URL}/images/${productImageId}.jpg`;

        let additionalImageUrls = [];
        if (req.files['images']) {
            for (const file of req.files['images']) {
                const processedImageBuffer = await sharp(file.buffer)
                .rotate()
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
        
        const product = new MarketplaceProduct({
            location,
            status: 'pending_approval',
            shipping,
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
        res.status(201).json(product);
    } catch (error) {
            const errorMessage = error.response ? (error.response.data.message || "Failed to create product.") : error.message;
            console.error('Failed to create product:', errorMessage);
            throw error;
    }
});

router.put('/update/:id', auth, upload.fields([
    { name: 'featuredImage', maxCount: 1 },
    { name: 'images', maxCount: 3 }
  ]), async (req, res) => {
    if (!req.user) {
      return res.status(401).send('User not authenticated');
    }
  
    const listingId = req.params.id;
  
    try {
        const { location, status, shipping, title, description, price, walletAddress, email } = req.body;
  
        const updatedProduct = await MarketplaceProduct.findById(listingId);
        console.log("product to update:", updatedProduct);
    
        if (!updatedProduct) {
            return res.status(404).send('Product not found');
        }
    
        updatedProduct.shipping = shipping;
        updatedProduct.location = location;
        updatedProduct.title = title;
        updatedProduct.description = description;
        updatedProduct.price = price;
        updatedProduct.walletAddress = walletAddress;
        updatedProduct.email = email;
  
        if (req.files['featuredImage'] && req.files['featuredImage'].length > 0) {
            const featuredImageFile = req.files['featuredImage'][0];
            const processedFeaturedImageBuffer = await sharp(featuredImageFile.buffer)
            .rotate()
            .resize(800, 800, { fit: sharp.fit.inside, withoutEnlargement: true })
            .jpeg()
            .toBuffer();
            const processedFeaturedImage = await storeImage(processedFeaturedImageBuffer, 'image/jpeg');
            const featuredImage = `${process.env.BASE_URL}/images/${processedFeaturedImage}.jpg`;
            updatedProduct.featuredImage = featuredImage;
        } else if (req.body.existingFeaturedImage) {
                // If no new featured image is provided, use the existing featured image URL
                updatedProduct.featuredImage = req.body.existingFeaturedImage;
        }
  
        // Create sharable frame with the featured image
        const generatedProductFrameBuffer = await createMarketplaceProductFrame(
            updatedProduct.location,
            updatedProduct.shipping,
            updatedProduct.title,
            updatedProduct.description,
            updatedProduct.price,
            updatedProduct.featuredImage
        );
        const productImageId = await storeImage(generatedProductFrameBuffer, 'image/jpeg');
        const productFrame = `${process.env.BASE_URL}/images/${productImageId}.jpg`;
        updatedProduct.productFrame = productFrame;
      
  
      if (req.files['images']) {
        const additionalImageUrls = [];
        for (const file of req.files['images']) {
          const processedImageBuffer = await sharp(file.buffer)
            .rotate()
            .resize(800, 800, { fit: sharp.fit.inside, withoutEnlargement: true })
            .jpeg()
            .toBuffer();
          const processedImage = await storeImage(processedImageBuffer, 'image/jpeg');
          const imageUrl = `${process.env.BASE_URL}/images/${processedImage}.jpg`;
          additionalImageUrls.push(imageUrl);
        }
        updatedProduct.additionalImages = additionalImageUrls;
      } else if (req.body.existingAdditionalImages) {
        // If no new additional images are provided, use the existing additional image URLs
        updatedProduct.additionalImages = Array.isArray(req.body.existingAdditionalImages)
            ? req.body.existingAdditionalImages
            : [req.body.existingAdditionalImages];
        }
  
      await updatedProduct.save();
  
      res.status(200).json(updatedProduct);
    } catch (error) {
      const errorMessage = error.response ? (error.response.data.message || "Failed to update product.") : error.message;
      console.error('Failed to update product:', errorMessage);
      res.status(500).json({ error: 'Failed to update product' });
    }
});

router.get('/', async (req, res) => {
    try {
        const { status } = req.query;
        const query = {};

        if (status && ['approved', 'pending_approval', 'rejected'].includes(status)) {
            query.status = status;
        } else {
            query.status = 'approved';
        }

        const products = await MarketplaceProduct.find(query)
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