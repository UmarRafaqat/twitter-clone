# spark-jobs/discover_feed_generator.py
from pyspark.sql import SparkSession
from pyspark.sql.functions import col, expr, collect_list, struct, window, desc, lit, row_number
from pyspark.sql.window import Window
import datetime

# Configuration
MONGODB_HOST = "mongodb"
MONGODB_PORT = 27017
MONGODB_DB = "mini_twitter"
MONGODB_OUTPUT_DB = "mini_twitter_analytics"

def create_spark_session():
    """Create and configure Spark session"""
    return (SparkSession.builder
            .appName("DiscoverFeedGenerator")
            .config("spark.mongodb.input.uri", f"mongodb://{MONGODB_HOST}:{MONGODB_PORT}/{MONGODB_DB}")
            .config("spark.mongodb.output.uri", f"mongodb://{MONGODB_HOST}:{MONGODB_PORT}/{MONGODB_OUTPUT_DB}")
            .config("spark.jars.packages", "org.mongodb.spark:mongo-spark-connector_2.12:3.0.1")
            .getOrCreate())

def generate_discover_feed():
    """Generate recommendations for the discover feed"""
    spark = create_spark_session()
    
    try:
        # Load tweets from MongoDB
        tweets_df = (spark.read.format("mongo")
                    .option("collection", "tweets")
                    .load())
        
        # Load users from MongoDB
        users_df = (spark.read.format("mongo")
                   .option("collection", "users")
                   .load())
        
        # Load user interactions (likes, retweets, etc.)
        interactions_df = (spark.read.format("mongo")
                          .option("collection", "like_events")
                          .load())
        
        # 1. Find popular tweets (high engagement)
        # Calculate engagement score for each tweet
        tweet_engagement = tweets_df.withColumn(
            "engagement_score", 
            expr("(COALESCE(likes_count, 0) * 1) + " + 
                 "(COALESCE(comments_count, 0) * 2) + " +
                 "(COALESCE(retweet_count, 0) * 3)")
        )
        
        # Get top engaged tweets
        window_spec = Window.orderBy(desc("engagement_score"))
        popular_tweets = tweet_engagement.withColumn(
            "rank", row_number().over(window_spec)
        ).filter(col("rank") <= 100).drop("rank")
        
        # 2. Find recent tweets with trending hashtags
        # First, analyze hashtag frequencies
        hashtag_df = tweets_df.select(
            "id", 
            "user_id",
            "content",
            "created_at",
            "likes_count",
            "comments_count",
            explode(col("hashtags")).alias("hashtag")
        )
        
        # Calculate trending hashtags based on recent activity
        trending_hashtags = hashtag_df.filter(
            col("created_at") > lit(datetime.datetime.now() - datetime.timedelta(days=2))
        ).groupBy("hashtag").count().orderBy(desc("count")).limit(20)
        
        # Save trending hashtags to MongoDB
        (trending_hashtags.write
        .format("mongo")
        .mode("overwrite")
        .option("collection", "trending_hashtags_daily")
        .save())
        
        # 3. Find tweets for each user that should be included in discover
        # Group tweets by user
        user_tweets = tweets_df.groupBy("user_id").agg(
            collect_list(
                struct(
                    col("id"),
                    col("content"),
                    col("created_at"),
                    col("likes_count"),
                    col("comments_count"),
                    col("retweet_count")
                )
            ).alias("tweets")
        )
        
        # Join with user data
        user_tweets_with_info = user_tweets.join(
            users_df.select("id", "username", "followers_count"),
            user_tweets["user_id"] == users_df["id"],
            "inner"
        )
        
        # Calculate user popularity score
        user_tweets_with_score = user_tweets_with_info.withColumn(
            "popularity_score",
            col("followers_count")
        )
        
        # Save to MongoDB for discover feed
        (user_tweets_with_score.select(
            col("id").alias("user_id"),
            col("username"),
            col("popularity_score"),
            col("tweets")
        ).write
        .format("mongo")
        .mode("overwrite")
        .option("collection", "discover_feed_candidates")
        .save())
        
        print("Discover feed candidates generated successfully")
        return True
        
    except Exception as e:
        print(f"Error generating discover feed: {e}")
        return False
    finally:
        spark.stop()

if __name__ == "__main__":
    print("Starting discover feed generation...")
    generate_discover_feed()
    print("Discover feed generation completed")