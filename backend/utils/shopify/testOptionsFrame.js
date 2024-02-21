import { writeFileSync } from 'fs';
import CreateOptionsFrame from './createOptionsFrame.js';

async function testOptionsFrame() {
    // Sample product data
    const variant = {
        title: "Farcaster + [Your Handle] Tee",
        description: "<p>Discover the duality of scents with this 6 Tealight Samnopler Pack! Choose your three most dynamic fragrances to fill your home with a unique scent experience. These tealights will have your space feeling balanced, regardless of your life's current duality.</p>",
        price: "$100",
        image: "https://swagcaster.xyz/cdn/shop/files/knit-beanie-black-front-6529f4e79f317_1024x1024@2x.jpg?v=1697248497"
    };


    try {
        const imageDataUrl = await CreateOptionsFrame(variant);
        const base64Data = imageDataUrl.replace(/^data:image\/jpeg;base64,/, '');

        // Save the image as a file
        writeFileSync('output.jpg', base64Data, 'base64');
        console.log('Image saved as output.jpg');
    } catch (error) {
        console.error('Error generating image:', error);
    }
}

testOptionsFrame();
