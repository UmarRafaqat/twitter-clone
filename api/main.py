from fastapi import FastAPI, Depends, HTTPException, status, APIRouter, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
import os
import json
import uuid
from pymongo import MongoClient
from cassandra.cluster import Cluster
import psycopg2
from psycopg2.extras import RealDictCursor
from kafka import KafkaProducer
import jwt
import boto3
from botocore.client import Config

app = FastAPI(title="Mini-Twitter API")
# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Configuration from environment variables
DB_URL = os.getenv("DATABASE_URL", "postgresql://mini_twitter:password@postgres:5432/mini_twitter")
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017/mini_twitter")
CASSANDRA_HOSTS = os.getenv("CASSANDRA_HOSTS", "localhost").split(",")
KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key")
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# S3/Minio configuration
S3_ENDPOINT = os.getenv("S3_ENDPOINT", "http://minio:9000")
S3_ACCESS_KEY = os.getenv("S3_ACCESS_KEY", "minioadmin")
S3_SECRET_KEY = os.getenv("S3_SECRET_KEY", "minioadmin")
S3_BUCKET = "mini-twitter"

# Initialize S3 client
try:
    s3_client = boto3.client(
        's3',
        endpoint_url=S3_ENDPOINT,
        aws_access_key_id=S3_ACCESS_KEY,
        aws_secret_access_key=S3_SECRET_KEY,
        config=Config(signature_version='s3v4')
    )

    # Create bucket if it doesn't exist
    try:
        s3_client.head_bucket(Bucket=S3_BUCKET)
    except:
        s3_client.create_bucket(Bucket=S3_BUCKET)
except Exception as e:
    print(f"Warning: Could not connect to S3/Minio: {e}")
    s3_client = None

# Database connections
def get_pg_conn():
    conn = psycopg2.connect(DB_URL)
    try:
        yield conn
    finally:
        conn.close()

def get_mongo_client():
    client = MongoClient(MONGODB_URL)
    try:
        yield client
    finally:
        client.close()

def get_cassandra_session():
    cluster = Cluster(CASSANDRA_HOSTS)
    session = cluster.connect()
    try:
        yield session
    finally:
        cluster.shutdown()

# Kafka producer
try:
    kafka_producer = KafkaProducer(
        bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
        value_serializer=lambda v: json.dumps(v).encode('utf-8')
    )
except Exception as e:
    print(f"Warning: Could not connect to Kafka: {e}")
    kafka_producer = None

# Models
class UserCreate(BaseModel):
    username: str
    email: str
    password: str

class User(BaseModel):
    id: str
    username: str
    email: str
    created_at: datetime

class Tweet(BaseModel):
    content: str
    hashtags: Optional[List[str]] = []
    media_urls: Optional[List[str]] = []

class TweetResponse(BaseModel):
    id: str
    user_id: str
    username: str
    content: str
    hashtags: List[str]
    created_at: datetime
    likes_count: int
    media_urls: Optional[List[str]] = []

class PostgresQuery(BaseModel):
    query: str

# Authentication
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm="HS256")
    return encoded_jwt

def get_current_user(token: str = Depends(oauth2_scheme), conn = Depends(get_pg_conn)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    cursor.execute("SELECT id, username, email, created_at FROM users WHERE id = %s", (user_id,))
    user = cursor.fetchone()
    cursor.close()
    
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user

# Health check endpoint
@app.get("/health")
def health_check():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}

# Routes
@app.post("/register", response_model=User)
def register(user: UserCreate, conn = Depends(get_pg_conn)):
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    # Check if username or email already exists
    cursor.execute("SELECT id FROM users WHERE username = %s OR email = %s", (user.username, user.email))
    if cursor.fetchone():
        raise HTTPException(status_code=400, detail="Username or email already registered")
    
    # Create user
    user_id = str(uuid.uuid4())
    created_at = datetime.utcnow()
    cursor.execute(
        "INSERT INTO users (id, username, email, password_hash, created_at) VALUES (%s, %s, %s, %s, %s)",
        (user_id, user.username, user.email, user.password, created_at)
    )
    conn.commit()
    
    # Publish user created event
    if kafka_producer:
        kafka_producer.send("users", {
            "event": "user_created",
            "user_id": user_id,
            "username": user.username,
            "created_at": created_at.isoformat()
        })
    
    return {
        "id": user_id,
        "username": user.username,
        "email": user.email,
        "created_at": created_at
    }

