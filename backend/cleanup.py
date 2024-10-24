import pandas as pd
import re
import os

def parse_data(file_path, output_dir="output"):
    # Step 1: Read the file content using pandas
    print(f"Reading file: {file_path}")
    try:
        df = pd.read_csv(file_path, delimiter='\t', skip_blank_lines=True, encoding='ISO-8859-1')
        print("File read successfully.")
    except Exception as e:
        print(f"Error reading file: {e}")
        return None

    # Show initial DataFrame structure
    print("\nInitial DataFrame structure:")
    print(df.head())
    print(f"Columns: {df.columns.tolist()}")
    print(f"Number of columns: {len(df.columns)}\n")

    # Drop rows and columns that are completely empty
    df = df.dropna(how='all').dropna(axis=1, how='all')
    print("Dropped completely empty rows and columns.")

    # If the DataFrame has only one column, try splitting it
    if len(df.columns) == 1:
        print("Single-column DataFrame detected, attempting to split based on whitespace.")
        df = df.iloc[:, 0].str.split(r'\s{2,}', expand=True)
        print("Split operation completed.")

    # Show DataFrame structure after possible split
    print("\nDataFrame structure after cleaning:")
    print(df.head())
    print(f"Columns: {df.columns.tolist()}")
    print(f"Number of columns: {len(df.columns)}\n")

    # Check if the number of columns matches the expected number (13 in this case)
    expected_columns = 13
    actual_columns = len(df.columns)

    if actual_columns != expected_columns:
        print(f"Warning: Expected {expected_columns} columns, but got {actual_columns}. Adjusting column names dynamically.")
        
        # Basic column names up to the expected number
        column_names = ['Index', 'Brand', 'Bin', 'Size', 'Unit', 'Location', 'Stock', 
                        'Price', 'Date', 'Status', 'Category', 'Additional Info', 'Extra']
        
        # If there are more columns than expected, extend the column_names list
        if actual_columns > expected_columns:
            # Adding generic names for extra columns
            column_names.extend([f'Extra_{i}' for i in range(actual_columns - expected_columns)])
        
        # If there are fewer columns than expected, truncate the column_names list
        elif actual_columns < expected_columns:
            column_names = column_names[:actual_columns]
        
        # Assign the adjusted column names
        df.columns = column_names
        print(f"New column names: {df.columns.tolist()}\n")

    # Drop unwanted columns if they exist
    columns_to_drop = ['Index', 'Location', 'Additional Info']
    df = df.drop([col for col in columns_to_drop if col in df.columns], axis=1)
    print(f"Columns after dropping unwanted columns: {df.columns.tolist()}\n")

    # Step 2: Data Parsing and Cleaning
    # Ensure 'Ordered' column exists
    if 'Ordered' not in df.columns:
        df['Ordered'] = 0  # Create 'Ordered' column with default value
        print("'Ordered' column not found. Created with default value 0.")

    # Ensure 'Quantity' column exists
    if 'Quantity' not in df.columns:
        df['Quantity'] = 0  # Create 'Quantity' column with default value
        print("'Quantity' column not found. Created with default value 0.")

    # Ensure 'Unit Cost' column exists
    if 'Unit Cost' not in df.columns:
        df['Unit Cost'] = 0  # Create 'Unit Cost' column with default value
        print("'Unit Cost' column not found. Created with default value 0.")

    # Function to categorize items
    def categorize_item(brand):
        if pd.isna(brand):
            return 'Miscellaneous'
        brand_lower = brand.lower()
        if 'beer' in brand_lower:
            return 'Beer'
        elif 'wine' in brand_lower:
            return 'Wine'
        elif 'liquor' in brand_lower or 'vodka' in brand_lower:
            return 'Liquor'
        else:
            return 'Miscellaneous'

    # Apply categorization if 'Brand' column exists
    if 'Brand' in df.columns:
        df['Name'] = df['Brand'].apply(categorize_item)
        print("Categorization applied based on 'Brand' column.")
    else:
        df['Name'] = 'Item'  # Default category if 'Brand' is missing
        print("'Brand' column not found. All items categorized as 'Name'.")

    # Standardize units (convert ounces to liters, etc., if needed)
    unit_conversion = {'oz': 0.0295735, 'ml': 0.001, 'ltr': 1, 'gal': 3.78541}
    if 'Ordered' in df.columns:
        df['Ordered'] = df['Unit'].str.lower().map(unit_conversion).fillna(1)
        print("Unit conversion applied.")
    else:
        df['Unit'] = 1  # Default unit conversion factor
        print("'Unit' column not found. Set to default conversion factor of 1.")

    # Convert 'Quantity' to numeric, handling errors
    df['Ordered'] = pd.to_numeric(df['Quantity'], errors='coerce').fillna(0)
    print("Converted 'Ordered' to numeric.")

    # Convert 'Ordered' to numeric, handling errors
    df['Ordered'] = pd.to_numeric(df['Ordered'], errors='coerce').fillna(0)
    print("Converted 'Ordered' to numeric.")

    # Calculate total value if 'Unit Cost' exists
    if 'Unit Cost' in df.columns:
        df['Price'] = pd.to_numeric(df['Unit Cost'], errors='coerce').fillna(0)
        df['Price'] = df['Quantity'] * df['Ordered']
        print("Calculated 'Ext Value' based on 'Quantity' and 'Unit Cost'.")
    else:
        df['Ext Value'] = 0  # If 'Unit Cost' is missing, set 'Ext Value' to 0
        print("'Unit Cost' column not found. Set 'Ext Value' to 0.")

    # Step 3: Data Structuring
    # Group and aggregate by Category
    grouped_df = df.groupby('Category').agg({
        'Quantity': 'sum',
        'Ordered': 'sum',
        'Ext Value': 'sum'
    }).reset_index()
    print("\nData grouped and aggregated by 'Category'.\n")

    # Step 4: Save the cleaned data for review
    # Ensure the output directory exists
    os.makedirs(output_dir, exist_ok=True)
    
    cleaned_file_path = os.path.join(output_dir, "1cleaned_data.csv")
    grouped_file_path = os.path.join(output_dir, "1grouped_data.csv")
    
    # Save cleaned data
    df.to_csv(cleaned_file_path, index=True)
    print(f"Cleaned data saved to {cleaned_file_path}")

    # Save grouped data
    grouped_df.to_csv(grouped_file_path, index=True)
    print(f"Grouped data saved to {grouped_file_path}")

    return df, grouped_df

