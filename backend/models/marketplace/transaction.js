import { Schema, model } from 'mongoose';

const transactionSchema = new Schema({
    buyerFid: { type: String },
    sellerFid: { type: String },
    sellerProfile: { type: String },
    sellerUsername: { type: String },
    transactionHash: { type: String, required: true },
    source: { type: String, required: true },
});

const MarketplaceTransaction = model('MarketplaceTransaction', transactionSchema);

export default MarketplaceTransaction;
