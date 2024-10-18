import os
import re
import csv
import json
import shutil
from pdfminer.high_level import extract_text
import pytesseract
from PIL import Image, UnidentifiedImageError
import pandas as pd
import docx2txt
import openpyxl


# Set up Tesseract OCR
pytesseract.pytesseract.tesseract_cmd = r"C:/Users/wonde/AppData/Local/Programs/Tesseract-OCR/tesseract.exe"  # Replace with your Tesseract path

# Function to extract text from PDF files
def extract_pdf_text(pdf_file):
    text = extract_text(pdf_file)
    return text

# Function to extract text from image files using OCR
def extract_image_text(image_file):
    img = Image.open(image_file)
    text = pytesseract.image_to_string(img)
    return text

# Function to extract text from .docx files
def extract_docx_text(docx_file):
    text = docx2txt.process(docx_file)
    return text

def extract_excel_text(excel_file):
    xlsx_data = pd.read_excel(excel_file, engine='openpyxl')
    text = xlsx_data.to_string(index=True, header=True)
    return text

# Function to extract text from .txt files
def extract_txt_text(txt_file):
    with open(txt_file, 'r') as file:
        text = file.read()
    return text

# Function to extract text from CSV files
def extract_csv_text(csv_file):
    with open(csv_file, 'r') as file:
        csv_reader = csv.reader(file)
        text = '\n'.join([' '.join(row) for row in csv_reader])
    return text

# Function to extract text from JSON files
def extract_json_text(json_file):
    with open(json_file, 'r') as file:
        json_data = json.load(file)
        text = json.dumps(json_data, sort_keys=True)
    return text

# Main function to process files
def process_files(input_folder, output_file):
    all_text = ""
    for root, dirs, files in os.walk(input_folder):
        for file in files:
            file_path = os.path.join(root, file)
            file_name, file_extension = os.path.splitext(file_path)
            
            # Check file extension and call appropriate function
            if file_extension.lower() in ['.pdf']:
                text = extract_pdf_text(file_path)
            elif file_extension.lower() in ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.img']:
                text = extract_image_text(file_path)
            elif file_extension.lower() == '.docx':
                text = extract_docx_text(file_path)
            elif file_extension.lower() in ['.xlsx', '.xls']:
                text = extract_excel_text(file_path)
            elif file_extension.lower() == '.txt':
                text = extract_txt_text(file_path)
            elif file_extension.lower() == '.csv':
                text = extract_csv_text(file_path)
            elif file_extension.lower() == '.json':
                text = extract_json_text(file_path)
            else:
                print(f"Skipping unsupported file: {file_path}")
                continue
            
            # Clean up text and append to all_text
            text = re.sub(r'[^\w\s]', '', text)
            all_text += text + "\n"
    
    # Save extracted text to the specified output file
    with open(output_file, 'w') as file:
        file.write(all_text)
    print(f"Text data saved to {output_file}")

# Example usage:
input_folder = "F:/repogit/XseLLer8/testfiles"
output_file = "F:/repogit/XseLLer8/output/extracted.txt"
process_files(input_folder, output_file)

import re
import pandas as pd
import openpyxl

def find_headers(text):
    text = re.sub(r'[^\w\s]', '', text).lower()
    words = text.split()
    headers = ['invoice_date', 'item_number', 'item', 'packsize', 'price', 'ordered', 'status', 'liquors', 'price_per_bottle', 'total', 'domestic_beer', 'import_beer', 'na_bev', 'beverage_supplies']
    return headers

def extract_data_with_headers(text):
    headers = find_headers(text)
    text_blocks = re.split(r'\n{2,}', text)
    data_rows = []
    
    for block in text_blocks:
        lines = block.split('\n')
        header_line = [line.strip() for line in lines if line.isupper()]
        data_lines = [line.strip() for line in lines if not line.isupper()]
        
        if header_line:
            clean_header = header_line[0].lower().replace(' ', '_').split('_')
            clean_data = data_lines
            data_row = dict(zip(clean_header, clean_data))
            data_rows.append(data_row)
    
    df = pd.DataFrame(data_rows)
    return df

def save_to_inventory_excel(df, file_name):
    output_file = file_name + '.xlsx'
    writer = pd.ExcelWriter(output_file, engine='openpyxl')
    df.to_excel(writer, index=False, header=False, startcol=0, startrow=0)
    
    print(f"Data successfully saved to {output_file}")

# Upload file and read content
file_path = "F:/repogit/XseLLer8/output/extracted.txt"
with open(file_path, 'r') as file:
    text = file.read()

# Find headers and extract data
df = extract_data_with_headers(text)

# Create an Excel file and copy data
output_file = "F:/repogit/XseLLer8/output/Inventory.xlsx"
save_to_inventory_excel(df, output_file)