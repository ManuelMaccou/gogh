import { Schema, model } from 'mongoose';

// Define Variant Schema
const ShopifyVariantSchema = new Schema({
    shopifyVariantId: { type: String },
    title: { type: String },
    image: { type: String },
    frameImage: { type: String },
    price: { type: String },
    inventory_quantity: { type: String },
}, { timestamps: true });

// Define Product Schema
const ShopifyProductSchema = new Schema({
    shopifyProductId: { type: String },
    title: { type: String },
    description: { type: String },
    originalDescription: { type: String },
    image: { type: String },
    frameImage: { type: String },
    price: { type: String },
    currency: { type: String },
    variants: [ShopifyVariantSchema],
}, { timestamps: true });

// Define Store Schema
const ShopifyStoreSchema = new Schema({
    shopifyStoreUrl: { type: String, unique: true, required: true },
    storeAdmin: { type: Schema.Types.ObjectId, ref: 'Merchant' },
    image: { type: String },
    frameImage: { type: String },
    storeName: { type: String },
    storeDescription: { type: String },
    products: [ShopifyProductSchema],
    pageHtml: { type: String },
    frameUrl: { type: String },
    accessTokenName: { type: String },
    webhookSig: { type: String },
    cartBackgroundImageName: { type: String },
    defaultProductImage: { type: String },
}, { timestamps: true });

// Index for faster retrieval
ShopifyStoreSchema.index({ shopifyStoreUrl: 1, 'products.shopifyProductId': 1 }, { unique: true });

const ShopifyStore = model('ShopifyStore', ShopifyStoreSchema);

export default ShopifyStore;
