import mongoose from 'mongoose';

const merchantSchema = new mongoose.Schema({
    merchantId: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});

const Merchant = mongoose.model('Merchant', merchantSchema);

export default Merchant;