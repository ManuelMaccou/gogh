import { JSDOM } from 'jsdom';
import { createCanvas, loadImage } from 'canvas';
import Jimp from 'jimp';

async function createProductFrame(product) {
    console.log('Starting product frame generation.')
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
        console.log('Attempt to load product image:', product.image)
        if (product.image && product.image.trim() !== '') {
            const productImage = await loadImage(product.image).catch(err => { throw new Error('Failed to load image'); });


            // Use JIMP to extract the color of the top-left pixel
            const image = await Jimp.read(product.image);
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
        wrapText(ctx, product.title, textSectionStart, currentY, textMaxWidth, textConfig.title.lineHeight);
        currentY += textConfig.title.lineHeight + 20; // Adjust gap after title based on title's line height


        // Draw product description
        if (product.description && product.description.trim() !== '') {
            ctx.font = textConfig.description.font;
            ctx.fillStyle = textConfig.description.color;
            const dom = new JSDOM(`<body>${product.description}</body>`);
            const body = dom.window.document.body;
            const lines = [];
            processNode(body, lines, ctx, textMaxWidth);

            let descriptionStartY = (canvasHeight - (lines.length * textConfig.description.lineHeight)) / 2; // Center vertically

            lines.forEach(line => {
                wrapText(ctx, line, textSectionStart, descriptionStartY, textMaxWidth, textConfig.description.lineHeight);
                descriptionStartY += textConfig.description.lineHeight; // Increment Y position for each line with adjusted line height
            });
        }

        // Draw price
        if (product.price && product.price.trim() !== '') {
            ctx.font = textConfig.price.font;
            ctx.fillStyle = textConfig.price.color;
            ctx.textAlign = 'right';
            const priceRightMargin = 40;
            const priceBottomMargin = 30;
            const priceX = canvas.width - priceRightMargin;
            const priceY = canvas.height - priceBottomMargin;
            ctx.fillText(product.price, priceX, priceY); // No line height needed for single line text like price
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
    const words = text.split(' ');
    let line = '';

    for (let n = 0; n < words.length; n++) {
        // Append each word to the line or break line if it exceeds maxWidth
        let testLine = line + words[n] + ' ';
        let metrics = ctx.measureText(testLine);
        let testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
            ctx.fillText(line, x, y);
            line = words[n] + ' ';
            y += lineHeight; // Move to the next line
        } else {
            line = testLine; // Continue with the same line
        }
    }
    ctx.fillText(line, x, y); // Draw the remaining part of the text
}


function processNode(node, lines, ctx, maxWidth) {
    if (node.nodeType === node.TEXT_NODE) {
        // Split text node content into lines, considering word wrapping
        let words = node.textContent.trim().split(' ');
        let line = '';
        words.forEach(word => {
            let testLine = line + word + ' ';
            if (ctx.measureText(testLine).width > maxWidth) {
                if (line.trim() !== '') lines.push(line);
                line = word + ' ';
            } else {
                line = testLine;
            }
        });
        if (line.trim() !== '') lines.push(line);
    } else if (node.nodeName === 'UL' || node.nodeName === 'OL') {
        Array.from(node.children).forEach(li => processNode(li, lines, ctx, maxWidth));
    } else if (node.nodeName === 'LI') {
        // Handle list items with bullet points
        let words = node.textContent.trim().split(' ');
        let line = '• ';
        words.forEach(word => {
            let testLine = line + word + ' ';
            if (ctx.measureText(testLine).width > maxWidth) {
                lines.push(line);
                line = '• ' + word + ' '; // Start a new line with a bullet point
            } else {
                line = testLine;
            }
        });
        lines.push(line); // Ensure the last line is added
    } else {
        Array.from(node.childNodes).forEach(child => processNode(child, lines, ctx, maxWidth));
    }
}

const textConfig = {
    title: {
        font: 'bold 45px Arial',
        color: 'black',
        lineHeight: 60 // This is the line height for the title
    },
    description: {
        font: '30px Arial',
        color: 'black',
        lineHeight: 40 // Adjusted line height for the description
    },
    price: {
        font: 'bold 45px Arial',
        color: 'black',
        lineHeight: 45 // Example line height for the price, adjust as needed
    }
};

export default createProductFrame;
