import { writeFileSync } from 'fs';
import GenerateProductImage from './concept-descriptionGenerator.js';

async function conceptGenerateDescriptionImage() {
    // Sample product data
    const productData = {
        description: "<p>This t-shirt is everything you've dreamed of and more. It feels soft and lightweight, with the right amount of stretch. It's comfortable and flattering for all.<br><br>&bull; 100% combed and ring-spun cotton (Heather colors contain polyester)<br>&bull; Fabric weight: 4.2 oz/yd&sup2; (142 g/m&sup2;)<br>&bull; Pre-shrunk fabric<br>&bull; Side-seamed construction<br>&bull; Shoulder-to-shoulder taping<br>&bull; Blank product sourced from Guatemala, Nicaragua, Mexico, Honduras, or the US<br><br>This product is made especially for you as soon as you place an order, which is why it takes us a bit longer to deliver it to you. Making products on demand instead of in bulk helps reduce overproduction, so thank you for making thoughtful purchasing decisions!</p>",
        price: "$100"
    };
    const backgroundImageUrl = 'files/frame_description_bg_dark.png';

    try {
        const imageDataUrl = await GenerateProductImage(productData, backgroundImageUrl);
        const base64Data = imageDataUrl.replace(/^data:image\/jpeg;base64,/, '');

        // Save the image as a file
        writeFileSync('output.jpg', base64Data, 'base64');
        console.log('Image saved as output.jpg');
    } catch (error) {
        console.error('Error generating image:', error);
    }
}

conceptGenerateDescriptionImage();
