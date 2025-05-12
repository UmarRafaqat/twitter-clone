import json
import threading
import logging
import time
import os
from kafka import KafkaConsumer
from processors import user_processor, tweet_processor, interaction_processor, analytics_processor

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("kafka-consumers")

# Kafka configuration
KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092")

def create_consumer(topic, group_id):
    """Create a Kafka consumer with retry logic"""
    max_retries = 10
    retry_delay = 5
    
    for attempt in range(max_retries):
        try:
            logger.info(f"Attempt {attempt+1}: Connecting to Kafka for topic {topic}")
            consumer = KafkaConsumer(
                topic,
                bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
                value_deserializer=lambda v: json.loads(v.decode('utf-8')),
                auto_offset_reset='latest',
                enable_auto_commit=True,
                group_id=group_id
            )
            logger.info(f"Successfully connected to Kafka for topic {topic}")
            return consumer
        except Exception as e:
            logger.error(f"Failed to connect to Kafka (attempt {attempt+1}): {e}")
            if attempt < max_retries - 1:
                logger.info(f"Retrying in {retry_delay} seconds...")
                time.sleep(retry_delay)
            else:
                logger.error(f"Max retries reached for topic {topic}")
                raise

def consumer_thread(topic, processor, group_id=None):
    """Thread function for consuming Kafka messages"""
    if group_id is None:
        group_id = f'mini_twitter_{topic}_group'
        
    try:
        consumer = create_consumer(topic, group_id)
        
        logger.info(f"Starting to consume messages from topic: {topic}")
        for message in consumer:
            try:
                logger.info(f"Received message from {topic}: {message.value}")
                processor(message.value)
            except Exception as e:
                logger.error(f"Error processing message from {topic}: {e}")
    except Exception as e:
        logger.error(f"Consumer error for topic {topic}: {e}")

def start_consumers():
    """Start all Kafka consumers in separate threads"""
    # Define topic-processor mappings
    topics = [
        {"topic": "users", "processor": user_processor.process_event},
        {"topic": "tweets", "processor": tweet_processor.process_event},
        {"topic": "likes", "processor": interaction_processor.process_event},
        {"topic": "comments", "processor": interaction_processor.process_event},
        {"topic": "follows", "processor": interaction_processor.process_event},
        {"topic": "tweet_analytics", "processor": analytics_processor.process_event}
    ]
    
    # Create and start threads
    threads = []
    for topic_config in topics:
        thread = threading.Thread(
            target=consumer_thread,
            args=(topic_config["topic"], topic_config["processor"]),
            daemon=True
        )
        thread.start()
        threads.append(thread)
        logger.info(f"Started consumer thread for topic: {topic_config['topic']}")
    
    return threads

if __name__ == "__main__":
    logger.info("Starting Kafka consumer service")
    
    # Wait for Kafka to be fully ready
    time.sleep(15)  
    
    # Start all consumers
    consumer_threads = start_consumers()
    
    # Keep the main thread running
    try:
        while True:
            alive_count = sum(1 for t in consumer_threads if t.is_alive())
            logger.info(f"Consumer status: {alive_count}/{len(consumer_threads)} threads alive")
            
            # Restart any dead threads
            for i, (thread, topic_config) in enumerate(zip(consumer_threads, [
                {"topic": "users", "processor": user_processor.process_event},
                {"topic": "tweets", "processor": tweet_processor.process_event},
                {"topic": "likes", "processor": interaction_processor.process_event},
                {"topic": "comments", "processor": interaction_processor.process_event},
                {"topic": "follows", "processor": interaction_processor.process_event},
                {"topic": "tweet_analytics", "processor": analytics_processor.process_event}
            ])):
                if not thread.is_alive():
                    logger.warning(f"Thread for topic {topic_config['topic']} died, restarting...")
                    new_thread = threading.Thread(
                        target=consumer_thread,
                        args=(topic_config["topic"], topic_config["processor"]),
                        daemon=True
                    )
                    new_thread.start()
                    consumer_threads[i] = new_thread
            
            time.sleep(60)  # Check every minute
    except KeyboardInterrupt:
        logger.info("Shutting down consumer service")