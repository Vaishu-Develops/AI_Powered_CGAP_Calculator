FROM python:3.11-slim

# Install system dependencies required by PaddleOCR / OpenCV
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port (Railway injects PORT env var, default 8080)
EXPOSE 8080

# Start the server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
