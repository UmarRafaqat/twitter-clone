import json
import threading
import time
from kafka import KafkaConsumer
from processors import (
    user_processor,
    tweet_processor,
    interaction_processor,
    analytics_processor
)

# Configuration
KAFKA_BOOTSTRAP_SERVERS = "kafka:9092"
CONSUMER_GROUP_ID = "mini-twitter-processors"

# Topics to consume
TOPICS = {
    "users": user_processor,
    "tweets": tweet_processor,
    "likes": interaction_processor,
    "comments": interaction_processor,
    "follows": interaction_processor
}

# Analytics topics
ANALYTICS_TOPICS = {
    "user_analytics": analytics_processor,
    "tweet_analytics": analytics_processor
}

class KafkaConsumerThread(threading.Thread):
    def __init__(self, topic, processor_module, **kwargs):
        super().__init__()
        self.topic = topic
        self.processor_module = processor_module
        self.consumer = KafkaConsumer(
            topic,
            bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
            group_id=CONSUMER_GROUP_ID,
            auto_offset_reset='latest',
            value_deserializer=lambda x: json.loads(x.decode('utf-8')),
            **kwargs
        )
        self.running = True
        
    def run(self):
        print(f"Starting consumer for topic: {self.topic}")
        while self.running:
            try:
                # Poll for messages with a timeout
                messages = self.consumer.poll(timeout_ms=1000)
                
                for topic_partition, records in messages.items():
                    for record in records:
                        try:
                            # Process the message
                            self.processor_module.process_event(record.value)
                        except Exception as e:
                            print(f"Error processing message: {e}")
                            
            except Exception as e:
                print(f"Consumer error: {e}")
                time.sleep(5)  # Avoid tight loops in case of errors
                
        self.consumer.close()
        print(f"Consumer for topic {self.topic} closed")
        
    def stop(self):
        self.running = False

def start_consumers():
    """Start all Kafka consumers as separate threads"""
    threads = []
    
    # Start main topic consumers
    for topic, processor in TOPICS.items():
        consumer_thread = KafkaConsumerThread(topic, processor)
        consumer_thread.daemon = True
        consumer_thread.start()
        threads.append(consumer_thread)
        
    # Start analytics topic consumers
    for topic, processor in ANALYTICS_TOPICS.items():
        consumer_thread = KafkaConsumerThread(topic, processor)
        consumer_thread.daemon = True
        consumer_thread.start()
        threads.append(consumer_thread)
        
    return threads

if __name__ == "__main__":
    print("Starting Kafka consumers...")
    consumer_threads = start_consumers()
    
    try:
        # Keep the main thread alive
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("Shutting down consumers...")
        for thread in consumer_threads:
            thread.stop()
        
        # Wait for all threads to complete
        for thread in consumer_threads:
            thread.join()
            
        print("All consumers stopped")