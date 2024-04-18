import { Schema, model } from 'mongoose';

const ShippingDetailsSchema = new Schema({
    name: { type: String, required: true },
    street: { type: String, required: true },
    apartment: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zip: { type: String, required: true },
    country: { type: String, required: true },
}, { timestamps: false });

const transactionSchema = new Schema({
    buyerFid: { type: String },
    sellerFid: { type: String },
    sellerProfile: { type: String },
    sellerUsername: { type: String },
    shippingDetails: ShippingDetailsSchema,
    transactionHash: { type: String, required: true },
    source: { type: String, required: true },
}, { timestamps: true });

const MarketplaceTransaction = model('MarketplaceTransaction', transactionSchema);

export default MarketplaceTransaction;
