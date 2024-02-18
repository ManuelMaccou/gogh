import { writeFileSync } from 'fs';
import conceptGenerateProductImage from './concept-imageGenerator.js';

async function conceptTestGenerateProductImage() {
    // Sample product data
    const productData = {
        image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Cat03.jpg/481px-Cat03.jpg',
        title: 'Farcaster + [Your Handle] Tee',
    };

    try {
        const imageDataUrl = await conceptGenerateProductImage(productData);
        const base64Data = imageDataUrl.replace(/^data:image\/jpeg;base64,/, '');

        // Save the image as a file
        writeFileSync('output.jpg', base64Data, 'base64');
        console.log('Image saved as output.jpg');
    } catch (error) {
        console.error('Error generating image:', error);
    }
}

conceptTestGenerateProductImage();
