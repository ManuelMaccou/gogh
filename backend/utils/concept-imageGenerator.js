import pkg from 'jimp';
import sharp from 'sharp';
import { createCanvas, loadImage } from 'canvas';

const { read, intToRGBA } = pkg;

async function fetchAndConvertImage(imageUrl) {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(imageUrl);
    if (!response.ok) {
        throw new Error(`Failed to fetch the image: ${response.statusText}`);
    }
    let buffer = await response.arrayBuffer();

    // Use sharp to convert .webp images to .png
    const image = await sharp(buffer);
    const metadata = await image.metadata();

    if (metadata.format === 'webp') {
        buffer = await image.jpeg({ quality: 90 }).toBuffer();
    } else {
        buffer = imageUrl;
    }

    return buffer;
}

// Adjusted getDominantColor to accept a buffer
async function getDominantColor(buffer) {
    const image = await read(buffer);
    const dominantColor = image.getPixelColor(0, 0);
    return intToRGBA(dominantColor);
}

function isLight(r, g, b) {
    return (r * 0.299 + g * 0.587 + b * 0.114) > 186;
}

async function GenerateProductImage(productData) {
    const imageUrl = productData.image;
    const buffer = await fetchAndConvertImage(imageUrl);
    const dominantColor = await getDominantColor(buffer);
    const image = await loadImage(buffer);
    
    const canvasWidth = 1000;
    const canvasHeight = 1000;
    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = `rgb(${dominantColor.r},${dominantColor.g},${dominantColor.b})`;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    const textHeightEstimation = 100; // Adjust based on expected text size
    let scaleFactor = Math.min(canvasWidth / image.width, (canvasHeight - textHeightEstimation) / image.height);
    let imageWidth = image.width * scaleFactor;
    let imageHeight = image.height * scaleFactor;

    // Position the image closer to the top, leaving room for text below
    let imageX = (canvasWidth - imageWidth) / 2;
    let imageY = 20; // Adjust this value as needed to position the image closer to the top

    ctx.drawImage(image, imageX, imageY, imageWidth, imageHeight);

    const textColor = isLight(dominantColor.r, dominantColor.g, dominantColor.b) ? 'black' : 'white';
    ctx.fillStyle = textColor;
    ctx.font = 'bold 32px Verdana';
    ctx.textAlign = 'center';

    // Calculate text position based on image position and height
    let textX = canvasWidth / 2;
    let textY = imageY + imageHeight + 30; // Adjust this value as needed based on the text size

    // Text wrapping function, as previously described
    const wrapText = (text, x, y, maxWidth, lineHeight) => {
        const words = text.split(' ');
        let line = '';

        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            const testWidth = metrics.width;
            if (testWidth > maxWidth && n > 0) {
                ctx.fillText(line, x, y);
                line = words[n] + ' ';
                y += lineHeight;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line, x, y);
    };

    wrapText(productData.title, textX, textY, canvasWidth - 40, 28); // Adjust as needed

    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    return dataUrl;
}

export default GenerateProductImage;
