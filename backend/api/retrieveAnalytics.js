import { Router } from 'express';
const router = Router();
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = join(__dirname, '..', 'data');

router.get('/:filename', (req, res) => {
    const { filename } = req.params;
    const filePath = join(DATA_DIR, `${filename}.csv`);

    // Validate the filename to prevent directory traversal attacks
    if (!filename.includes('..') && !filename.includes('/') && !filename.includes('\\')) {
        res.download(filePath, (err) => {
            if (err) {
                console.error('Error downloading the file:', err);
                res.status(500).send('Error downloading the file');
            }
        });
    } else {
        // Invalid filename provided
        res.status(400).send('Invalid request');
    }
});

export default router;
