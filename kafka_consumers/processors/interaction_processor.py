import logging
from datetime import datetime
from pymongo import MongoClient
from cassandra.cluster import Cluster

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Database connections
MONGODB_URL = "mongodb://mongodb:27017/mini_twitter"
CASSANDRA_HOSTS = ["cassandra"]

def get_mongo_client():
    return MongoClient(MONGODB_URL)

def get_cassandra_session():
    cluster = Cluster(CASSANDRA_HOSTS)
    session = cluster.connect()
    
    # Create keyspace if not exists
    session.execute("""
        CREATE KEYSPACE IF NOT EXISTS mini_twitter_analytics 
        WITH REPLICATION = { 
            'class' : 'SimpleStrategy', 
            'replication_factor' : 1 
        }
    """)
    
    # Create tables for analytics
    session.execute("""
        CREATE TABLE IF NOT EXISTS mini_twitter_analytics.user_activity (
            user_id TEXT,
            activity_date TEXT,
            likes_count COUNTER,
            comments_count COUNTER,
            follows_count COUNTER,
            PRIMARY KEY ((user_id), activity_date)
        )
    """)
    
    return session

def process_event(event):
    """Process interaction events from Kafka"""
    event_type = event.get("event")
    
    logger.info(f"Processing interaction event: {event_type}")
    
    if event_type == "tweet_liked":
        process_like_event(event)
    elif event_type == "tweet_unliked":
        process_unlike_event(event)
    elif event_type == "comment_created":
        process_comment_event(event)
    elif event_type == "user_followed" or event_type == "user_unfollowed":
        process_follow_event(event)
    else:
        logger.warning(f"Unknown interaction event type: {event_type}")

def process_like_event(event):
    """Process like events"""
    try:
        user_id = event.get("user_id")
        tweet_id = event.get("tweet_id")
        created_at = event.get("created_at")
        activity_date = created_at[:10]  # Extract YYYY-MM-DD
        
        # Store in MongoDB for analytics
        mongo_client = get_mongo_client()
        analytics_db = mongo_client.mini_twitter_analytics
        
        # Add processing metadata
        event['processed_at'] = datetime.utcnow().isoformat()
        event['analytics_source'] = 'kafka_interaction_processor'
        
        # Store the like event
        analytics_db.like_events.insert_one(event)
        
        # Update user engagement metrics in Cassandra
        cassandra_session = get_cassandra_session()
        cassandra_session.execute("""
            UPDATE mini_twitter_analytics.user_activity 
            SET likes_count = likes_count + 1 
            WHERE user_id = %s AND activity_date = %s
        """, (user_id, activity_date))
        
        # Update tweet popularity metrics
        analytics_db.tweet_popularity.update_one(
            {"tweet_id": tweet_id},
            {"$inc": {"like_count": 1}},
            upsert=True
        )
        
        logger.info(f"Like event processed for tweet: {tweet_id}")
        
    except Exception as e:
        logger.error(f"Error processing like event: {e}")
    finally:
        if 'mongo_client' in locals():
            mongo_client.close()
        if 'cassandra_session' in locals():
            cassandra_session.shutdown()

def process_unlike_event(event):
    """Process unlike events"""
    try:
        user_id = event.get("user_id")
        tweet_id = event.get("tweet_id")
        created_at = event.get("created_at")
        activity_date = created_at[:10]  # Extract YYYY-MM-DD
        
        # Store in MongoDB for analytics
        mongo_client = get_mongo_client()
        analytics_db = mongo_client.mini_twitter_analytics
        
        # Add processing metadata
        event['processed_at'] = datetime.utcnow().isoformat()
        event['analytics_source'] = 'kafka_interaction_processor'
        
        # Store the unlike event
        analytics_db.unlike_events.insert_one(event)
        
        # Update tweet popularity metrics
        analytics_db.tweet_popularity.update_one(
            {"tweet_id": tweet_id},
            {"$inc": {"like_count": -1}},
            upsert=True
        )
        
        logger.info(f"Unlike event processed for tweet: {tweet_id}")
        
    except Exception as e:
        logger.error(f"Error processing unlike event: {e}")
    finally:
        if 'mongo_client' in locals():
            mongo_client.close()

