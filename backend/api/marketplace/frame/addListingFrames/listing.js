// https://www.gogh.shopping/marketplace/add/listing

// NEW https://www.gogh.shopping/marketplace/add-listing/art

import { Router } from 'express';
import { validationResult } from 'express-validator';
import validateMessage from '../../../../utils/validateFrameMessage.js';
import { v4 as uuidv4 } from 'uuid';
import { client } from '../../../../redis.js';

const router = Router();

const categoryImages = {
    art: {
        images: [
            'https://www.gogh.shopping/images/66227d21ff6a2532fb8ed6ee.jpg',
            'https://www.gogh.shopping/images/66204b858aab7609d2dc525d.jpg',
            'https://www.gogh.shopping/images/66204f276835f247c9646d81.jpg',
            'https://www.gogh.shopping/images/66204e66cdcd338a3eaff898.jpg',
            'https://www.gogh.shopping/images/662050e766d905e9ae844f26.jpg',
            'https://www.gogh.shopping/images/66205263107c6d940c9a47c1.jpg',
            'https://www.gogh.shopping/images/6620537edc93915720418b8e.jpg',
            'https://www.gogh.shopping/images/6620557eb386c6bce971e6ff.jpg'
        ],
        explainImage: 'https://www.gogh.shopping/images/66095f362cd09738f3c3e73c.jpg',
        inputErrorImage: 'https://www.gogh.shopping/images/66095ef9392e8d62c5bb1c2d.jpg',
    },

    default: {
        images: [
            'https://www.gogh.shopping/images/66095d9bc857af0c21f8f7d8.jpg',
            'https://www.gogh.shopping/images/66095dd9469ada57b203afeb.jpg',
            'https://www.gogh.shopping/images/66095e064fc27b682c24f728.jpg',
            'https://www.gogh.shopping/images/66095e33962afe7376a582b8.jpg',
            'https://www.gogh.shopping/images/66204a4b139c9a979472820e.jpg',
            'https://www.gogh.shopping/images/66095e5fe423199a5cfd195a.jpg',
            'https://www.gogh.shopping/images/66095e809390148e1605b39a.jpg',
            'https://www.gogh.shopping/images/66095ea7fcb5dad5fbd73df8.jpg'
        ],
        explainImage: 'https://www.gogh.shopping/images/66095f362cd09738f3c3e73c.jpg',
        inputErrorImage: 'https://www.gogh.shopping/images/66095ef9392e8d62c5bb1c2d.jpg'
    }
};
  
const categoryMeta = {
    art: `${process.env.BASE_URL}/marketplace/add-listing/art?step=1`,
    default: `${process.env.BASE_URL}/marketplace/add-listing/default?step=1`
};

router.get('/:category', async (req, res) => {

    const category = req.params.category || 'default';
    const categoryData = categoryImages[category] || categoryImages['default'];
    const images = categoryData.images;
    const postUrl = categoryMeta[category] || categoryMeta['default'];

    const htmlResponse = `
    <!DOCTYPE html>
    <html>
        <head>
        <title>Gogh Marketplace - ${category}</title>
            <meta name="description" content="Sell your ${category} items locally with Gogh">
            <meta property="og:url" content="${process.env.BASE_URL}/marketplace/add-listing/${category}">
            <meta property="og:image" content="${images[0]}" />
            <meta property="fc:frame" content="vNext" />
            <meta property="fc:frame:post_url" content="${postUrl}" />
            <meta property="fc:frame:image" content="${images[0]}">
            <meta property="fc:frame:image:aspect_ratio" content="1.91:1" />
            <meta property="fc:frame:input:text" content="City and state/country" />
            <meta property="fc:frame:button:1" content="Continue" />
            <meta property="fc:frame:button:2" content="FAQ" />
        </head>
    </html>
    `;

        res.status(200).send(htmlResponse);
});


