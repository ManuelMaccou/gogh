import { Router } from 'express';
import auth from '../middleware/auth.js';
import auth_old from '../middleware/auth_old.js';
import axios from 'axios';
import User from '../models/user.js';
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
        const fid = userData.fid;
        const query = privyId ? { privyId } : { fid };

        let user = await User.findOne(query);

        if (!user) {
            user = new User({
                privyId: userData.privyId,
                fid: userData.fid,
                fc_username: userData.fc_username,
                fc_pfp: userData.fc_pfp,
                fc_profile: userData.fc_profile,
                walletAddress: userData.walletAddress,
            });
        } 
        await user.save();
        return res.status(201).json({ user, message: "User created successfully" });

    } catch (error) {
        console.error('Error handling Privy login:', error.message);
        res.status(500).send("Server error");
    }
});

router.post('/lookup', async (req, res) => {
    const userData = req.body;

    try {
        // Prefer privyId if available, fallback to fid otherwise
        const privyId = userData.privyId;
        const fid = userData.fid;
        const query = privyId ? { privyId } : { fid };

        let user = await User.findOne(query);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        console.error('Error fetching user details:', error.message);
        res.status(500).send('Server error');
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
                fc_profile: `https://warpcast.com/${fcUserData.username}`,
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
