import { Schema, model } from 'mongoose';

const imageSchema = new Schema({
  contentType: String,
  data: Buffer,
});

const Image = model('Image', imageSchema);

export default Image;