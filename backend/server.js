const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const tesseract = require('tesseract.js');
const ExcelJS = require('exceljs');
const chokidar = require('chokidar'); // For automating text-to-Excel conversion
const cors = require('cors');

// Add this line to ensure CORS is configured correctly
const corsOptions = {
  origin: 'http://localhost:3000', // Allow your React frontend
  optionsSuccessStatus: 200,
};

// Then use CORS with these options
app.use(cors(corsOptions));
const app = express();
app.use(cors());
app.use(express.json());

const UPLOAD_FOLDER = 'uploads';
const OUTPUT_FOLDER = 'output';
const EXCEL_FILE = path.join(OUTPUT_FOLDER, 'inventory.xlsx');

// Ensure the upload and output folders exist
if (!fs.existsSync(UPLOAD_FOLDER)) {
    fs.mkdirSync(UPLOAD_FOLDER);
}
if (!fs.existsSync(OUTPUT_FOLDER)) {
    fs.mkdirSync(OUTPUT_FOLDER);
}

// Set up multer for file upload handling
const upload = multer({ dest: UPLOAD_FOLDER });

// Inventory and processed files for the frontend display
let processed_files = [];

// Route to handle file upload and text extraction
app.post('/process', upload.single('file'), async (req, res) => {
    const file = req.file;
    const file_path = path.join(UPLOAD_FOLDER, file.filename);

    try {
        // Extract text using Tesseract OCR
        const extracted_text = await extractText(file_path);
        console.log(`Extracted Text: ${extracted_text}`);

        // Save the extracted text to a .txt file
        const txt_path = saveTextToTxt(extracted_text, 'temp_text.txt');

        // Add the text file to processed files list
        processed_files.push(txt_path);

        return res.status(200).json({ extractedText: extracted_text, txtPath: txt_path });
    } catch (error) {
        console.error(`Error during file processing: ${error}`);
        return res.status(500).json({ error: error.toString() });
    }
});

// Helper function for OCR extraction using Tesseract
async function extractText(file_path) {
    const { data: { text } } = await tesseract.recognize(file_path);
    return text;
}

// Save the extracted text to a .txt file
function saveTextToTxt(extracted_text, filename) {
    const txt_filename = filename.replace(/\.[^/.]+$/, ".txt");
    const txt_path = path.join(OUTPUT_FOLDER, txt_filename);

    fs.writeFileSync(txt_path, extracted_text, 'utf8');
    return txt_path;
}

async function mapTextToExcel(filePath) {
    try {
      let workbook = new ExcelJS.Workbook();
  
      // Create or load the inventory.xlsx file
      if (fs.existsSync(EXCEL_FILE)) {
        await workbook.xlsx.readFile(EXCEL_FILE);
      } else {
        const worksheet = workbook.addWorksheet('Inventory');
        worksheet.columns = [
          { header: 'Item#', key: 'item', width: 15 },
          { header: 'Item Name', key: 'name', width: 30 },
          { header: 'Brand', key: 'brand', width: 20 },
          { header: 'Pack Size', key: 'packSize', width: 15 },
          { header: 'Price', key: 'price', width: 10 },
          { header: 'Ordered', key: 'ordered', width: 10 },
          { header: 'Status', key: 'status', width: 15 }
        ];
      }
  
      const worksheet = workbook.getWorksheet('Inventory');
      
      // Read the text file and extract items
      const text = fs.readFileSync(filePath, 'utf8');
      console.log('Reading text file:', filePath); // Debug log
      const lines = text.split('\n').map(line => line.trim());
      let parsingItems = false;
  
      lines.forEach(line => {
        if (line.startsWith('TEE TEN BRAND')) {
          parsingItems = true;
          return;
        }
  
        if (parsingItems) {
          const match = line.split(/\s{2,}|\t+/);
          if (match.length >= 6) {
            const [itemNumber, itemName, brand, packSize, price, ordered, status] = match;
            worksheet.addRow({
              item: itemNumber,
              name: itemName,
              brand: brand,
              packSize: packSize,
              price: parseFloat(price.replace('$', '')) || 0,
              ordered: parseInt(ordered) || 0,
              status: status || 'Unknown'
            });
          }
        }
      });
  
      // Save the workbook
      await workbook.xlsx.writeFile(EXCEL_FILE);
      console.log(`Excel file updated and saved at: ${EXCEL_FILE}`);
    } catch (err) {
      console.error('Error in mapTextToExcel:', err); // Log any errors
    }
  }
  

// Watch the output folder for new .txt files (from Tesseract extraction)
const watcher = chokidar.watch(OUTPUT_FOLDER, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: true
  });
  
  // Event handler for when a new .txt file is added
  watcher.on('add', filePath => {
    if (path.extname(filePath) === '.txt') {
      console.log(`New .txt file detected: ${filePath}`); // Log the detected file
      mapTextToExcel(filePath).catch(err => console.error('Error mapping text to Excel:', err));
    }
  });

// Route to download the Excel file
app.get('/download/:filename', (req, res) => {
    const file_path = path.join(OUTPUT_FOLDER, req.params.filename);

    if (fs.existsSync(file_path)) {
        return res.sendFile(file_path);
    } else {
        return res.status(404).json({ error: 'File not found' });
    }
});

// Route to get processed files
app.get('/files', (req, res) => {
    return res.status(200).json(processed_files);
});

// Route to serve the inventory data
app.get('/inventory', async (req, res) => {
    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(EXCEL_FILE);

        const worksheet = workbook.getWorksheet('Inventory');
        const inventoryData = [];

        worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
            if (rowNumber > 1) {
                inventoryData.push({
                    itemNumber: row.getCell(1).value,
                    itemName: row.getCell(2).value,
                    brand: row.getCell(3).value,
                    packSize: row.getCell(4).value,
                    price: row.getCell(5).value,
                    ordered: row.getCell(6).value,
                    status: row.getCell(7).value
                });
            }
        });

        res.status(200).json(inventoryData);
    } catch (error) {
        console.error('Error reading inventory file:', error);
        res.status(500).json({ error: 'Failed to retrieve inventory data' });
    }
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
