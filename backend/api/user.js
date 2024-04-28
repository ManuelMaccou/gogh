import { Router } from 'express';
import auth from '../middleware/auth.js';
import User from '../models/user.js';
import MarketplaceProduct from '../models/marketplace/product.js'
import pkg from 'jsonwebtoken';

const router = Router();
const { sign: jwtSign } = pkg;

router.post('/create', auth, async (req, res) => {
    const userData = req.body;
    
    if (!userData) {
        return res.status(400).json({ message: "Missing user data" });
    }

    try {
        const privyId = userData.privyId;

        let user = await User.findOne({ privyId: privyId });

        if (!user) {
            try {
                user = new User({
                    privyId: userData.privyId,
                    fid: userData.fid,
                    fc_username: userData.fc_username,
                    fc_fname: userData. fc_fname,
                    fc_pfp: userData.fc_pfp,
                    fc_url: userData.fc_url,
                    fc_bio: userData.fc_bio,
                    walletAddress: userData.walletAddress,
                });
    
                await user.save();
                return res.status(201).json({ user, message: "User created successfully" });
            } catch (saveError) {
                console.error('Error saving new user:', saveError.message);
                return res.status(500).json({ message: "Error saving new user" });
            }
        } else {
            return res.status(200).json({ user, message: "User already exists" });
        }

    } catch (error) {
        console.error('Error handling Privy login:', error.message);
        res.status(500).send("Server error");
    }
});

router.post('/lookup', auth, async (req, res) => {
    const { privyId, fc_username, fc_fname, fc_bio } = req.body;
    const userIdFromToken = req.user;

    try {
        let user = await User.findOne({ privyId: privyId });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Ensure the user from the token is the same as the user being updated
        if (user.privyId.toString() !== userIdFromToken) {
            return res.status(403).json({ message: 'Unauthorized to update this user' });
        }

        const updatedUser = await User.findByIdAndUpdate(user._id, { fc_username, fc_fname, fc_bio }, { new: true });

        res.json(updatedUser);
    } catch (error) {
        console.error('Error fetching user details:', error.message);
        res.status(500).send('Server error');
    }
});

router.get('/purchases', auth, async (req, res) => {
    const userIdFromToken = req.user;

    try {
      const user = await User.findOne({ privyId: userIdFromToken }) 
        .populate({
            path: 'marketplaceProductPurchases',
            populate: {
                path: 'marketplaceProduct',
                model: 'MarketplaceProduct',
            }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
      
      res.json(user.marketplaceProductPurchases);
    } catch (error) {
      console.error("Failed to get transactions:", error);
      res.status(500).send("Internal Server Error");
    }
});

router.get('/listings', auth, async (req, res) => {
    const userIdFromToken = req.user;

    try {
      const user = await User.findOne({ privyId: userIdFromToken }).exec();
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
      const marketplaceProductListings = await MarketplaceProduct.find({user : user.id})
    
      res.json(marketplaceProductListings);
    } catch (error) {
      console.error("Failed to get transactions:", error);
      res.status(500).send("Internal Server Error");
    }
});

router.get('/listings/single/:productId', auth, async (req, res) => {
    const userIdFromToken = req.user;
    const productId = req.params.productId;
     

    try {
      const user = await User.findOne({ privyId: userIdFromToken }).exec();
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
      const product = await MarketplaceProduct.findOne({ _id: productId })
    
      res.json(product);
    } catch (error) {
      console.error("Failed to get transactions:", error);
      res.status(500).send("Internal Server Error");
    }
});

export default router;
