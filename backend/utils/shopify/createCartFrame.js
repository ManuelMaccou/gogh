import { createCanvas, loadImage } from 'canvas';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import ShopifyStore from '../../models/shopify/store.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Function to find a variant by Shopify Variant ID
async function findVariantById(shopifyVariantId) {

    console.log('Starting findVariantbyId');
    console.log('shopifyVariantId:', shopifyVariantId);

    const storeContainingVariant = await ShopifyStore.findOne({
        "products.variants.shopifyVariantId": shopifyVariantId
    }, {
        "products.$": 1 // Return only the first matching product
    }).lean();

    if (!storeContainingVariant) throw new Error('Variant not found');

    const product = storeContainingVariant.products[0];

    console.log('Found product:', product.title);

    const variant = product.variants.find(v => v.shopifyVariantId === shopifyVariantId);

    console.log('Found variant:', variant.title);

    return variant ? { image: variant.image, shopifyVariantId } : null;
}

// Function to create canvas and return buffer
async function createCartFrame(cartUrlParams, store) {
    console.log('Starting cartFrame creation');

    try {
        const canvasWidth = 800;
        const canvasHeight = 800;
        const padding = 50;
        const titleImageSpacing = 20;
        const maxImageWidth = 250;
        const font = '30px Arial'; // Quantity text
        const textFontColor = 'black';
        const spacingBetweenImageAndNumber = 20;

        const canvas = createCanvas(canvasWidth, canvasHeight);
        const ctx = canvas.getContext('2d');

        // Load and draw the background image first
        const backgroundImageUrl = join(__dirname, `../../files/${store.cartBackgroundImageName}`);
        const backgroundImage = await loadImage(backgroundImageUrl);

        ctx.drawImage(backgroundImage, 0, 0, canvasWidth, canvasHeight);

        // Parse cartUrlParams to get variant IDs and quantities
        const variants = cartUrlParams.split(',').map(param => {
            const [shopifyVariantId, quantity] = param.split(':');
            return { shopifyVariantId, quantity };
        }).slice(0, 4); // Take only the first 4 variants

        // Fetch variant images and prepare data for canvas drawing
        const variantImages = await Promise.all(variants.map(async variant => {
            const variantData = await findVariantById(variant.shopifyVariantId);
            return { image: variantData.image, quantity: variant.quantity };
        }));

        // Draw images and quantities on the canvas
        await Promise.all(variantImages.map(async (variantImage, index) => {
            const image = await loadImage(variantImage.image);
            const aspectRatio = image.width / image.height;
            let imgWidth = Math.min(maxImageWidth, (canvasWidth - 3 * padding) / 2);
            let imgHeight = imgWidth / aspectRatio;

            if (imgHeight > (canvasHeight - 3 * padding) / 2) {
                imgHeight = (canvasHeight - 3 * padding) / 2;
                imgWidth = imgHeight * aspectRatio;
            }

            const col = index % 2;
            const row = Math.floor(index / 2);
            const positionX = padding + (col * ((canvasWidth - 3 * padding) / 2 + padding)) + ((canvasWidth - 3 * padding) / 2 - imgWidth) / 2;
            // Adjust positionY calculation to include titleImageSpacing
            const positionY = padding * 1.5 + titleImageSpacing + (row * ((canvasHeight - 3 * padding) / 2 + padding)) + ((canvasHeight - 3 * padding) / 2 - imgHeight) / 2;

            ctx.drawImage(image, positionX, positionY, imgWidth, imgHeight);

            if (variantImage.quantity) {
                // Display "Quantity: <number>" under each product image
                const quantityText = `Quantity: ${variantImage.quantity}`;
                ctx.font = font;
                ctx.fillStyle = textFontColor;
                // Adjust Y position to display the text under the image
                const textY = positionY + imgHeight + spacingBetweenImageAndNumber;
                ctx.fillText(quantityText, positionX, textY);
            }
        }));

        // Generate and return the image URL
        const imageBuffer = canvas.toBuffer('image/jpeg');
        return imageBuffer;

    } catch (error) {
        console.error('Error creating cart frame:', error);
        throw error; // Or handle more gracefully
    }
}

export default createCartFrame;