import logging
import json
from datetime import datetime
from pymongo import MongoClient
from kafka import KafkaProducer

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Database and Kafka configurations
MONGODB_URL = "mongodb://mongodb:27017/mini_twitter"
KAFKA_BOOTSTRAP_SERVERS = "kafka:9092"

def get_mongo_client():
    return MongoClient(MONGODB_URL)

def get_kafka_producer():
    return KafkaProducer(
        bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
        value_serializer=lambda v: json.dumps(v).encode('utf-8')
    )

def process_event(event):
    """Process tweet-related events from Kafka"""
    event_type = event.get("event")
    
    logger.info(f"Processing tweet event: {event_type}")
    
    if event_type == "tweet_created":
        process_tweet_created(event)
    elif event_type == "tweet_retweeted":
        process_tweet_retweeted(event)
    elif event_type == "tweet_replied":
        process_tweet_replied(event)
    else:
        logger.warning(f"Unknown tweet event type: {event_type}")

def process_tweet_created(event):
    """Process tweet creation events"""
    try:
        # Extract tweet data
        tweet_id = event.get("tweet_id")
        user_id = event.get("user_id")
        content = event.get("content")
        hashtags = event.get("hashtags", [])
        created_at = event.get("created_at")
        
        # Connect to MongoDB
        mongo_client = get_mongo_client()
        analytics_db = mongo_client.mini_twitter_analytics
        
        # Store tweet in analytics collection
        event['processed_at'] = datetime.utcnow().isoformat()
        event['analytics_source'] = 'kafka_tweet_processor'
        analytics_db.tweet_analytics.insert_one(event)
        
        # Update hashtag statistics
        if hashtags:
            update_hashtag_stats(hashtags, analytics_db)
        
        # Send to analytics topic for further processing
        producer = get_kafka_producer()
        producer.send("tweet_analytics", {
            "event": "tweet_analyzed",
            "tweet_id": tweet_id,
            "user_id": user_id,
            "hashtags": hashtags,
            "content_length": len(content) if content else 0,
            "created_at": created_at,
            "analyzed_at": datetime.utcnow().isoformat()
        })
        
        logger.info(f"Tweet creation event processed for tweet: {tweet_id}")
        
    except Exception as e:
        logger.error(f"Error processing tweet creation: {e}")
    finally:
        if 'mongo_client' in locals():
            mongo_client.close()
        if 'producer' in locals():
            producer.flush()

def update_hashtag_stats(hashtags, analytics_db):
    """Update hashtag usage statistics"""
    hashtag_stats = analytics_db.hashtag_stats
    current_date = datetime.utcnow().strftime("%Y-%m-%d")
    
    # Update count for each hashtag
    for hashtag in hashtags:
        # Update daily stats
        hashtag_stats.update_one(
            {"hashtag": hashtag, "date": current_date},
            {"$inc": {"count": 1}},
            upsert=True
        )
        
        # Update all-time stats
        hashtag_stats.update_one(
            {"hashtag": hashtag, "date": "all-time"},
            {"$inc": {"count": 1}},
            upsert=True
        )

def process_tweet_retweeted(event):
    """Process retweet events"""
    try:
        # Extract data
        tweet_id = event.get("tweet_id")
        original_tweet_id = event.get("original_tweet_id")
        user_id = event.get("user_id")
        
        # Store event in analytics DB
        mongo_client = get_mongo_client()
        analytics_db = mongo_client.mini_twitter_analytics
        
        event['processed_at'] = datetime.utcnow().isoformat()
        event['analytics_source'] = 'kafka_tweet_processor'
        analytics_db.retweet_analytics.insert_one(event)
        
        # Increment retweet count for original tweet
        analytics_db.tweet_metrics.update_one(
            {"tweet_id": original_tweet_id},
            {"$inc": {"retweet_count": 1}},
            upsert=True
        )
        
        logger.info(f"Retweet event processed for tweet: {original_tweet_id}")
        
    except Exception as e:
        logger.error(f"Error processing retweet: {e}")
    finally:
        if 'mongo_client' in locals():
            mongo_client.close()

def process_tweet_replied(event):
    """Process reply events"""
    try:
        tweet_id = event.get("tweet_id")
        parent_tweet_id = event.get("parent_tweet_id")
        
        # Store event in analytics DB
        mongo_client = get_mongo_client()
        analytics_db = mongo_client.mini_twitter_analytics
        
        event['processed_at'] = datetime.utcnow().isoformat()
        event['analytics_source'] = 'kafka_tweet_processor'
        analytics_db.reply_analytics.insert_one(event)
        
        # Increment reply count for parent tweet
        analytics_db.tweet_metrics.update_one(
            {"tweet_id": parent_tweet_id},
            {"$inc": {"reply_count": 1}},
            upsert=True
        )
        
        logger.info(f"Reply event processed for tweet: {parent_tweet_id}")
        
    except Exception as e:
        logger.error(f"Error processing reply: {e}")
    finally:
        if 'mongo_client' in locals():
            mongo_client.close()