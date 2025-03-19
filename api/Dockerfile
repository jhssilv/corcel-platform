# Use the official Python image as the base
FROM python:3.12

# Set the working directory in the container
WORKDIR /api

# Copy the requirements file
COPY requirements.txt .

# Update pip and install Python dependencies
RUN pip install --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Expose port 5000
EXPOSE 5000

# Start the Flask server
CMD ["flask", "run", "--host=0.0.0.0"]