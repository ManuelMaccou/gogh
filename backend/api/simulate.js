import { Router } from 'express';
import auth from '../middleware/auth.js';
import pkg from 'jsonwebtoken';
import User from '../models/user.js';
import auth_old from '../middleware/auth_old.js';

const router = Router();
const { sign } = pkg;

router.post('/', auth_old, async (req, res) => {
    const { targetFid } = req.body;
    const adminId = process.env.ADMIN_ID
    const adminUser = await User.findById(req.user);

    if (!adminUser || adminUser.fid !== adminId) {
        return res.status(403).json({ message: "Access denied" });
    }

    const targetUser = await User.findOne({ fid: targetFid });
    if (!targetUser) {
        return res.status(404).json({ message: "Target user not found." });
    }

    // Consider adding additional security checks or logging here
    const token = sign({ userId: targetUser.id }, process.env.JWT_SECRET, { expiresIn: '48h' });

    res.json({ token, redirect: '/manage-store' });
});

export default router;
