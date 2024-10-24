import pandas as pd
import re

def parse_data(file_path):
    # Read the file content
    with open(file_path, 'r') as file:
        lines = file.readlines()
    
    # Initialize lists to store parsed data
    current_category = None
    data = []

    # Step 1: Iterate through the lines to parse data
    for line in lines:
        line = line.strip()
        
        # Skip empty lines
        if not line:
            continue
        
        # Step 2: Identify category headers
        if line.isupper() and 'TOTAL' not in line:
            # This is a category header (e.g., "DOMESTIC BEER", "IMPORT BEER")
            current_category = line
            continue

        # Step 3: Parse item lines (non-empty, non-header lines)
        match = re.match(r'^(.*?)(\d+)\s*(oz|ml|ltr|gal|can|btl)?$', line, re.IGNORECASE)
        if match:
            product_name = match.group(1).strip()
            quantity = match.group(2).strip()
            size = match.group(3) if match.group(3) else 'unknown'

            # Add parsed data to the list
            data.append({
                'Category': current_category,
                'Product Name': product_name,
                'Quantity': int(quantity),
                'Size': size
            })
    
    # Step 4: Convert the list of dictionaries into a DataFrame
    df = pd.DataFrame(data)

    # Step 5: Clean the DataFrame by filling missing values or adjusting the format
    df['Category'] = df['Category'].fillna('Miscellaneous')
    df['Size'] = df['Size'].str.lower().replace('unknown', pd.NA)

    return df

# Specify the file path
file_path = "F:/repogit/XseLLer8/output/extracted.txt"

# Call the function to parse data
df = parse_data(file_path)
