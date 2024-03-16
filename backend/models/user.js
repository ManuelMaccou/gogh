import { Schema, model } from 'mongoose';

const userSchema = new Schema({
    privyId: { type: String, unique: true },
    fid: { type: String, unique: true },
    signer_uuid: { type: String },
    fc_pfp: { type: String },
    fc_username: { type: String },
    fc_profile: { type: String },
    email: { type: String },
});

const User = model('User', userSchema);

export default User;
