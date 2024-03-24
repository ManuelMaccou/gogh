import { writeFileSync } from 'fs';
import CreateProductFrame from './createProductFrame.js';

async function testProuctFrame() {
    // Sample product data
    const productData = {
        title: "Farcaster + [Your Handle] Tee",
        description: "<p>Discover the duality of scents with this 6 Tealight Sampler Pack! Choose your three most dynamic fragrances to fill your home with a unique scent experience. These tealights will have your space feeling balanced, regardless of your life's current duality.</p>",
        price: "$100",
        image: "https://swagcaster.xyz/cdn/shop/products/unisex-long-sleeve-tee-black-left-front-63d6dbe40f762.jpg?v=1675025401&width=1426"
    };


    try {
        const imageDataUrl = await CreateProductFrame(productData);
        const base64Data = imageDataUrl.replace(/^data:image\/jpeg;base64,/, '');

        // Save the image as a file
        writeFileSync('output.jpg', base64Data, 'base64');
        console.log('Image saved as output.jpg');
    } catch (error) {
        console.error('Error generating image:', error);
    }
}

testProuctFrame();
