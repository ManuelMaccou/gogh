import { createHmac, timingSafeEqual } from 'crypto';

// Middleware to capture raw body
export const captureRawBody = (req, res, next) => {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', chunk => {
        data += chunk;
    });
    req.on('end', () => {
        req.rawBody = data;
        next();
    });
};

// Middleware to verify Shopify's HMAC signature
export function verifyShopifyWebhook(req, res, next) {
    const hmacHeader = req.get('X-Shopify-Hmac-SHA256');
    const data = req.rawBody;
    const calculatedHmac = createHmac('sha256', process.env.SHOPIFY_API_SECRET_TEST)
        .update(data, 'utf8')
        .digest('base64');

    if (timingSafeEqual(Buffer.from(calculatedHmac), Buffer.from(hmacHeader || ''))) {
        console.log('Webhook verified');
        next(); // Proceed to the next middleware/route handler
    } else {
        console.log('Webhook verification failed');
        return res.status(401).send('Webhook verification failed');
    }
}