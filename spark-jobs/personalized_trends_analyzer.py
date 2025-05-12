# In spark-jobs/personalized_trends_analyzer.py
from pyspark.sql import SparkSession
from pyspark.sql.functions import explode, split, col, count, regexp_extract
import datetime

# Create Spark session
spark = SparkSession.builder \
    .appName("PersonalizedTrendsAnalyzer") \
    .config("spark.mongodb.input.uri", "mongodb://mongodb:27017/mini_twitter") \
    .config("spark.mongodb.output.uri", "mongodb://mongodb:27017/mini_twitter_analytics") \
    .getOrCreate()

# Get follows relationships
follows_df = spark.read.format("jdbc") \
    .option("url", "jdbc:postgresql://postgres:5432/mini_twitter") \
    .option("dbtable", "follows") \
    .option("user", "mini_twitter") \
    .option("password", "password") \
    .load()

# Get tweets from MongoDB
tweets_df = spark.read.format("mongo") \
    .option("database", "mini_twitter") \
    .option("collection", "tweets") \
    .load()

# Extract hashtags with regex
tweets_with_hashtags = tweets_df.withColumn(
    "hashtag", 
    regexp_extract(col("content"), r'#(\w+)', 1)
).filter(col("hashtag") != "")

# For each user, find tweets from followed users
user_timelines = follows_df.join(
    tweets_with_hashtags,
    follows_df.followed_id == tweets_with_hashtags.user_id,
    "inner"
)

# Group by user_id and hashtag to get personalized trends
personalized_trends = user_timelines.groupBy("follower_id", "hashtag") \
    .count() \
    .orderBy(col("follower_id"), col("count").desc())

# Save to MongoDB
personalized_trends.write.format("mongo") \
    .option("database", "mini_twitter_analytics") \
    .option("collection", "personalized_trends") \
    .mode("overwrite") \
    .save()

spark.stop()