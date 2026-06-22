import pandas as pd
import os
from collections import Counter


# ============================================
# CONFIGURATION
# ============================================

# Excel inventory file
EXCEL_FILE = "inventory.xlsx"

# Folder containing product images
IMAGE_FOLDER = "inventory-images - Copy"

# Output Excel file
OUTPUT_FILE = "inventory-renamed.xlsx"


# ============================================
# LOAD EXCEL FILE
# ============================================

print("Loading inventory...")

# Read spreadsheet
# dtype=str prevents numbers from losing formatting
# (leading zeros, etc.)
df = pd.read_excel(EXCEL_FILE, dtype=str)

# Replace NaN with empty strings
# so string operations are safe
df = df.fillna("")


# ============================================
# COLUMN NAMES
# ============================================

# Replace these if your sheet uses different names
INVENTORY_COLUMN = "Item#"
IMAGE_COLUMN = "Product Image"

print(df.columns.tolist())


# ============================================
# FIND DUPLICATE IMAGE NAMES
# ============================================

# Count how many times each image appears
image_counts = Counter(df[IMAGE_COLUMN])

# ============================================
# PROCESS EACH ROW
# ============================================

for index, row in df.iterrows():

    inventory_number = row[INVENTORY_COLUMN].strip()
    image_name = row[IMAGE_COLUMN].strip()


    # ----------------------------------------
    # SKIP EMPTY IMAGE CELLS
    # ----------------------------------------

    if image_name == "":
        continue


    # ----------------------------------------
    # SKIP DUPLICATE/SHARED IMAGES
    # ----------------------------------------

    print(
        inventory_number,
        image_name,
        image_counts[image_name]
    )
    
    if image_counts[image_name] > 1:

        print(
            "DUPLICATE:",
            image_name
        )

        continue


    # ----------------------------------------
    # GET IMAGE EXTENSION
    # ----------------------------------------

    # Example:
    # ring.jpg -> .jpg
    _, extension = os.path.splitext(image_name)
    # ----------------------------------------
    # BUILD NEW IMAGE NAME
    # ----------------------------------------

    new_image_name = f"{inventory_number}{extension}"


    # ----------------------------------------
    # BUILD FULL FILE PATHS
    # ----------------------------------------

    old_path = os.path.join(
        IMAGE_FOLDER,
        image_name
    )

    new_path = os.path.join(
        IMAGE_FOLDER,
        new_image_name
    )


    # ----------------------------------------
    # CHECK FILE EXISTS
    # ----------------------------------------

    print("Checking:", old_path)

    if not os.path.exists(old_path):

        print(
            "MISSING:",
            old_path
        )

        continue


    # ----------------------------------------
    # RENAME IMAGE FILE
    # ----------------------------------------

    try:

        os.rename(old_path, new_path)

        print(
            f"Renamed: {image_name} -> {new_image_name}"
        )


        # ------------------------------------
        # UPDATE EXCEL DATA
        # ------------------------------------

        old_value = df.at[index, IMAGE_COLUMN]

        df.at[index, IMAGE_COLUMN] = new_image_name

        print(
            "ROW:",
            index,
            "OLD:",
            old_value,
            "NEW:",
            df.at[index, IMAGE_COLUMN]
        )

        print(
            inventory_number,
            image_name,
            "->",
            df.at[index, IMAGE_COLUMN]
        )


    except Exception as error:

        print(f"Error renaming {image_name}")

        print(error)


# ============================================
# SAVE UPDATED EXCEL FILE
# ============================================

print("Saving updated inventory sheet...")

print(
    df[[INVENTORY_COLUMN, IMAGE_COLUMN]]
    .head(20)
)

df.to_excel(
    OUTPUT_FILE,
    index=False
)

print("Done.")
