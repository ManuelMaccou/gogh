import { Schema, model } from 'mongoose';

const ProductSchema = new Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    productFrame: { type: String, required: true },
    descriptionFrame: { type: String, required: true },
    image: { type: String, required: true },
    url: { type: String, required: true },
    price: { type: String, required: false },
    stock: { type: Boolean},
    store: { type: Schema.Types.ObjectId, ref: 'store' }
});

const Product = model('product', ProductSchema);

export default Product;
