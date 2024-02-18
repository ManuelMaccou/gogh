import mongoose, { model } from 'mongoose';
const { Schema } = mongoose;

const userSchema = new Schema({
    fid: { type: String, unique: true },
    signer_uuid: { type: String },
});

const User = model('User', userSchema);

export default User;
