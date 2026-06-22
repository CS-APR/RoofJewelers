import os
import json

IMAGE_FOLDER = "inventory-images"

manifest = {}

for filename in os.listdir(IMAGE_FOLDER):

    if not filename.lower().endswith(
        (".jpg", ".jpeg", ".png", ".webp")
    ):
        continue

    item_number = filename.split("-")[0]
    item_number = item_number.split(".")[0]
    item_number = item_number.lower()

    if item_number not in manifest:
        manifest[item_number] = []

    manifest[item_number].append(filename)

for item in manifest:
    manifest[item].sort()

with open(
    "imageManifest.json",
    "w",
    encoding="utf-8"
) as f:

    json.dump(
        manifest,
        f,
        indent=4
    )

print(
    f"Created manifest for {len(manifest)} items"
)
