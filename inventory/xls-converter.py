#Coded by APR

import pandas as pd

inv = pd.read_excel("inventory.xlsx")

inv.to_json("inventory.json", orient="records", indent=4)

print("inventory.json generated")
