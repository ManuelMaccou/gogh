import { Schema, model } from 'mongoose';

// Define Variant Schema
const ShopifyVariantSchema = new Schema({
    shopifyVariantId: { type: String, unique: true, required: true },
    title: { type: String },
    image: { type: String },
    frameImage: { type: String },
    price: { type: String },
}); // Optionally disable _id for subdocuments if not needed

// Define Product Schema
const ShopifyProductSchema = new Schema({
    shopifyProductId: { type: String, unique: true, required: true },
    title: { type: String },
    description: { type: String },
    originalDescription: { type: String },
    image: { type: String },
    frameImage: { type: String },
    price: { type: String },
    variants: [ShopifyVariantSchema],
});

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
});

// Index for faster retrieval
ShopifyStoreSchema.index({ 'products.shopifyProductId': 1, 'products.variants.shopifyVariantId': 1 });

const ShopifyStore = model('ShopifyStore', ShopifyStoreSchema);

export default ShopifyStore;