@app.post("/token")
def login(form_data: OAuth2PasswordRequestForm = Depends(), conn = Depends(get_pg_conn)):
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    cursor.execute(
        "SELECT id, password_hash FROM users WHERE username = %s",
        (form_data.username,)
    )
    user = cursor.fetchone()
    cursor.close()
    
    if not user or user["password_hash"] != form_data.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user["id"]})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me", response_model=User)
def get_current_user_profile(current_user = Depends(get_current_user)):
    """Get the profile of the currently authenticated user."""
    return current_user

@app.get("/users/search")
def search_users(
    query: str,
    limit: int = 10,
    current_user = Depends(get_current_user),
    conn = Depends(get_pg_conn)
):
    """Search for users by username or email"""
    if len(query) < 2:
        raise HTTPException(status_code=400, detail="Search query must be at least 2 characters")
    
    # Use case-insensitive search
    search_pattern = f"%{query}%"
    
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    cursor.execute(
        """
        SELECT id, username, email, created_at 
        FROM users 
        WHERE username ILIKE %s OR email ILIKE %s 
        LIMIT %s
        """,
        (search_pattern, search_pattern, limit)
    )
    
    users = cursor.fetchall()
    cursor.close()
    
    # Add follow status for each user
    for user in users:
        # Skip current user
        if user["id"] == current_user["id"]:
            user["is_following"] = False
            user["is_self"] = True
            continue
        
        # Check if current user follows this user
        cursor = conn.cursor()
        cursor.execute(
            "SELECT 1 FROM follows WHERE follower_id = %s AND followee_id = %s",
            (current_user["id"], user["id"])
        )
        is_following = cursor.fetchone() is not None
        cursor.close()
        
        user["is_following"] = is_following
        user["is_self"] = False
    
    return users

@app.get("/users/{user_id}/followers/count")
def get_followers_count(
    user_id: str,
    current_user = Depends(get_current_user),
    conn = Depends(get_pg_conn)
):
    """Get the number of followers for a user"""
    cursor = conn.cursor()
    cursor.execute(
        "SELECT COUNT(*) FROM follows WHERE followee_id = %s",
        (user_id,)
    )
    count = cursor.fetchone()[0]
    cursor.close()
    
    return {"count": count}

@app.get("/users/{user_id}/following/count")
def get_following_count(
    user_id: str,
    current_user = Depends(get_current_user),
    conn = Depends(get_pg_conn)
):
    """Get the number of users a user is following"""
    cursor = conn.cursor()
    cursor.execute(
        "SELECT COUNT(*) FROM follows WHERE follower_id = %s",
        (user_id,)
    )
    count = cursor.fetchone()[0]
    cursor.close()
    
    return {"count": count}

@app.post("/tweets", response_model=TweetResponse)
def create_tweet(tweet: Tweet, current_user = Depends(get_current_user), mongo_client = Depends(get_mongo_client)):
    tweets_collection = mongo_client.mini_twitter.tweets
    
    # Extract hashtags (words starting with #)
    hashtags = [word[1:] for word in tweet.content.split() if word.startswith('#')]
    
    tweet_id = str(uuid.uuid4())
    created_at = datetime.utcnow()
    
    # Store tweet in MongoDB
    tweet_doc = {
        "id": tweet_id,
        "user_id": current_user["id"],
        "content": tweet.content,
        "hashtags": hashtags,
        "created_at": created_at,
        "media_urls": tweet.media_urls or []
    }
    tweets_collection.insert_one(tweet_doc)
    
    # Publish tweet created event
    if kafka_producer:
        kafka_producer.send("tweets", {
            "event": "tweet_created",
            "tweet_id": tweet_id,
            "user_id": current_user["id"],
            "content": tweet.content,
            "hashtags": hashtags,
            "media_urls": tweet.media_urls or [],
            "created_at": created_at.isoformat()
        })
    
    return {
        "id": tweet_id,
        "user_id": current_user["id"],
        "username": current_user["username"],
        "content": tweet.content,
        "hashtags": hashtags,
        "created_at": created_at,
        "likes_count": 0,
        "media_urls": tweet.media_urls or []
    }

