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
    shippingDetails: ShippingDetailsSchema,
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
