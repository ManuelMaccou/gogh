import { Schema, model } from 'mongoose';

const transactionSchema = new Schema(
  {
    status : {type : String, enum : ["IN_ESCROW","EXPIRED_AFTER_24_HOURS","COMPLETE","CANCELED","PENDING","EXPIRED_AFTER_7_DAYS"]},
    dateOwnerSigned : {type : Date},
    dateRecipientSigned : {type : Date},
    metadata: { type: Object },
    ownerSignature: { type: String },
    recipientSignature: { type: String },
    uid: { type: String },
    escrowId: { type: String },
    buyer: { type: Schema.Types.ObjectId, ref: 'User' },
    seller: { type: Schema.Types.ObjectId, ref: 'User' },
    buyerFid: { type: String },
    sellerFid: { type: String },
    sellerProfile: { type: String },
    sellerUsername: { type: String },
    transactionHash: { type: String, required: true },
    source: { type: String, required: true },
    marketplaceProduct: { type: Schema.Types.ObjectId, ref: 'MarketplaceProduct' },
  },
  { timestamps: true }
);


const MarketplaceTransaction = model(
  "MarketplaceTransaction",
  transactionSchema
);

export default MarketplaceTransaction;
