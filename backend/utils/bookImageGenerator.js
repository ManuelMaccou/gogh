import { join } from 'path';
import { createCanvas, loadImage } from 'canvas';

async function GenerateBookImage(productData) {
    const dynamicImageUrl = productData.imageUrl;
    const dynamicImage = await loadImage(dynamicImageUrl);

    const backgroundImageUrl = join(__dirname, '../files/book_frame_background.jpg');
    const background = await loadImage(backgroundImageUrl);

    const canvas = createCanvas(background.width, background.height);
    const ctx = canvas.getContext('2d');

    // Draw the background image
    ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

    // Configuration for margins and paddings
    const topMargin = 20; // Margin at the top of the canvas
    const leftMargin = 40; // Margin at the left of the canvas for the image
    const leftTextPadding = 100; // Adjustable padding at the left of the text area
    const rightTextPadding = 100; // Adjustable padding at the right of the text area
    const bookPortion = 1/3; // The portion of the canvas width the book image will take up

    // Calculate and draw the dynamic book image
    const imageAreaWidth = canvas.width * bookPortion - leftMargin;
    const scale = Math.min(imageAreaWidth / dynamicImage.width, (canvas.height - topMargin) / dynamicImage.height);
    const scaledWidth = dynamicImage.width * scale;
    const scaledHeight = dynamicImage.height * scale;
    const imageXPosition = leftMargin + (imageAreaWidth - scaledWidth) / 2;
    const imageYPosition = topMargin + ((canvas.height - topMargin - scaledHeight) / 2);
    ctx.drawImage(dynamicImage, imageXPosition, imageYPosition, scaledWidth, scaledHeight);

    ctx.font = 'bold 26px Arial';
    ctx.fillStyle = 'white'; // Adjust text color as needed
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    // Text area configuration
    const textAreaStart = canvas.width * bookPortion + leftTextPadding;
    const textAreaWidth = canvas.width * (1 - bookPortion) - leftTextPadding - rightTextPadding;

    // Split and wrap the text
    const words = productData.description.split(' ');
    const lines = [];
    let line = '';

    words.forEach(word => {
        const testLine = line + word + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > textAreaWidth && line.length > 0) {
            lines.push(line);
            line = word + ' ';
        } else {
            line = testLine;
        }
    });
    lines.push(line); // Push the last line

    // Calculate the starting Y position to center the text vertically
    const lineHeight = 34;
    const totalTextHeight = lines.length * lineHeight;
    let textYPosition = topMargin + ((canvas.height - topMargin - totalTextHeight) / 2);

    // Draw the text within the configured area
    lines.forEach(line => {
        ctx.fillText(line.trim(), textAreaStart, textYPosition, textAreaWidth);
        textYPosition += lineHeight;
    });

    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    return dataUrl;
}

export default GenerateBookImage;
