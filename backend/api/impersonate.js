import { Router } from 'express';
import auth from '../middleware/auth.js';
import pkg from 'jsonwebtoken';
import User from '../models/user.js';

const router = Router();
const { sign } = pkg;

router.post('/', auth, async (req, res) => {
    const { targetFid } = req.body;
    const adminUser = await User.findById(req.user);

    if (!adminUser || adminUser.fid !== "8587") {
        return res.status(403).json({ message: "Access denied" });
    }

    const targetUser = await User.findOne({ fid: targetFid });
    if (!targetUser) {
        return res.status(404).json({ message: "Target user not found." });
    }

    const token = sign({ userId: targetUser.id }, process.env.JWT_SECRET, { expiresIn: '48h' });
    res.json({ token, redirect: '/manage-store' });
});

export default router;