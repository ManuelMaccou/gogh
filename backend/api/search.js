import { Router } from 'express';
const router = Router();
import Client from './elasticsearch-client.js';
import { existsSync, mkdirSync, appendFile } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import GenerateBookImage from '../utils/bookImageGenerator.js';
import { body, query, validationResult } from 'express-validator';
import Image from '../models/image.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = join(__dirname, '..', 'data');

async function storeImage(imageBuffer, contentType) {
    const image = new Image({
      data: imageBuffer,
      contentType: contentType,
    });
    await image.save();
    return image._id; // Returns the MongoDB ID of the saved image
  }

const ensureDirectoryExists = (dirPath) => {
    if (!existsSync(dirPath)) {
        mkdirSync(dirPath, { recursive: true });
    }
};

const appendToCSV = async (filename, data) => {
    ensureDirectoryExists(DATA_DIR);
    const csvPath = join(DATA_DIR, `${filename}.csv`);
    
    try {
        await new Promise((resolve, reject) => {
            appendFile(csvPath, `${data}\n`, (err) => {
                if (err) {
                    console.error('Error appending to CSV:', err);
                    reject(err); // Reject the promise on error
                } else {
                    console.log('Data appended to CSV:', csvPath);
                    console.log('Data:', data);
                    resolve(); // Resolve the promise on success
                }
            });
        });
    } catch (error) {
        console.error("Error appending to CSV:", error);
    }
};

const logBookQueryToCSV = async (query) => {
    const now = new Date().toISOString();
    const sanitizedQuery = query.replace(/[\r\n]+/g, ' ').replace(/,/g, ';');
    const data = `"${sanitizedQuery}","${now}"`;

    await appendToCSV('books_queries', data);
};

router.post('/books', [
    // Validate and sanitize the "query" parameter
    query('query').optional().trim().escape().isString(),
    body('untrustedData.inputText').optional().trim().escape(),
    body('untrustedData.buttonIndex').optional().toInt(),
  ], async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

    const { inputText, buttonIndex } = req.body.untrustedData || {};

    let index = parseInt(req.query.index) || 0;
    let initial = req.query.initial === 'true';
    let query = req.query.query || inputText;

    // Define image URLs
    const defaultImage = "https://aef8cbb778975f3e4df2041ad0bae1ca.cdn.bubble.io/f1708021185091x477780439670159040/book-store-frame_2.jpg";
    const alternateImage = "https://aef8cbb778975f3e4df2041ad0bae1ca.cdn.bubble.io/f1708021395943x353089813996647400/try-again-book.jpg?";
    const specialImage = "https://aef8cbb778975f3e4df2041ad0bae1ca.cdn.bubble.io/f1708015513348x700473003573649300/book_rec_image.jpg";

    if (initial) {
        if (buttonIndex === 2 && !query) {
            // Scenario: initial is true, buttonIndex is 2, query is empty
            return res.send(getResetHTML(specialImage));
        } else if (buttonIndex === 1) {
            if (!query) {
                // Scenario: initial is true, buttonIndex is 1, query is empty
                return res.send(getResetHTML(alternateImage));
            } else {
                // Scenario: initial is true, buttonIndex is 1, query is not empty
                index = 0; // Reset index and proceed with full flow
            }
        }
    } else if (buttonIndex === 3) {
        // Scenario: initial is not true (or not present), and buttonIndex is 3
        return res.send(getResetHTML(defaultImage));
    }


      try {
        await logBookQueryToCSV(query);
    } catch (error) {
        console.error("Failed to log book query to CSV:", error);
    }

    
    if (!initial) {
        if (buttonIndex === 1 && query) {
            index = index === 0 ? 9 : index - 1;
        } else if (buttonIndex === 2) {
            index = index === 9 ? 0 : index + 1;
        }
    }

  try {
    const response = await Client.searchTemplate({
      index: 'search-gogh-books',
      body: {
        id: 'gogh-books-search-template',
        params: {
            knn_query: query,
            text_query: query,
            k: 10,
            num_candidates: 100,
            rrf_window_size: 50,
            rrf_rank_constant: 20
        }
      }
    });
    
    if (response && response.hits && response.hits.hits.length > index) {

        const selectedResult = response.hits.hits[index];

        const productData = {
            imageUrl: selectedResult._source.image,
            description: selectedResult._source.short_description,
          };

          const generateBookImageBuffer = await GenerateBookImage(productData);
          const bookImageId = await storeImage(generateBookImageBuffer, 'image/jpeg');
          const generatedBookImage = `${req.protocol}://${req.headers.host}/image/${bookImageId}`;

  
        const results = {
          id: selectedResult._id,
          title: selectedResult._source.title,
          description: selectedResult._source.short_description,
          image: generatedBookImage,
          author: selectedResult._source.creator,
          checkoutUrl: selectedResult._source.checkout_url,
          productUrl: selectedResult._source.product_url,
        };
  
            // Generate HTML content based on the selected result
            const htmlContent = generateHTMLResponse(results, index, query);
    
            res.status(200).send(htmlContent);
        } else {
            console.error('No hits or response is undefined');
            res.status(404).json({ success: false, message: "No results found or query failed." });
        }
    } catch (error) {
      console.error('Elasticsearch search error:', error);
      res.status(500).send('Internal Server Error');
    }
});

  
function getResetHTML(imageToUse) {

    return `
    <!DOCTYPE html>
    <html>
        <head>
        <title>Gogh Books</title>
            <meta name="description" content="A collection of books in the Gogh Mall" />
            <meta property="og:url" content="https://www.gogh.shopping" />
            <meta property="og:image" content="${imageToUse}" />
            <meta property="fc:frame" content="vNext" />
            <meta name="fc:frame:post_url" content="${process.env.BASE_URL}/api/search/books?initial=true" />
            <meta property="fc:frame:image" content="${imageToUse}" />
            <meta property="fc:frame:image:aspect_ratio" content="" />
            <meta property="fc:frame:input:text" content="Describe a book or topic" />
            <meta property="fc:frame:button:1" content="Search" />
            <meta property="fc:frame:button:2" content="Recommend a book" />
        </head>
    </html>
    `;
}

function generateHTMLResponse(results, index, query) {
    const htmlContent = `
    <!DOCTYPE html>
    <html>
        <head>
        <title>Gogh Books</title>
            <meta name="description" content="A collection of books in the Gogh Mall" />
            <meta property="og:url" content="${results.productUrl}" />
            <meta property="fc:frame" content="vNext" />
            <meta name="fc:frame:post_url" content="${process.env.BASE_URL}/api/search/books?index=${index}&query=${query}" />
            <meta property="fc:frame:image" content="${results.image}" />
            <meta property="fc:frame:image:aspect_ratio" content="" />
            <meta property="fc:frame:button:1" content="prev" />
            <meta property="fc:frame:button:2" content="next" />
            <meta property="fc:frame:button:3" content="go back" />
            <meta property="fc:frame:button:4" content="buy" />
            <meta property="fc:frame:button:4:action" content="link" />
            <meta property="fc:frame:button:4:target" content="${results.productUrl}" />
        </head>
    </html>
    `;
    return htmlContent;
}

export default router;
