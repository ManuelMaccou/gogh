import { Router } from 'express';
import auth from '../middleware/auth.js';
import auth_old from '../middleware/auth_old.js';
import axios from 'axios';
import User from '../models/user.js';
import pkg from 'jsonwebtoken';
import MarketplaceProduct from '../models/marketplace/product.js';

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
    const { privyId, fc_username, fc_bio } = req.body;
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

        const updatedUser = await User.findByIdAndUpdate(user._id, { fc_username, fc_bio }, { new: true });

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
      const marketplaceProductListings = await MarketplaceProduct.find({user : user.id}).populate({
        path: 'transactions',
        model: 'MarketplaceTransaction',
      })
    .exec();
      res.json(marketplaceProductListings);
    } catch (error) {
      console.error("Failed to get transactions:", error);
      res.status(500).send("Internal Server Error");
    }
});

router.get('/', auth_old, async (req, res) => {
    try {
        const user = await User.findById(req.user);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        console.error('Error fetching user details:', error.message);
        res.status(500).send('Server error');
    }
});

router.post('/farcaster_login', async (req, res) => {
    const { signer_uuid, fid } = req.body;

    if (!signer_uuid || !fid) {
        return res.status(400).json({ message: "Missing signer_uuid or fid" });
    }

    try {
        // Fetch user details from Neynar API
        const neynarUrl = `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`;
        const neynarOptions = {
            method: 'GET',
            headers: { accept: 'application/json', api_key: process.env.NEYNAR_API_KEY }
        };

        const neynarResponse = await axios(neynarUrl, neynarOptions);
        const neynarData = neynarResponse.data;

        let user = await User.findOne({ fid });

        // If user not found, create a new user
        if (!user && neynarData && neynarData.users && neynarData.users.length > 0) {
            const fcUserData = neynarData.users[0];

            // Create a new user with data from Neynar API
            user = new User({
                fid,
                fc_username: fcUserData.display_name,
                fc_pfp: fcUserData.pfp_url,
                fc_url: `https://warpcast.com/${fcUserData.username}`,
                signer_uuid
            });

            await user.save();
        } else if (user) {
            const fcUserData = neynarData.users[0];
            
            user.fc_username = fcUserData.display_name;
            user.fc_pfp = fcUserData.pfp_url;
            await user.save();
        }

        const token = jwtSign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '48h' });

        // Update signer_uuid if it has changed
        if (user.signer_uuid !== signer_uuid) {
            user.signer_uuid = signer_uuid;
            await user.save();
        }

        res.json({ token, message: "Login successful" });

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server error");
    }
});

export default router;
