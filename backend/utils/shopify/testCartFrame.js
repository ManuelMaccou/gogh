import { writeFileSync } from 'fs';
import CreateCartFrame from './createCartFrame.js';
import 'dotenv/config';
import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const connection = await mongoose.connect(process.env.MONGO_URI, {
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

async function testOptionsFrame() {
    connectDB();

    // Sample product data
    const cartUrlParams = "47792663855405:2,47792663920941:3,47792625320237:1,47792580493613:7";


    try {
        const imageDataUrl = await CreateCartFrame(cartUrlParams);
        const base64Data = imageDataUrl.replace(/^data:image\/jpeg;base64,/, '');

        // Save the image as a file
        writeFileSync('output.jpg', base64Data, 'base64');
        console.log('Image saved as output.jpg');
    } catch (error) {
        console.error('Error generating image:', error);
    }
}

testOptionsFrame();
