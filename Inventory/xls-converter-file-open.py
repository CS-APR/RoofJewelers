# Coded by APR

import win32com.client
import pandas as pd

WORKSHEET_NAME = "inventory.xlsx"

JSON_FILENAME = "inventory.json"

excel = win32com.client.Dispatch("Excel.Application")

# Get already-open workbook
wb = excel.Workbooks(WORKSHEET_NAME)

# Select first sheet
ws = wb.Sheets(1)

# Read used range
data = ws.UsedRange.Value

# Convert to DataFrame
headers = data[0]
rows = data[1:]

inv = pd.DataFrame(rows, columns=headers)

# Export JSON
inv.to_json(JSON_FILENAME, orient="records", indent=4)

print(JSON_FILENAME + " generated")
