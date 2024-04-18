import { Schema, model } from 'mongoose';

const marketplaceProductSchema = new Schema({
    location: { type: String, required: true },
    shipping: {type: Boolean, required: true },
    farcon: {type: Boolean, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    productFrame: { type: String, required: true },
    featuredImage: { type: String, required: true },
    additionalImages: [{ type: String }],
    price: { type: String, required: false },
    walletAddress: { type: String, required: true },
    email: { type: String, required: true },
    user: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
}, {
  timestamps: true,
  toObject: { virtuals: true },
  toJSON: { virtuals: true },
});

marketplaceProductSchema.virtual('transactions', {
  ref: 'MarketplaceTransaction',
  localField: '_id',
  foreignField: 'marketplaceProduct',
});

const MarketplaceProduct = model('MarketplaceProduct', marketplaceProductSchema);

export default MarketplaceProduct;