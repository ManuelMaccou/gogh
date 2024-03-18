// https://www.gogh.shopping/marketplace/add/book/


import { Router } from 'express';
import { query, validationResult } from 'express-validator';
import validateMessage from '../../../../utils/validateFrameMessage.js';
import { v4 as uuidv4 } from 'uuid';
import { client, connectRedis } from '../../../../redis.js';

connectRedis()

const router = Router();

router.get('/', async (req, res) => {

    const htmlResponse = `
    <!DOCTYPE html>
    <html>
        <head>
        <title>Gogh Marketplace</title>
            <meta name="description" content="Sell your items locally with Gogh">
            <meta property="og:url" content="https://">
            <meta property="og:image" content="https://aef8cbb778975f3e4df2041ad0bae1ca.cdn.bubble.io/f1710534902459x287655313360131620/books1.jpg" />
            <meta property="fc:frame" content="vNext" />
            <meta property="fc:frame:post_url" content="${process.env.BASE_URL}/marketplace/add/book?step=1" />
            <meta property="fc:frame:image" content="https://aef8cbb778975f3e4df2041ad0bae1ca.cdn.bubble.io/f1710534902459x287655313360131620/books1.jpg">
            <meta property="fc:frame:image:aspect_ratio" content="" />
            <meta property="fc:frame:button:1" content="NYC" />
            <meta property="fc:frame:button:2" content="LA" />
            <meta property="fc:frame:button:3" content="How's it work?" />
        </head>
    </html>
    `;

        res.status(200).send(htmlResponse);
});


router.post('/', async (req, res) => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

const bookFrames = [
    'https://aef8cbb778975f3e4df2041ad0bae1ca.cdn.bubble.io/f1710555919752x326559283048353900/books1.jpg',
    'https://aef8cbb778975f3e4df2041ad0bae1ca.cdn.bubble.io/f1710534914905x210028621315930600/books2.jpg',
    'https://aef8cbb778975f3e4df2041ad0bae1ca.cdn.bubble.io/f1710720645673x271228752763877470/books3.jpg',
    'https://aef8cbb778975f3e4df2041ad0bae1ca.cdn.bubble.io/f1710534944815x575172734527624960/books4.jpg',
    'https://aef8cbb778975f3e4df2041ad0bae1ca.cdn.bubble.io/f1710720430622x627950942486502400/books5.jpg',
    'https://aef8cbb778975f3e4df2041ad0bae1ca.cdn.bubble.io/f1710721208937x933494432404038800/books6.jpg',
    'https://aef8cbb778975f3e4df2041ad0bae1ca.cdn.bubble.io/f1710720534023x518762324099516000/books7.jpg',
];

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

            console.log('eth_addresses:', validatedFrameData.action.interactor.verified_addresses.eth_addresses);

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
                if (buttonIndex === 1) {
                    redisData.city = 'NYC';
                    step = '2';
                } else if (buttonIndex === 2) {
                    redisData.city = 'LA';
                    step = '2';
                } else  if (buttonIndex === 3) {
                    explain = 'true';
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
                if (buttonIndex === 1) { // back
                    step = '4';

                } else if (buttonIndex === 2 && inputText) {
                    redisData.walletAddress = inputText;
                    step = '6';

                } else if (buttonIndex === 2 && !inputText) {
                    inputError = 'true';

                } else if (buttonIndex === 3 && verifiedAddresses[0]) {
                    redisData.walletAddress = verifiedAddresses[0];
                    step = '6';

                } else if (buttonIndex === 4 && verifiedAddresses[1]) {
                    redisData.walletAddress = verifiedAddresses[1];
                    step = '6';
                }

            } else if (step === '6') {
                if (buttonIndex === 1) { // back
                    step = '5'

                } else if (buttonIndex === 2 && inputText) {
                    redisData.email = inputText;
                    step = '7'
                    
                } else if (!inputText && buttonIndex === 2) {
                    inputError = "true";
                }
                
            } else if (step === '7') {
                if (buttonIndex === 1) { // back
                    step = '6'
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

    res.status(200).send(generateFrameHtml(bookFrames, verifiedAddresses, redisData, sessionId, step, inputError, explain));

    } catch (error) {
        console.error('Failed to generate frame HTML:', error.response || error);
        res.status(500).json({ message: 'Failed to share product' });
    }
});

