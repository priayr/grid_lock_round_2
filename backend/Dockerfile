FROM python:3.11-slim

WORKDIR /app

# Install system dependencies needed for spatial libraries (like GeoPandas/OSMnx if used)
RUN apt-get update && apt-get install -y \
    build-essential \
    libgdal-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend files
COPY . .

# Hugging Face Spaces require the app to listen on port 7860
EXPOSE 7860

# Ensure data models are trained (optional: you could do this locally before pushing to save startup time)
RUN python train.py

# Run the FastAPI server
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]
