import os
import tempfile
import re
import pandas as pd
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
        print(f"Extracted Text: {extracted_text}")
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

# Save the extracted text into a .txt file
def save_text_to_txt(extracted_text, filename):
    # Save as a .txt file in the output folder
    txt_filename = filename.rsplit('.', 1)[0] + '.txt'
    txt_path = os.path.join(OUTPUT_FOLDER, txt_filename)

    with open(txt_path, 'w') as txt_file:
        txt_file.write(extracted_text)

    return txt_path


# Update the path to match the frontend output folder, or ensure the backend output folder is used
EXCEL_FILE = os.path.join('f:/WorkDevelopments-main/XseLLer8/backend/output', 'inventory.txt')

def update_excel_file(extracted_text, delivery_date, invoice_total):
    # Create or load the Excel file
    if os.path.exists(EXCEL_FILE):
        df = pd.read_excel(EXCEL_FILE)
    else:
        # Create a new DataFrame with the appropriate headers
        df = pd.DataFrame(columns=['Item#', 'Item Name', 'Brand', 'Pack Size', 'Price', 'Ordered', 'Confirmed Status'])

    # Process the extracted text
    lines = extracted_text.split('\n')
    temp_data = []

    for line in lines:
        line = line.strip()

        # Skip lines without relevant content
        if not line or any(keyword in line for keyword in ["Customer", "Invoice", "Total", "Date", "BRAND", "Quantity", "Pow"]):
            continue

        # Extract data by splitting lines with multiple spaces, tabs, or commas
        match = re.split(r'\s{2,}|\t|,', line)

        if len(match) >= 6:
            # Append extracted data
            temp_data.append({
                'Item#': match[0],
                'Item Name': match[1],
                'Brand': match[2],
                'Pack Size': match[3],
                'Price': match[4],
                'Ordered': match[5],
                'Confirmed Status': 'Confirmed'
            })

    if temp_data:
        new_data = pd.DataFrame(temp_data)

        # Update or merge data
        for index, row in new_data.iterrows():
            if row['Item Name'] in df['Item Name'].values:
                existing_row_index = df[df['Item Name'] == row['Item Name']].index[0]
                df.at[existing_row_index, 'Price'] = row['Price']
                df.at[existing_row_index, 'Ordered'] = str(int(df.at[existing_row_index, 'Ordered']) + int(row['Ordered']))
            else:
                df = pd.concat([df, pd.DataFrame([row])], ignore_index=True)

    # Append delivery date and invoice total
    footer_data = pd.DataFrame([{
        'Item#': '',
        'Item Name': f'Delivery Date: {delivery_date}',
        'Brand': '',
        'Pack Size': '',
        'Price': f'Invoice Total: {invoice_total}',
        'Ordered': '',
        'Confirmed Status': ''
    }])
    df = pd.concat([df, footer_data], ignore_index=True)
    print("Final DataFrame being written to Excel:")
    print(df)
    # Save the DataFrame to the Excel file
    with pd.ExcelWriter(EXCEL_FILE, engine='openpyxl', mode='w') as writer:
        df.to_excel(writer, index=False)

    return EXCEL_FILE

@app.route('/download/<path:filename>', methods=['GET'])
def download_excel(filename):
    file_path = os.path.join('f:/WorkDevelopments-main/XseLLer8/backend/output', filename)
    
    if os.path.exists(file_path):
        return send_file(file_path, as_attachment=True)
    else:
        return jsonify({'error': 'File not found'}), 404

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