function generateFrameHtml(bookFrames, verifiedAddresses, redisData, sessionId, step, inputError, explain) {
    const index = parseInt(step, 10) - 1;
    const bookFrame = bookFrames[Math.max(0, Math.min(index, bookFrames.length - 1))];
    let buttonsHtml;

    if (inputError === "true") {
        return `
        <!DOCTYPE html>
        <html>
            <head>
                <title>Gogh Marketplace</title>
                <meta name="description" content="Sell your items locally with Gogh" />
                <meta property="og:url" content="https://www.gogh.shopping" />
                <meta property="fc:frame:post_url" content="${process.env.BASE_URL}/marketplace/add/book/?step=${step}&sessionId=${sessionId}&inputError=${inputError}&explain=${explain}" />
                <meta property="fc:frame" content="vNext" />
                <meta property="fc:frame:image:aspect_ratio" content="1.91:1" />
                <meta property="fc:frame:image" content="https://aef8cbb778975f3e4df2041ad0bae1ca.cdn.bubble.io/f1710536263408x279083520176537150/book_error.jpg" />
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
                <meta property="fc:frame:post_url" content="${process.env.BASE_URL}/marketplace/add/book/?step=${step}&sessionId=${sessionId}&inputError=${inputError}&explain=${explain}" />
                <meta property="fc:frame" content="vNext" />
                <meta property="fc:frame:image:aspect_ratio" content="1.91:1" />
                <meta property="fc:frame:image" content="https://aef8cbb778975f3e4df2041ad0bae1ca.cdn.bubble.io/f1710536203514x489206431345016200/book_explain.jpg" />
                <meta property="fc:frame:button:1" content="Back" />
            </head>
        </html>
        `;
    } else {

        switch (step) {
            case '1': // When the user hits explain and comes back on the first step
            buttonsHtml = `
                <meta property="fc:frame:image" content="${bookFrame}" />
                <meta property="fc:frame:button:1" content="NYC" />
                <meta property="fc:frame:button:2" content="LA" />
                <meta property="fc:frame:button:3" content="How's it work?" />
            `;
            break;

            case '2': // User shared city, now show them title frame
            buttonsHtml = `
                <meta property="fc:frame:image" content="${bookFrame}" />
                <meta property="fc:frame:input:text" content="Enter book title" />
                <meta property="fc:frame:button:1" content="Back" />
                <meta property="fc:frame:button:2" content="Continue" />
            `;
            break;

            case '3': // User entered title, now show description frame
            buttonsHtml = `
                <meta property="fc:frame:image" content="${bookFrame}" />
                <meta property="fc:frame:input:text" content="Why do you love it?" />
                <meta property="fc:frame:button:1" content="Back" />
                <meta property="fc:frame:button:2" content="Continue" />
            `;
            break;

            case '4': // User entered description, now show price frame
            buttonsHtml = `
                <meta property="fc:frame:image" content="${bookFrame}" />
                <meta property="fc:frame:input:text" content="Enter a price (USDC)" />
                <meta property="fc:frame:button:1" content="Back" />
                <meta property="fc:frame:button:2" content="Continue" />
            `;
            break;

            case '5':
            if (!verifiedAddresses) {
                buttonsHtml = `
                    <meta property="fc:frame:image" content="${bookFrame}" />
                    <meta property="fc:frame:input:text" content="ENS not supported" />
                    <meta property="fc:frame:button:1" content="Back" />
                    <meta property="fc:frame:button:2" content="Use custom" />

                `;
            } else if (verifiedAddresses[0] && !verifiedAddresses[1]) {
                buttonsHtml = `
                    <meta property="fc:frame:image" content="${bookFrame}" />
                    <meta property="fc:frame:input:text" content="ENS not supported" />
                    <meta property="fc:frame:button:1" content="Back" />
                    <meta property="fc:frame:button:2" content="Use custom" />
                    <meta property="fc:frame:button:3" content="${verifiedAddresses[0]}" />
                `;
            } else if (verifiedAddresses[1]) {
                buttonsHtml = `
                    <meta property="fc:frame:image" content="${bookFrame}" />
                    <meta property="fc:frame:input:text" content="ENS not supported" />
                    <meta property="fc:frame:button:1" content="Back" />
                    <meta property="fc:frame:button:2" content="Use custom" />
                    <meta property="fc:frame:button:3" content="${verifiedAddresses[0]}" />
                    <meta property="fc:frame:button:3" content="${verifiedAddresses[1]}" />
                `;
            }

            break;

            case '6': // User entered description, now show price frame
            buttonsHtml = `
                <meta property="fc:frame:image" content="${bookFrame}" />
                <meta property="fc:frame:input:text" content="Enter an email" />
                <meta property="fc:frame:button:1" content="Back" />
                <meta property="fc:frame:button:2" content="Continue" />
            `;
            break;

            case '7': // Confirms the price, now navigate to Gogh for picture

            const encodedCity = encodeURIComponent(redisData.city || '');
            const encodedTitle = encodeURIComponent(redisData.title || '');
            const encodedDescription = encodeURIComponent(redisData.description || '');
            const encodedPrice = encodeURIComponent(redisData.price || '');
            const encodedWalletAddress = encodeURIComponent(redisData.walletAddress || '');
            const encodedEmail = encodeURIComponent(redisData.email || '');

            buttonsHtml = `
                <meta property="fc:frame:image" content="${bookFrame}" />
                <meta property="fc:frame:button:1" content="Back" />
                <meta property="fc:frame:button:2" content="Upload photo" />
                <meta property="fc:frame:button:2:action" content="link" />
                <meta property="fc:frame:button:2:target" content="${process.env.BASE_URL}/?city=${encodedCity}&title=${encodedTitle}&description=${encodedDescription}&price=${encodedPrice}&walletAddress=${encodedWalletAddress}&email=${encodedEmail}" />
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
            <meta property="fc:frame:post_url" content="${process.env.BASE_URL}/marketplace/add/book/?step=${step}&sessionId=${sessionId}&inputError=${inputError}&explain=${explain}" />
            <meta property="fc:frame:image:aspect_ratio" content="1.91:1" />
            ${buttonsHtml}
        </head>
    </html>
    `;
}
    
export default router;