import { createCanvas, loadImage } from 'canvas';
import Jimp from 'jimp';

async function createProductFrame(location, title, description, price, imageUrl) {
    console.log('Starting product frame generation.');
    try {
        const canvasWidth = 1450;
        const canvasHeight = 760;
        const canvas = createCanvas(canvasWidth, canvasHeight);
        const ctx = canvas.getContext('2d');

        // Set the canvas background to white
        ctx.fillStyle = '#FFFFFF'; // White color
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Configuration for the shape and text section
        const shapeWidthRatio = 0.45; // % of the canvas for the shape
        const leftPadding = 60;
        const rightPadding = 40;

        // Load the product image
        if (imageUrl && imageUrl.trim() !== '') {
            const productImage = await loadImage(imageUrl).catch(err => { throw new Error('Failed to load image'); });

            // Use JIMP to extract the color of the top-left pixel
            const image = await Jimp.read(imageUrl);
            const topLeftPixelColor = image.getPixelColor(0, 0);
            const rgbColor = Jimp.intToRGBA(topLeftPixelColor);
            const shapeColor = `rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, ${rgbColor.a / 255})`;

            // Draw the shape on the left half
            ctx.fillStyle = shapeColor;
            ctx.fillRect(0, 0, canvasWidth * shapeWidthRatio, canvasHeight);

            // Adjust image drawing to fit within the new shape size
            const imageMargin = 40;
            const imageTargetWidth = (canvasWidth * shapeWidthRatio) - 2 * imageMargin;
            const imageAspectRatio = productImage.width / productImage.height;
            const imageTargetHeight = imageTargetWidth / imageAspectRatio;
            ctx.drawImage(productImage, imageMargin, (canvasHeight - imageTargetHeight) / 2, imageTargetWidth, imageTargetHeight);
        }

        // Adjust these values to change the split ratio and spacing
        const textSectionStart = canvasWidth * shapeWidthRatio + leftPadding;
        const textMaxWidth = canvasWidth - textSectionStart - rightPadding;

        // Draw product title
        ctx.font = textConfig.title.font;
        ctx.fillStyle = textConfig.title.color;
        let currentY = 100; // Starting Y position for the text
        currentY += wrapText(ctx, title, textSectionStart, currentY, textMaxWidth, textConfig.title.lineHeight);

        // Print location underneath the title in italics
        const locationGap = 0; // Gap between title and location
        currentY += locationGap; // Move currentY down to create a gap
        const fullLocation = `${location} pickup/dropoff`;
        ctx.font = 'italic 30px Arial';
        ctx.fillText(fullLocation, textSectionStart, currentY);
        currentY += 60; // Adjust space before the description

        // Reset font to non-italics for description
        ctx.font = textConfig.description.font;

        // Draw product description if available
        if (description && description.trim() !== '') {
            const maxDescriptionLength = 60; // Maximum number of words for the description
            let words = description.split(' ');
            let shouldShowViewMore = words.length > maxDescriptionLength;
            let trimmedDescription = shouldShowViewMore ? words.slice(0, maxDescriptionLength).join(' ') + "...\n\nView product online for full description." : description;
        
            // Use the corrected variable for drawing
            currentY += wrapText(ctx, trimmedDescription, textSectionStart, currentY, textMaxWidth, textConfig.description.lineHeight);

            // No need for additional "view more" text handling here; it's incorporated into trimmedDescription
        }

        // Draw price
        if (price && price.trim() !== '') {
            ctx.font = textConfig.price.font;
            ctx.fillStyle = textConfig.price.color;
            ctx.textAlign = 'right';
            const priceRightMargin = 40;
            const priceBottomMargin = 30;
            const priceX = canvas.width - priceRightMargin;
            const priceY = canvas.height - priceBottomMargin;
            const fullprice = `$${price}`;
            ctx.fillText(fullprice, priceX, priceY);
        }

        // Generate and return the image URL
        const imageBuffer = canvas.toBuffer('image/jpeg');
        return imageBuffer;
    } catch (error) {
        console.error('Error creating product frame:', error);
        throw error; // Or handle more gracefully
    }
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    // Split the text into lines based on explicit new line characters
    const lines = text.split('\n');
    let lastY = y;

    lines.forEach((originalLine) => {
        // Trim leading spaces to prevent unintended indenting
        const line = originalLine.trimStart();
        const words = line.split(' ');
        let currentLine = '';

        for (let n = 0; n < words.length; n++) {
            let testLine = currentLine + words[n] + ' ';
            let metrics = ctx.measureText(testLine);
            let testWidth = metrics.width;
            if (testWidth > maxWidth && n > 0) {
                ctx.fillText(currentLine, x, lastY);
                currentLine = words[n] + ' ';
                lastY += lineHeight;
            } else {
                currentLine = testLine;
            }
        }
        // Draw the current line because the loop is finished
        ctx.fillText(currentLine.trim(), x, lastY);
        lastY += lineHeight; // Move to the next line
    });

    return lastY - y; // Return the height used by the text
}

const textConfig = {
    title: {
        font: 'bold 45px Arial',
        color: 'black',
        lineHeight: 60
    },
    description: {
        font: '30px Arial',
        color: 'black',
        lineHeight: 40
    },
    price: {
        font: 'bold 45px Arial',
        color: 'black'
    }
};

export default createProductFrame;