@app.get("/tweets/{tweet_id}")
def get_tweet(
    tweet_id: str,
    current_user = Depends(get_current_user),
    mongo_client = Depends(get_mongo_client),
    conn = Depends(get_pg_conn)
):
    """Get a single tweet by ID"""
    tweets_collection = mongo_client.mini_twitter.tweets
    
    # Get the tweet
    tweet = tweets_collection.find_one({"id": tweet_id})
    if not tweet:
        raise HTTPException(status_code=404, detail="Tweet not found")
    
    # Get username
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    cursor.execute(
        "SELECT username FROM users WHERE id = %s",
        (tweet["user_id"],)
    )
    user = cursor.fetchone()
    cursor.close()
    
    # Convert MongoDB ObjectId to string if necessary
    if "_id" in tweet:
        del tweet["_id"]
    
    # Add username and likes count
    tweet["username"] = user["username"] if user else "Unknown"
    tweet["likes_count"] = 0  # In a real app, query Cassandra for this
    
    return tweet

@app.get("/tweets")
def get_tweets(
    user_id: Optional[str] = None,
    limit: int = 20,
    current_user = Depends(get_current_user),
    mongo_client = Depends(get_mongo_client),
    conn = Depends(get_pg_conn)
):
    """
    Get tweets with optional user_id filter.
    If user_id is provided, returns tweets from that user only.
    """
    tweets_collection = mongo_client.mini_twitter.tweets
    
    # Build query
    query = {}
    if user_id:
        query["user_id"] = user_id
    
    # Fetch tweets
    tweets = list(tweets_collection.find(
        query,
        sort=[("created_at", -1)],
        limit=limit
    ))
    
    # Get usernames
    user_ids = set(t["user_id"] for t in tweets)
    user_ids.add(current_user["id"])  # Add current user
    
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    if user_ids:
        cursor.execute(
            "SELECT id, username FROM users WHERE id IN %s",
            (tuple(user_ids),)
        )
        usernames = {row["id"]: row["username"] for row in cursor.fetchall()}
    else:
        usernames = {}
    
    cursor.close()
    
    # Format response
    formatted_tweets = []
    for tweet in tweets:
        # Convert MongoDB ObjectId to string if necessary
        if "_id" in tweet:
            del tweet["_id"]
            
        formatted_tweets.append({
            **tweet,
            "username": usernames.get(tweet["user_id"], "Unknown"),
            "likes_count": 0  # In a real app, we'd query Cassandra for this
        })
    
    return formatted_tweets

@app.post("/tweets/{tweet_id}/like")
def like_tweet(
    tweet_id: str, 
    current_user = Depends(get_current_user), 
    cassandra_session = Depends(get_cassandra_session)
):
    # Store like in Cassandra
    timestamp = datetime.utcnow()
    
    # Create keyspace if not exists
    cassandra_session.execute(
        """
        CREATE KEYSPACE IF NOT EXISTS mini_twitter 
        WITH REPLICATION = { 
            'class' : 'SimpleStrategy', 
            'replication_factor' : 1 
        }
        """
    )
    
    # Create table if not exists
    cassandra_session.execute(
        """
        CREATE TABLE IF NOT EXISTS mini_twitter.likes (
            tweet_id TEXT,
            user_id TEXT,
            created_at TIMESTAMP,
            PRIMARY KEY ((tweet_id), user_id)
        )
        """
    )
    
    cassandra_session.execute(
        "INSERT INTO mini_twitter.likes (tweet_id, user_id, created_at) VALUES (%s, %s, %s)",
        (tweet_id, current_user["id"], timestamp)
    )
    
    # Publish like event
    if kafka_producer:
        kafka_producer.send("likes", {
            "event": "tweet_liked",
            "tweet_id": tweet_id,
            "user_id": current_user["id"],
            "created_at": timestamp.isoformat()
        })
    
    return {"status": "success"}

