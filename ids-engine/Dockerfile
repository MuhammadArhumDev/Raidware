FROM python:3.10-slim

WORKDIR /app

# Copy requirements first to leverage Docker cache
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Ensure the models directory exists
RUN mkdir -p /app/models

# Set environment variable for model directory
ENV MODEL_DIR=/app/models

# Expose the internal port
EXPOSE 9632

# Run the application with gunicorn
CMD ["gunicorn", "--workers", "2", "--bind", "0.0.0.0:9632", "ids_server:app"]
