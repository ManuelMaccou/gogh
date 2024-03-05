import { Schema, model } from 'mongoose';

const marketplaceProductSchema = new Schema({
    location: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    productFrame: { type: String },
    imageUrl: { type: String, required: true },
    price: { type: String, required: false },
    user: { type: Schema.Types.ObjectId, ref: 'User' }
});

const MarketplaceProduct = model('MarketplaceProduct', marketplaceProductSchema);

export default MarketplaceProduct;
