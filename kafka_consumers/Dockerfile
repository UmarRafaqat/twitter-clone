FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Download NLTK data (required by TextBlob)
RUN python -m nltk.downloader punkt
RUN python -m textblob.download_corpora

COPY . .

CMD ["python", "main.py"]