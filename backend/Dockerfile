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

# Pre-download PaddleOCR models to prevent runtime timeouts on Render/Railway
# The models are stored in /root/.paddleocr by default
RUN python3 -c "from paddleocr import PaddleOCR; PaddleOCR(use_angle_cls=True, lang='en', use_gpu=False, show_log=False)"

# Render/Render inject PORT env var at runtime
EXPOSE 10000

# Use shell form so $PORT is expanded; fall back to 10000 if unset (Render default)
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-10000}
