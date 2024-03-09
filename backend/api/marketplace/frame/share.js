// https://www.gogh.shopping/marketplace/frame/share/product/65eca10b7b4b2e08f18c89e9

import { Router } from 'express';
import MarketplaceProduct from'../../../models/marketplace/product.js';

const router = Router();

router.get('/product/:productId', async (req, res) => {
    const { productId } = req.params;

    try {
        const product = await MarketplaceProduct.findOne({ _id: productId });
        if (!product) {
            return res.status(404).send('Product not found during share route');
        }
        res.status(200).send(generateFrameHtml(product));

    } catch (error) {
        console.error('Failed to share product:', error.response || error);
        res.status(500).json({ message: 'Failed to share product' });
    }
});

function generateFrameHtml(product) {
    
    const htmlResponse = `
    <!DOCTYPE html>
    <html>
        <head>
        <title>Gogh Marketplace</title>
            <meta name="description" content="Sell your items locally with Gogh">
            <meta property="og:url" content="https://">
            <meta property="og:image" content="${product.productFrame}">
            <meta property="fc:frame" content="vNext" />
            
            <meta property="fc:frame:image" content="${product.productFrame}">
            <meta property="fc:frame:image:aspect_ratio" content="" />
            <meta property="fc:frame:button:1" content="View online" />
            <meta property="fc:frame:button:1:action" content="link" />
            <meta property="fc:frame:button:1:target" content="https:www.gogh.shopping" />
            <meta property="fc:frame:button:2" content="Buy now" />
            <meta property="fc:frame:button:2:action" content="tx" />
            <meta property="fc:frame:button:2:target" content="${process.env.BASE_URL}/api/marketplace/frame/send_transaction/${product._id}" />
            <meta property="fc:frame:button:3" content="Creating listing" />
            <meta property="fc:frame:button:3:action" content="link" />
            <meta property="fc:frame:button:3:target" content="https:www.gogh.shopping" />
        </head>
    </html>
    `;

    return htmlResponse;
}

export default router;