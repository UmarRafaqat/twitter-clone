FROM bitnami/spark:3.3

USER root

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    python3-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt /tmp/
RUN pip install --no-cache-dir -r /tmp/requirements.txt

# Create directory for jobs
WORKDIR /opt/spark-jobs

# Copy all job scripts
COPY *.py /opt/spark-jobs/

# Set permissions
RUN chmod -R 755 /opt/spark-jobs

USER 1001

CMD ["python", "scheduler.py"]