import 'dotenv/config'
import { connectRedis } from './redis.js';

import express, { json, static as expressStatic } from 'express';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import connectDB from './database.js';
import cors from 'cors';
import helmet from "helmet";

import productRoutes from './api/products.js';
import userRoutes from './api/user.js';
import merchantRoutes from './api/merchant.js'
// import generatePage from './api/generate.js';
import frameRoutes from './api/frames.js';
import productPage from './api/pages.js';
import storePage from './api/store.js';
import searchRoutes from './api/search.js';
import metadataRoutes from './api/metadata.js';
// import productDb from './api/productDb.js';
import storeRoutes from './api/store.js';
import simulateRoutes from './api/simulate.js';
import analyticsRoutes from './api/retrieveAnalytics.js';
// import recommendRoutes from './api/recommend.js';
import shopifyInitialRoutes from './api/shopify/initial_sync/fetchProducts.js';
import shopifyProductRoutes from './api/shopify/product.js';
import shopifyStoreRoutes from './api/shopify/store.js';
import shopifyFrameRoutes from './api/shopify/frame.js';
import shopifySingleProductFrameRoutes from './api/shopify/singleProductFrame.js';

import shopifyProductWebhooks from './webhooks/shopify/product.js';

import marketplaceProductRoutes from './api/marketplace/product.js';
import marketplaceFrameShareRoutes from './api/marketplace/frame/transactionFrame.js';
import marketplaceFrameSendTransactionRoutes from './api/marketplace/frame/sendTransaction.js';
import crypto from './api/crypto.js';

import marketplaceTransactionRoutes from './api/marketplace/transaction.js';

// This will soon be removed
import imageRoutes from './api/image.js';

// This will soon replace the image route above
import imagesRoutes from './api/images.js';

import bookListingFrameRoute from './api/marketplace/frame/addListingFrames/books.js'
import addListingFrameRoute from './api/marketplace/frame/addListingFrames/listing.js'

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();



// Trust the reverse proxy when determining the connection protocol
app.set('trust proxy', true);

// Connect to Database
connectDB();
connectRedis();



app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "sha256-Ajrn2JfOTISCPhOetahUcaOhZ854HKtCcNBgJTdIGxM=", "sha256-UDHBHdd4da/v5O7d+qMgrwf9zOoyf3QWpe6JgGdMnHY=",
            "sha256-FG186pX32/RqkjtL5kNb6LG7uYR99KhVlJGHiAbALxk=", "sha256-MslUGu1K02u908pcw8Mbxp0ZoMZEzz1debesfSEzmsE=", "sha256-Ajrn2JfOTISCPhOetahUcaOhZ854HKtCcNBgJTdIGxM=",
            "sha256-UDHBHdd4da/v5O7d+qMgrwf9zOoyf3QWpe6JgGdMnHY=", "sha256-FG186pX32/RqkjtL5kNb6LG7uYR99KhVlJGHiAbALxk=", "sha256-MslUGu1K02u908pcw8Mbxp0ZoMZEzz1debesfSEzmsE=",
            "sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=", "sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=", ],
            imgSrc: ["'self'", "data:", "https://lh3.googleusercontent.com/", "https://*.cdn.bubble.io", "http://localhost:5001", "https://i.imgur.com"],
            scriptSrc: ["'self'", "'wasm-eval'", "https://auth.privy.io/apps", "https://challenges.cloudflare.com", "https://kit.fontawesome.com", "https://neynarxyz.github.io"],
            childSrc: ["https://auth.privy.io", "https://verify.walletconnect.com", "https://verify.walletconnect.org"],
            frameSrc: ["https://auth.privy.io", "https://verify.walletconnect.com", "https://verify.walletconnect.org", "https://challenges.cloudflare.com"],
            connectSrc: ["'self'", "https://auth.privy.io", "wss://relay.walletconnect.com", "wss://relay.walletconnect.org", "wss://www.walletlink.org", "https://*.infura.io", "https://*.blastapi.io", "https://ka-f.fontawesome.com",],
            reportUri: ["/csp-report"],
        },
        reportOnly: true,
    }}),
);

/*
app.post('/csp-report', express.json({type: 'application/csp-report'}), (req, res) => {
    console.log('CSP Violation:', req.body);
    res.status(204).end();
});
*/

app.use(cors());

app.use(json({ verify: (req, res, buf) => { req.rawBody = buf; } }));

app.use(expressStatic(join(__dirname, '..', 'gogh', 'build')));


// Use routes
app.use('/api/products', productRoutes);
app.use('/api/user', userRoutes);
app.use('/api/merchant', merchantRoutes);
// app.use('/api/generate-page', generatePage);
app.use('/api/frames', frameRoutes);
app.use('/product-page', productPage);
app.use('/gogh-store', storePage);
app.use('/api/search', searchRoutes);
app.use('/api', metadataRoutes);
// app.use('/api/index-csv', productDb);
app.use('/api/store', storeRoutes);
app.use('/api/simulate', simulateRoutes);
app.use('/api/download-csv', analyticsRoutes);
// app.use('/api/recommend', recommendRoutes);
app.use('/api/shopify/initial_sync', shopifyInitialRoutes);
app.use('/api/shopify/product', shopifyProductRoutes);
app.use('/api/shopify/store', shopifyStoreRoutes);
app.use('/api/shopify/frame', shopifyFrameRoutes);
app.use('/api/shopify/singleProductFrame', shopifySingleProductFrameRoutes);

app.use('/webhooks/shopify/product', shopifyProductWebhooks);

// This will soon be removed
app.use('/image', imageRoutes);

// This will soon replace the image route above
app.use('/images', imagesRoutes);

app.use('/api/marketplace/product', marketplaceProductRoutes);
app.use('/api/marketplace/frame/send_transaction', marketplaceFrameSendTransactionRoutes);
app.use('/marketplace/frame/share', marketplaceFrameShareRoutes);
app.use('/marketplace/add/book', bookListingFrameRoute);
app.use('/marketplace/add/listing', addListingFrameRoute);
app.use('/api/crypto', crypto);

app.use('/api/transaction', marketplaceTransactionRoutes);


app.get('*', (req, res) => {
    res.sendFile(join(__dirname, '..', 'gogh', 'build', 'index.html'));
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