@app.post("/tweets/{tweet_id}/retweet")
def retweet(
    tweet_id: str,
    current_user = Depends(get_current_user),
    mongo_client = Depends(get_mongo_client)
):
    """Retweet a tweet"""
    tweets_collection = mongo_client.mini_twitter.tweets
    
    # Check if tweet exists
    original_tweet = tweets_collection.find_one({"id": tweet_id})
    if not original_tweet:
        raise HTTPException(status_code=404, detail="Tweet not found")
    
    # Check if already retweeted
    existing_retweet = tweets_collection.find_one({
        "retweeted_from": tweet_id,
        "user_id": current_user["id"]
    })
    
    if existing_retweet:
        raise HTTPException(status_code=400, detail="You have already retweeted this tweet")
    
    # Create retweet
    retweet_id = str(uuid.uuid4())
    created_at = datetime.utcnow()
    
    retweet_doc = {
        "id": retweet_id,
        "user_id": current_user["id"],
        "content": original_tweet["content"],
        "hashtags": original_tweet["hashtags"],
        "created_at": created_at,
        "retweeted_from": tweet_id,
        "original_user_id": original_tweet["user_id"],
        "media_urls": original_tweet.get("media_urls", [])
    }
    
    tweets_collection.insert_one(retweet_doc)
    
    # Publish retweet event
    if kafka_producer:
        kafka_producer.send("tweets", {
            "event": "tweet_retweeted",
            "tweet_id": retweet_id,
            "original_tweet_id": tweet_id,
            "user_id": current_user["id"],
            "created_at": created_at.isoformat()
        })
    
    return {
        "id": retweet_id,
        "retweeted_from": tweet_id,
        "created_at": created_at
    }

@app.post("/tweets/{tweet_id}/reply")
def reply_to_tweet(
    tweet_id: str,
    reply: Tweet,
    current_user = Depends(get_current_user),
    mongo_client = Depends(get_mongo_client)
):
    """Reply to a tweet"""
    tweets_collection = mongo_client.mini_twitter.tweets
    
    # Check if parent tweet exists
    parent_tweet = tweets_collection.find_one({"id": tweet_id})
    if not parent_tweet:
        raise HTTPException(status_code=404, detail="Tweet not found")
    
    # Extract hashtags
    hashtags = [word[1:] for word in reply.content.split() if word.startswith('#')]
    
    # Create reply
    reply_id = str(uuid.uuid4())
    created_at = datetime.utcnow()
    
    reply_doc = {
        "id": reply_id,
        "user_id": current_user["id"],
        "content": reply.content,
        "hashtags": hashtags,
        "created_at": created_at,
        "in_reply_to": tweet_id,
        "in_reply_to_user_id": parent_tweet["user_id"],
        "media_urls": reply.media_urls or []
    }
    
    tweets_collection.insert_one(reply_doc)
    
    # Publish reply event
    if kafka_producer:
        kafka_producer.send("tweets", {
            "event": "tweet_replied",
            "tweet_id": reply_id,
            "parent_tweet_id": tweet_id,
            "user_id": current_user["id"],
            "content": reply.content,
            "hashtags": hashtags,
            "media_urls": reply.media_urls or [],
            "created_at": created_at.isoformat()
        })
    
    return {
        "id": reply_id,
        "user_id": current_user["id"],
        "username": current_user["username"],
        "content": reply.content,
        "hashtags": hashtags,
        "created_at": created_at,
        "in_reply_to": tweet_id,
        "likes_count": 0,
        "media_urls": reply.media_urls or []
    }