def process_comment_event(event):
    """Process comment events"""
    try:
        user_id = event.get("user_id")
        tweet_id = event.get("tweet_id")
        comment_id = event.get("comment_id")
        created_at = event.get("created_at")
        activity_date = created_at[:10]  # Extract YYYY-MM-DD
        
        # Store in MongoDB for analytics
        mongo_client = get_mongo_client()
        analytics_db = mongo_client.mini_twitter_analytics
        
        # Add processing metadata
        event['processed_at'] = datetime.utcnow().isoformat()
        event['analytics_source'] = 'kafka_interaction_processor'
        
        # Store the comment event
        analytics_db.comment_events.insert_one(event)
        
        # Update user engagement metrics in Cassandra
        cassandra_session = get_cassandra_session()
        cassandra_session.execute("""
            UPDATE mini_twitter_analytics.user_activity 
            SET comments_count = comments_count + 1 
            WHERE user_id = %s AND activity_date = %s
        """, (user_id, activity_date))
        
        # Update tweet engagement metrics
        analytics_db.tweet_engagement.update_one(
            {"tweet_id": tweet_id},
            {"$inc": {"comment_count": 1}},
            upsert=True
        )
        
        logger.info(f"Comment event processed for tweet: {tweet_id}")
        
    except Exception as e:
        logger.error(f"Error processing comment event: {e}")
    finally:
        if 'mongo_client' in locals():
            mongo_client.close()
        if 'cassandra_session' in locals():
            cassandra_session.shutdown()

def process_follow_event(event):
    """Process follow/unfollow events"""
    try:
        follower_id = event.get("follower_id")
        followee_id = event.get("followee_id")
        created_at = event.get("created_at")
        activity_date = created_at[:10]  # Extract YYYY-MM-DD
        is_follow = event.get("event") == "user_followed"
        
        # Store in MongoDB for analytics
        mongo_client = get_mongo_client()
        analytics_db = mongo_client.mini_twitter_analytics
        
        # Add processing metadata
        event['processed_at'] = datetime.utcnow().isoformat()
        event['analytics_source'] = 'kafka_interaction_processor'
        
        # Store the follow/unfollow event
        analytics_db.follow_events.insert_one(event)
        
        if is_follow:
            # Update user social metrics in Cassandra
            cassandra_session = get_cassandra_session()
            cassandra_session.execute("""
                UPDATE mini_twitter_analytics.user_activity 
                SET follows_count = follows_count + 1 
                WHERE user_id = %s AND activity_date = %s
            """, (follower_id, activity_date))
            
            # Update follower count for followee
            analytics_db.user_metrics.update_one(
                {"user_id": followee_id},
                {"$inc": {"follower_count": 1}},
                upsert=True
            )
            
            # Update following count for follower
            analytics_db.user_metrics.update_one(
                {"user_id": follower_id},
                {"$inc": {"following_count": 1}},
                upsert=True
            )
            
            logger.info(f"Follow event processed: {follower_id} -> {followee_id}")
        else:
            # Update follower count for followee
            analytics_db.user_metrics.update_one(
                {"user_id": followee_id},
                {"$inc": {"follower_count": -1}},
                upsert=True
            )
            
            # Update following count for follower
            analytics_db.user_metrics.update_one(
                {"user_id": follower_id},
                {"$inc": {"following_count": -1}},
                upsert=True
            )
            
            logger.info(f"Unfollow event processed: {follower_id} -> {followee_id}")
        
    except Exception as e:
        logger.error(f"Error processing follow event: {e}")
    finally:
        if 'mongo_client' in locals():
            mongo_client.close()
        if 'cassandra_session' in locals():
            cassandra_session.shutdown()