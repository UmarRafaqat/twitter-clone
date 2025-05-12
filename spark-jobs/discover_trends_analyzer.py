# spark-jobs/discover_trends_analyzer.py
from pyspark.sql import SparkSession
from pyspark.sql.functions import col, explode, count, desc, row_number, collect_list, struct
from pyspark.sql.window import Window
from datetime import datetime, timedelta

# MongoDB Configuration
MONGODB_HOST = "mongodb"
MONGODB_PORT = 27017
MONGODB_DB = "mini_twitter"
MONGODB_OUTPUT_DB = "mini_twitter_analytics"

def create_spark_session():
    """Create and configure Spark session"""
    return (SparkSession.builder
            .appName("DiscoverTrendsAnalyzer")
            .config("spark.mongodb.input.uri", f"mongodb://{MONGODB_HOST}:{MONGODB_PORT}/{MONGODB_DB}")
            .config("spark.mongodb.output.uri", f"mongodb://{MONGODB_HOST}:{MONGODB_PORT}/{MONGODB_OUTPUT_DB}")
            .config("spark.jars.packages", "org.mongodb.spark:mongo-spark-connector_2.12:3.0.1")
            .getOrCreate())

def analyze_discover_trends():
    """Analyze trends for the discover feed"""
    spark = create_spark_session()
    
    try:
        # Load tweets from MongoDB
        tweets_df = (spark.read.format("mongo")
                    .option("collection", "tweets")
                    .load())
        
        # Explode hashtags for analysis
        hashtags_df = tweets_df.select(
            "id", 
            "user_id", 
            "content",
            "created_at",
            explode(col("hashtags")).alias("hashtag")
        )
        
        # Calculate trending hashtags in the last 24 hours
        # This helps find content that's currently popular for the discover feed
        now = datetime.now()
        yesterday = now - timedelta(days=1)
        
        daily_trending = (hashtags_df
                        .filter(col("created_at") > yesterday.isoformat())
                        .groupBy("hashtag")
                        .agg(count("*").alias("count"))
                        .orderBy(desc("count"))
                        .limit(20))
        
        # Save trending hashtags to MongoDB for API access
        (daily_trending.write
        .format("mongo")
        .mode("overwrite")
        .option("collection", "trending_hashtags_daily")
        .save())
        
        # Identify users with high engagement tweets for discover recommendations
        engagement_df = tweets_df.withColumn(
            "engagement_score",
            col("likes_count") * 1 + col("comments_count") * 2
        )
        
        # Find top engaged tweets
        window_spec = Window.partitionBy("user_id").orderBy(desc("engagement_score"))
        top_engaged_tweets = (engagement_df
                            .withColumn("rank", row_number().over(window_spec))
                            .filter(col("rank") <= 3)  # Top 3 tweets per user
                            .drop("rank"))
        
        # Group by user to create discover recommendations
        discover_users = (top_engaged_tweets
                        .groupBy("user_id")
                        .agg(
                            collect_list(
                                struct(
                                    col("id"),
                                    col("content"),
                                    col("created_at"),
                                    col("likes_count"),
                                    col("comments_count")
                                )
                            ).alias("top_tweets"),
                            count("*").alias("tweet_count")
                        ))
        
        # Save discover recommendations to MongoDB
        (discover_users.write
        .format("mongo")
        .mode("overwrite")
        .option("collection", "discover_recommendations")
        .save())
        
        print("Discover trends analysis completed successfully")
        return True
    
    except Exception as e:
        print(f"Error in discover trends analysis: {e}")
        return False
    finally:
        spark.stop()

if __name__ == "__main__":
    print("Starting discover trends analysis...")
    analyze_discover_trends()
    print("Discover trends analysis completed")