@app.get("/tweets/{tweet_id}/replies")
def get_tweet_replies(
    tweet_id: str,
    limit: int = 20,
    current_user = Depends(get_current_user),
    mongo_client = Depends(get_mongo_client),
    conn = Depends(get_pg_conn)
):
    """Get replies to a tweet"""
    tweets_collection = mongo_client.mini_twitter.tweets
    
    # Get replies
    replies = list(tweets_collection.find(
        {"in_reply_to": tweet_id},
        sort=[("created_at", -1)],
        limit=limit
    ))
    
    # Get usernames
    user_ids = set(r["user_id"] for r in replies)
    
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    if user_ids:
        cursor.execute(
            "SELECT id, username FROM users WHERE id IN %s",
            (tuple(user_ids),)
        )
        usernames = {row["id"]: row["username"] for row in cursor.fetchall()}
    else:
        usernames = {}
    
    cursor.close()
    
    # Format response
    formatted_replies = []
    for reply in replies:
        # Convert MongoDB ObjectId to string if necessary
        if "_id" in reply:
            del reply["_id"]
            
        formatted_replies.append({
            **reply,
            "username": usernames.get(reply["user_id"], "Unknown"),
            "likes_count": 0  # In a real app, we'd query Cassandra for this
        })
    
    return formatted_replies

@app.post("/users/{user_id}/follow")
def follow_user(
    user_id: str, 
    current_user = Depends(get_current_user), 
    conn = Depends(get_pg_conn)
):
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")
    
    cursor = conn.cursor()
    # Check if target user exists
    cursor.execute("SELECT id FROM users WHERE id = %s", (user_id,))
    if not cursor.fetchone():
        raise HTTPException(status_code=404, detail="User not found")
    
    # Create follow relationship
    try:
        created_at = datetime.utcnow()
        cursor.execute(
            "INSERT INTO follows (follower_id, followee_id, created_at) VALUES (%s, %s, %s)",
            (current_user["id"], user_id, created_at)
        )
        conn.commit()
        
        # Publish follow event
        if kafka_producer:
            kafka_producer.send("follows", {
                "event": "user_followed",
                "follower_id": current_user["id"],
                "followee_id": user_id,
                "created_at": created_at.isoformat()
            })
        
        return {"status": "success"}
    except psycopg2.IntegrityError:
        conn.rollback()
        raise HTTPException(status_code=400, detail="Already following this user")

@app.post("/users/{user_id}/unfollow")
def unfollow_user(
    user_id: str, 
    current_user = Depends(get_current_user), 
    conn = Depends(get_pg_conn)
):
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot unfollow yourself")
    
    cursor = conn.cursor()
    # Check if target user exists
    cursor.execute("SELECT id FROM users WHERE id = %s", (user_id,))
    if not cursor.fetchone():
        raise HTTPException(status_code=404, detail="User not found")
    
    # Delete follow relationship
    cursor.execute(
        "DELETE FROM follows WHERE follower_id = %s AND followee_id = %s",
        (current_user["id"], user_id)
    )
    
    rows_deleted = cursor.rowcount
    conn.commit()
    
    if rows_deleted == 0:
        raise HTTPException(status_code=400, detail="You are not following this user")
    
    # Publish unfollow event
    if kafka_producer:
        kafka_producer.send("follows", {
            "event": "user_unfollowed",
            "follower_id": current_user["id"],
            "followee_id": user_id,
            "created_at": datetime.utcnow().isoformat()
        })
    
    return {"status": "success"}

