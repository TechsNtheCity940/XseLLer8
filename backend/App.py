import os
import tempfile
import re
import tesserocr
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from tesserocr import PyTessBaseAPI
from openpyxl import load_workbook, Workbook

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = 'uploads'
OUTPUT_FOLDER = 'output'  # Backend output folder for saving Excel
EXCEL_FILE = os.path.join(OUTPUT_FOLDER, 'inventory.xlsx')

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

if not os.path.exists(OUTPUT_FOLDER):
    os.makedirs(OUTPUT_FOLDER)

inventory_data = []  # This will hold the inventory for the frontend display
processed_files = []  # This will store processed files for download

# Route to handle file upload and text extraction
@app.route('/process', methods=['POST'])
def process_file():
    file = request.files['file']
    file_path = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(file_path)

    try:
        # Extract text from the image
        extracted_text = extract_text(file_path)

        # Save the extracted text to the Excel file in the backend output folder
        delivery_date = request.form.get('deliveryDate', 'Not Available')
        invoice_total = request.form.get('invoiceTotal', 'Not Available')
        excel_path = update_excel_file(extracted_text, delivery_date, invoice_total)

        return jsonify({'extractedText': extracted_text, 'excelPath': excel_path}), 200
    except Exception as e:
        print(f"Error during file processing: {e}")
        return jsonify({'error': str(e)}), 500

# Helper function for OCR extraction using Tesseract
def extract_text(file_path):
    with PyTessBaseAPI(path=r'C:/Users/wonde/AppData/Local/Programs/Tesseract-OCR/tessdata') as api:
        api.SetImageFile(file_path)
        extracted_text = api.GetUTF8Text()
        return extracted_text

# Function to update or create the Excel file with new data
def update_excel_file(extracted_text, delivery_date, invoice_total):
    # Check if the Excel file exists
    if os.path.exists(EXCEL_FILE):
        workbook = load_workbook(EXCEL_FILE)
        worksheet = workbook.active
    else:
        workbook = Workbook()
        worksheet = workbook.active
        worksheet.title = "Inventory"
        headers = ['Item#', 'Item Name', 'Brand', 'Pack Size', 'Price', 'Ordered', 'Confirmed Status']
        worksheet.append(headers)

    # Existing data dictionary (to update if item already exists)
    existing_data = {}
    for row in worksheet.iter_rows(min_row=2, values_only=True):  # Skip headers
        item_name = row[1]  # Assuming item name is in the second column
        existing_data[item_name] = list(row)

    # Process the extracted text line by line
    lines = extracted_text.split('\n')
    for line in lines:
        line = line.strip()
        if not line:
            continue

        # Adjust regex based on your invoice format (assuming space or tab separation)
        match = re.split(r'\s{2,}|\t', line)
        if len(match) >= 6:  # Make sure enough fields are present
            item_number, item_name, brand, pack_size, price, ordered = match[:6]

            if item_name in existing_data:
                # Update existing row
                existing_row = existing_data[item_name]
                existing_row[4] = price  # Update price
                existing_row[5] = str(int(existing_row[5]) + int(ordered))  # Add ordered quantity
                existing_data[item_name] = existing_row  # Update in dictionary
            else:
                # Add new item
                new_row = [item_number, item_name, brand, pack_size, price, ordered, 'Confirmed']
                existing_data[item_name] = new_row  # Add to dictionary

            # Also update inventory_data for frontend API
            inventory_data.append({
                'itemNumber': item_number,
                'itemName': item_name,
                'brand': brand,
                'packSize': pack_size,
                'price': price,
                'ordered': ordered,
                'status': 'Confirmed'
            })

    # Clear existing rows in the worksheet (except headers) and update with new data
    worksheet.delete_rows(2, worksheet.max_row)
    for row_data in existing_data.values():
        worksheet.append(row_data)

    # Append delivery date and invoice total
    worksheet.append([])
    worksheet.append(['Delivery Date:', delivery_date])
    worksheet.append(['Invoice Total:', invoice_total])

    # Save the updated workbook to the backend output folder
    workbook.save(EXCEL_FILE)

    # Store processed file information for download
    processed_files.append({
        'name': 'inventory.xlsx',
        'path': EXCEL_FILE
    })

    return EXCEL_FILE

# Route to download the Excel file
@app.route('/download/<path:filename>', methods=['GET'])
def download_excel(filename):
    file_path = os.path.join(OUTPUT_FOLDER, os.path.basename(filename))
    if not os.path.exists(file_path):
        return jsonify({'error': 'File not found.'}), 404
    return send_file(file_path, as_attachment=True)

# Route to get inventory data for frontend
@app.route('/inventory', methods=['GET'])
def get_inventory():
    return jsonify(inventory_data), 200

# Route to get processed files
@app.route('/files', methods=['GET'])
def get_processed_files():
    return jsonify(processed_files), 200

if __name__ == '__main__':
    app.run(debug=True)
