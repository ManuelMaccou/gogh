import { Schema, model } from 'mongoose';

const ShopifyVariantSchema = new Schema({
    shopifyVariantId: { type: String, required: true },
    title: { type: String, required: false },
    image: { type: String, required: false },
    price: { type: String, required: false },
});

ShopifyVariantSchema.index({ shopifyVariantId: 1 }, { unique: true });

const ShopifyVariant = model('ShopifyVariant', ShopifyVariantSchema);

export default ShopifyVariant;
