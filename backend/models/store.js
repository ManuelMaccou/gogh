import { Schema, model } from 'mongoose';

const StoreSchema = new Schema({
    image: { type: String, required: true },
    storeName: { type: String, required: true },
    storeDescription: { type: String, required: true },
    storeAdmin: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true },
    products: [{ type: Schema.Types.ObjectId, ref: 'product' }],
    pageId: { type: String },
    pageHtml: { type: String },
});

const Store = model('store', StoreSchema);

export default Store;
