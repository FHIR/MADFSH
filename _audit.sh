echo "Running npm audit..."
if npm audit; then
  echo "npm audit passed successfully. Exiting..."
  exit 0
fi

echo "npm audit failed. Attempting to fix vulnerabilities..."
npm audit --fix

echo "Checking for changes in package-lock.json..."
if [ -f package-lock.json ]; then
  git add package-lock.json
  git diff --exit-code package-lock.json

  if [ $? -eq 0 ]; then
    echo "No changes detected in package-lock.json. Proceeding..."
    npm audit --audit-level=moderate
  else
    echo "Changes detected in package-lock.json after npm audit --fix."
    exit 1
  fi
else
  echo "package-lock.json does not exist."
  exit 1
fi
