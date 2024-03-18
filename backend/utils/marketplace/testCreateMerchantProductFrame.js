import { writeFileSync } from 'fs';
import createMarketplaceProductFrame from './createMarketplaceProductFrame.js';

async function testMerchantProuctFrame() {
    // Sample product data
    const title = "Burrow Nomad Modular Sectional with Ottoman and Chaise";
    const description = `
    Dive into the vibrant metaverse debut of 0xZara with the exclusive CAREFREE Poster. This high-quality print embodies the spirit of freedom and creativity that CAREFREE represents, bringing a piece of the digital realm into your physical space.

Features:

Vibrant Visuals: Capture the essence of 0xZara's groundbreaking song and music video with stunning, colorful artwork that brightens any room.

High-Quality Print: Premium paper ensures every detail is vivid, offering a visual spectacle of 0xZara's metaverse journey.
`;
    const location = "NYC";
    const price = "$100";
    const imageUrl = "https://www.gogh.shopping/images/65ea94634055968e1a66ca2a.jpg";



    try {
        const imageDataUrl = await createMarketplaceProductFrame(location, title, description, price, imageUrl);
        const base64Data = imageDataUrl.replace(/^data:image\/jpeg;base64,/, '');

        // Save the image as a file
        writeFileSync('output.jpg', base64Data, 'base64');
        console.log('Image saved as output.jpg');
    } catch (error) {
        console.error('Error generating image:', error);
    }
}

testMerchantProuctFrame();
