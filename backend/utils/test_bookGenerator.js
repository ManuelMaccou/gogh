import { writeFileSync } from 'fs';
import GenerateBookImage from './bookImageGenerator.js';

async function testGenerateBookImage() {
    // Sample product data
    const productData = {
        description: "The definitive biography of the SpaceX and Tesla CEO, offering an unparalleled look into the life of one of the most innovative and influential figures of our time. Based on extensive interviews and firsthand observations, Isaacson captures Musk's complex personality, his professional highs and lows, and his visionary ambitions to advance human technology and exploration.",
        imageUrl: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1348961035i/5449798.jpg"
    };
    const backgroundImageUrl = 'files/frame_description_bg_dark.png';


    try {
        const imageDataUrl = await GenerateBookImage(productData, backgroundImageUrl);
        const base64Data = imageDataUrl.replace(/^data:image\/jpeg;base64,/, '');

        // Save the image as a file
        writeFileSync('output.jpg', base64Data, 'base64');
        console.log('Image saved as output.jpg');
    } catch (error) {
        console.error('Error generating image:', error);
    }
}

testGenerateBookImage();
