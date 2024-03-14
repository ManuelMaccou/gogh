// https://www.gogh.shopping/marketplace/add/book


import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import validateMessage from '../../../../utils/validateFrameMessage.js';

const router = Router();

const bookFrames = [
    'https://aef8cbb778975f3e4df2041ad0bae1ca.cdn.bubble.io/f1710204427752x477688850444208700/faq1.jpg',
    'https://aef8cbb778975f3e4df2041ad0bae1ca.cdn.bubble.io/f1710204437954x612208291044247900/faq2.jpg',
    'https://aef8cbb778975f3e4df2041ad0bae1ca.cdn.bubble.io/f1710204529991x893094894813133700/faq3.jpg',
];

router.get('/', async (req, res) => {

    const htmlResponse = `
    <!DOCTYPE html>
    <html>
        <head>
        <title>Gogh Marketplace</title>
            <meta name="description" content="Sell your items locally with Gogh">
            <meta property="og:url" content="https://">
            <meta property="og:image" content="https://aef8cbb778975f3e4df2041ad0bae1ca.cdn.bubble.io/f1710204529991x893094894813133700/faq3.jpg" />
            <meta property="fc:frame" content="vNext" />
            <meta property="fc:frame:post_url" content="${process.env.BASE_URL}/marketplace/add/book/step=1" />
            <meta property="fc:frame:image" content="https://aef8cbb778975f3e4df2041ad0bae1ca.cdn.bubble.io/f1710204529991x893094894813133700/faq3.jpg">
            <meta property="fc:frame:image:aspect_ratio" content="" />
            <meta property="fc:frame:button:1" content="NYC" />
            <meta property="fc:frame:button:2" content="LA" />
        </head>
    </html>
    `;

        res.status(200).send(htmlResponse);
});


router.post('/',
[
    body('city').trim().escape(),
    body('title').trim().escape(),
    body('description').trim().escape(),
    body('price').customSanitizer(value => {
        // Remove everything except numbers and dollar sign
        return value.replace(/[^0-9$]/g, '');
    }),
],
async (req, res) => {
    const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

    const totalBookFrames = bookFrames.length;

    let buttonIndex, fid;
    let user = req.query.user;
    let step = req.query.step;
    let city = req.query.city;
    let title = req.query.title;
    let description = req.query.description;
    let price = req.query.price;

    const encodedCity = encodeURIComponent(city);
    const encodedTitle = encodeURIComponent(title);
    const encodedDescription = encodeURIComponent(description);
    const encodedPrice = encodeURIComponent(price);

    if (isProduction) {
        
        try {
            const messageBytes = req.body.trustedData.messageBytes;
            const validatedFrameData = await validateMessage(messageBytes);

            buttonIndex = validatedFrameData.action?.tapped_button?.index;
            fid = validatedFrameData.action?.interactor?.fid;
            inputText = validatedFrameData.action?.input?.text;

        } catch (error) {
            console.error('Error validating message:', error);
            return res.status(500).send('An error occurred during message validation.');
        }
    } else {
        buttonIndex = req.body.untrustedData.buttonIndex;
        fid = req.body.untrustedData.fid;
        inputText = req.body.untrustedData.inputText;
    }
    try {

        if (step === '1') {
            if (buttonIndex === '1') {
                city = 'NYC';
            } else {
                city = 'LA';
            }
            user = fid;
            step = '2';

        } else if (step === '2') {
            title = inputText;
            step = '3';

        } else if (step === '3') {
            description = inputText
            step = '4';

        } else if (step === '4') {
            price = inputText
        }

    res.status(200).send(generateFrameHtml(step));

    } catch (error) {
        console.error('Failed to share product:', error.response || error);
        res.status(500).json({ message: 'Failed to share product' });
    }



});

function generateFrameHtml(step) {
    const index = parseInt(step, 10) - 1;
    const bookFrame = bookFrames[Math.max(0, Math.min(index, bookFrames.length - 1))];

    let buttonsHtml;
    switch (step) {
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
            <meta property="fc:frame:button:2" content="Upload photo" />
            <meta property="fc:frame:button:3:action" content="link" />
            <meta property="fc:frame:button:3:target" content="${process.env.BASE_URL}/?city=${encodedCity}&title=${encodedTitle}&description=${encodedDescription}&price=${encodedPrice}" />
        `;
        break;
    }


    return `
    <!DOCTYPE html>
    <html>
        <head>
            <title>Gogh Marketplace</title>
            <meta name="description" content="Sell your items locally with Gogh" />
            <meta property="og:url" content="https://www.gogh.shopping" />
            <meta property="fc:frame" content="vNext" />
            <meta property="fc:frame:post_url" content="${process.env.BASE_URL}/marketplace/add/book/?step=${step}&city=${city}&title=${title}&description=${description}&price=${price}" />
            <meta property="fc:frame:image:aspect_ratio" content="1.91:1" />
            ${buttonsHtml}
        </head>
    </html>
    `;
}
    
    export default router;