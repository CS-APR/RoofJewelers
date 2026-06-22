# ============================================
# Roof Jewelers Inventory Image Scraper
# Coded by APR
# ============================================


# -----------------------------
# IMPORTS
# -----------------------------

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.support.ui import WebDriverWait

from selenium.webdriver.support import expected_conditions as EC

import requests
import os
import time



# -----------------------------
# CONFIGURATION
# -----------------------------

# FULL URL TO THE BACKEND PAGE
# Example:
# "https://example.com/admin/products.aspx"
START_URL = "https://roofjewelers.americommerce.com/store/admin/products/listproducts.aspx"


# WEBSITE ROOT URL
# Used to convert relative image paths
# Example:
# "https://example.com"
BASE_URL = "https://roofjewelers.americommerce.com"

# FOLDER TO SAVE IMAGES INTO
IMAGE_FOLDER = "scraped-images"


# TIME TO WAIT AFTER PAGE CHANGES
# Increase if backend loads slowly
PAGE_WAIT_TIME = 5.0



# -----------------------------
# CREATE IMAGE DIRECTORY
# -----------------------------

# Create folder if it does not exist
os.makedirs(IMAGE_FOLDER, exist_ok=True)



# -----------------------------
# START SELENIUM
# -----------------------------

# Opens a Chrome browser
from selenium.webdriver.firefox.service import Service

service = Service(executable_path="geckodriver.exe")

options = Options()

options.binary_location = r"C:\Program Files\Mozilla Firefox\firefox.exe"

driver = webdriver.Firefox(service=service,options=options)


# Load the backend page
driver.get(START_URL)


# -----------------------------
# OPTIONAL LOGIN WAIT
# -----------------------------

# If your backend already keeps you logged in:
# leave this as-is

# If you need time to manually log in:
# increase this number

print("Waiting for login/session...")

time.sleep(180)



# -----------------------------
# TRACK DOWNLOADED IMAGES
# -----------------------------

# Prevents duplicate downloads
downloaded_images = set()



# -----------------------------
# SCRAPE CURRENT PAGE
# -----------------------------

def scrape_current_page():

    print("Scraping current page...")


    # ------------------------------------
    # FIND ALL IMAGES
    # ------------------------------------

    # Currently grabs all images on page

    # Later you can narrow this to:
    # product rows
    # product containers
    # specific classes

    images = driver.find_elements(By.TAG_NAME,"img")


    # ------------------------------------
    # PROCESS EACH IMAGE
    # ------------------------------------

    for image in images:

        try:
            
            src = image.get_attribute("src")

        except Exception:

            continue


        # Skip missing src
        if not src:
            continue


        # --------------------------------
        # REMOVE RESIZE PARAMETERS
        # --------------------------------

        # Example:
        # /resize/shared/images/product/abc.jpg?bw=50&bh=50

        # becomes:
        # /shared/images/product/abc.jpg

        clean_src = src.split("?")[0]

        clean_src = clean_src.replace("/resize","")

        if "/product/" not in clean_src:
            continue


        # --------------------------------
        # CONVERT TO ABSOLUTE URL
        # --------------------------------

        # Relative path:
        # /shared/images/product/abc.jpg

        # becomes:
        # https://example.com/shared/images/product/abc.jpg

        if clean_src.startswith("/"):

            clean_src = BASE_URL + clean_src


        # --------------------------------
        # GET FILENAME
        # --------------------------------

        filename = clean_src.split("/")[-1]


        # --------------------------------
        # SKIP DUPLICATES
        # --------------------------------

        if filename in downloaded_images:
            continue


        downloaded_images.add(filename)


        # --------------------------------
        # DOWNLOAD IMAGE
        # --------------------------------

        try:

            print(f"Downloading: {filename}")

            response = requests.get(clean_src)

            if response.status_code == 200:

                with open(f"{IMAGE_FOLDER}/{filename}","wb") as file:

                    file.write(response.content)

            else:

                print(f"Failed download: {clean_src}")

        except Exception as error:

            print(error)



# -----------------------------
# CLICK NEXT PAGE
# -----------------------------

def click_next_page():

    try:

        next_button = WebDriverWait(driver,10).until( EC.element_to_be_clickable( (By.CSS_SELECTOR,'[title="Next Page"]') ) )

        print(next_button.get_attribute("outerHTML"))
        
        driver.execute_script("arguments[0].scrollIntoView();",next_button)
        
        driver.execute_script("arguments[0].click();",next_button)

        time.sleep(PAGE_WAIT_TIME)

        return True

    except Exception:

        print("No more pages found.")

        return False



# -----------------------------
# MAIN SCRAPING LOOP
# -----------------------------

while True:

    scrape_current_page()

    success = click_next_page()

    if not success:
        break



# -----------------------------
# FINISH
# -----------------------------

print("Scraping complete.")

driver.quit()
