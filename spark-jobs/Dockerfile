FROM bitnami/spark:3.3

USER root

# Install Python dependencies
COPY requirements.txt /tmp/
RUN pip install --no-cache-dir -r /tmp/requirements.txt

# Create directory for jobs
RUN mkdir -p /opt/spark-jobs
WORKDIR /opt/spark-jobs

# Copy jobs
COPY *.py /opt/spark-jobs/

# Set permissions
RUN chmod -R 755 /opt/spark-jobs

USER 1001

CMD ["python", "scheduler.py"]