# Example usage
file_path = "F:/repogit/XseLLer8/output/newextracted.txt"
df, grouped_df = parse_data(file_path)

if df is not None:
    # Output the modified DataFrame
    print("\nParsed DataFrame:")
    print(df.head())
    
    # Output the grouped DataFrame
    print("\nGrouped DataFrame:")
    print(grouped_df.head())
    
import pandas as pd

# Load the uploaded CSV file
file_path = "F:/repogit/XseLLer8/output/1cleaned_data.csv"
df = pd.read_csv(file_path)

# Display the first few rows to understand the data structure
df.head()

# Step 1: Replace NaN values with empty strings for easier processing
df = df.fillna('')

# Step 2: Identify rows with all-uppercase text in the 'Brand' or 'Stock' columns (potential headers)
uppercase_rows = df[(df['Brand'].str.isupper()) | (df['Stock'].str.isupper())]

# Step 3: Remove rows that appear to be irrelevant information (e.g., "Inventory Report")
# Define a list of keywords that signify non-relevant rows
irrelevant_keywords = [
    'INVENTORY REPORT', 'SCANNED ON'
]
# Filter out rows containing these keywords
df_cleaned = df[~df['Brand'].str.upper().isin(irrelevant_keywords) &
                ~df['Stock'].str.upper().isin(irrelevant_keywords)]

# Step 4: Set any remaining 'Brand' rows that are all-uppercase as column headers if needed
if not uppercase_rows.empty:
    new_headers = uppercase_rows.iloc[0].tolist()  # Use the first uppercase row as headers
    df_cleaned.columns = [col if not new else new for col, new in zip(df_cleaned.columns, new_headers)]

# Step 5: Replace remaining empty strings with actual empty spaces
df_cleaned = df_cleaned.replace('', ' ')

# Display the cleaned DataFrame's structure
df_cleaned.head()
print(df_cleaned.head())
# Step 1: Realign data in rows that seem shifted based on the presence of numeric values
def realign_row(row):
    # Check if 'Brand' column is empty and the subsequent columns have values
    if row['Brand'].strip() == '' and any(str(row[col]).strip() for col in row.index[1:]):
        # Shift data to the left to align properly
        values = row.tolist()
        values = [v for v in values if str(v).strip()] + [''] * (len(row) - len([v for v in values if str(v).strip()]))
        return pd.Series(values, index=row.index)
    return row

# Apply the realignment function to each row
df_realigned = df_cleaned.apply(realign_row, axis=1)

# Step 2: Consolidate redundant columns by merging related fields
# Identify related fields for merging based on similarities in column names or types
df_realigned['Quantity'] = pd.to_numeric(df_realigned['Quantity'], errors='coerce').fillna(0).astype(int)
df_realigned['Unit Cost'] = pd.to_numeric(df_realigned['Unit Cost'], errors='coerce').fillna(0).astype(float)
df_realigned['Ext Value'] = pd.to_numeric(df_realigned['Ext Value'], errors='coerce').fillna(0).astype(float)

# Step 3: Replace any remaining empty strings with spaces for uniformity
df_realigned = df_realigned.replace('', ' ')

# Display the fully cleaned DataFrame's structure
df_realigned.head()
print(df_realigned.head())
# Step 1: Rename columns to better reflect their intended content
df_realigned.columns = [
    'Brand', 'Date', 'Day', 'Index', 'Beverage', 'Beer', 'Wine', 'Liquor',
    'Price', 'Item #', 'Pack Size', 'Labor', 'Cash Flow',
    'Ordered', 'Quantity', 'Unit Cost', 'Ext Value'
] + [f'Extra_{i}' for i in range(len(df_realigned.columns) - 17)]

# Step 2: Drop redundant or non-informative columns that contain only zeros or empty spaces
columns_to_drop = [col for col in df_realigned.columns if df_realigned[col].replace(' ', '').eq(0).all()]
df_final = df_realigned.drop(columns=columns_to_drop)

# Step 3: Remove any rows that still don't contain meaningful information
df_final = df_final[df_final['Brand'].str.strip().ne('') | df_final['Beverage'].str.strip().ne('')]

# Step 4: Reorganize rows with meaningful data and reset the index for clarity
df_final = df_final.reset_index(drop=True)

# Display the final cleaned DataFrame
df_final.head()
print(df_final.head())
# Save the final cleaned DataFrame to a new CSV file for further review
output_file_path = 'F:/repogit/XseLLer8/output/1advanced_cleaned_data.csv'
df_final.to_csv(output_file_path, index=False)

# Provide the path to the saved file for download
output_file_path
