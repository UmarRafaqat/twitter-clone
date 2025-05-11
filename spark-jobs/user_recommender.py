from pyspark.sql import SparkSession
from pyspark.sql.functions import col, collect_list, struct, explode, size
from pyspark.ml.feature import CountVectorizer
from pyspark.ml.feature import MinHashLSH
from datetime import datetime

# MongoDB Configuration
MONGODB_HOST = "mongodb"
MONGODB_PORT = 27017
MONGODB_DB = "mini_twitter"
MONGODB_OUTPUT_DB = "mini_twitter_analytics"

def create_spark_session():
    """Create and configure Spark session"""
    return (SparkSession.builder
            .appName("MiniTwitterUserRecommender")
            .config("spark.mongodb.input.uri", f"mongodb://{MONGODB_HOST}:{MONGODB_PORT}/{MONGODB_DB}")
            .config("spark.mongodb.output.uri", f"mongodb://{MONGODB_HOST}:{MONGODB_PORT}/{MONGODB_OUTPUT_DB}")
            .config("spark.jars.packages", "org.mongodb.spark:mongo-spark-connector_2.12:3.0.1")
            .getOrCreate())

def generate_user_recommendations(spark):
    """Generate user recommendations based on shared interests and behavior"""
    # Load tweets from MongoDB
    tweets_df = (spark.read.format("mongo")
                .option("collection", "tweets")
                .load())
    
    # Load follows relationships from PostgreSQL
    follows_df = (spark.read.format("jdbc")
                .option("url", "jdbc:postgresql://postgres:5432/mini_twitter")
                .option("dbtable", "follows")
                .option("user", "mini_twitter")
                .option("password", "password")
                .load())
    
    # 1. Find users with similar hashtag usage
    # Get hashtags for each user
    user_hashtags = (tweets_df
                    .filter(size(col("hashtags")) > 0)
                    .select("user_id", explode("hashtags").alias("hashtag"))
                    .distinct()
                    .groupBy("user_id")
                    .agg(collect_list("hashtag").alias("hashtags")))
    
    # Convert hashtags to feature vectors
    cv = CountVectorizer(inputCol="hashtags", outputCol="hashtag_features")
    cv_model = cv.fit(user_hashtags)
    featurized_df = cv_model.transform(user_hashtags)
    
    # Use MinHashLSH for finding similar users
    mh = MinHashLSH(inputCol="hashtag_features", outputCol="hashes", numHashTables=5)
    model = mh.fit(featurized_df)
    
    # Transform data
    hashed_df = model.transform(featurized_df)
    
    # For each user, find similar users
    user_similarities = []
    
    for user_row in featurized_df.collect():
        user_id = user_row["user_id"]
        
        # Find similar users
        similar_users = model.approxSimilarityJoin(
            spark.createDataFrame([user_row]), 
            hashed_df, 
            threshold=0.5, 
            distCol="distance"
        )
        
        # Exclude self-matches
        similar_users_filtered = similar_users.filter(
            col("datasetA.user_id") != col("datasetB.user_id")
        )
        
        # Get top 10 similar users
        top_similar = similar_users_filtered.orderBy("distance").limit(10)
        
        # Collect similar user IDs
        similar_user_ids = [row["datasetB.user_id"] for row in top_similar.collect()]
        
        if similar_user_ids:
            user_similarities.append({
                "user_id": user_id,
                "similar_users": similar_user_ids,
                "generated_at": datetime.utcnow().isoformat()
            })
    
    # Convert to DataFrame and save to MongoDB
    if user_similarities:
        similar_users_df = spark.createDataFrame(user_similarities)
        
        (similar_users_df.write
        .format("mongo")
        .mode("overwrite")
        .option("collection", "user_recommendations")
        .save())
    
    # 2. Generate follow recommendations based on network
    # Get current follows
    follows_rdd = follows_df.select("follower_id", "followee_id").rdd
    
    # Transform to (follower_id, [followee_ids])
    user_follows = follows_rdd.map(lambda x: (x[0], x[1])).groupByKey().mapValues(list)
    
    # Find friend-of-friend recommendations
    recommendations = user_follows.flatMap(
        lambda x: [
            (x[0], followee_of_followee) 
            for followee in x[1]
            for followee_of_followee in user_follows.filter(lambda y: y[0] == followee).flatMap(lambda y: y[1])
            if followee_of_followee != x[0] and followee_of_followee not in x[1]
        ]
    )
    
    # Count common connections
    ranked_recommendations = recommendations.map(
        lambda x: (x, 1)
    ).reduceByKey(lambda a, b: a + b).map(
        lambda x: (x[0][0], x[0][1], x[1])
    )
    
    # Convert to DataFrame
    network_recs_df = ranked_recommendations.toDF(["user_id", "recommended_user_id", "common_connections"])
    
    # Get top 10 recommendations for each user
    top_network_recs = network_recs_df.orderBy(
        col("user_id"), col("common_connections").desc()
    ).groupBy("user_id").agg(
        collect_list(
            struct(
                col("recommended_user_id"),
                col("common_connections")
            )
        ).alias("recommendations")
    )
    
    # Save to MongoDB
    (top_network_recs.write
    .format("mongo")
    .mode("overwrite")
    .option("collection", "network_recommendations")
    .save())
    
    return {
        "hashtag_based_recommendations": len(user_similarities),
        "network_based_recommendations": top_network_recs.count()
    }

def main():
    """Main function to run user recommendation job"""
    spark = create_spark_session()
    
    try:
        print("Starting Mini Twitter User Recommender...")
        
        # Generate recommendations
        recommendation_results = generate_user_recommendations(spark)
        print(f"User recommendations complete: {recommendation_results}")
        
        # Log completion
        completion_time = datetime.utcnow().isoformat()
        print(f"User recommender job completed at {completion_time}")
        
    finally:
        spark.stop()

if __name__ == "__main__":
    main()