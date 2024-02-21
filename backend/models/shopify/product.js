import { Schema, model } from 'mongoose';

const ShopifyProductSchema = new Schema({
    shopifyProductId: { type: String, required: true },
    title: { type: String, required: false },
    description: { type: String, required: false },
    image: { type: String, required: false },
    price: { type: String, required: false },
    variants: [{ type: Schema.Types.ObjectId, ref: 'ShopifyVariant' }],
});

ShopifyProductSchema.index({ shopifyProductId: 1 }, { unique: true });

const ShopifyProduct = model('ShopifyProduct', ShopifyProductSchema);

export default ShopifyProduct;
