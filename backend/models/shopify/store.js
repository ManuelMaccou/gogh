import { Schema, model } from 'mongoose';

const ShopifyStoreSchema = new Schema({
    shopifyStoreUrl: { type: String, required: false },
    image: { type: String, required: false },
    storeName: { type: String, required: false },
    storeDescription: { type: String, required: false },
    products: [{ type: Schema.Types.ObjectId, ref: 'ShopifyProduct' }],
    pageHtml: { type: String },
    frameUrl: { type: String },
});

ShopifyStoreSchema.index({ shopifyStoreUrl: 1 }, { unique: true, sparse: true });

const ShopifyStore = model('ShopifyStore', ShopifyStoreSchema);

export default ShopifyStore;
