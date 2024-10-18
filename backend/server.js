const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const tesseract = require('tesseract.js');
const chokidar = require('chokidar');
const { spawn } = require('child_process');
const { parse } = require('json2csv'); // Importing the json2csv library for CSV conversion
const mime = require('mime-types');
const winston = require('winston');  // Advanced logging library

// Initialize the express app
const app = express();
app.use(cors());
app.use(express.json());

const UPLOAD_FOLDER = 'uploads';
const OUTPUT_FOLDER = path.join(__dirname, 'output');  // Adjusted path for portability
const ARCHIVE_FOLDER = path.join(OUTPUT_FOLDER, 'archive');
const JSON_FILE = path.join(OUTPUT_FOLDER, 'inventory_data.json');

// Custom transport for saving specific logs to a separate file
const extractTransport = new winston.transports.File({
    filename: path.join(__dirname, 'logs', 'extracted.txt'),
    level: 'info',
    format: winston.format.combine(
        winston.format.printf(({ message }) => {
            // Only log messages containing "Extracted Text"
            return message.includes('Extracted Text') ? message : ''; // Return empty string if not matched
        })
    )
});


// Set up Winston logger with both the default and custom transports
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => `${timestamp} [${level.toUpperCase()}] - ${message}`)
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: path.join(__dirname, 'logs', 'app.log') }),
        extractTransport // Add custom transport for extracted text logs
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

