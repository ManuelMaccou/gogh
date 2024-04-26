// node utils/marketplace/testCreateMerchantProductFrame.js 

import { writeFileSync } from 'fs';
import createMarketplaceProductFrame from './createMarketplaceProductFrame.js';

async function testMerchantProuctFrame() {
    // Sample product data
    const title = "This will be a title that takes up three lines on the canvas";
    const description = "Here is a long test description about an art product. It is a physical print by an artist who lives in Paris, France.They were motivated by the rap song, From Paris with Love by Jay-Z. NOICE. Here is a long test description about an art product. It is a physical print by an artist who lives in Paris, France.They were motivated by the rap song, From Paris with Love by Jay-Z. NOICE. Here is a long test description about an art product. It is a physical print by an artist who lives in Paris, France.They were motivated by the rap song, From Paris with Love by Jay-Z. NOICE.";
    const location = "NYC";
    const price = "100";
    const imageUrl = "https://www.gogh.shopping/images/65ea94634055968e1a66ca2a.jpg";
    const shipping = true;



    try {
        const imageDataUrl = await createMarketplaceProductFrame(location, shipping, title, description, price, imageUrl);
        const base64Data = imageDataUrl.replace(/^data:image\/jpeg;base64,/, '');

        // Save the image as a file
        writeFileSync('output.jpg', base64Data, 'base64');
        console.log('Image saved as output.jpg');
    } catch (error) {
        console.error('Error generating image:', error);
    }
}

testMerchantProuctFrame();
