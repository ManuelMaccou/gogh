// node api/manuallyUploadImage.js

import sharp from 'sharp';
import axios from 'axios';
import Image from '../models/image.js';

import 'dotenv/config';
import mongoose from 'mongoose';

const imageUrl = 'https://aef8cbb778975f3e4df2041ad0bae1ca.cdn.bubble.io/f1713395429635x979624725198747300/Channel%20Specific%20Frames%20%2811%29.jpg';
// const baseUrl = 'http://localhost:5001';
const baseUrl = 'https://www.gogh.shopping';
// const mongoURI = process.env.MONGO_URI;
const mongoURI = process.env.PROD_MONGO_URI;

const connectDB = async () => {
  try {
    const connection = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      connectTimeoutMS: 10000, // Give up initial connection after 10 seconds
    });
    console.log('MongoDB Connected...');

  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};

connectDB();


async function storeImage(imageBuffer, contentType) {
    const image = new Image({
      data: imageBuffer,
      contentType,
    });
    await image.save();
    return image._id;
  }
  
  async function fetchImageBuffer(url) {
    const response = await axios({ url, responseType: 'arraybuffer' });
    return response.data;
  }
  
  async function processAndStoreFeaturedImageFromUrl(imageUrl, baseUrl) {
    try {
      const imageBuffer = await fetchImageBuffer(imageUrl);
      const processedImageBuffer = await sharp(imageBuffer)
        .rotate()
        .resize(800, 800, {
          fit: sharp.fit.inside,
          withoutEnlargement: true
        })
        .jpeg()
        .toBuffer();
  
      const imageName = await storeImage(processedImageBuffer, 'image/jpeg');
      const storedImageUrl = `${baseUrl}/images/${imageName}.jpg`; // Renamed variable here
  
      console.log(`Image successfully processed and stored: ${storedImageUrl}`);
      return storedImageUrl;
    } catch (error) {
      console.error('Error processing and storing image from URL:', error);
      throw new Error('Failed to process and store image from URL');
    }
  }
  
  // Automatically run the function without needing specific arguments
  async function main() {
    try {
      const resultUrl = await processAndStoreFeaturedImageFromUrl(imageUrl, baseUrl);
      console.log(`Image stored at: ${resultUrl}`);
    } catch (error) {
      console.error(error);
    }
  }
  
  main();