@app.get("/timeline", response_model=List[TweetResponse])
def get_timeline(current_user = Depends(get_current_user), conn = Depends(get_pg_conn), mongo_client = Depends(get_mongo_client)):
    # Get users the current user follows
    cursor = conn.cursor()
    cursor.execute("SELECT followee_id FROM follows WHERE follower_id = %s", (current_user["id"],))
    following_ids = [row[0] for row in cursor.fetchall()]
    following_ids.append(current_user["id"])  # Include user's own tweets
    
    # Get tweets from MongoDB
    tweets_collection = mongo_client.mini_twitter.tweets
    tweets = list(tweets_collection.find(
        {"user_id": {"$in": following_ids}},
        sort=[("created_at", -1)],
        limit=20
    ))
    
    # Get usernames
    cursor.execute(
        "SELECT id, username FROM users WHERE id IN %s",
        (tuple(following_ids),)
    )
    usernames = {row[0]: row[1] for row in cursor.fetchall()}
    
    # Format response
    timeline = []
    for tweet in tweets:
        # Convert MongoDB ObjectId to string if necessary
        if "_id" in tweet:
            del tweet["_id"]
            
        timeline.append({
            **tweet,
            "username": usernames.get(tweet["user_id"], "Unknown"),
            "likes_count": 0,  # In a real app, we'd query Cassandra for this
            "media_urls": tweet.get("media_urls", [])
        })
    
    return timeline

@app.get("/trending")
def get_trending_hashtags(mongo_client = Depends(get_mongo_client)):
    # This is a simplified implementation
    # In a real app, this would use Spark MLlib for more sophisticated trending detection
    
    # Get tweets from the last hour
    tweets_collection = mongo_client.mini_twitter.tweets
    one_hour_ago = datetime.utcnow() - timedelta(hours=1)
    
    pipeline = [
        {"$match": {"created_at": {"$gte": one_hour_ago}}},
        {"$unwind": "$hashtags"},
        {"$group": {"_id": "$hashtags", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    
    trending = list(tweets_collection.aggregate(pipeline))
    return [{"hashtag": t["_id"], "count": t["count"]} for t in trending]

@app.post("/media/upload")
async def upload_media(
    file: UploadFile = File(...),
    current_user = Depends(get_current_user)
):
    """Upload a media file to S3/Minio"""
    if not s3_client:
        raise HTTPException(status_code=503, detail="S3/Minio service not available")
    
    # Check file size (limit to 5MB)
    file_size = 0
    contents = await file.read()
    file_size = len(contents)
    
    if file_size > 5 * 1024 * 1024:  # 5MB
        raise HTTPException(status_code=400, detail="File too large (max 5MB)")
    
    # Check file type
    content_type = file.content_type
    if not content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="Only image files are allowed")
    
    # Generate unique filename
    file_ext = file.filename.split('.')[-1] if '.' in file.filename else ''
    unique_filename = f"{current_user['id']}/{uuid.uuid4()}.{file_ext}"
    
    # Upload to S3/Minio
    try:
        s3_client.put_object(
            Bucket=S3_BUCKET,
            Key=unique_filename,
            Body=contents,
            ContentType=content_type
        )
        
        # Generate URL
        url = f"{S3_ENDPOINT}/{S3_BUCKET}/{unique_filename}"
        
        return {"url": url, "filename": unique_filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")

# Database Explorer Endpoints
db_router = APIRouter(prefix="/db", tags=["database"])

@db_router.post("/postgres")
def execute_postgres_query(query_data: PostgresQuery, conn = Depends(get_pg_conn)):
    """Execute a PostgreSQL query and return the results"""
    try:
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cursor.execute(query_data.query)
        
        # Check if this is a SELECT query
        if cursor.description:
            results = cursor.fetchall()
            return list(results)
        else:
            conn.commit()
            return [{"message": f"Query executed successfully. Rows affected: {cursor.rowcount}"}]
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@db_router.get("/mongodb/{collection}")
def get_mongodb_data(collection: str, limit: int = 100, mongo_client = Depends(get_mongo_client)):
    """Get data from a MongoDB collection"""
    try:
        db = mongo_client.mini_twitter
        collection = db[collection]
        documents = list(collection.find({}).limit(limit))
        
        # Convert ObjectIds to strings for JSON serialization
        for doc in documents:
            if "_id" in doc:
                doc["_id"] = str(doc["_id"])
        
        return documents
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))