// Route to handle file upload and text extraction using app.py
app.post('/process', upload.single('file'), async (req, res) => {
    const file = req.file;
    const file_path = path.join(UPLOAD_FOLDER, file.filename);
    const fileType = mime.lookup(file.originalname);
    const baseFilename = path.parse(file.originalname).name; // Get the base name without extension
    if (!fileType || !fileType.startsWith('image/')) {
        logger.error(`Uploaded file ${file.originalname} is not a valid image`);
        return res.status(400).json({ error: 'Uploaded file is not a valid image' });
    }

    try {
        // Run the Python script (app.py) to extract text
        const pythonProcess = spawn('python', [path.join(__dirname, 'app.py'), file_path]);

        let scriptOutput = '';
        pythonProcess.stdout.on('data', (data) => {
            scriptOutput += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            logger.error(`Python script error: ${data}`);
        });

        pythonProcess.on('close', async (code) => {
            if (code !== 0) {
                logger.error(`Python script exited with code ${code}`);
                return res.status(500).json({ error: 'Failed to process the file' });
            }

            try {
                // Parse the script output as JSON
                const jsonData = JSON.parse(scriptOutput);
                logger.info(`Extracted data from app.py: ${JSON.stringify(jsonData)}`);

                // Generate the filenames for each format
                const txtFilePath = path.join(OUTPUT_FOLDER, `${baseFilename}.txt`);
                const jsonFilePath = path.join(OUTPUT_FOLDER, `${baseFilename}.json`);
                const csvFilePath = path.join(OUTPUT_FOLDER, `${baseFilename}.csv`);

                // Save data in .txt format
                await fs.promises.writeFile(txtFilePath, scriptOutput, 'utf8');
                logger.info(`Data saved as .txt file: ${txtFilePath}`);

                // Save data in .json format
                await fs.promises.writeFile(jsonFilePath, JSON.stringify(jsonData, null, 2), 'utf8');
                logger.info(`Data saved as .json file: ${jsonFilePath}`);

                // Convert JSON to CSV and save it
                const csvData = parse(jsonData);
                await fs.promises.writeFile(csvFilePath, csvData, 'utf8');
                logger.info(`Data saved as .csv file: ${csvFilePath}`);

                // Cleanup: Delete the uploaded file after processing
                fs.unlinkSync(file_path);
                logger.info(`File ${file.originalname} successfully processed and deleted.`);

                res.status(200).json({ 
                    message: 'Data processed successfully',
                    files: {
                        txt: txtFilePath,
                        json: jsonFilePath,
                        csv: csvFilePath
                    }
                });
            } catch (parseError) {
                logger.error(`Failed to parse output from app.py: ${parseError}`);
                res.status(500).json({ error: 'Invalid output format from Python script' });
            }
        });
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
function mapTextToJSON(extracted_text) {
    const lines = extracted_text.split('\n').map(line => line.trim());
    const jsonData = {lines};
    let currentItem = {};  // To store the current item being processed
    let currentItemNumber = '';  // Store item number to associate with additional data

    console.log("Processing lines from extracted text...");

    // Regular expression patterns
    const itemNumberPattern = /^[A-Za-z0-9]+$/;
    const numericPattern = /^[0-9]+(\.[0-9]+)?$/;

    lines.forEach((line, index) => {
        // Skip empty lines or irrelevant lines
        if (!line || line.match(/Invoice|Customer|Delivery|pieces|Email|Branch|NAME/i)) {
            console.log(`Skipping line due to irrelevant content: "${line}"`);
            return;
        }

        const match = line.split(/\s{2,}|\t+/);  // Split by multiple spaces or tabs

        // Check if the line might contain product data
        if (match.length >= 1) {
            // Check if first element looks like an item number
            const itemNumber = match[0] && itemNumberPattern.test(match[0]) ? match[0].trim() : null;

            if (itemNumber) {
                // If it's a valid item number, process the product data
                const itemName = match.slice(1, match.length - 4).join(' ').trim();  // Capture everything until pack size
                const packSize = match[match.length - 4] ? match[match.length - 4].trim() : 'Unknown';
                const price = match[match.length - 3] ? parseFloat(match[match.length - 3].replace('$', '').trim()) || 0 : 0;
                const ordered = match[match.length - 2] ? parseInt(match[match.length - 2].trim()) || 0 : 0;
                const status = match[match.length - 1] ? match[match.length - 1].trim() : 'Unknown';

                // Construct the current item object
                currentItem = {
                    'ITEM#': itemNumber,
                    'ITEM NAME': itemName,
                    'PACKSIZE': packSize,
                    'PRICE': price,
                    'ORDERED': ordered,
                    'STATUS': status,
                };

                currentItemNumber = itemNumber;  // Store the item number for future use
                jsonData[itemNumber] = currentItem;  // Save the item into JSON

                console.log(`Processed item: ${JSON.stringify(currentItem)}`);
            }
        } else if (line.match(/per case|per pound/i) && currentItemNumber) {
            // Append additional details like "per case" or "per pound" to the previous item's pack size
            jsonData[currentItemNumber]['PACKSIZE'] += ' ' + line.trim();
            console.log(`Appended additional info to ${currentItemNumber}: ${line.trim()}`);
        } else {
            console.log(`Skipping line due to insufficient data: "${line}"`);
        }
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

// Path to your inventory data file
const inventoryFile = path.join('F:','repogit', 'XseLLer8', 'inventory_data.json');

// API route to get inventory data
app.get('/inventory', (req, res) => {
  // Read the inventory data from the file and send it as a JSON response
  fs.readFile(inventoryFile, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading inventory data:', err);
      return res.status(500).json({ error: 'Failed to load inventory data' });
    }

    try {
      const jsonData = JSON.parse(data);  // Parse the file contents
      res.json(jsonData);  // Send the parsed JSON as the response
    } catch (parseError) {
      console.error('Error parsing inventory data:', parseError);
      res.status(500).json({ error: 'Invalid JSON format in inventory file' });
    }
  });
});

// Function to update inventory with new invoice data
function updateInventory(newData) {
  const inventory = JSON.parse(fs.readFileSync(inventoryFile, 'utf-8'));

  newData.forEach((newItem) => {
    const existingItem = inventory.find(item => item['ITEM#'] === newItem['ITEM#']);

    if (existingItem) {
      // Update the item with the most recent price and add the old price to history
      existingItem.priceHistory.push({
        price: existingItem.PRICE,
        date: existingItem.lastUpdated,
      });

      existingItem.PRICE = newItem.PRICE;
      existingItem.ORDERED = newItem.ORDERED;
      existingItem.STATUS = newItem.STATUS;
      existingItem.lastUpdated = new Date().toISOString();  // Keep track of when the price was updated

    } else {
      // Add the new item to the inventory
      newItem.priceHistory = [];
      newItem.lastUpdated = new Date().toISOString();
      inventory.push(newItem);
    }
  });

  // Save the updated inventory back to the file
  fs.writeFileSync(inventoryFile, JSON.stringify(inventory, null, 2), 'utf-8');
}


// Watch the output folder for new .txt files (optional)
const watcher = chokidar.watch(OUTPUT_FOLDER, {
    persistent: true,
    ignoreInitial: false,
    awaitWriteFinish: { stabilityThreshold: 2000, pollInterval: 100 }
});

watcher.on('add', async filePath => {
    if (path.extname(filePath) === '.txt') {
        logger.info(`Detected new file: ${filePath}`);
        try {
            const fileData = await fs.promises.readFile(filePath, 'utf8');
            const jsonData = mapTextToJSON(fileData);
            updateInventory(jsonData);
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