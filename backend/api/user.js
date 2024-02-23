import { Router } from 'express';
import User from '../models/user.js';
import pkg from 'jsonwebtoken';
import Merchant from '../models/merchant.js';

const router = Router();
const { sign: jwtSign } = pkg;

router.post('/farcaster_login', async (req, res) => {
    const { signer_uuid, fid } = req.body;
    console.log(signer_uuid);

    if (!signer_uuid || !fid) {
        return res.status(400).json({ message: "Missing signer_uuid or fid" });
    }

    try {
        let user = await User.findOne({ fid });

        if (!user) {
            // If the user does not exist, no need to check for merchant status
            return res.status(404).json({ message: "Apply to be a merchant by DMing @manuelmaccou.eth on Warpcast" });
        }

        // Check if a merchant exists for this user, if not create one
        let merchant = await Merchant.findOne({ user: user._id });
        let redirect = '/manage-store';

        if (merchant && merchant.merchantId.startsWith('spfy')) {
            redirect = '/manage-shopify-store';
        
        } else {
            if (!merchant) {
                const highestMerchant = await Merchant.findOne().sort('-merchantId');
                const nextMerchantId = highestMerchant ? parseInt(highestMerchant.merchantId, 10) + 1 : 1;

                merchant = new Merchant({
                    merchantId: nextMerchantId.toString(),
                    user: user._id
                });
                redirect = '/manage-store'
                await merchant.save();
            }
        }

        const token = jwtSign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '48h' });

        // Update signer_uuid if it has changed
        if (user.signer_uuid !== signer_uuid) {
            user.signer_uuid = signer_uuid;
            await user.save();
        }

        res.json({ token, message: "Login successful", redirect: redirect });

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server error");
    }
});

export default router;
