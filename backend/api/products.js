import { Router } from 'express';
import Product from '../models/product.js';
import User from '../models/user.js';
import Image from '../models/image.js';
import Merchant from '../models/merchant.js';
import Store from '../models/store.js';
import pkg from 'jsonwebtoken';
import auth from '../middleware/auth.js';
import generateProductImage from '../utils/productImageGenerator.js';
import generateDescriptionImage from '../utils/descriptionImageGenerator.js';

const router = Router();
const { verify } = pkg;

const findMerchantByUserId = async (userId) => {
  return Merchant.findOne({ user: userId }).populate('user');
};

async function storeImage(imageBuffer, contentType) {
  const image = new Image({
    data: imageBuffer,
    contentType: contentType,
  });
  await image.save();
  return image._id; // Returns the MongoDB ID of the saved image
}

// Fetch products related to the current user's store
router.get('/', async (req, res) => {
  try {
      const token = req.headers.authorization.split(' ')[1]; // Bearer Token
      const decoded = verify(token, process.env.JWT_SECRET);
      const userId = decoded.userId;

      // Find the merchant associated with the user
      const merchant = await Merchant.findOne({ user: userId });
      if (!merchant) {
          return res.status(404).json({ message: "Merchant not found." });
      }

      // Find the store associated with the merchant
      const store = await Store.findOne({ storeAdmin: merchant._id }).populate('products');
      if (!store) {
          return res.status(404).json({ message: "Store not found." });
      }

      // Return the products associated with the store
      res.json(store.products);
  } catch (error) {
      console.log("Error fetching products:", error);
      res.status(500).json({ message: "Error fetching products." });
  }
});

// POST route to add a new product
router.post('/add', auth, async (req, res) => {
  try {
    const productData = req.body;
    console.log("Received product data:", productData.image);

    let generatedProductImage, generatedDescriptionImage;

    try {
      const generatedProductImageBuffer = await generateProductImage(productData);
      const productImageId = await storeImage(generatedProductImageBuffer, 'image/jpeg');

      generatedProductImage = `${req.protocol}://${req.headers.host}/image/${productImageId}`;
    } catch (error) {
      console.error("Error generating product image:", error);
    } 

    try {
      const generatedDescriptionImageBuffer = await generateDescriptionImage(productData);
      const descriptionImageId = await storeImage(generatedDescriptionImageBuffer, 'image/jpeg');

      generatedDescriptionImage = `${req.protocol}://${req.headers.host}/image/${descriptionImageId}`;
    } catch (error) {
      console.error("Error generating description image:", error);
    }

    productData.productFrame = generatedProductImage;
    productData.descriptionFrame = generatedDescriptionImage;

    if (productData.productFrame && productData.descriptionFrame) {
    } else {
      console.error("Product or description frame generation failed.");
    }

    const newProduct = new Product(productData);

    await newProduct.save();

    // Extract user ID from JWT token
    const token = req.headers.authorization.split(' ')[1];
    const decoded = verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    const merchant = await findMerchantByUserId(userId);
        if (!merchant) {
            return res.status(404).json({ message: "Merchant not found" });
        }

    const store = await Store.findOne({ storeAdmin: merchant._id });
    if (!store) {
      return res.status(404).send('Store not found.');
    }

    // Add product ID to user's products array
    await Store.findByIdAndUpdate(store._id, { $push: { products: newProduct._id } });

    res.status(201).send(newProduct);
  } catch (err) {
    console.error('Error in POST /api/products/add:', err);
    res.status(500).send(err.message);
  }
});

router.put('/update/:productId', auth, async (req, res) => {
  const { productId } = req.params;
  const productData = req.body;
  
  try {
    let generatedProductImage, generatedDescriptionImage;

    try {
      const generatedProductImageBuffer = await generateProductImage(productData);
      const productImageId = await storeImage(generatedProductImageBuffer, 'image/jpeg');

      generatedProductImage = `${req.protocol}://${req.headers.host}/image/${productImageId}`;
    } catch (error) {
      console.error("Error generating product image:", error);
      return res.status(500).send("Error generating product image");
    }

    try {
      const generatedDescriptionImageBuffer = await generateDescriptionImage(productData);
      const descriptionImageId = await storeImage(generatedDescriptionImageBuffer, 'image/jpeg');

      generatedDescriptionImage = `${req.protocol}://${req.headers.host}/image/${descriptionImageId}`;
    } catch (error) {
      console.error("Error generating description image:", error);
      return res.status(500).send("Error generating description image");
    }

    // Update the product data with the new image URLs
    productData.productFrame = generatedProductImage;
    productData.descriptionFrame = generatedDescriptionImage;

    const updatedProduct = await Product.findByIdAndUpdate(productId, productData, { new: true });

    if (!updatedProduct) {
      return res.status(404).send("Product not found");
    }

    res.json(updatedProduct);
  } catch (error) {
    console.error('Error in PUT /api/products/update:', error);
    res.status(500).send("Server error");
  }
});

router.delete('/delete/:productId', auth, async (req, res) => {
  try {
    const productId = req.params.productId;
    const userId = req.user;

    // Verify ownership and delete products
    const product = await Product.findOne({ _id: productId, user: userId });
        if (!product) {
            return res.status(403).json({ message: "Unauthorized action or product not found" });
        }

    // Delete the product from the Product collection
    await Product.deleteOne({ _id: productId });

    // Remove product ID from user's products array
    await User.findByIdAndUpdate(userId, { $pull: { products: productId } });

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/products/delete:', error);
    res.status(500).send('Server error');
  }
});

// Endpoint to handle redirection
router.get('/redirect/:productId', async (req, res) => {
  try {
      const productId = req.params.productId;
      const product = await Product.findById(productId);

      if (product && product.url) {
          return res.redirect(product.url);
      } else {
          return res.status(404).send('Product or URL not found');
      }
  } catch (err) {
      console.error('Error in GET /redirect/:productId', err);
      res.status(500).send('Internal Server Error');
  }
});

// Fetch user's products
router.get('/user-products', auth, async (req, res) => {
    try {
        const userId = req.user;
        if (!userId) {
          return res.status(400).json({ message: "User ID not found" });
        }
        const products = await Product.find({ user: userId });
        res.json(products);
    } catch (err) {
        res.status(500).send('Server error');
    }
});

router.get('/by-page/:pageId', async (req, res) => {
  try {
    // console.log(`Fetching products for page ID: ${req.params.pageId}`);
    const pageId = req.params.pageId;
    const user = await User.findOne({ pageId: pageId }).exec();
    if (!user) {
      // console.log(`User not found for page ID: ${pageId}`);
      return res.status(404).send('User not found');
    }

    // console.log(`User found: ${user._id}`);
    const products = await Product.find({ user: user._id }).exec();

    // console.log(`Number of products found: ${products.length}`);
    res.json(products);
  } catch (error) {
    console.error('Error in GET /api/products/by-page/:pageId:', error);
    res.status(500).send('Server error');
  }
});


export default router;
