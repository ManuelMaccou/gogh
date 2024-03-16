// https://www.gogh.shopping/marketplace/add/book


import { Router } from 'express';
import { query, validationResult } from 'express-validator';
import validateMessage from '../../../../utils/validateFrameMessage.js';


const router = Router();

let inputText, buttonIndex, step, city, title, description, price, inputError, explain;

const bookFrames = [
    'https://aef8cbb778975f3e4df2041ad0bae1ca.cdn.bubble.io/f1710534902459x287655313360131620/books1.jpg',
    'https://aef8cbb778975f3e4df2041ad0bae1ca.cdn.bubble.io/f1710534914905x210028621315930600/books2.jpg',
    'https://aef8cbb778975f3e4df2041ad0bae1ca.cdn.bubble.io/f1710534927003x427386421304160260/books3.jpg',
    'https://aef8cbb778975f3e4df2041ad0bae1ca.cdn.bubble.io/f1710534944815x575172734527624960/books4.jpg',
    'https://aef8cbb778975f3e4df2041ad0bae1ca.cdn.bubble.io/f1710551642848x613212823615965040/books5.jpg',
];



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


router.post('/',
[
    query('city').if(query('city').exists()).trim().escape(),
    query('title').if(query('title').exists()).trim().escape(),
    query('description').if(query('description').exists()).trim().escape(),
    query('price').if(query('price').exists()).customSanitizer(value => {
        // Remove everything except numbers and dollar sign
        return value.replace(/[^0-9$]/g, '');
    }),
],

async (req, res) => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const isProduction = process.env.NODE_ENV === 'production';

    step = req.query.step;
    city = req.query.city;
    title = req.query.title;
    description = req.query.description;
    price = req.query.price;
    inputError = req.query.inputError
    explain = req.query.explain

    if (isProduction) {
        
        try {
            const messageBytes = req.body.trustedData.messageBytes;
            const validatedFrameData = await validateMessage(messageBytes);

            buttonIndex = validatedFrameData.action?.tapped_button?.index;
            inputText = validatedFrameData.action?.input?.text;

        } catch (error) {
            console.error('Error validating message:', error);
            return res.status(500).send('An error occurred during message validation.');
        }
    } else {
        buttonIndex = req.body.untrustedData.buttonIndex;
        inputText = req.body.untrustedData.inputText;
    }
    try {
        if (inputError !== "true" && explain !== "true") {

            if (step === '1') {

                if (buttonIndex === '1') {
                    city = 'NYC';
                    step = '2';
                } else if (buttonIndex === '2') {

                    city = 'LA';
                    step = '2';
                } else {
                    explain = 'true';
                }

            } else if (step === '2') {
                if (inputText) {
                    if (buttonIndex === '1') { // back
                        step = '1';
                    } else {
                        title = inputText;
                        step = '3';
                    }
                } else {
                    inputError = "true";
                }

            } else if (step === '3') {
                if (inputText) {
                    if (buttonIndex === '1') { // back
                        step = '2';
                    } else {
                        description = inputText;
                        step = '4';
                    }
                } else {
                    inputError = "true";
                }

            } else if (step === '4') {
                if (inputText) {
                    if (buttonIndex === '1') { // back
                        step = '3'
                    } else {
                        price = inputText;
                        step = '5'
                    }
                }
            } else if (step === '5') {
                if (buttonIndex === '1') { // back
                    step = '4'
                }
            }
        } else {
            if (buttonIndex === '1') {
                inputError = "";
                explain = "";
            }
        }


    res.status(200).send(generateFrameHtml(step, inputError, explain));

    } catch (error) {
        console.error('Failed to generate frame HTML:', error.response || error);
        res.status(500).json({ message: 'Failed to share product' });
    }
});

function generateFrameHtml(step, inputError, explain) {
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
                <meta property="fc:frame:post_url" content="${process.env.BASE_URL}/marketplace/add/book/?step=${step}&city=${city}&title=${title}&description=${description}&price=${price}&inputError=${inputError}&explain=${explain}" />
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
                <meta property="fc:frame:post_url" content="${process.env.BASE_URL}/marketplace/add/book/?step=${step}&city=${city}&title=${title}&description=${description}&price=${price}&inputError=${inputError}&explain=${explain}" />
                <meta property="fc:frame" content="vNext" />
                <meta property="fc:frame:image:aspect_ratio" content="1.91:1" />
                <meta property="fc:frame:image" content="https://aef8cbb778975f3e4df2041ad0bae1ca.cdn.bubble.io/f1710536203514x489206431345016200/book_explain.jpg" />
                <meta property="fc:frame:button:1" content="Back" />
            </head>
        </html>
        `;
    } else {

        console.log("not explain or inputError")

        switch (step) {
            case '1': // When the user hits explain and comes back on the first step
            console.log('brookFrame:', bookFrame);
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

            case '5': // Confirms the price, now navigate to Gogh for picture
            buttonsHtml = `
                <meta property="fc:frame:image" content="${bookFrame}" />
                <meta property="fc:frame:button:1" content="Back" />
                <meta property="fc:frame:button:2" content="Upload photo" />
                <meta property="fc:frame:button:2:action" content="link" />
                <meta property="fc:frame:button:2:target" content="${process.env.BASE_URL}/?city=${encodeURIComponent(city)}&title=${encodeURIComponent(title)}&description=${encodeURIComponent(description)}&price=${encodeURIComponent(price)}" />
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
            <meta property="fc:frame:post_url" content="${process.env.BASE_URL}/marketplace/add/book/?step=${step}&city=${city}&title=${title}&description=${description}&price=${price}&inputError=${inputError}&explain=${explain}" />
            <meta property="fc:frame:image:aspect_ratio" content="1.91:1" />
            ${buttonsHtml}
        </head>
    </html>
    `;
}
    
export default router;