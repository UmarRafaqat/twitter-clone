import json
import threading
import logging
from kafka import KafkaConsumer
import user_processor
import tweet_processor
import interaction_processor
import analytics_processor

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Kafka configuration
KAFKA_BOOTSTRAP_SERVERS = "kafka:9092"

def start_consumer(topic, process_function):
    """Start a Kafka consumer in a separate thread"""
    def consumer_thread():
        try:
            logger.info(f"Starting consumer for topic: {topic}")
            consumer = KafkaConsumer(
                topic,
                bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
                value_deserializer=lambda v: json.loads(v.decode('utf-8')),
                auto_offset_reset='latest',
                enable_auto_commit=True,
                group_id=f'mini_twitter_{topic}_group'
            )
            
            logger.info(f"Consumer for topic {topic} started successfully")
            
            for message in consumer:
                try:
                    logger.info(f"Received message from topic {topic}: {message.value}")
                    process_function(message.value)
                except Exception as e:
                    logger.error(f"Error processing message from {topic}: {e}")
        except Exception as e:
            logger.error(f"Error starting consumer for {topic}: {e}")
    
    # Start the consumer in a new thread
    thread = threading.Thread(target=consumer_thread)
    thread.daemon = True
    thread.start()
    return thread

def start_all_consumers():
    """Start all Kafka consumers"""
    consumers = [
        start_consumer("users", user_processor.process_event),
        start_consumer("tweets", tweet_processor.process_event),
        start_consumer("likes", interaction_processor.process_event),
        start_consumer("comments", interaction_processor.process_event),
        start_consumer("follows", interaction_processor.process_event),
        start_consumer("tweet_analytics", analytics_processor.process_event)
    ]
    
    logger.info(f"Started {len(consumers)} Kafka consumers")
    return consumers

if __name__ == "__main__":
    logger.info("Starting Kafka consumers")
    consumers = start_all_consumers()
    
    # Keep the main thread running
    for consumer in consumers:
        consumer.join()