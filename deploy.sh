#!/bin/bash
# Main deployment script for Mini-Twitter with logging

# Create log file
LOG_FILE="deployment_$(date +%Y%m%d_%H%M%S).log"
touch $LOG_FILE

# Function to log messages to both console and log file
log() {
    local timestamp=$(date +"%Y-%m-%d %H:%M:%S")
    echo -e "[$timestamp] $1"
    echo -e "[$timestamp] $1" >> $LOG_FILE
}

# Function to log and execute a command
exec_and_log() {
    local cmd="$1"
    log "EXECUTING: $cmd"
    
    # Execute the command and capture output
    output=$($cmd 2>&1)
    status=$?
    
    # Log the output
    if [ $status -eq 0 ]; then
        log "SUCCESS: Command completed successfully"
        log "OUTPUT: $output"
    else
        log "ERROR: Command failed with status $status"
        log "OUTPUT: $output"
    fi
    
    return $status
}

log "Starting Mini-Twitter deployment..."

# Check Docker and Docker Compose
log "Checking for required tools..."
if ! command -v docker &> /dev/null; then
    log "ERROR: Docker is required but not installed."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    log "ERROR: Docker Compose is required but not installed."
    exit 1
fi

log "Docker and Docker Compose are available."

# Build and start containers
log "Building and starting containers..."
docker-compose up -d --build 2>&1 | tee -a $LOG_FILE
if [ ${PIPESTATUS[0]} -ne 0 ]; then
    log "ERROR: Docker Compose build failed."
    exit 1
fi

# List running containers
log "Containers started. Listing running containers:"
docker ps 2>&1 | tee -a $LOG_FILE

# Wait for services to be ready
log "Waiting for services to be ready..."
for i in {1..30}; do
    log "Waiting... ($i/30)"
    sleep 1
done

# Check status of key services
log "Checking service health status:"

# Check PostgreSQL
log "Checking PostgreSQL..."
docker exec -it $(docker ps -q -f name=mini-twitter_postgres) pg_isready 2>&1 | tee -a $LOG_FILE
if [ ${PIPESTATUS[0]} -ne 0 ]; then
    log "WARNING: PostgreSQL may not be ready yet."
fi

# Try to run initialization script for Cassandra
log "Initializing Cassandra schema..."
docker exec -it $(docker ps -q -f name=mini-twitter_cassandra) cqlsh -f /docker-entrypoint-initdb.d/01-init.cql 2>&1 | tee -a $LOG_FILE
if [ ${PIPESTATUS[0]} -ne 0 ]; then
    log "WARNING: Cassandra initialization script ran with errors (this might be normal if already initialized)."
fi

# Check Kafka
log "Checking Kafka topics..."
docker exec -it $(docker ps -q -f name=mini-twitter_kafka) kafka-topics.sh --list --bootstrap-server localhost:9092 2>&1 | tee -a $LOG_FILE
if [ ${PIPESTATUS[0]} -ne 0 ]; then
    log "WARNING: Kafka may not be ready yet."
fi

# Check MongoDB
log "Checking MongoDB..."
docker exec -it $(docker ps -q -f name=mini-twitter_mongodb) mongo --eval "db.runCommand({ping:1})" 2>&1 | tee -a $LOG_FILE
if [ ${PIPESTATUS[0]} -ne 0 ]; then
    log "WARNING: MongoDB may not be ready yet."
fi

# Generate test data
log "Generating test data..."
mkdir -p data/test
python scripts/generate_test_data.py --output-dir data/test 2>&1 | tee -a $LOG_FILE
if [ ${PIPESTATUS[0]} -ne 0 ]; then
    log "ERROR: Test data generation failed."
fi

# Check API health
log "Checking API health..."
for i in {1..10}; do
    log "Attempt $i/10..."
    curl -s http://localhost:8000/health 2>&1 | tee -a $LOG_FILE
    if [ ${PIPESTATUS[0]} -eq 0 ]; then
        log "SUCCESS: API is healthy!"
        break
    fi
    
    if [ $i -eq 10 ]; then
        log "WARNING: API health check failed after 10 attempts."
    else
        log "API not ready yet. Waiting..."
        sleep 5
    fi
done

# Final status
log "Mini-Twitter system deployment completed!"
log "Access the services at:"
log "  - API: http://localhost:8000"
log "  - API Documentation: http://localhost:8000/docs"
log "  - Frontend: http://localhost:3000"
log "  - Spark Master UI: http://localhost:8080"
log "  - Minio Console: http://localhost:9001 (user: minioadmin, password: minioadmin)"
log "Deployment log saved to: $LOG_FILE"