router.post('/:category', async (req, res) => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const category = req.params.category || 'default';
    const categoryData = categoryImages[category] || categoryImages['default'];
    const newListingFrameImgs = categoryData.images;
    const explainImage = categoryData.explainImage;
    const inputErrorImage = categoryData.inputErrorImage;

    let { step, inputError, explain } = req.query;

    const isProduction = process.env.NODE_ENV === 'production';

    let buttonIndex, inputText, verifiedAddresses;
    if (isProduction) {
        
        try {
            const messageBytes = req.body.trustedData.messageBytes;
            const validatedFrameData = await validateMessage(messageBytes);

            buttonIndex = validatedFrameData.action?.tapped_button?.index;
            verifiedAddresses = validatedFrameData.action?.interactor?.verified_addresses?.eth_addresses;
            inputText = validatedFrameData.action?.input?.text;

        } catch (error) {
            console.error('Error validating message:', error);
            return res.status(500).send('An error occurred during message validation.');
        }
    } else {
        buttonIndex = req.body.untrustedData.buttonIndex;
        inputText = req.body.untrustedData.inputText;
        verifiedAddresses = req.body.untrustedData.verified_addresses.eth_addresses;
    }

    let sessionId = req.query.sessionId || uuidv4();

    try {

        let existingData = await client.get(sessionId).catch(err => {
            console.error('Error retrieving data from Redis:', err);
            throw new Error('Failed to retrieve session data');
        });

        let redisData = existingData ? JSON.parse(existingData) : {};
       
        if (inputError !== "true" && explain !== "true") {

            if (step === '1') {
                if (buttonIndex === 1 && inputText) { // continue
                    redisData.location = inputText;
                    step = '2';

                } else if (!inputText && buttonIndex === 1) {
                    inputError = "true";

                } else if (buttonIndex === 2) {
                    explain = "true";
                }

            } else if (step === '2') {
                if (buttonIndex === 1) { // back
                    step = '1';

                } else if (buttonIndex === 2 && inputText) {
                    redisData.title = inputText;
                    step = '3';

                } else if (!inputText && buttonIndex === 2) {
                    inputError = "true";
                }

            } else if (step === '3') {
                if (buttonIndex === 1) { // back
                    step = '2';

                } else if (buttonIndex === 2 && inputText) {
                    redisData.description = inputText;
                    step = '4';

                } else if (!inputText && buttonIndex === 2) {
                    inputError = "true";
                }

            } else if (step === '4') {
                if (buttonIndex === 1) { // back
                    step = '3'

                } else if (buttonIndex === 2 && inputText) {
                    redisData.price = inputText;
                    step = '5'
                    
                } else if (!inputText && buttonIndex === 2) {
                    inputError = "true";
                }

            } else if (step === '5') {
                if (buttonIndex === 1) {
                    redisData.shipping = "false";
                    step = '6'
                    

                } else if (buttonIndex === 2) {
                    redisData.shipping = "true";
                    step = '6'

                } else if (buttonIndex === 3) { // back
                    step = '4'
                }

            } else if (step === '6') {
                if (buttonIndex === 1) { // back
                    step = '5';

                } else if (buttonIndex === 2 && inputText) {
                    redisData.walletAddress = inputText;
                    step = '7';

                } else if (buttonIndex === 2 && !inputText) {
                    inputError = 'true';

                } else if (buttonIndex === 3 && verifiedAddresses[0]) {
                    redisData.walletAddress = verifiedAddresses[0];
                    step = '7';

                } else if (buttonIndex === 4 && verifiedAddresses[1]) {
                    redisData.walletAddress = verifiedAddresses[1];
                    step = '7';
                }

            } else if (step === '7') {
                if (buttonIndex === 1) { // back
                    step = '6'

                } else if (buttonIndex === 2 && inputText) {
                    redisData.email = inputText;
                    step = '8'
                    
                } else if (!inputText && buttonIndex === 2) {
                    inputError = "true";
                }
                
            } else if (step === '8') {
                if (buttonIndex === 1) { // back
                    step = '7'
                }
            }
        } else { // Either inputError or explain is true
            if (buttonIndex === 1) {
                inputError = "";
                explain = "";
            }
        }

        await client.set(sessionId, JSON.stringify(redisData), {
            EX: 3600 // Expires in 3600 seconds (1 hour)
        }).catch(err => {
            console.error('Error saving data to Redis:', err);
            throw new Error('Failed to save session data');
        }); 

        console.log('redisData:', redisData);

    res.status(200).send(generateFrameHtml(newListingFrameImgs, explainImage, inputErrorImage, verifiedAddresses, redisData, sessionId, step, inputError, explain, category));

    } catch (error) {
        console.error('Failed to generate frame HTML:', error.response || error);
        res.status(500).json({ message: 'Failed to share product' });
    }
});

