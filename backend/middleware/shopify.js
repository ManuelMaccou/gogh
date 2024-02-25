import { createHmac, timingSafeEqual } from 'crypto';

// Shopify app's client secret, loaded from environment variables for security
const CLIENT_SECRET = process.env.SHOPIFY_API_SECRET_TEST;

// Middleware for raw body buffer
export function rawBodyBuffer(req, res, buf, encoding) {
  if (buf && buf.length) {
    req.rawBody = buf.toString(encoding || 'utf8');
    console.log('Raw body buffer captured');
  }
}

// Shopify webhook verification middleware
export const verifyShopifyWebhook = (req, res, next) => {
  const hmacHeader = req.get('X-Shopify-Hmac-SHA256');
  console.log('Received HMAC header');

  if (!hmacHeader) {
    console.log('No HMAC header found');
    // Optionally, log this event as suspicious for further investigation.
    return res.status(400).send('Bad Request: Missing security header.');
  }
  try {
    const digest = createHmac('sha256', CLIENT_SECRET)
      .update(req.rawBody, 'utf8')
      .digest('base64');
      console.log('Computed digest');

    if (timingSafeEqual(Buffer.from(digest), Buffer.from(hmacHeader || ''))) {
      console.log('Shopify webhook verified successfully');      
      next();
    } else {
      console.log('Shopify webhook verification failed');
      res.status(401).send('Webhook verification failed');
    }
  } catch (error) {
    console.error('Error during webhook verification:', error);
    res.status(401).send('Webhook verification failed');  }
};