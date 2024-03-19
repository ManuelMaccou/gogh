import { writeFileSync } from 'fs';
import createMarketplaceProductFrame from './createMarketplaceProductFrame.js';

async function testMerchantProuctFrame() {
    // Sample product data
    const title = "Burrow Nomad Modular Sectional with Ottoman and Chaise";
    const description = "Well-maintained Burrow Nomad King Sectional with sloped arms + ottoman and chaise! 40% the MSRP of $3100+ from Burrow. Just got it professionally cleaned a few weeks ago including Scotchgard which makes it even more stain resistant. Completely modular so pieces can be added, removed, or rearranged as necessary. Comfortably fits 4 people but can squeeze in a couple more for movie nights. The back cushions can also be flipped for a non-tufted look. Also comes with an extra seat cushion if you want to remove the chaise (or if one gets damaged). Pickup in elevator building in SoHo preferred (easy to move since it’s modular) but delivery can be arranged for a fee.";
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
