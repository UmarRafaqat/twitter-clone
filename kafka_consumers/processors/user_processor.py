import logging
from datetime import datetime
from pymongo import MongoClient
import psycopg2
from cassandra.cluster import Cluster

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Database connections
MONGODB_URL = "mongodb://mongodb:27017/mini_twitter"
DB_URL = "postgresql://mini_twitter:password@postgres:5432/mini_twitter"
CASSANDRA_HOSTS = ["cassandra"]

# Connect to databases
def get_mongo_client():
    return MongoClient(MONGODB_URL)

def get_pg_conn():
    return psycopg2.connect(DB_URL)

def get_cassandra_session():
    cluster = Cluster(CASSANDRA_HOSTS)
    return cluster.connect()

def process_event(event):
    """Process user-related events from Kafka"""
    event_type = event.get("event")
    
    logger.info(f"Processing user event: {event_type}")
    
    if event_type == "user_created":
        process_user_created(event)
    else:
        logger.warning(f"Unknown user event type: {event_type}")

def process_user_created(event):
    """Process user creation events"""
    try:
        # Store user data in analytics collection
        mongo_client = get_mongo_client()
        analytics_db = mongo_client.mini_twitter_analytics
        user_analytics = analytics_db.user_analytics
        
        # Add timestamp and analytics metadata
        event['processed_at'] = datetime.utcnow().isoformat()
        event['analytics_source'] = 'kafka_user_processor'
        
        # Insert into analytics collection
        user_analytics.insert_one(event)
        
        # Update other metrics like daily user signups
        update_user_metrics(event, mongo_client)
        
        logger.info(f"User creation event processed for user: {event.get('username')}")
        
    except Exception as e:
        logger.error(f"Error processing user creation: {e}")
    finally:
        if 'mongo_client' in locals():
            mongo_client.close()

def update_user_metrics(event, mongo_client):
    """Update user-related metrics"""
    analytics_db = mongo_client.mini_twitter_analytics
    metrics = analytics_db.metrics
    
    # Get the date portion for daily metrics
    created_date = event.get('created_at', datetime.utcnow().isoformat())[:10]
    
    # Increment daily user signup count
    metrics.update_one(
        {"metric": "daily_signups", "date": created_date},
        {"$inc": {"count": 1}},
        upsert=True
    )
    
    # Increment total user count
    metrics.update_one(
        {"metric": "total_users"},
        {"$inc": {"count": 1}},
        upsert=True
    )