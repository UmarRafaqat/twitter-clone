import logging
import json
from datetime import datetime
from pymongo import MongoClient
from textblob import TextBlob

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Database configuration
MONGODB_URL = "mongodb://mongodb:27017/mini_twitter"

def get_mongo_client():
    return MongoClient(MONGODB_URL)

def process_event(event):
    """Process analytics events from Kafka"""
    event_type = event.get("event")
    
    logger.info(f"Processing analytics event: {event_type}")
    
    if event_type == "tweet_analyzed":
        perform_sentiment_analysis(event)
    else:
        logger.warning(f"Unknown analytics event type: {event_type}")

def perform_sentiment_analysis(event):
    """Perform sentiment analysis on tweet content"""
    try:
        # Need to get the actual tweet content from MongoDB
        tweet_id = event.get("tweet_id")
        
        mongo_client = get_mongo_client()
        tweets_collection = mongo_client.mini_twitter.tweets
        
        # Get the tweet
        tweet = tweets_collection.find_one({"id": tweet_id})
        if not tweet:
            logger.warning(f"Tweet {tweet_id} not found for sentiment analysis")
            return
        
        content = tweet.get("content", "")
        
        # Perform sentiment analysis using TextBlob
        analysis = TextBlob(content)
        sentiment_score = analysis.sentiment.polarity
        
        # Categorize sentiment
        if sentiment_score > 0.1:
            sentiment = "positive"
        elif sentiment_score < -0.1:
            sentiment = "negative"
        else:
            sentiment = "neutral"
        
        # Store sentiment analysis result
        analytics_db = mongo_client.mini_twitter_analytics
        analytics_db.tweet_sentiment.insert_one({
            "tweet_id": tweet_id,
            "user_id": tweet.get("user_id"),
            "content": content,
            "sentiment_score": sentiment_score,
            "sentiment": sentiment,
            "analyzed_at": datetime.utcnow().isoformat()
        })
        
        # Update user sentiment stats
        update_user_sentiment_stats(tweet.get("user_id"), sentiment, analytics_db)
        
        logger.info(f"Sentiment analysis completed for tweet {tweet_id}: {sentiment}")
        
    except Exception as e:
        logger.error(f"Error performing sentiment analysis: {e}")
    finally:
        if 'mongo_client' in locals():
            mongo_client.close()

def update_user_sentiment_stats(user_id, sentiment, analytics_db):
    """Update sentiment statistics for a user"""
    # Get today's date
    today = datetime.utcnow().strftime("%Y-%m-%d")
    
    # Increment the appropriate sentiment counter
    sentiment_field = f"{sentiment}_count"
    
    # Update daily stats
    analytics_db.user_sentiment_stats.update_one(
        {"user_id": user_id, "date": today},
        {"$inc": {sentiment_field: 1, "total_count": 1}},
        upsert=True
    )
    
    # Update all-time stats
    analytics_db.user_sentiment_stats.update_one(
        {"user_id": user_id, "date": "all-time"},
        {"$inc": {sentiment_field: 1, "total_count": 1}},
        upsert=True
    )