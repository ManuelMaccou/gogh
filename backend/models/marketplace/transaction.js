import { Schema, model } from 'mongoose';

const transactionSchema = new Schema({
    buyerFid: { type: String, required: true },
    sellerFid: { type: String, required: true },
    transactionHash: { type: String, required: true },
});

const MarketplaceTransaction = model('MarketplaceTransaction', transactionSchema);

export default MarketplaceTransaction;
