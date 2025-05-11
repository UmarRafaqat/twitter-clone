from pyspark.sql import SparkSession
from pyspark.sql.functions import col, udf, regexp_replace, lower, explode, split, size
from pyspark.sql.types import ArrayType, StringType, BooleanType, IntegerType
from pyspark.ml.feature import StopWordsRemover, Tokenizer
from pyspark.ml.clustering import LDA
import nltk
import re
from datetime import datetime

# Download NLTK data
nltk.download('punkt')
nltk.download('stopwords')
nltk.download('wordnet')

from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer

# MongoDB Configuration
MONGODB_HOST = "mongodb"
MONGODB_PORT = 27017
MONGODB_DB = "mini_twitter"
MONGODB_OUTPUT_DB = "mini_twitter_analytics"

def create_spark_session():
    """Create and configure Spark session"""
    return (SparkSession.builder
            .appName("MiniTwitterContentAnalyzer")
            .config("spark.mongodb.input.uri", f"mongodb://{MONGODB_HOST}:{MONGODB_PORT}/{MONGODB_DB}")
            .config("spark.mongodb.output.uri", f"mongodb://{MONGODB_HOST}:{MONGODB_PORT}/{MONGODB_OUTPUT_DB}")
            .config("spark.jars.packages", "org.mongodb.spark:mongo-spark-connector_2.12:3.0.1")
            .getOrCreate())

# Text processing functions
def preprocess_text(spark):
    """Define UDFs for text preprocessing"""
    # Remove URLs, mentions, special chars
    def clean_text(text):
        if not text:
            return ""
        # Remove URLs
        text = re.sub(r'https?://\S+', '', text)
        # Remove mentions
        text = re.sub(r'@\w+', '', text)
        # Remove special characters and numbers
        text = re.sub(r'[^a-zA-Z\s]', '', text)
        # Convert to lowercase and strip
        return text.lower().strip()
    
    # Lemmatization
    lemmatizer = WordNetLemmatizer()
    
    def lemmatize_text(tokens):
        if not tokens:
            return []
        return [lemmatizer.lemmatize(token) for token in tokens if token]
    
    # Register UDFs
    clean_text_udf = udf(clean_text, StringType())
    lemmatize_udf = udf(lemmatize_text, ArrayType(StringType()))
    
    return clean_text_udf, lemmatize_udf

def analyze_tweet_content(spark):
    """Perform topic modeling and content analysis on tweets"""
    # Get UDFs for text preprocessing
    clean_text_udf, lemmatize_udf = preprocess_text(spark)
    
    # Load tweets from MongoDB
    tweets_df = (spark.read.format("mongo")
                .option("collection", "tweets")
                .load())
    
    # Preprocess text
    processed_df = tweets_df.withColumn(
        "cleaned_content", 
        clean_text_udf(col("content"))
    )
    
    # Tokenize
    tokenizer = Tokenizer(inputCol="cleaned_content", outputCol="raw_tokens")
    tokenized_df = tokenizer.transform(processed_df)
    
    # Remove stopwords
    stop_words = stopwords.words('english')
    stop_words_remover = StopWordsRemover(
        inputCol="raw_tokens", 
        outputCol="filtered_tokens",
        stopWords=stop_words
    )
    filtered_df = stop_words_remover.transform(tokenized_df)
    
    # Apply lemmatization
    lemmatized_df = filtered_df.withColumn(
        "tokens", 
        lemmatize_udf(col("filtered_tokens"))
    )
    
    # Filter out short documents (those with fewer than 3 tokens)
    filtered_df = lemmatized_df.filter(size(col("tokens")) >= 3)
    
    # Convert tokens to feature vectors (using CountVectorizer)
    from pyspark.ml.feature import CountVectorizer
    cv = CountVectorizer(inputCol="tokens", outputCol="features", vocabSize=10000, minDF=5.0)
    cv_model = cv.fit(filtered_df)
    vectorized_df = cv_model.transform(filtered_df)
    
    # Apply LDA for topic modeling
    num_topics = 10
    lda = LDA(k=num_topics, maxIter=10, featuresCol="features")
    lda_model = lda.fit(vectorized_df)
    
    # Extract topics
    topics = lda_model.describeTopics(maxTermsPerTopic=10)
    
    # Get vocabulary from CountVectorizer
    vocab = cv_model.vocabulary
    
    # Convert topic term indices to actual words
    topics_with_terms = []
    for topic in topics.collect():
        topic_id = topic["topic"]
        term_indices = topic["termIndices"]
        term_weights = topic["termWeights"]
        
        terms = [{"term": vocab[idx], "weight": float(weight)} 
                for idx, weight in zip(term_indices, term_weights)]
        
        topics_with_terms.append({
            "topic_id": int(topic_id),
            "terms": terms,
            "generated_at": datetime.utcnow().isoformat()
        })
    
    # Save topics to MongoDB
    topics_df = spark.createDataFrame(topics_with_terms)
    
    (topics_df.write
    .format("mongo")
    .mode("overwrite")
    .option("collection", "tweet_topics")
    .save())
    
    # Get topic distribution for each tweet
    transformed = lda_model.transform(vectorized_df)
    
    # Extract top topic for each tweet
    def get_top_topic(topicDistribution):
        return int(topicDistribution.argmax())
    
    top_topic_udf = udf(get_top_topic, IntegerType())
    
    tweets_with_topics = transformed.withColumn(
        "top_topic", 
        top_topic_udf(col("topicDistribution"))
    ).select(
        "id", 
        "user_id", 
        "content", 
        "created_at", 
        "top_topic", 
        "topicDistribution"
    )
    
    # Save tweet topics to MongoDB
    (tweets_with_topics.write
    .format("mongo")
    .mode("overwrite")
    .option("collection", "tweets_with_topics")
    .save())
    
    return {
        "topics_discovered": num_topics,
        "tweets_analyzed": tweets_with_topics.count()
    }

def main():
    """Main function to run content analysis job"""
    spark = create_spark_session()
    
    try:
        print("Starting Mini Twitter Content Analyzer...")
        
        # Analyze tweet content
        analysis_results = analyze_tweet_content(spark)
        print(f"Content analysis complete: {analysis_results}")
        
        # Log completion
        completion_time = datetime.utcnow().isoformat()
        print(f"Content analyzer job completed at {completion_time}")
        
    finally:
        spark.stop()

if __name__ == "__main__":
    main()