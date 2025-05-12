# backend/app/routers/discover.py
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
import random
from pymongo import MongoClient, DESCENDING
from ..dependencies import get_current_user, get_db
from ..models.tweet import Tweet

router = APIRouter()

@router.get("/discover", response_model=List[Tweet])
async def get_discover_feed(
    limit: int = Query(20, ge=1, le=50),
    current_user = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    Get a discover feed with posts from multiple users, prioritizing:
    1. Popular tweets (high engagement)
    2. Trending topics
    3. Posts from users similar to followed users
    """
    # Get user's following list to exclude them from discover 
    # (they're already in the regular timeline)
    following_cursor = db.follows.find({"follower_id": current_user["id"]})
    following_ids = [follow["followee_id"] for follow in following_cursor]
    
    # Make sure we don't include the user's own tweets
    following_ids.append(current_user["id"])

    # Find popular tweets from users not followed by current user
    popular_tweets = list(db.tweets.aggregate([
        {"$match": {"user_id": {"$nin": following_ids}}},
        {"$lookup": {
            "from": "users",
            "localField": "user_id",
            "foreignField": "id",
            "as": "user"
        }},
        {"$unwind": "$user"},
        {"$sort": {"likes_count": DESCENDING}},
        {"$limit": 50}
    ]))
    
    # Find tweets with trending hashtags
    trending_hashtags = list(db.trending_hashtags_daily.find().limit(5))
    
    trend_tweets = []
    if trending_hashtags:
        hashtag_queries = []
        for trend in trending_hashtags:
            hashtag = trend.get("hashtag") or trend.get("_id")
            if hashtag:
                hashtag_queries.append({"hashtags": hashtag})
        
        if hashtag_queries:
            trend_tweets = list(db.tweets.aggregate([
                {"$match": {
                    "$and": [
                        {"user_id": {"$nin": following_ids}},
                        {"$or": hashtag_queries}
                    ]
                }},
                {"$lookup": {
                    "from": "users",
                    "localField": "user_id",
                    "foreignField": "id",
                    "as": "user"
                }},
                {"$unwind": "$user"},
                {"$limit": 20}
            ]))
    
    # Combine all sources and remove duplicates
    all_tweets = []
    seen_ids = set()
    
    # Helper function to add tweets while avoiding duplicates
    def add_unique_tweets(tweets):
        for tweet in tweets:
            if tweet["id"] not in seen_ids:
                # Add username directly to tweet object for frontend use
                tweet["username"] = tweet["user"]["username"]
                # Remove the nested user object as it's redundant now
                del tweet["user"]
                
                all_tweets.append(tweet)
                seen_ids.add(tweet["id"])
    
    # Add tweets from each source
    add_unique_tweets(popular_tweets)
    add_unique_tweets(trend_tweets)
    
    # Group by user to ensure we have tweets from multiple users
    tweets_by_user = {}
    for tweet in all_tweets:
        user_id = tweet["user_id"]
        if user_id not in tweets_by_user:
            tweets_by_user[user_id] = []
        
        # Limit to 3 tweets per user maximum
        if len(tweets_by_user[user_id]) < 3:
            tweets_by_user[user_id].append(tweet)
    
    # Flatten the grouped tweets
    result = []
    for user_tweets in tweets_by_user.values():
        result.extend(user_tweets)
    
    # Return a selection of tweets, prioritizing a diverse set of users
    return result[:limit]