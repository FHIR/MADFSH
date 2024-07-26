@echo off
:: execute the primary _genonce.bat script
CALL _genonce.bat

:: Source directory path
SET "SOURCE_DIR=%CD%\output"
:: Destination directory path
SET "DEST_DIR=%CD%\distribution"
:: List of files to check and copy
SET FILES=package.tgz full-ig.zip
:: Loop through each file in the list
FOR %%F IN (%FILES%) DO (
    SET "SOURCE_FILE=%SOURCE_DIR%\%%F"
    SET "DESTINATION_FILE=%DEST_DIR%\%%F"
    :: Check if the source file exists
    IF exist "%SOURCE_FILE%" (
        :: Copy the file to the destination, overwriting if it exists
        copy /Y "%SOURCE_FILE%" "%DESTINATION_FILE%"
        echo Copied %SOURCE_FILE% to %DESTINATION_FILE%.
    ) ELSE (
        echo Source file %SOURCE_FILE% does not exist.
    )
)