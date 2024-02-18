import { JSDOM } from 'jsdom';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createCanvas, loadImage } from 'canvas';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


async function GenerateDescriptionImage(productData) {

    const backgroundImageUrl = join(__dirname, '../files/frame_description_bg_dark.jpg');
    const background = await loadImage(backgroundImageUrl);

    const canvas = createCanvas(background.width, background.height);
    const ctx = canvas.getContext('2d');

    // Draw the background image
    ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

    const dom = new JSDOM(productData.description);
    const body = dom.window.document.body;

    const textMarginHorizontal = 120; // Horizontal margin for text
    const maxWidth = canvas.width - 2 * textMarginHorizontal; // Effective max width for text
    ctx.font = '26px Arial'; // Set font for text rendering
    ctx.fillStyle = 'white';

    // Function to process HTML nodes and extract text lines, including handling of <li> tags
    const lines = [];
    function processNode(node) {
        if (node.nodeType === dom.window.Node.TEXT_NODE) {
            // Split text node content into words for line wrapping
            const words = node.textContent.trim().split(/\s+/);
            wrapText(words, false); // Regular text, not a bullet point
        } else if (node.nodeName === 'BR') {
            // lines.push(''); // Add an empty line for <br>
        } else if (node.nodeName === 'UL' || node.nodeName === 'OL') {
            Array.from(node.children).forEach(li => processNode(li)); // Process list items
            lines.push('');
        } else if (node.nodeName === 'LI') {
            const words = node.textContent.trim().split(/\s+/);
            wrapText(words, true); // Text with bullet point
        } else if (node.nodeName === 'P') {
            Array.from(node.childNodes).forEach(child => processNode(child));
            // lines.push(''); // Optional: Add an empty line after paragraphs
        }
    }

    function wrapText(words, isBullet) {
        let currentLine = isBullet ? '• ' : '';
        words.forEach(word => {
            const testLine = currentLine + (currentLine.length > 0 ? ' ' : '') + word;
            if (ctx.measureText(testLine).width > maxWidth) {
                lines.push(currentLine);
                currentLine = isBullet ? '• ' + word : word; // Start new line
            } else {
                currentLine = testLine;
            }
        });
        if (currentLine.trim().length > 0) {
            lines.push(currentLine); // Add remaining text
        }
    }

    // Process all nodes within the body
    Array.from(body.childNodes).forEach(processNode);

    // Calculate the starting Y position to center the text vertically
    const lineHeight = 28; // Adjust line height based on font size
    const totalTextHeight = lines.length * lineHeight;
    let currentY = (canvas.height - totalTextHeight) / 2;

    // Render the lines on the canvas
    lines.forEach(line => {
        if (line !== '') {
            ctx.fillText(line, textMarginHorizontal, currentY, maxWidth);
        }
        currentY += lineHeight;
    });

    // Price text
    ctx.font = 'bold 32px Arial';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';

    // Position for the price text: bottom right corner, with some margin
    const priceMargin = 70; // Margin from the right and bottom edges
    const priceX = canvas.width - priceMargin;
    const priceY = canvas.height - priceMargin;

    // Draw the price text
    ctx.fillText(productData.price, priceX, priceY);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    return dataUrl;
}

export default GenerateDescriptionImage;
