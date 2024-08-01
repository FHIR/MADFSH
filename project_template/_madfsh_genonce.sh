#!/bin/bash

# execute the primary _genonce.sh script
./_genonce.sh

# Source directory path
SOURCE_DIR="output"
# Destination directory path
DEST_DIR="distribution"
# List of files to check and copy
FILES=("package.tgz" "full-ig.zip")
# Loop through each file in the list
for FILE in "${FILES[@]}"; do
    SOURCE_FILE="$SOURCE_DIR/$FILE"
    DESTINATION_FILE="$DEST_DIR/$FILE"
    # Check if the source file exists
    if [ -f "$SOURCE_FILE" ]; then
        # Copy the file to the destination, overwriting if it exists
        cp -f "$SOURCE_FILE" "$DESTINATION_FILE"
        echo "Copied $SOURCE_FILE to $DESTINATION_FILE."
    else
        echo "Source file $SOURCE_FILE does not exist."
    fi
done