import { createCanvas, loadImage } from 'canvas';
import Jimp from 'jimp';

async function createProductFrame(location, shipping, title, description, price, imageUrl) {
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

        // Draw "shipping available" if shipping is true
        if (shipping === true || shipping === 'true') {
            ctx.font = 'bold italic 30px Arial'; // You can change the font size and style as needed
            ctx.textAlign = 'left'; // Align text to the left
            const shippingTextX = textSectionStart; // Starting X position for the shipping text
            const shippingTextY = currentY - 20; // Position Y below the last drawn text, adjust as needed
            ctx.fillText("Shipping available", shippingTextX, shippingTextY);
            currentY += 40; // Update currentY if more items are to be added below
        }

        // Reset font to non-italics for description
        ctx.font = textConfig.description.font;

        // Draw product description if available
        if (description && description.trim() !== '') {
            const maxVerticalSpace = 650; // Set maximum vertical space available for description
            const words = description.split(' ');
            let currentText = '';
            let testHeight = 0;
        
            for (let word of words) {
                let newText = currentText + (currentText ? ' ' : '') + word;
                // Measure the potential new text height
                let potentialHeight = wrapText(ctx, newText, textSectionStart, currentY, textMaxWidth, textConfig.description.lineHeight, true);
                if (currentY + potentialHeight > maxVerticalSpace) {
                    break; // Stop adding words if adding another exceeds max height
                }
                currentText = newText; // Accept the new text
                testHeight = potentialHeight; // Update tested height to accepted new height
            }
        
            let shouldShowViewMore = description.length > currentText.length;
            let trimmedDescription = shouldShowViewMore ? currentText + "...\n\nView product online for full description." : currentText;
            currentY += wrapText(ctx, trimmedDescription, textSectionStart, currentY, textMaxWidth, textConfig.description.lineHeight);
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

function wrapText(ctx, text, x, y, maxWidth, lineHeight, dryRun = false) {
    const lines = text.split('\n');
    let lastY = y;

    lines.forEach((originalLine) => {
        const line = originalLine.trimStart();
        const words = line.split(' ');
        let currentLine = '';

        for (let n = 0; n < words.length; n++) {
            let testLine = currentLine + words[n] + ' ';
            let metrics = ctx.measureText(testLine);
            let testWidth = metrics.width;
            if (testWidth > maxWidth && n > 0) {
                if (!dryRun) ctx.fillText(currentLine, x, lastY);
                currentLine = words[n] + ' ';
                lastY += lineHeight;
            } else {
                currentLine = testLine;
            }
        }
        if (!dryRun) ctx.fillText(currentLine.trim(), x, lastY);
        lastY += lineHeight; // Move to the next line
    });

    return lastY - y; // Return the height used by the text, useful for calculating potential overflow
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
