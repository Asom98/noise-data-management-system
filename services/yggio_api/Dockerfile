# Use a lightweight Python OS
FROM python:3.11-slim

# Create a folder inside the container and move into it
WORKDIR /app

# Copy the requirements file into our /app folder
COPY requirements.txt .

# Install the Python libraries
RUN pip install --no-cache-dir -r requirements.txt

# Copy all of our Python scripts into the /app folder
COPY . .

# Tell Docker exactly what to run when the container wakes up
CMD ["python", "-u", "yggio_to_db.py"]