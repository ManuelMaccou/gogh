import { Router } from 'express';
import fetch from 'node-fetch';
import { findOrCreateStore, storeProductData, updateProductFrames } from './updateDatabase.js';

const router = Router();

// Get all products from Shopify
router.get('/', async (req, res) => {
    const baseUrl = "https://nounsesports.myshopify.com"
    const fields = [
        'id',
        'title',
        'body_html',
        'variants', // "variants.title" will have the different names for the sizes. 
        'images', // The image for each varient is images.src with the matching varient id in the "varient_ids" object. If there is only one varient, get this value without looking for a matching varient. There is only one for each product with not other varient. The varient object in the response will be empty.
        'image' // This is where the product main image is - "image.src"
    ];

    const createQueryString = (fields) => {
        // Encode each field and join them with commas
        const fieldsParam = fields.map(field => encodeURIComponent(field)).join(',');
    
        return `fields=${fieldsParam}`;
    };

    const url = `${baseUrl}/admin/api/2024-01/products.json?${createQueryString(fields)}`;
    const accessToken = process.env.NOUNS_SHOPIFY_ACCESS_TOKEN;
    console.log(url);

    const options = {
        method: 'GET',
        headers: {
            "X-Shopify-Access-Token": accessToken,
            "Content-Type": "application/json"
        }
    };

    try {
        const response = await fetch(url, options);
        if (!response.ok) throw new Error(`Error: ${response.statusText}`);
        const { products } = await response.json();

        // Process Shopify store and products
        const store = await findOrCreateStore(baseUrl);

        // Store product data in the database
        console.log('Adding products to the store without frames')
        await storeProductData(products, store._id);
        console.log('Finished adding products to the store without frames')

        // Update the products with frame images
        console.log('Updating products and variants with frames')
        await updateProductFrames(store._id);
        console.log('Finished updating products and variants with frames')

        res.status(200).json({ message: "Products and variants added successfully" });
    } catch (error) {
        console.error('Fetch Shopify Products Error:', error);
        res.status(500).send(error.message);
    }
});

export default router;