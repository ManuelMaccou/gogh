
// This is the latest route for serving images with a .jpg ext.
// Evenutally move all images to this

import { Router } from 'express';
const router = Router();
import Image from '../models/image.js';

router.get('/:imageId.jpg', async (req, res) => {
    try {
        const { imageId } = req.params;
        const image = await Image.findById(imageId);

        if (!image) {
            return res.status(404).send('Image not found');
        }

        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        res.send(image.data); // Send the image data as the response
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

export default router;