const express = require('express');
const multer = require('multer'); // For file uploads
const updateExcelFile = require('./updateExcel'); // The function to update Excel file

const router = express.Router();
const upload = multer({ dest: 'uploads/' }); // Upload destination

router.post('/process', upload.single('file'), (req, res) => {
  // Simulate extracted data from the uploaded file
  const newData = [
    { itemName: 'Item A', brand: 'Brand A', packSize: '2kg', price: 20.0, ordered: 5, status: 'In Stock' },
    { itemName: 'Item C', brand: 'Brand C', packSize: '1kg', price: 10.0, ordered: 8, status: 'In Stock' },
    // More items...
  ];

  // Update or create the Excel file with new data
  const filePath = updateExcelFile(newData);

  // Send back the path to the updated Excel file
  res.json({ excelPath: filePath, extractedText: 'Data processed and Excel updated.' });
});

// Route to download the Excel file
router.get('/download/:fileName', (req, res) => {
  const filePath = path.join(__dirname, 'output', req.params.fileName);
  res.download(filePath);
});

module.exports = router;