function generateFrameHtml(newListingFrameImgs, explainImage, inputErrorImage, verifiedAddresses, redisData, sessionId, step, inputError, explain, category) {
    const index = parseInt(step, 10) - 1;


    const listingFrame = newListingFrameImgs[Math.max(0, Math.min(index, newListingFrameImgs.length - 1))];
    let buttonsHtml;

    if (inputError === "true") {
        return `
        <!DOCTYPE html>
        <html>
            <head>
                <title>Gogh Marketplace</title>
                <meta name="description" content="Sell your items locally with Gogh" />
                <meta property="og:url" content="https://www.gogh.shopping" />
                <meta property="fc:frame:post_url" content="${process.env.BASE_URL}/marketplace/add-listing/${category}?step=${step}&sessionId=${sessionId}&inputError=${inputError}&explain=${explain}" />
                <meta property="fc:frame" content="vNext" />
                <meta property="fc:frame:image:aspect_ratio" content="1.91:1" />
                <meta property="fc:frame:image" content="${inputErrorImage}" />
                <meta property="fc:frame:button:1" content="Back" />
            </head>
        </html>
        `;
    } else if (explain === "true") {
        return `
        <!DOCTYPE html>
        <html>
            <head>
                <title>Gogh Marketplace</title>
                <meta name="description" content="Sell your items locally with Gogh" />
                <meta property="og:url" content="https://www.gogh.shopping" />
                <meta property="fc:frame:post_url" content="${process.env.BASE_URL}/marketplace/add-listing/${category}?step=${step}&sessionId=${sessionId}&inputError=${inputError}&explain=${explain}" />
                <meta property="fc:frame" content="vNext" />
                <meta property="fc:frame:image:aspect_ratio" content="1.91:1" />
                <meta property="fc:frame:image" content="${explainImage}" />
                <meta property="fc:frame:button:1" content="Back" />
            </head>
        </html>
        `;
    } else {

        switch (step) {
            case '1': // When the user hits explain and comes back on the first step
            buttonsHtml = `
                <meta property="fc:frame:image" content="${listingFrame}" />
                <meta property="fc:frame:input:text" content="Enter your location" />
                <meta property="fc:frame:button:1" content="Continue" />
                <meta property="fc:frame:button:2" content="FAQ" />
            `;
            break;

            case '2': // User shared location, now show them title frame
            buttonsHtml = `
                <meta property="fc:frame:image" content="${listingFrame}" />
                <meta property="fc:frame:input:text" content="The title of your work" />
                <meta property="fc:frame:button:1" content="Back" />
                <meta property="fc:frame:button:2" content="Continue" />
            `;
            break;

            case '3': // User entered title, now show description frame
            buttonsHtml = `
                <meta property="fc:frame:image" content="${listingFrame}" />
                <meta property="fc:frame:input:text" content="Description" />
                <meta property="fc:frame:button:1" content="Back" />
                <meta property="fc:frame:button:2" content="Continue" />
            `;
            break;

            case '4': // User entered description, now show price frame
            buttonsHtml = `
                <meta property="fc:frame:image" content="${listingFrame}" />
                <meta property="fc:frame:input:text" content="Enter a price in $USD" />
                <meta property="fc:frame:button:1" content="Back" />
                <meta property="fc:frame:button:2" content="Continue" />
            `;
            break;

            case '5': // User entered price, now show shipping frame
            buttonsHtml = `
                <meta property="fc:frame:image" content="${listingFrame}" />
                <meta property="fc:frame:button:1" content="No" />
                <meta property="fc:frame:button:2" content="Yes" />
                <meta property="fc:frame:button:3" content="Back" />
            `;
            break;

            case '6':
            if (!verifiedAddresses) {
                buttonsHtml = `
                    <meta property="fc:frame:image" content="${listingFrame}" />
                    <meta property="fc:frame:input:text" content="0x1234" />
                    <meta property="fc:frame:button:1" content="Back" />
                    <meta property="fc:frame:button:2" content="Continue" />

                `;
            } else if (verifiedAddresses[0] && !verifiedAddresses[1]) {
                buttonsHtml = `
                    <meta property="fc:frame:image" content="${listingFrame}" />
                    <meta property="fc:frame:input:text" content="0x1234" />
                    <meta property="fc:frame:button:1" content="Back" />
                    <meta property="fc:frame:button:2" content="Use custom" />
                    <meta property="fc:frame:button:3" content="${verifiedAddresses[0]}" />
                `;
            } else if (verifiedAddresses[1]) {
                buttonsHtml = `
                    <meta property="fc:frame:image" content="${listingFrame}" />
                    <meta property="fc:frame:input:text" content="0x1234" />
                    <meta property="fc:frame:button:1" content="Back" />
                    <meta property="fc:frame:button:2" content="Use custom" />
                    <meta property="fc:frame:button:3" content="${verifiedAddresses[0]}" />
                    <meta property="fc:frame:button:3" content="${verifiedAddresses[1]}" />
                `;
            }

            break;

            case '7': // User entered description, now show price frame
            buttonsHtml = `
                <meta property="fc:frame:image" content="${listingFrame}" />
                <meta property="fc:frame:input:text" content="Enter an email" />
                <meta property="fc:frame:button:1" content="Back" />
                <meta property="fc:frame:button:2" content="Continue" />
            `;
            break;

            case '8': // Confirms the price, now navigate to Gogh for picture

            const encodedLocation = encodeURIComponent(redisData.location || '');
            const encodedShipping = encodeURIComponent(redisData.shipping || '');
            const encodedTitle = encodeURIComponent(redisData.title || '');
            const encodedDescription = encodeURIComponent(redisData.description || '');
            const encodedPrice = encodeURIComponent(redisData.price || '');
            const encodedWalletAddress = encodeURIComponent(redisData.walletAddress || '');
            const encodedEmail = encodeURIComponent(redisData.email || '');

            buttonsHtml = `
                <meta property="fc:frame:image" content="${listingFrame}" />
                <meta property="fc:frame:button:1" content="Back" />
                <meta property="fc:frame:button:2" content="Upload photos" />
                <meta property="fc:frame:button:2:action" content="link" />
                <meta property="fc:frame:button:2:target" content="${process.env.BASE_URL}/?location=${encodedLocation}&shipping=${encodedShipping}&title=${encodedTitle}&description=${encodedDescription}&price=${encodedPrice}&walletAddress=${encodedWalletAddress}&email=${encodedEmail}" />
            `;
            break;
        }
    }

    return `
    <!DOCTYPE html>
    <html>
        <head>
            <title>Gogh Marketplace</title>
            <meta name="description" content="Sell your items locally with Gogh" />
            <meta property="og:url" content="https://www.gogh.shopping" />
            <meta property="fc:frame" content="vNext" />
            <meta property="fc:frame:post_url" content="${process.env.BASE_URL}/marketplace/add-listing/${category}?step=${step}&sessionId=${sessionId}&inputError=${inputError}&explain=${explain}" />
            <meta property="fc:frame:image:aspect_ratio" content="1.91:1" />
            ${buttonsHtml}
        </head>
    </html>
    `;
}
    
export default router;