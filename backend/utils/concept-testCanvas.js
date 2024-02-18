import { writeFileSync } from 'fs';
import conceptGenerateProductImage from './concept-imageGenerator.js';

async function conceptTestGenerateProductImage() {
    // Sample product data
    const productData = {
        image: 'https://imgproxy.fourthwall.com/sA58xK2dBmyeNqYKXZgbNktEkT_9tgEzSmGUSatzvoU/w:720/sm:1/aHR0cHM6Ly9zdG9y/YWdlLmdvb2dsZWFw/aXMuY29tL2Nkbi5m/b3VydGh3YWxsLmNv/bS9jdXN0b21pemF0/aW9uL3NoXzc0ZWQ5/NjQzLWU3ZjItNGM0/ZS1iZWI3LTU5YTk5/NGYxYjlkYi85YzVl/ZWQ5Mi0yMGVjLTQx/N2QtYjNjYS1jOWM5/ZGViZTQ5ZmQuanBl/Zw.webp',
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
