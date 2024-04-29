import { Schema, model } from 'mongoose';

const marketplaceProductSchema = new Schema({
    status: { type: String, required: true },
    category: { type: String },
    location: { type: String, required: true },
    shipping: {type: Boolean, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    productFrame: { type: String, required: true },
    featuredImage: { type: String, required: true },
    additionalImages: [{ type: String }],
    price: { type: String, required: false },
    user: { type: Schema.Types.ObjectId, required: true, ref: 'User' }
}, { timestamps: true });

marketplaceProductSchema.index({ status: 1, createdAt: -1 });

const MarketplaceProduct = model('MarketplaceProduct', marketplaceProductSchema);

export default MarketplaceProduct;
