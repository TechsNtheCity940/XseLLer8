import pandas as pd
import re

# Step 1: Data Cleaning
# Load the data from the extracted file
file_path = "F:/repogit/XseLLer8/output/extracted.txt"
df = pd.read_csv(file_path, delimiter='\t', skip_blank_lines=True, encoding='ISO-8859-1')
# Drop rows and columns that are completely empty
df = df.dropna(how='all').dropna(axis=1, how='all')

# Identify meaningful columns based on the content
df.columns = ['Index', 'Brand', 'Bin', 'Size', 'Unit', 'Location', 
              'Quantity', 'Unit Cost', 'Ext Value', 'Additional Info']

# Drop columns that aren't useful
df = df.drop(['Index', 'Location', 'Additional Info'], axis=1)

# Step 2: Data Parsing
# Function to categorize items
def categorize_item(brand):
    if 'beer' in brand.lower():
        return 'Beer'
    elif 'wine' in brand.lower():
        return 'Wine'
    elif 'liquor' in brand.lower() or 'vodka' in brand.lower():
        return 'Liquor'
    else:
        return 'Miscellaneous'

# Apply categorization
df['Category'] = df['Brand'].apply(categorize_item)

# Standardize units (convert ounces to liters, etc. if needed)
unit_conversion = {'oz': 0.0295735, 'ml': 0.001, 'ltr': 1, 'gal': 3.78541}
df['Unit'] = df['Unit'].str.lower().map(unit_conversion).fillna(1)
df['Quantity'] = pd.to_numeric(df['Quantity'], errors='coerce').fillna(0)

# Calculate total value if missing
df['Unit Cost'] = pd.to_numeric(df['Unit Cost'], errors='coerce').fillna(0)
df['Ext Value'] = df['Quantity'] * df['Unit Cost']

# Step 3: Data Structuring
# Group and aggregate by Category
grouped_df = df.groupby('Category').agg({
    'Quantity': 'sum',
    'Ext Value': 'sum'
}).reset_index()

# Display the cleaned and structured DataFrame
import ace_tools as tools; tools.display_dataframe_to_user(name="Cleaned Invoice Data", dataframe=grouped_df)
