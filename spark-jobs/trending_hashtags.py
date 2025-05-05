from pyspark.sql import SparkSession
from pyspark.sql.functions import explode, split, window, count, col, from_json
from pyspark.sql.types import StructType, StructField, StringType, TimestampType, ArrayType
import os

# Kafka configuration
KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092")

def create_spark_session():
    return (SparkSession.builder
            .appName("TrendingHashtagsJob")
            .config("spark.jars.packages", "org.apache.spark:spark-sql-kafka-0-10_2.12:3.3.0")
            .getOrCreate())

# Define schema for tweet events
tweet_schema = StructType([
    StructField("event", StringType(), True),
    StructField("tweet_id", StringType(), True),
    StructField("user_id", StringType(), True),
    StructField("content", StringType(), True),
    StructField("hashtags", ArrayType(StringType()), True),
    StructField("created_at", TimestampType(), True)
])

def trending_hashtags_job():
    """
    Spark Streaming job to detect trending hashtags
    """
    spark = create_spark_session()
    
    # Read tweet stream from Kafka
    tweets_df = (spark
        .readStream
        .format("kafka")
        .option("kafka.bootstrap.servers", KAFKA_BOOTSTRAP_SERVERS)
        .option("subscribe", "tweets")
        .option("startingOffsets", "latest")
        .load()
        .selectExpr("CAST(value AS STRING)")
        .select(from_json(col("value"), tweet_schema).alias("data"))
        .select("data.*")
        .filter(col("event") == "tweet_created")
        .select("tweet_id", "hashtags", "created_at"))

    # Explode hashtags array into rows
    hashtags_df = tweets_df.select(
        "tweet_id", 
        "created_at", 
        explode("hashtags").alias("hashtag")
    )
    
    # Count hashtags in 10-minute sliding windows
    trending_df = (hashtags_df
        .withWatermark("created_at", "10 minutes")
        .groupBy(
            window("created_at", "10 minutes", "2 minutes"),
            "hashtag"
        )
        .count()
        .orderBy(col("count").desc()))
    
# Write to in-memory table for querying by API
    query = (trending_df
        .writeStream
        .outputMode("complete")
        .format("memory")
        .queryName("trending_hashtags")
        .start())
    
    # For demonstration, also print to console
    console_query = (trending_df
        .writeStream
        .outputMode("complete")
        .format("console")
        .option("truncate", "false")
        .start())
    
    query.awaitTermination()

if __name__ == "__main__":
    trending_hashtags_job()