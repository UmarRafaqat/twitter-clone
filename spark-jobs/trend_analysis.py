from pyspark.sql import SparkSession
from pyspark.sql.functions import explode, split, col, to_date, count, dense_rank, desc, window
from pyspark.sql.types import StructType, StructField, StringType, TimestampType, ArrayType
import json
import os
from datetime import datetime, timedelta

# MongoDB Configuration
MONGODB_HOST = "mongodb"
MONGODB_PORT = 27017
MONGODB_DB = "mini_twitter"
MONGODB_OUTPUT_DB = "mini_twitter_analytics"

def create_spark_session():
    """Create and configure Spark session"""
    return (SparkSession.builder
            .appName("MiniTwitterTrendAnalysis")
            .config("spark.mongodb.input.uri", f"mongodb://{MONGODB_HOST}:{MONGODB_PORT}/{MONGODB_DB}")
            .config("spark.mongodb.output.uri", f"mongodb://{MONGODB_HOST}:{MONGODB_PORT}/{MONGODB_OUTPUT_DB}")
            .config("spark.jars.packages", "org.mongodb.spark:mongo-spark-connector_2.12:3.0.1")
            .getOrCreate())

def analyze_trending_hashtags(spark):
    """Analyze trending hashtags over different time windows"""
    # Define schema for tweets
    tweet_schema = StructType([
        StructField("id", StringType()),
        StructField("user_id", StringType()),
        StructField("content", StringType()),
        StructField("hashtags", ArrayType(StringType())),
        StructField("created_at", TimestampType())
    ])
    
    # Load tweets from MongoDB
    tweets_df = (spark.read.format("mongo")
                .option("collection", "tweets")
                .schema(tweet_schema)
                .load())
    
    # Explode the hashtags array to create one row per hashtag
    hashtags_df = tweets_df.select(
        "id", 
        "user_id", 
        to_date("created_at").alias("date"),
        "created_at",
        explode("hashtags").alias("hashtag")
    )
    
    # Calculate trending hashtags for today
    today = datetime.utcnow().date()
    today_str = today.strftime("%Y-%m-%d")
    
    today_trending = (hashtags_df
                    .filter(col("date") == today_str)
                    .groupBy("hashtag")
                    .agg(count("*").alias("count"))
                    .orderBy(desc("count"))
                    .limit(50))
    
    # Calculate trending hashtags for last 7 days
    seven_days_ago = (today - timedelta(days=7)).strftime("%Y-%m-%d")
    
    weekly_trending = (hashtags_df
                    .filter(col("date") >= seven_days_ago)
                    .groupBy("hashtag")
                    .agg(count("*").alias("count"))
                    .orderBy(desc("count"))
                    .limit(50))
    
    # Calculate hourly trending hashtags using sliding windows
    hourly_trending = (hashtags_df
                    .filter(col("date") >= today_str)
                    .withWatermark("created_at", "1 hour")
                    .groupBy(
                        window("created_at", "1 hour", "30 minutes"),
                        "hashtag"
                    )
                    .agg(count("*").alias("count"))
                    .orderBy(desc("count"))
                    .limit(50))
    
    # Store results in MongoDB collections
    (today_trending.write
    .format("mongo")
    .mode("overwrite")
    .option("collection", "trending_hashtags_daily")
    .save())
    
    (weekly_trending.write
    .format("mongo")
    .mode("overwrite")
    .option("collection", "trending_hashtags_weekly")
    .save())
    
    (hourly_trending.write
    .format("mongo")
    .mode("overwrite")
    .option("collection", "trending_hashtags_hourly")
    .save())
    
    return {
        "daily": today_trending.count(),
        "weekly": weekly_trending.count(),
        "hourly": hourly_trending.count()
    }

def analyze_user_activity(spark):
    """Analyze user activity patterns"""
    # Load tweets
    tweets_df = (spark.read.format("mongo")
                .option("collection", "tweets")
                .load())
    
    # Daily tweets per user
    daily_tweets = (tweets_df
                  .withColumn("date", to_date("created_at"))
                  .groupBy("user_id", "date")
                  .agg(count("*").alias("tweet_count"))
                  .orderBy("date", desc("tweet_count")))
    
    # Most active users overall
    active_users = (tweets_df
                  .groupBy("user_id")
                  .agg(count("*").alias("tweet_count"))
                  .orderBy(desc("tweet_count"))
                  .limit(100))
    
    # Store results
    (daily_tweets.write
    .format("mongo")
    .mode("overwrite")
    .option("collection", "user_daily_activity")
    .save())
    
    (active_users.write
    .format("mongo")
    .mode("overwrite")
    .option("collection", "most_active_users")
    .save())
    
    return {
        "daily_activity_records": daily_tweets.count(),
        "active_users": active_users.count()
    }

def analyze_engagement_metrics(spark):
    """Analyze tweet engagement metrics (likes, retweets, replies)"""
    # Load tweets
    tweets_df = (spark.read.format("mongo")
                .option("collection", "tweets")
                .load())
    
    # Load likes from Cassandra-backed collection
    likes_df = (spark.read.format("mongo")
              .option("collection", "like_counts")
              .load())
    
    # Join tweets with likes
    tweet_engagement = (tweets_df
                      .join(likes_df, tweets_df["id"] == likes_df["tweet_id"], "left")
                      .select(
                          tweets_df["id"].alias("tweet_id"),
                          tweets_df["user_id"],
                          tweets_df["content"],
                          tweets_df["created_at"],
                          likes_df["count"].alias("likes_count")
                      ))
    
    # Most liked tweets
    top_liked = (tweet_engagement
               .orderBy(desc("likes_count"))
               .limit(100))
    
    # Store results
    (top_liked.write
    .format("mongo")
    .mode("overwrite")
    .option("collection", "top_liked_tweets")
    .save())
    
    return {
        "top_liked_tweets": top_liked.count()
    }

def main():
    """Main function to run Spark analytics jobs"""
    spark = create_spark_session()
    
    try:
        print("Starting Mini Twitter Analytics...")
        
        # Run analysis jobs
        hashtags_results = analyze_trending_hashtags(spark)
        print(f"Hashtag analysis complete: {hashtags_results}")
        
        activity_results = analyze_user_activity(spark)
        print(f"User activity analysis complete: {activity_results}")
        
        engagement_results = analyze_engagement_metrics(spark)
        print(f"Engagement metrics analysis complete: {engagement_results}")
        
        # Log completion with timestamp
        completion_time = datetime.utcnow().isoformat()
        print(f"All analytics jobs completed at {completion_time}")
        
    finally:
        spark.stop()

if __name__ == "__main__":
    main()