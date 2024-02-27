import { createHmac, timingSafeEqual } from 'crypto';
import ShopifyStore from '../models/shopify/store.js';

// Middleware for raw body buffer
export function rawBodyBuffer(req, res, buf, encoding) {
  if (buf && buf.length) {
    req.rawBody = buf.toString(encoding || 'utf8');
  }
}

// Shopify webhook verification middleware
export const verifyShopifyWebhook = async (req, res, next) => {
  const shopifyDomain = req.headers['x-shopify-shop-domain'];

  try {
    const store = await ShopifyStore.findOne({ shopifyStoreUrl: shopifyDomain });
    console.log('Store found');
    if (!store) {
      console.log('Store not found');
      return res.status(404).json({ message: "Store not found." });
    }

    const CLIENT_SECRET = process.env[store.webhookSig];
    if (!CLIENT_SECRET) {
      console.error('Config error');
      return res.status(500).send('Configuration error.');
    }
    const hmacHeader = req.get('X-Shopify-Hmac-SHA256');

    if (!hmacHeader) {
      console.log('Missing header');
      return res.status(400).send('Bad Request: Missing security header.');
    }
    const digest = createHmac('sha256', CLIENT_SECRET)
      .update(req.rawBody, 'utf8')
      .digest('base64');

    if (timingSafeEqual(Buffer.from(digest), Buffer.from(hmacHeader))) {
      console.log('verified successfully');
      next();
    } else {
      console.log('verification failed');
      res.status(401).send('Webhook verification failed');
    }
  } catch (error) {
    console.error('Error during verification:', error);
    res.status(401).send('Webhook verification failed');  }
};