import { Router } from 'express';
import auth from '../middleware/auth.js';
import Store from '../models/store.js';
import Merchant from '../models/merchant.js';

const router = Router();

const findMerchantByUserId = async (userId) => {
    return Merchant.findOne({ user: userId }).populate('user');
};

router.get('/get-page-id', auth, async (req, res) => {
    try {
        const userId = req.user;
        const merchant = await findMerchantByUserId(userId);

        if (!merchant) {
            return res.status(404).json({ message: "Merchant not found" });
        }

        const store = await Store.findOne({ storeAdmin: merchant._id });
        if (!store) {
            return res.status(404).json({ message: "Store not found" });
        }

        res.json({ pageId: store.pageId });
    } catch (err) {
        console.error('Error in /get-page-id:', err);
        res.status(500).send('Server error');
    }
});

router.get('/check-page-status', auth, async (req, res) => {
    try {
        const userId = req.user;
        const merchant = await findMerchantByUserId(userId);

        if (!merchant) {
            return res.status(404).send('Merchant not found');
        }

        const store = await Store.findOne({ storeAdmin: merchant._id });
        const hasPage = store && store.pageId && store.pageHtml ? true : false;

        const response = {
            hasPage: hasPage,
            pageId: hasPage ? store.pageId : null,
            pageHtml: hasPage ? store.pageHtml : null,
        };

        res.json(response);
    } catch (err) {
        console.error('Error in /check-page-status:', err);
        res.status(500).send('Server error');
    }
});

router.get('/check-merchant-status', auth, async (req, res) => {
    const userId = req.user;

    try {
        const merchant = await findMerchantByUserId(userId);

        if (!merchant) {
            return res.status(404).json({ success: false, message: "Merchant not found" });
        }

        const stores = await Store.find({ storeAdmin: merchant._id });
        const hasStore = stores.length > 0;

        res.json({
            success: true,
            hasStore: stores.length > 0,
            stores
        });
    } catch (error) {
        console.error("Error checking merchant status:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});

export default router;
