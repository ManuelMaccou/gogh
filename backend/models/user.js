import { Schema, model } from 'mongoose';

const userSchema = new Schema({
    privyId: { type: String, unique: true },
    fid: { type: String },
    signer_uuid: { type: String },
    fc_pfp: { type: String },
    fc_bio: { type: String },
    fc_username: { type: String },
    fc_fname: {type: String },
    fc_url: { type: String },
    facebookUser: {type: Boolean},
    fb_url: { type: String },
    email: { type: String },
    walletAddress: { type: String },
    shopifyStores: [{ type: Schema.Types.ObjectId, ref: 'ShopifyStore' }],
    customStores: [{ type: Schema.Types.ObjectId, ref: 'Store' }],
    marketplaceProductListings: [{ type: Schema.Types.ObjectId, ref: 'MarketplaceProduct' }],
    marketplaceProductPurchases: [{ type: Schema.Types.ObjectId, ref: 'MarketplaceTransaction' }],
});

const User = model('User', userSchema);

export default User;
