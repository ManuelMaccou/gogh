// https://www.gogh.shopping/marketplace/frame/share/product/65ecc1562704071fe0d9752a

import { Router } from 'express';
import MarketplaceProduct from'../../../models/marketplace/product.js';

const router = Router();

const faqImages = [
    'https://example.com/faq1.jpg',
    'https://example.com/faq2.jpg',
    'https://example.com/faq3.jpg',
];

router.get('/product/:productId', async (req, res) => {
    const { productId } = req.params;

    try {
        const product = await MarketplaceProduct.findOne({ _id: productId });
        if (!product) {
            return res.status(404).send('Product not found during share route');
        }

        const htmlResponse = `
    <!DOCTYPE html>
    <html>
        <head>
        <title>Gogh Marketplace</title>
            <meta name="description" content="Sell your items locally with Gogh">
            <meta property="og:url" content="https://">
            <meta property="og:image" content="${product.productFrame}" />
            <meta property="fc:frame" content="vNext" />
            <meta property="fc:frame:post_url" content="${process.env.BASE_URL}/marketplace/frame/share/product/${product._id} />
            <meta property="fc:frame:image" content="${product.productFrame}">
            <meta property="fc:frame:image:aspect_ratio" content="" />
            <meta property="fc:frame:button:1" content="View online" />
            <meta property="fc:frame:button:1:action" content="link" />
            <meta property="fc:frame:button:1:target" content="https://www.gogh.shopping" />
            <meta property="fc:frame:button:2" content="Buy now" />
            <meta property="fc:frame:button:2:action" content="tx" />
            <meta property="fc:frame:button:2:target" content="${process.env.BASE_URL}/api/marketplace/frame/send_transaction/${product._id}" />
            <meta property="fc:frame:button:3" content="Creating listing" />
            <meta property="fc:frame:button:3:action" content="link" />
            <meta property="fc:frame:button:3:target" content="https://www.gogh.shopping" />
            <meta property="fc:frame:button:4" content="FAQ" />
        </head>
    </html>
    `;

        res.status(200).send(htmlResponse);

    } catch (error) {
        console.error('Failed to share product:', error.response || error);
        res.status(500).json({ message: 'Failed to share product' });
    }
});


router.post('/product/:productId', async (req, res) => {
    const { productId } = req.params;
    const isProduction = process.env.NODE_ENV === 'production';
    const totalFaqs = faqImages.length;

    let frameType = req.query.frameType;
    let faqIndex = parseInt(req.query.index) || 0;
    let buttonIndex, fid;

    // Validate frame interaction first
    if (isProduction) {
        try {
            const messageBytes = req.body.trustedData.messageBytes;
            const validatedFrameData = await validateMessage(messageBytes);
            // Extract data from the validatedFrameData for production
            buttonIndex = validatedFrameData.action?.tapped_button?.index;
            fid = validatedFrameData.action?.interactor?.fid;
        } catch (error) {
            console.error('Error validating message:', error);
            return res.status(500).send('An error occurred during message validation.');
        }
    } else {
        // Directly use untrustedData in development, with a different data structure
        buttonIndex = req.body.untrustedData.buttonIndex;
        fid = req.body.untrustedData.fid;
    }

    try {
        const product = await MarketplaceProduct.findOne({ _id: productId });
        if (!product) {
            return res.status(404).send('Product not found during share route');
        }

        if (frameType === "faq") {
            if (buttonIndex === 1) { // prev
                faqIndex = (faqIndex - 1 + totalFaqs) % totalFaqs;

            } else if (buttonIndex === 2) { // next
                faqIndex = (faqIndex + 1) % totalFaqs;
            } else if (buttonIndex === 3) { // back to listing
                frameType = "";
                faqIndex = 0;
            }
        } else {
            if (buttonIndex === 4) { // faq
                frameType = "faq";
            }
        }

        res.status(200).send(generateFrameHtml(product, frameType, faqIndex));

    } catch (error) {
        console.error('Failed to share product:', error.response || error);
        res.status(500).json({ message: 'Failed to share product' });
    }
});

function generateFrameHtml(product, frameType, faqIndex) {
    const faqImage = faqImages[faqIndex % faqImages.length];
    let buttonsHtml;

    if (frameType === 'faq') {
        buttonsHtml = `
            <meta property="og:image" content="${faqImage}" />
            <meta property="fc:frame:button:1" content="⬅️ prev" />
            <meta property="fc:frame:button:2" content="next ➡️" />
            <meta property="fc:frame:button:3" content="return to listing" />
        `;
    } else {
        buttonsHtml = `
            <meta property="og:image" content="${product.productFrame}" />
            <meta property="fc:frame:button:1" content="View online" />
            <meta property="fc:frame:button:1:action" content="link" />
            <meta property="fc:frame:button:1:target" content="https://www.gogh.shopping" />
            <meta property="fc:frame:button:2" content="Buy now" />
            <meta property="fc:frame:button:2:action" content="tx" />
            <meta property="fc:frame:button:2:target" content="${process.env.BASE_URL}/api/marketplace/frame/send_transaction/${product._id}" />
            <meta property="fc:frame:button:3" content="Creating listing" />
            <meta property="fc:frame:button:3:action" content="link" />
            <meta property="fc:frame:button:3:target" content="https://www.gogh.shopping" />
            <meta property="fc:frame:button:4" content="FAQ" />
        `;
    }

    return `
    <!DOCTYPE html>
    <html>
        <head>
            <title>Gogh Marketplace</title>
            <meta name="description" content="Sell your items locally with Gogh" />
            <meta property="og:url" content="https://www.gogh.shopping/marketplace/product/${product._id}" />
            <meta property="fc:frame" content="vNext" />
            <meta property="fc:frame:post_url" content="${process.env.BASE_URL}/marketplace/frame/share/product/${product._id}?frameType=${frameType}&index=${faqIndex}" />
            <meta property="fc:frame:image" content="${frameType === 'faq' ? faqImage : product.productFrame}" />
            <meta property="fc:frame:image:aspect_ratio" content="1.91:1" />
            ${buttonsHtml}
        </head>
    </html>
    `;
}

export default router;