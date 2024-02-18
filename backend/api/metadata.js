import { Router } from 'express';
import User from '../models/user.js';

const router = Router();

// Route to get metadata based on uniqueId
router.get('/metadata/:uniqueId', async (req, res) => {
    try {
        const uniqueId = req.params.uniqueId;
        const user = await User.findOne({ pageId: uniqueId })

        if (!user || !user.framesMeta) {
            return res.status(404).send('Metadata not found');
        }

        res.json(user);
    } catch (err) {
        console.error('Error in GET /metadata/:uniqueId:', err);
        res.status(500).send('Server error');
    }
});

export default router;