import { writeFileSync } from 'fs';
import GenerateDescriptionImage from './descriptionImageGenerator.js';

async function testGenerateDescriptionImage() {
    // Sample product data
    const productData = {
        description: "<p>Discover the duality of scents with this 6 Tealight Sampler Pack! Choose your three most dynamic fragrances to fill your home with a unique scent experience. These tealights will have your space feeling balanced, regardless of your life's current duality.</p>",
        price: "$100"
    };
    const backgroundImageUrl = 'files/frame_description_bg_dark.png';


    try {
        const imageDataUrl = await GenerateDescriptionImage(productData, backgroundImageUrl);
        const base64Data = imageDataUrl.replace(/^data:image\/jpeg;base64,/, '');

        // Save the image as a file
        writeFileSync('output.jpg', base64Data, 'base64');
        console.log('Image saved as output.jpg');
    } catch (error) {
        console.error('Error generating image:', error);
    }
}

testGenerateDescriptionImage();
