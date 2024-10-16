const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const tesseract = require('tesseract.js');
const chokidar = require('chokidar');
const { spawn } = require('child_process');
const winston = require('winston');  // Advanced logging library

// Initialize the express app
const app = express();
app.use(cors());
app.use(express.json());

const UPLOAD_FOLDER = 'uploads';
const OUTPUT_FOLDER = path.join(__dirname, 'output');  // Adjusted path for portability
const ARCHIVE_FOLDER = path.join(OUTPUT_FOLDER, 'archive');
const JSON_FILE = path.join(OUTPUT_FOLDER, 'inventory_data.json');

// Set up Winston logger for better logging
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => `${timestamp} [${level.toUpperCase()}] - ${message}`)
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: path.join(__dirname, 'logs', 'app.log') })
    ]
});

// Ensure upload and output folders exist
[UPLOAD_FOLDER, OUTPUT_FOLDER, ARCHIVE_FOLDER].forEach(folder => {
    if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
    }
});

// Set up multer for file upload handling
const upload = multer({ dest: UPLOAD_FOLDER });

// Route to handle file upload and text extraction
app.post('/process', upload.single('file'), async (req, res) => {
    const file = req.file;
    const file_path = path.join(UPLOAD_FOLDER, file.filename);

    try {
        // Extract text using Tesseract OCR
        const extracted_text = await extractText(file_path);
        logger.info(`Extracted Text from file ${file.originalname}: ${extracted_text}`);

        // Process extracted text and store it as a JSON object
        const jsonData = mapTextToJSON(extracted_text);
        await saveDataToJSONFile(jsonData, JSON_FILE);

        // Cleanup: Delete the uploaded file after processing
        fs.unlinkSync(file_path);
        logger.info(`File ${file.originalname} successfully processed and deleted.`);

        res.status(200).json({ message: 'Data processed successfully', data: jsonData });
    } catch (error) {
        logger.error(`Error during file processing for ${file.originalname}: ${error}`);
        res.status(500).json({ error: error.toString() });
    }
});

// Helper function for OCR extraction using Tesseract
async function extractText(file_path) {
    try {
        const { data: { text } } = await tesseract.recognize(file_path);
        return text;
    } catch (error) {
        logger.error(`OCR extraction failed for file ${file_path}: ${error}`);
        throw error;
    }
}
// Function to process the extracted text into a structured JSON dictionary
function mapTextToJSON(extracted_text) {
    const lines = extracted_text.split('\n').map(line => line.trim());
    const jsonData = {};
    let currentItem = {};

    console.log("Processing lines from extracted text...");

    lines.forEach((line, index) => {
        if (!line) return;  // Skip empty lines

        // Use a more strict approach, expecting at least 6 fields, separated by multiple spaces or tabs
        const match = line.split(/\s{2,}|\t+/);

        // Check if we have enough fields, if not log and skip this line
        if (match.length < 6) {
            console.log(`Skipping line due to insufficient data (Expected at least 6 columns, got ${match.length}): "${line}"`);
            return;
        }

        // Safely assign each field with validation
        const itemNumber = match[0] ? match[0].trim() : 'Unknown';
        const itemName = match[1] ? match[1].trim() : 'Unknown';
        const brand = match[2] ? match[2].trim() : 'Unknown';
        const packSize = match[3] ? match[3].trim() : 'Unknown';
        const price = match[4] ? parseFloat(match[4].replace('$', '').trim()) || 0 : 0;
        const ordered = match[5] ? parseInt(match[5].trim()) || 0 : 0;
        const status = match[6] ? match[6].trim() : 'Unknown';

        // Add current item to the JSON structure
        currentItem = {
            'ITEM#': itemNumber,
            'ITEM NAME': itemName,
            'BRAND': brand,
            'PACKSIZE': packSize,
            'PRICE': price,
            'ORDERED': ordered,
            'STATUS': status,
        };

        // Log for debugging and tracking
        console.log(`Processed item: ${JSON.stringify(currentItem)}`);

        // Use the ITEM# as the key in the JSON object
        jsonData[itemNumber] = currentItem;
    });

    console.log('Final JSON Data:', jsonData);
    return jsonData;
}

// Function to save data to JSON file
async function saveDataToJSONFile(data, filename) {
    try {
        const jsonData = JSON.stringify(data, null, 2);
        await fs.promises.writeFile(filename, jsonData, 'utf8');
        logger.info(`Data written to ${filename}`);
    } catch (error) {
        logger.error(`Failed to write JSON data to ${filename}: ${error}`);
        throw error;
    }
}

// Example JSON data (for testing)
const available_products = {
    1001: {
        "ITEM#": 131080,
        "ITEM NAME": "Beef Patty 75% Angus Wide",
        "BRAND": "Winn Meat",
        "PACKSIZE": "24/17 oz",
        "PRICE": 38.13,
        "ORDERED": 6,
        "STATUS": "Filled"
    },
    1002: {
        "ITEM#": 550221,
        "ITEM NAME": "Chicken Breast 8oz Butterfly",
        "BRAND": "Koch Foods",
        "PACKSIZE": "210 lb",
        "PRICE": 69.13,
        "ORDERED": 13,
        "STATUS": "Filled"
    },
    1003: {
        "ITEM#": 884043,
        "ITEM NAME": "Mustard Yellow Upside Down",
        "BRAND": "Heinz",
        "PACKSIZE": "16/13 oz",
        "PRICE": 31.77,
        "ORDERED": 2,
        "STATUS": "Out of stock"
    }
};
saveDataToJSONFile(available_products, JSON_FILE);

// Watch the output folder for new .txt files (optional)
const watcher = chokidar.watch(OUTPUT_FOLDER, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 2000, pollInterval: 100 }
});

watcher.on('add', async filePath => {
    if (path.extname(filePath) === '.txt') {
        logger.info(`Detected new file: ${filePath}`);
        try {
            const fileData = await fs.promises.readFile(filePath, 'utf8');
            const jsonData = mapTextToJSON(fileData);
            await saveDataToJSONFile(jsonData, JSON_FILE);

            // Move the processed file to the archive folder
            const archivedFile = path.join(ARCHIVE_FOLDER, path.basename(filePath));
            await fs.promises.rename(filePath, archivedFile);
            logger.info(`File archived to: ${archivedFile}`);
        } catch (error) {
            logger.error(`Failed to process and archive file ${filePath}: ${error}`);
        }
    }
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
});