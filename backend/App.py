import os
import tempfile
import re
import tesserocr
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from tesserocr import PyTessBaseAPI
from openpyxl import Workbook
from PIL import Image, ExifTags
import pandas as pd

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

inventory_data = []
processed_files = []

# Function to detect and correct image orientation
def correct_image_orientation(image_path):
    try:
        image = Image.open(image_path)

        # Check for EXIF data and orientation tag
        for orientation in ExifTags.TAGS.keys():
            if ExifTags.TAGS[orientation] == 'Orientation':
                break

        exif = image._getexif()

        if exif and orientation in exif:
            if exif[orientation] == 3:
                image = image.rotate(180, expand=True)
            elif exif[orientation] == 6:
                image = image.rotate(270, expand=True)
            elif exif[orientation] == 8:
                image = image.rotate(90, expand=True)

        # Save the corrected image
        corrected_image_path = os.path.join(UPLOAD_FOLDER, 'corrected_' + os.path.basename(image_path))
        image.save(corrected_image_path)
        return corrected_image_path

    except Exception as e:
        print(f"Error in correcting image orientation: {e}")
        return image_path  # Return original if correction fails

# OCR function after correcting orientation
def extract_text(image_path):
    corrected_image_path = correct_image_orientation(image_path)

    with tesserocr.PyTessBaseAPI(path=r'C:/Users/wonde/AppData/Local/Programs/Tesseract-OCR/tessdata') as api:
        api.SetImageFile(corrected_image_path)
        extracted_text = api.GetUTF8Text()

    return extracted_text

# Function to save the extracted data to an Excel file
def save_text_to_excel(extracted_text, delivery_date, invoice_total, filename):
    workbook = Workbook()
    worksheet = workbook.active
    worksheet.title = "Extracted Data"

    # Add the headers to the first row (corresponding to different columns)
    headers = ['Item#', 'Item Name', 'Brand', 'Pack Size', 'Price', 'Ordered', 'Confirmed Status']
    worksheet.append(headers)

    # Split the extracted text into lines
    lines = extracted_text.split('\n')

    # Iterate over each line and parse it into columns
    for line in lines:
        # Strip leading/trailing spaces
        line = line.strip()

        # Skip empty lines
        if not line:
            continue

        # Adjust this regex based on your invoice format
        # This assumes that fields are separated by one or more spaces or tabs
        match = re.split(r'\s{2,}|\t', line)

        # Check if we have enough fields for the row (e.g., expecting at least 6 fields)
        if len(match) >= 6:
            row = [
                match[0],  # Item#
                match[1],  # Item Name
                match[2],  # Brand
                match[3],  # Pack Size
                match[4],  # Price
                match[5],  # Ordered
            ]

            # Append the parsed row to the worksheet
            worksheet.append(row)

            # Save data to inventory list for display in Inventory
            inventory_data.append({
                'itemNumber': match[0],
                'itemName': match[1],
                'brand': match[2],
                'packSize': match[3],
                'price': match[4],
                'ordered': match[5],
                'status': 'Confirmed'  # Example status
            })

    # Add delivery date and invoice total at the bottom of the sheet
    worksheet.append([])
    worksheet.append(['Delivery Date:', delivery_date])
    worksheet.append(['Invoice Total:', invoice_total])

    # Save the workbook to a temporary file
    temp_file = tempfile.NamedTemporaryFile(suffix='.xlsx', delete=False)
    workbook.save(temp_file.name)

    # Save processed file metadata for later download
    processed_files.append({
        'name': filename,
        'path': temp_file.name
    })

    return temp_file.name

# Single route to process file, extract text, and optionally save to Excel
@app.route('/process', methods=['POST'])
def process_file():
    file = request.files['file']
    file_path = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(file_path)

    try:
        # Extract text from the image (with orientation correction)
        extracted_text = extract_text(file_path)

        # Optionally save the extracted text to an Excel file if `deliveryDate` and `invoiceTotal` are provided
        delivery_date = request.form.get('deliveryDate')
        invoice_total = request.form.get('invoiceTotal')

        if delivery_date and invoice_total:
            excel_path = save_text_to_excel(extracted_text, delivery_date, invoice_total, file.filename)
            return jsonify({'extractedText': extracted_text, 'excelPath': excel_path}), 200
        else:
            return jsonify({'extractedText': extracted_text}), 200

    except Exception as e:
        print(f"Error during file processing: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/upload_sales', methods=['POST'])
def upload_sales():
    file = request.files['file']
    file_ext = os.path.splitext(file.filename)[1].lower()

    try:
        if file_ext == '.csv':
            df = pd.read_csv(file)
        elif file_ext in ['.xls', '.xlsx']:
            df = pd.read_excel(file)
        else:
            return jsonify({'error': 'Unsupported file format'}), 400

        # Assuming the sales sheet has columns like 'Item', 'Quantity', 'Price', and 'Month'
        total_sales = (df['Quantity'] * df['Price']).sum()
        monthly_sales = df.groupby('Month')['Quantity'].sum() * df.groupby('Month')['Price'].mean()

        # Sample cost calculation (assumed from sales data or predefined)
        monthly_costs = monthly_sales * 0.7  # Assume costs are 70% of sales

        # Return sales figures
        return jsonify({
            'totalSales': total_sales,
            'averageMonthlySales': total_sales / 12,  # Simplified calculation
            'monthlySales': monthly_sales.tolist(),
            'monthlyCosts': monthly_costs.tolist()
        }), 200

    except Exception as e:
        print(f"Error parsing sales data: {e}")
        return jsonify({'error': str(e)}), 500

# Route to download the Excel file
@app.route('/download/<path:filename>', methods=['GET'])
def download_excel(filename):
    return send_file(filename, as_attachment=True)

# Route to get inventory data
@app.route('/inventory', methods=['GET'])
def get_inventory():
    return jsonify(inventory_data), 200

# Route to get processed files
@app.route('/files', methods=['GET'])
def get_processed_files():
    return jsonify(processed_files), 200

if __name__ == '__main__':
    app.run(debug=True)
