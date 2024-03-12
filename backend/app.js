import 'dotenv/config'
import express, { json, static as expressStatic } from 'express';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import connectDB from './database.js';
import cors from 'cors';


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

import shopifyProductWebhooks from './webhooks/shopify/product.js';

import marketplaceProductRoutes from './api/marketplace/product.js';
import marketplaceShareRoutes from './api/marketplace/frame/transactionFrame.js';
import marketplaceSendTransactionRoutes from './api/marketplace/frame/sendTransaction.js';

// This will soon be removed
import imageRoutes from './api/image.js';

// This will soon replace the image route above
import imagesRoutes from './api/images.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
app.use(cors());

// Trust the reverse proxy when determining the connection protocol
app.set('trust proxy', true);

// Connect to Database
connectDB();

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

app.use('/webhooks/shopify/product', shopifyProductWebhooks);

// This will soon be removed
app.use('/image', imageRoutes);

// This will soon replace the image route above
app.use('/images', imagesRoutes);

app.use('/api/marketplace/product', marketplaceProductRoutes);
app.use('/api/marketplace/frame/send_transaction', marketplaceSendTransactionRoutes);
app.use('/marketplace/frame/share', marketplaceShareRoutes);


app.get('*', (req, res) => {
    res.sendFile(join(__dirname, '..', 'gogh', 'build', 'index.html'));
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
