import { Router } from 'express';
import Image from '../models/image.js';

const router = Router();

router.get('/:imageId', async (req, res) => {
    try {
      const image = await Image.findById(req.params.imageId);
      if (!image) {
        return res.status(404).send('Image not found');
      }
      res.type(image.contentType);
      res.send(image.data);
    } catch (error) {
      console.error("Failed to serve image:", error);
      res.status(500).send('Error serving image');
    }
  });
  

export default router;
