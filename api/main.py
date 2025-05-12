from fastapi import FastAPI, Depends, HTTPException, status, APIRouter, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm, HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import FileResponse
from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
import os
import json
import uuid
import io
import socket
import time
from pymongo import MongoClient
from cassandra.cluster import Cluster
import psycopg2
from psycopg2.extras import RealDictCursor
from kafka import KafkaProducer
import jwt
import boto3
from botocore.client import Config
import minio
import minio.error
from uuid import uuid4




# Configuration from environment variables
DB_URL = os.getenv("DATABASE_URL", "postgresql://mini_twitter:password@postgres:5432/mini_twitter")
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017/mini_twitter")
CASSANDRA_HOSTS = os.getenv("CASSANDRA_HOSTS", "localhost").split(",")
KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key")
ACCESS_TOKEN_EXPIRE_MINUTES = 30

class UserUpdate(BaseModel):
    bio: Optional[str] = None
    location: Optional[str] = None
    website: Optional[str] = None
    profile_image_url: Optional[str] = None
    
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

# Comment model classes
class CommentCreate(BaseModel):
    content: str
    parent_id: Optional[str] = None  # None for top-level comments, comment_id for replies

class CommentResponse(BaseModel):
    id: str
    tweet_id: str
    user_id: str
    username: str
    content: str
    created_at: datetime
    likes_count: int = 0
    parent_id: Optional[str] = None
    path: List[str] = []
    depth: int = 0
    replies_count: int = 0

# Create the FastAPI app
app = FastAPI(title="Mini-Twitter API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Function to check if a host is reachable
def is_host_reachable(host, port=9000, timeout=1):
    try:
        socket.create_connection((host, port), timeout)
        print(f"Host {host}:{port} is reachable")
        return True
    except (socket.timeout, socket.error) as e:
        print(f"Host {host}:{port} is not reachable: {e}")
        return False

# Minio configuration
# Try different hostnames to connect to Minio
MINIO_HOSTNAME_OPTIONS = [
    "172.20.0.11",  # Minio container IP from network inspect
    "minio",        # Service name
    "localhost",    # For localhost access
    os.getenv("S3_ENDPOINT", "minio").replace("http://", "").replace(":9000", "")
]

MINIO_ACCESS_KEY = os.getenv("S3_ACCESS_KEY", "minioadmin")
MINIO_SECRET_KEY = os.getenv("S3_SECRET_KEY", "minioadmin")
MINIO_BUCKET = "mini-twitter"

# Initialize Minio client with retry logic
minio_client = None
selected_hostname = None

# Try each hostname with retries
for hostname in MINIO_HOSTNAME_OPTIONS:
    print(f"Checking if {hostname} is reachable...")
    if is_host_reachable(hostname):
        print(f"Trying to connect to Minio at {hostname}:9000")
        for attempt in range(3):  # Try 3 times per hostname
            try:
                minio_client = minio.Minio(
                    endpoint=f"{hostname}:9000",
                    access_key=MINIO_ACCESS_KEY,
                    secret_key=MINIO_SECRET_KEY,
                    secure=False
                )
                
                # Test connection
                buckets = minio_client.list_buckets()
                print(f"Successfully connected to Minio at {hostname}:9000")
                print(f"Existing buckets: {[b.name for b in buckets]}")
                selected_hostname = hostname
                
                # Create bucket if it doesn't exist
                if not minio_client.bucket_exists(MINIO_BUCKET):
                    minio_client.make_bucket(MINIO_BUCKET)
                    print(f"Created bucket: {MINIO_BUCKET}")
                    
                    # Set bucket policy to allow public access for reading
                    policy = {
                        "Version": "2012-10-17",
                        "Statement": [
                            {
                                "Effect": "Allow",
                                "Principal": {"AWS": ["*"]},
                                "Action": ["s3:GetObject"],
                                "Resource": [f"arn:aws:s3:::{MINIO_BUCKET}/*"]
                            }
                        ]
                    }
                    try:
                        minio_client.set_bucket_policy(MINIO_BUCKET, json.dumps(policy))
                        print(f"Successfully set bucket policy for {MINIO_BUCKET}")
                    except Exception as e:
                        print(f"Error setting bucket policy: {e}")
                else:
                    print(f"Bucket {MINIO_BUCKET} already exists, ensuring policy is set")
                    try:
                        # Ensure policy is set even if bucket exists
                        policy = {
                            "Version": "2012-10-17",
                            "Statement": [
                                {
                                    "Effect": "Allow",
                                    "Principal": {"AWS": ["*"]},
                                    "Action": ["s3:GetObject"],
                                    "Resource": [f"arn:aws:s3:::{MINIO_BUCKET}/*"]
                                }
                            ]
                        }
                        minio_client.set_bucket_policy(MINIO_BUCKET, json.dumps(policy))
                        print(f"Successfully set bucket policy for existing bucket {MINIO_BUCKET}")
                    except Exception as e:
                        print(f"Error setting bucket policy for existing bucket: {e}")
                
                # Successfully connected and configured
                break
            except Exception as e:
                print(f"Attempt {attempt+1} failed to connect to Minio at {hostname}:9000: {e}")
                time.sleep(1)  # Wait before retry
        
        # If we connected successfully, break out of the hostname loop
        if minio_client is not None:
            break

if minio_client is None:
    print("Warning: Could not initialize Minio client after trying all hostnames")

# Initialize S3 client
S3_ENDPOINT = None
s3_client = None

# Try each hostname for S3 client
if selected_hostname:
    S3_ENDPOINT = f"http://{selected_hostname}:9000"
    try:
        s3_client = boto3.client(
            's3',
            endpoint_url=S3_ENDPOINT,
            aws_access_key_id=MINIO_ACCESS_KEY,
            aws_secret_access_key=MINIO_SECRET_KEY,
            config=Config(signature_version='s3v4')
        )

        # Create bucket if it doesn't exist
        try:
            s3_client.head_bucket(Bucket=MINIO_BUCKET)
            print(f"S3 bucket {MINIO_BUCKET} exists")
        except:
            s3_client.create_bucket(Bucket=MINIO_BUCKET)
            print(f"Created S3 bucket {MINIO_BUCKET}")
    except Exception as e:
        print(f"Warning: Could not connect to S3/Minio: {e}")
        s3_client = None
else:
    print("Warning: No selected_hostname for S3 client initialization")

# Kafka producer
try:
    kafka_producer = KafkaProducer(
        bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
        value_serializer=lambda v: json.dumps(v).encode('utf-8')
    )
except Exception as e:
    print(f"Warning: Could not connect to Kafka: {e}")
    kafka_producer = None

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
#
# Add this after your Kafka initialization
def ensure_kafka_connection():
    """Attempt to reconnect to Kafka if connection was lost"""
    global kafka_producer
    
    if kafka_producer is None:
        try:
            logger.info("Attempting to connect to Kafka...")
            kafka_producer = KafkaProducer(
                bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
                value_serializer=lambda v: json.dumps(v).encode('utf-8')
            )
            logger.info("Successfully connected to Kafka")
            return True
        except Exception as e:
            logger.error(f"Failed to connect to Kafka: {e}")
            return False
    return True

# Use this before sending any Kafka messages
def send_kafka_event(topic, event):
    """Send event to Kafka with retry logic"""
    if ensure_kafka_connection() and kafka_producer:
        try:
            kafka_producer.send(topic, event)
            kafka_producer.flush(timeout=10)  # Wait up to 10 seconds
            return True
        except Exception as e:
            logger.error(f"Error sending Kafka event to {topic}: {e}")
    return False
# Add this to startup events
@app.on_event("startup")
async def app_startup():
    """Run on application startup"""
    # Existing startup code...
    
    # Try to connect to Kafka
    kafka_connected = ensure_kafka_connection()
    print(f"Kafka connection status: {'Connected' if kafka_connected else 'Failed'}") 

# Authentication
# Custom HTTP Bearer for optional authentication
class OptionalHTTPBearer(HTTPBearer):
    async def __call__(
        self, request: Request
    ) -> Optional[HTTPAuthorizationCredentials]:
        try:
            return await super().__call__(request)
        except HTTPException:
            return None

# OAuth2 schemes
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")
optional_oauth2_scheme = OptionalHTTPBearer(auto_error=False)

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

def get_current_user_optional(token: Optional[HTTPAuthorizationCredentials] = Depends(optional_oauth2_scheme), conn = Depends(get_pg_conn)):
    """
    Optional authentication - returns None instead of raising an exception if authentication fails.
    Use this for endpoints that should work with or without authentication.
    """
    if not token:
        return None
    
    try:
        payload = jwt.decode(token.credentials, SECRET_KEY, algorithms=["HS256"])
        user_id = payload.get("sub")
        if user_id is None:
            return None
            
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("SELECT id, username, email, created_at FROM users WHERE id = %s", (user_id,))
        user = cursor.fetchone()
        cursor.close()
        
        return user
    except:
        return None

# Health check endpoint
@app.get("/health")
def health_check():
    storage_status = "available" if minio_client else "unavailable"
    return {
        "status": "ok", 
        "timestamp": datetime.now().isoformat(),
        "storage_status": storage_status,
        "storage_details": {
            "endpoint": f"http://{selected_hostname}:9000" if selected_hostname else "Not connected",
            "tried_hostnames": MINIO_HOSTNAME_OPTIONS
        }
    }

# User routes
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

# 2. Modify the update_user_profile endpoint to handle the profile image URL
@app.put("/users/{user_id}", summary="Update user profile")
def update_user_profile(
    user_id: str,
    user_data: UserUpdate,
    conn=Depends(get_pg_conn)
):
    try:
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        # Dynamically build update fields
        fields = []
        values = []
        if user_data.bio is not None:
            fields.append("bio = %s")
            values.append(user_data.bio)
        if user_data.location is not None:
            fields.append("location = %s")
            values.append(user_data.location)
        if user_data.website is not None:
            fields.append("website = %s")
            values.append(user_data.website)
        if user_data.profile_image_url is not None:
            fields.append("profile_image_url = %s")
            values.append(user_data.profile_image_url)

        if not fields:
            raise HTTPException(status_code=400, detail="No valid fields to update")

        values.append(user_id)  # user_id goes last for WHERE clause
        query = f"UPDATE users SET {', '.join(fields)} WHERE id = %s RETURNING *"
        cursor.execute(query, values)
        updated_user = cursor.fetchone()

        if not updated_user:
            raise HTTPException(status_code=404, detail="User not found")

        conn.commit()
        # Convert datetime to isoformat
        for key, value in updated_user.items():
            if isinstance(value, datetime):
                updated_user[key] = value.isoformat()

        return updated_user
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


# 1. Initialize like counts for existing tweets
def initialize_like_counts(mongo_client, cassandra_session):
    """Initialize like counts for any tweets without counts"""
    try:
        # Create keyspace and table if they don't exist
        cassandra_session.execute(
            """
            CREATE KEYSPACE IF NOT EXISTS mini_twitter 
            WITH REPLICATION = { 
                'class' : 'SimpleStrategy', 
                'replication_factor' : 1 
            }
            """
        )
        
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
            """
            CREATE TABLE IF NOT EXISTS mini_twitter.like_counts (
                tweet_id TEXT PRIMARY KEY,
                count COUNTER
            )
            """
        )
        
        # Get all tweets
        tweets_collection = mongo_client.mini_twitter.tweets
        tweets = list(tweets_collection.find({}, {"id": 1}))
        
        # For each tweet, calculate like count
        for tweet in tweets:
            tweet_id = tweet["id"]
            
            # Check if count already exists
            rows = cassandra_session.execute(
                "SELECT count FROM mini_twitter.like_counts WHERE tweet_id = %s",
                (tweet_id,)
            )
            
            count_exists = False
            for row in rows:
                count_exists = True
                break
            
            if not count_exists:
                # Count likes for this tweet
                likes_rows = cassandra_session.execute(
                    "SELECT COUNT(*) FROM mini_twitter.likes WHERE tweet_id = %s",
                    (tweet_id,)
                )
                
                like_count = 0
                for row in likes_rows:
                    like_count = row[0]
                    break
                
                # Initialize the counter
                if like_count > 0:
                    # Initialize with the correct count
                    for _ in range(like_count):
                        cassandra_session.execute(
                            "UPDATE mini_twitter.like_counts SET count = count + 1 WHERE tweet_id = %s",
                            (tweet_id,)
                        )
                    print(f"Initialized like count for tweet {tweet_id} with {like_count} likes")
                else:
                    # Initialize with zero (just to create the record)
                    cassandra_session.execute(
                        "UPDATE mini_twitter.like_counts SET count = count + 0 WHERE tweet_id = %s",
                        (tweet_id,)
                    )
                    print(f"Initialized like count for tweet {tweet_id} with 0 likes")
        
        print("Like count initialization complete")
    except Exception as e:
        print(f"Error initializing like counts: {e}")

# Helper function to enhance tweets with accurate like counts
def enhance_tweets_with_likes(tweets, cassandra_session):
    """Add accurate like counts to a list of tweets"""
    if not tweets:
        return tweets
        
    # Get like counts for all tweets from Cassandra
    tweet_ids = [tweet["id"] for tweet in tweets]
    like_counts = {}
    
    if tweet_ids:
        try:
            # Create keyspace and table if they don't exist
            cassandra_session.execute(
                """
                CREATE KEYSPACE IF NOT EXISTS mini_twitter 
                WITH REPLICATION = { 
                    'class' : 'SimpleStrategy', 
                    'replication_factor' : 1 
                }
                """
            )
            
            cassandra_session.execute(
                """
                CREATE TABLE IF NOT EXISTS mini_twitter.like_counts (
                    tweet_id TEXT PRIMARY KEY,
                    count COUNTER
                )
                """
            )
            
            # Use a set to deduplicate tweet IDs
            unique_tweet_ids = set(tweet_ids)
            
            # For each tweet, get its like count
            for tweet_id in unique_tweet_ids:
                # First check if the counter exists
                rows = cassandra_session.execute(
                    "SELECT count FROM mini_twitter.like_counts WHERE tweet_id = %s",
                    (tweet_id,)
                )
                
                count = 0
                count_exists = False
                for row in rows:
                    count = row.count
                    count_exists = True
                    break
                
                # If counter doesn't exist, initialize it
                if not count_exists:
                    # Count likes for this tweet
                    likes_rows = cassandra_session.execute(
                        "SELECT COUNT(*) FROM mini_twitter.likes WHERE tweet_id = %s",
                        (tweet_id,)
                    )
                    
                    like_count = 0
                    for row in likes_rows:
                        like_count = row[0]
                        break
                    
                    # Initialize the counter
                    if like_count > 0:
                        # Initialize with the correct count
                        for _ in range(like_count):
                            cassandra_session.execute(
                                "UPDATE mini_twitter.like_counts SET count = count + 1 WHERE tweet_id = %s",
                                (tweet_id,)
                            )
                        count = like_count
                    else:
                        # Initialize with zero
                        cassandra_session.execute(
                            "UPDATE mini_twitter.like_counts SET count = count + 0 WHERE tweet_id = %s",
                            (tweet_id,)
                        )
                
                # Ensure count is always non-negative
                like_counts[tweet_id] = max(0, count)
        except Exception as e:
            print(f"Error fetching like counts: {e}")
    
    # Update each tweet with its like count
    for tweet in tweets:
        tweet["likes_count"] = like_counts.get(tweet["id"], 0)
    
    return tweets

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

# Comments endpoints with nested comments support
@app.post("/tweets/{tweet_id}/comments", response_model=CommentResponse)
def create_comment(
    tweet_id: str,
    comment: CommentCreate,
    current_user = Depends(get_current_user),
    mongo_client = Depends(get_mongo_client)
):
    """Add a comment to a tweet with support for nested comments"""
    # Get MongoDB collections
    tweets_collection = mongo_client.mini_twitter.tweets
    comments_collection = mongo_client.mini_twitter.comments
    
    # Check if tweet exists
    tweet = tweets_collection.find_one({"id": tweet_id})
    if not tweet:
        raise HTTPException(status_code=404, detail="Tweet not found")
    
    # Create comment
    comment_id = str(uuid.uuid4())
    created_at = datetime.utcnow()
    
    # Initialize path and depth for hierarchical structure
    path = [comment_id]
    depth = 0
    
    # If this is a reply to another comment, validate and set up the hierarchy
    if comment.parent_id:
        parent_comment = comments_collection.find_one({"id": comment.parent_id})
        if not parent_comment:
            raise HTTPException(status_code=404, detail="Parent comment not found")
        
        # Make sure parent comment belongs to this tweet
        if parent_comment["tweet_id"] != tweet_id:
            raise HTTPException(
                status_code=400, 
                detail="Parent comment does not belong to this tweet"
            )
        
        # Update path and depth based on parent
        parent_path = parent_comment.get("path", [parent_comment["id"]])
        path = parent_path + [comment_id]
        depth = parent_comment.get("depth", 0) + 1
        
        # Limit nesting depth (optional, can be adjusted)
        if depth > 5:
            raise HTTPException(
                status_code=400, 
                detail="Maximum comment nesting depth reached (limit: 5)"
            )
    
    comment_doc = {
        "id": comment_id,
        "tweet_id": tweet_id,
        "user_id": current_user["id"],
        "content": comment.content,
        "created_at": created_at,
        "parent_id": comment.parent_id,
        "path": path,
        "depth": depth,
        "replies_count": 0
    }
    
    # Insert comment into MongoDB
    comments_collection.insert_one(comment_doc)
    
    # If this is a reply, increment the parent's replies_count
    if comment.parent_id:
        comments_collection.update_one(
            {"id": comment.parent_id},
            {"$inc": {"replies_count": 1}}
        )
    
    # Publish comment created event if Kafka is available
    if kafka_producer:
        kafka_producer.send("comments", {
            "event": "comment_created",
            "comment_id": comment_id,
            "tweet_id": tweet_id,
            "user_id": current_user["id"],
            "content": comment.content,
            "created_at": created_at.isoformat(),
            "parent_id": comment.parent_id,
            "path": path,
            "depth": depth
        })
    
    return {
        "id": comment_id,
        "tweet_id": tweet_id,
        "user_id": current_user["id"],
        "username": current_user["username"],
        "content": comment.content,
        "created_at": created_at,
        "likes_count": 0,
        "parent_id": comment.parent_id,
        "path": path,
        "depth": depth,
        "replies_count": 0
    }
@app.get("/tweets/{tweet_id}/comments", response_model=List[CommentResponse])
def get_tweet_comments(
    tweet_id: str,
    parent_id: Optional[str] = None,
    flat: bool = False,
    limit: int = 50,
    current_user = Depends(get_current_user_optional),  # Changed to optional authentication
    mongo_client = Depends(get_mongo_client),
    conn = Depends(get_pg_conn)
):
    """Get comments for a tweet with optional filtering by parent_id"""
    # MongoDB collections
    comments_collection = mongo_client.mini_twitter.comments
    
    # Build query
    query = {"tweet_id": tweet_id}
    
    # If specific parent is requested, filter by it
    if parent_id is not None:
        query["parent_id"] = parent_id
    elif not flat:
        # If hierarchical and no parent specified, get top-level comments only
        query["parent_id"] = None
    
    # Get comments
    comments = list(comments_collection.find(
        query,
        sort=[("created_at", -1)],
        limit=limit
    ))
    
    # Get usernames for comment authors
    user_ids = set(comment["user_id"] for comment in comments)
    
    usernames = {}
    if user_ids:
        try:
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            if len(user_ids) > 0:
                user_ids_tuple = tuple(user_ids)
                # If only one ID, we need to make it a proper tuple
                if len(user_ids) == 1:
                    user_ids_tuple = (list(user_ids)[0],)
                cursor.execute(
                    "SELECT id, username FROM users WHERE id IN %s",
                    (user_ids_tuple,)
                )
                usernames = {row["id"]: row["username"] for row in cursor.fetchall()}
            cursor.close()
        except Exception as e:
            print(f"Error fetching usernames: {e}")
    
    # Format and return comments
    formatted_comments = []
    for comment in comments:
        # Convert MongoDB ObjectId to string if necessary
        if "_id" in comment:
            del comment["_id"]
        
        # Ensure these fields exist
        if "path" not in comment:
            comment["path"] = [comment["id"]]
        if "depth" not in comment:
            comment["depth"] = 0
        if "replies_count" not in comment:
            comment["replies_count"] = 0
        
        formatted_comments.append({
            **comment,
            "username": usernames.get(comment["user_id"], "Unknown"),
            "likes_count": 0  # In a real app, we might query Cassandra for this
        })
    
    return formatted_comments

@app.get("/comments/{comment_id}/replies", response_model=List[CommentResponse])
def get_comment_replies(
    comment_id: str,
    limit: int = 20,
    current_user = Depends(get_current_user_optional),  # Changed to optional authentication
    mongo_client = Depends(get_mongo_client),
    conn = Depends(get_pg_conn)
):
    """Get replies to a specific comment"""
    # MongoDB collections
    comments_collection = mongo_client.mini_twitter.comments
    
    # Find the original comment first to validate
    parent_comment = comments_collection.find_one({"id": comment_id})
    if not parent_comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    # Get direct replies to this comment
    replies = list(comments_collection.find(
        {"parent_id": comment_id},
        sort=[("created_at", -1)],
        limit=limit
    ))
    
    # Get usernames for reply authors
    user_ids = set(reply["user_id"] for reply in replies)
    
    usernames = {}
    if user_ids:
        try:
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            if len(user_ids) > 0:
                user_ids_tuple = tuple(user_ids)
                # If only one ID, we need to make it a proper tuple
                if len(user_ids) == 1:
                    user_ids_tuple = (list(user_ids)[0],)
                cursor.execute(
                    "SELECT id, username FROM users WHERE id IN %s",
                    (user_ids_tuple,)
                )
                usernames = {row["id"]: row["username"] for row in cursor.fetchall()}
            cursor.close()
        except Exception as e:
            print(f"Error fetching usernames for replies: {e}")
    
    # Format and return replies
    formatted_replies = []
    for reply in replies:
        # Convert MongoDB ObjectId to string if necessary
        if "_id" in reply:
            del reply["_id"]
        
        # Ensure these fields exist
        if "path" not in reply:
            reply["path"] = [parent_comment.get("id"), reply["id"]]
        if "depth" not in reply:
            reply["depth"] = parent_comment.get("depth", 0) + 1
        if "replies_count" not in reply:
            reply["replies_count"] = 0
        
        formatted_replies.append({
            **reply,
            "username": usernames.get(reply["user_id"], "Unknown"),
            "likes_count": 0
        })
    
    return formatted_replies

@app.delete("/comments/{comment_id}")
def delete_comment(
    comment_id: str,
    current_user = Depends(get_current_user),
    mongo_client = Depends(get_mongo_client)
):
    """Delete a comment and handle nested comment relationships"""
    # MongoDB collection
    comments_collection = mongo_client.mini_twitter.comments
    
    # Find the comment
    comment = comments_collection.find_one({"id": comment_id})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    # Check if user is the author of the comment
    if comment["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="You can only delete your own comments")
    
    # Mark as deleted (soft deletion approach)
    comments_collection.update_one(
        {"id": comment_id},
        {
            "$set": {
                "content": "[deleted]",
                "is_deleted": True,
                "deleted_at": datetime.utcnow()
            }
        }
    )
    
    # Publish comment deleted event if Kafka is available
    if kafka_producer:
        kafka_producer.send("comments", {
            "event": "comment_deleted",
            "comment_id": comment_id,
            "tweet_id": comment["tweet_id"],
            "user_id": current_user["id"],
            "created_at": datetime.utcnow().isoformat()
        })
    
    return {"status": "success", "message": "Comment deleted"}

# Get all descendants of a comment (for admin/moderation purposes)
@app.get("/comments/{comment_id}/tree", response_model=List[CommentResponse])
def get_comment_tree(
    comment_id: str,
    current_user = Depends(get_current_user_optional),  # Changed to optional authentication
    mongo_client = Depends(get_mongo_client),
    conn = Depends(get_pg_conn)
):
    """Get a comment and all its nested replies (the entire subtree)"""
    # MongoDB collections
    comments_collection = mongo_client.mini_twitter.comments
    
    # Find the original comment first to validate
    root_comment = comments_collection.find_one({"id": comment_id})
    if not root_comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    # Query MongoDB with path match (finds all comments with root comment ID in their path)
    # This works because path contains the full ancestry chain
    comments = list(comments_collection.find(
        {"path": {"$elemMatch": {"$eq": comment_id}}},
        sort=[("created_at", 1)]  # Sort by creation time
    ))
    
    # Get usernames for all comment authors
    user_ids = set(comment["user_id"] for comment in comments)
    
    usernames = {}
    if user_ids:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        if len(user_ids) > 0:
            user_ids_tuple = tuple(user_ids)
            # If only one ID, we need to make it a proper tuple
            if len(user_ids) == 1:
                user_ids_tuple = (list(user_ids)[0],)
            cursor.execute(
                "SELECT id, username FROM users WHERE id IN %s",
                (user_ids_tuple,)
            )
            usernames = {row["id"]: row["username"] for row in cursor.fetchall()}
        
        cursor.close()
    
    # Format and return all comments in the subtree
    formatted_comments = []
    for comment in comments:
        # Convert MongoDB ObjectId to string if necessary
        if "_id" in comment:
            del comment["_id"]
        
        formatted_comments.append({
            **comment,
            "username": usernames.get(comment["user_id"], "Unknown"),
            "likes_count": 0
        })
    
    return formatted_comments


# Tweet and media routes
@app.post("/upload/image")
async def upload_image(
    file: UploadFile = File(...),
    current_user = Depends(get_current_user)
):
    """Upload an image to Minio storage"""
    if not minio_client:
        # Provide more helpful error and fallback
        return {
            "error": "Storage service is not available",
            "message": "The storage service (Minio) is not currently available. Your image was not saved.",
            "debug_info": {
                "tried_hostnames": MINIO_HOSTNAME_OPTIONS,
                "selected_hostname": selected_hostname
            },
            "url": "http://localhost:9000/placeholder-image.jpg"  # Placeholder URL
        }
    
    # Validate file type
    content_type = file.content_type
    if not content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are allowed")
    
    try:
        # Read file content
        file_data = await file.read()
        
        # Generate a unique filename
        ext = os.path.splitext(file.filename)[1]
        filename = f"{current_user['id']}/{uuid4()}{ext}"
        
        print(f"Uploading file {filename} to Minio bucket {MINIO_BUCKET}")
        
        # Upload to Minio
        minio_client.put_object(
            bucket_name=MINIO_BUCKET,
            object_name=filename,
            data=io.BytesIO(file_data),
            length=len(file_data),
            content_type=content_type
        )
        
        # Return the URL with localhost instead of container name
        image_url = f"http://localhost:9000/{MINIO_BUCKET}/{filename}"
        print(f"Generated URL: {image_url}")
        
        return {"url": image_url}
    
    except minio.error.S3Error as e:
        print(f"Minio S3Error: {e}")
        raise HTTPException(status_code=500, detail=f"Error uploading to storage: {e}")
    except Exception as e:
        print(f"Unexpected error: {e}")
        raise HTTPException(status_code=500, detail=f"Unexpected error: {e}")

@app.post("/tweets", response_model=TweetResponse)
def create_tweet(
    content: str = Form(...),
    media_urls: Optional[str] = Form(None),
    current_user = Depends(get_current_user),
    mongo_client = Depends(get_mongo_client)
):
    tweets_collection = mongo_client.mini_twitter.tweets
    
    # Extract hashtags (words starting with #)
    hashtags = [word[1:] for word in content.split() if word.startswith('#')]
    
    # Parse media_urls from string to list, if provided
    media_urls_list = []
    if media_urls:
        try:
            print(f"Received media_urls: {media_urls}")
            # Try to parse as JSON
            try:
                media_urls_list = json.loads(media_urls)
                if not isinstance(media_urls_list, list):
                    media_urls_list = [media_urls]
            except json.JSONDecodeError as e:
                print(f"JSON parsing error: {e}. Treating as single URL.")
                # If parsing fails, treat as a single URL
                media_urls_list = [media_urls]
            
            print(f"Initial media_urls_list: {media_urls_list}")
            
            # Ensure all URLs use localhost:9000 instead of minio:9000
            fixed_urls = []
            for url in media_urls_list:
                # Skip empty URLs
                if not url:
                    continue
                    
                # Standardize URL format
                if "minio:9000" in url:
                    fixed_url = url.replace("minio:9000", "localhost:9000")
                    print(f"Fixed URL from {url} to {fixed_url}")
                    fixed_urls.append(fixed_url)
                else:
                    # Ensure URL has the correct domain format
                    if "://localhost:9000" not in url and "mini-twitter" in url:
                        # This looks like a relative path, add the domain
                        fixed_url = f"http://localhost:9000/{url.lstrip('/')}"
                        print(f"Added domain to URL: {fixed_url}")
                        fixed_urls.append(fixed_url)
                    else:
                        # URL looks good, pass it through
                        fixed_urls.append(url)
                        print(f"URL kept as is: {url}")
            
            # Update the list with fixed URLs
            media_urls_list = fixed_urls
            print(f"Final media_urls_list: {media_urls_list}")
        except Exception as e:
            # Catch any unexpected errors in URL processing
            print(f"Error processing media URLs: {e}")
            # Use empty list if there was an error
            media_urls_list = []
    
    tweet_id = str(uuid.uuid4())
    created_at = datetime.utcnow()
    
    # Double-check media URLs before storing
    checked_urls = []
    for url in media_urls_list:
        if url and isinstance(url, str):
            # Final sanity check
            if "minio:9000" in url:
                url = url.replace("minio:9000", "localhost:9000")
            checked_urls.append(url)
    
    # Store tweet in MongoDB
    tweet_doc = {
        "id": tweet_id,
        "user_id": current_user["id"],
        "content": content,
        "hashtags": hashtags,
        "created_at": created_at,
        "media_urls": checked_urls  # Use the thoroughly checked URLs
    }
    
    # Log what's being saved to MongoDB
    print(f"Saving tweet with media_urls: {checked_urls}")
    
    tweets_collection.insert_one(tweet_doc)
    
    # Publish tweet created event
    if kafka_producer:
        kafka_producer.send("tweets", {
            "event": "tweet_created",
            "tweet_id": tweet_id,
            "user_id": current_user["id"],
            "content": content,
            "hashtags": hashtags,
            "media_urls": checked_urls,  # Use the same URLs here
            "created_at": created_at.isoformat()
        })
    
    return {
        "id": tweet_id,
        "user_id": current_user["id"],
        "username": current_user["username"],
        "content": content,
        "hashtags": hashtags,
        "created_at": created_at,
        "likes_count": 0,
        "media_urls": checked_urls  # And here
    }

@app.get("/system/health")
def system_health():
    """Check health of all system components"""
    health = {
        "api": "healthy",
        "database": {
            "postgres": check_postgres_health(),
            "mongodb": check_mongodb_health(),
            "cassandra": check_cassandra_health()
        },
        "messaging": {
            "kafka": "healthy" if kafka_producer else "not connected"
        },
        "storage": {
            "minio": "healthy" if minio_client else "not connected"
        },
        "analytics": {
            "spark": check_spark_health(),
            "scheduled_jobs": get_scheduled_jobs_status()
        },
        "timestamp": datetime.utcnow().isoformat()
    }
    return health

def check_postgres_health():
    try:
        conn = psycopg2.connect(DB_URL)
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        cursor.close()
        conn.close()
        return "healthy"
    except Exception as e:
        return f"unhealthy: {str(e)}"

def check_mongodb_health():
    try:
        client = MongoClient(MONGODB_URL, serverSelectionTimeoutMS=2000)
        client.admin.command('ping')
        return "healthy"
    except Exception as e:
        return f"unhealthy: {str(e)}"
    
@app.get("/tweets/{tweet_id}/like-status")
def get_tweet_like_status(
    tweet_id: str,
    current_user = Depends(get_current_user),
    cassandra_session = Depends(get_cassandra_session)
):
    """Check if the current user has liked a tweet"""
    try:
        # Query Cassandra for like status
        rows = cassandra_session.execute(
            "SELECT * FROM mini_twitter.likes WHERE tweet_id = %s AND user_id = %s",
            (tweet_id, current_user["id"])
        )
        
        # If any rows are returned, the user has liked the tweet
        is_liked = len(list(rows)) > 0
        
        return {"is_liked": is_liked}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error checking like status: {str(e)}")

# 3. Enhanced unlike_tweet endpoint with counter decrement
@app.post("/tweets/{tweet_id}/unlike")
def unlike_tweet(
    tweet_id: str, 
    current_user = Depends(get_current_user), 
    cassandra_session = Depends(get_cassandra_session)
):
    """Remove a like from a tweet and decrement its counter"""
    # Check if like exists
    rows = cassandra_session.execute(
        "SELECT * FROM mini_twitter.likes WHERE tweet_id = %s AND user_id = %s",
        (tweet_id, current_user["id"])
    )
    
    like_exists = len(list(rows)) > 0
    
    if like_exists:
        # Delete the like from Cassandra
        cassandra_session.execute(
            "DELETE FROM mini_twitter.likes WHERE tweet_id = %s AND user_id = %s",
            (tweet_id, current_user["id"])
        )
        
        # Get the current count before decrementing
        rows = cassandra_session.execute(
            "SELECT count FROM mini_twitter.like_counts WHERE tweet_id = %s",
            (tweet_id,)
        )
        
        current_count = 0
        for row in rows:
            current_count = row.count
            break
        
        # Only decrement if count is positive
        if current_count > 0:
            cassandra_session.execute(
                "UPDATE mini_twitter.like_counts SET count = count - 1 WHERE tweet_id = %s",
                (tweet_id,)
            )
        
        # Publish unlike event
        if kafka_producer:
            kafka_producer.send("likes", {
                "event": "tweet_unliked",
                "tweet_id": tweet_id,
                "user_id": current_user["id"],
                "created_at": datetime.utcnow().isoformat()
            })
    
    # Get the current count after update
    rows = cassandra_session.execute(
        "SELECT count FROM mini_twitter.like_counts WHERE tweet_id = %s",
        (tweet_id,)
    )
    
    count = 0
    for row in rows:
        count = row.count
        break
    
    # Ensure count is always non-negative
    count = max(0, count)
    
    return {"status": "success", "likes_count": count}

# 4. Enhanced get_tweets function to include like counts
@app.get("/tweets")
def get_tweets(
    user_id: Optional[str] = None,
    limit: int = 20,
    current_user = Depends(get_current_user_optional),
    mongo_client = Depends(get_mongo_client),
    conn = Depends(get_pg_conn),
    cassandra_session = Depends(get_cassandra_session)
):
    """
    Get tweets with optional user_id filter and accurate like counts.
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
    if current_user:
        user_ids.add(current_user["id"])  # Add current user
    
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    if user_ids and len(user_ids) > 0:
        user_ids_tuple = tuple(user_ids)
        # If only one ID, we need to make it a proper tuple
        if len(user_ids) == 1:
            user_ids_tuple = (list(user_ids)[0],)
            
        cursor.execute(
            "SELECT id, username FROM users WHERE id IN %s",
            (user_ids_tuple,)
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
            
        # Ensure media_urls is always a list and fix URLs if needed
        if "media_urls" not in tweet:
            tweet["media_urls"] = []
        else:
            # Fix URLs if needed
            fixed_urls = []
            for url in tweet["media_urls"]:
                if "minio:9000" in url:
                    fixed_url = url.replace("minio:9000", "localhost:9000")
                    fixed_urls.append(fixed_url)
                else:
                    fixed_urls.append(url)
            
            tweet["media_urls"] = fixed_urls
            
        formatted_tweets.append({
            **tweet,
            "username": usernames.get(tweet["user_id"], "Unknown"),
            "likes_count": 0  # Initialize to 0, will be updated
        })
    
    # Enhance tweets with like counts
    enhanced_tweets = enhance_tweets_with_likes(formatted_tweets, cassandra_session)
    
    return enhanced_tweets
# Add this to the end of your FastAPI app file

@app.get("/tweets/{tweet_id}/comments/count")
def get_tweet_comments_count(
    tweet_id: str,
    current_user = Depends(get_current_user_optional),
    mongo_client = Depends(get_mongo_client)
):
    """Get the total number of comments for a tweet, including replies"""
    comments_collection = mongo_client.mini_twitter.comments
    
    # Count all comments associated with this tweet
    comment_count = comments_collection.count_documents({"tweet_id": tweet_id})
    
    return {"count": comment_count}
# Add these endpoints to your FastAPI app file

@app.get("/tweets/{tweet_id}/retweets/count")
def get_tweet_retweets_count(
    tweet_id: str,
    current_user = Depends(get_current_user_optional),
    mongo_client = Depends(get_mongo_client)
):
    """Get the number of retweets for a tweet"""
    tweets_collection = mongo_client.mini_twitter.tweets
    
    # Count tweets that have retweeted this tweet
    retweet_count = tweets_collection.count_documents({"retweeted_from": tweet_id})
    
    return {"count": retweet_count}

@app.get("/tweets/{tweet_id}/retweet-status")
def check_retweet_status(
    tweet_id: str,
    current_user = Depends(get_current_user),
    mongo_client = Depends(get_mongo_client)
):
    """Check if the current user has retweeted a tweet"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
        
    tweets_collection = mongo_client.mini_twitter.tweets
    
    # Check if user has retweeted this tweet
    retweet = tweets_collection.find_one({
        "retweeted_from": tweet_id,
        "user_id": current_user["id"]
    })
    
    # If this is a retweet, also check if the user has retweeted the original
    if not retweet:
        # Get the original tweet to check if this is a retweet
        tweet = tweets_collection.find_one({"id": tweet_id})
        if tweet and "retweeted_from" in tweet:
            # If this is a retweet, check if user has retweeted the original
            retweet = tweets_collection.find_one({
                "retweeted_from": tweet["retweeted_from"],
                "user_id": current_user["id"]
            })
    
    return {"is_retweeted": retweet is not None}

# 5. Enhanced get_tweet endpoint to include like count
@app.get("/tweets/{tweet_id}")
def get_tweet(
    tweet_id: str,
    current_user = Depends(get_current_user_optional),
    mongo_client = Depends(get_mongo_client),
    conn = Depends(get_pg_conn),
    cassandra_session = Depends(get_cassandra_session)
):
    """Get a single tweet by ID with accurate like count"""
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
    
    # Add username and initialize likes count
    tweet["username"] = user["username"] if user else "Unknown"
    tweet["likes_count"] = 0  # Initialize to 0, will be updated
    
    # Ensure media_urls is always a list and fix URLs if needed
    if "media_urls" not in tweet:
        tweet["media_urls"] = []
    else:
        # Fix URLs if needed
        fixed_urls = []
        for url in tweet["media_urls"]:
            if "minio:9000" in url:
                fixed_url = url.replace("minio:9000", "localhost:9000")
                fixed_urls.append(fixed_url)
            else:
                fixed_urls.append(url)
        
        tweet["media_urls"] = fixed_urls
    
    # Get like count from Cassandra
    try:
        # Check if the counter exists
        rows = cassandra_session.execute(
            "SELECT count FROM mini_twitter.like_counts WHERE tweet_id = %s",
            (tweet_id,)
        )
        
        count = 0
        count_exists = False
        for row in rows:
            count = row.count
            count_exists = True
            break
        
        # If counter doesn't exist, initialize it
        if not count_exists:
            # Count likes for this tweet
            likes_rows = cassandra_session.execute(
                "SELECT COUNT(*) FROM mini_twitter.likes WHERE tweet_id = %s",
                (tweet_id,)
            )
            
            like_count = 0
            for row in likes_rows:
                like_count = row[0]
                break
            
            # Initialize the counter
            if like_count > 0:
                # Initialize with the correct count
                for _ in range(like_count):
                    cassandra_session.execute(
                        "UPDATE mini_twitter.like_counts SET count = count + 1 WHERE tweet_id = %s",
                        (tweet_id,)
                    )
                count = like_count
            else:
                # Initialize with zero
                cassandra_session.execute(
                    "UPDATE mini_twitter.like_counts SET count = count + 0 WHERE tweet_id = %s",
                    (tweet_id,)
                )
        
        # Ensure count is always non-negative
        tweet["likes_count"] = max(0, count)
    except Exception as e:
        print(f"Error fetching like count: {e}")
    
    return tweet

# 2. Enhanced like_tweet endpoint with counter
@app.post("/tweets/{tweet_id}/like")
def like_tweet(
    tweet_id: str, 
    current_user = Depends(get_current_user), 
    cassandra_session = Depends(get_cassandra_session)
):
    """Like a tweet and increment its like counter"""
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
    
    # Create table if not exists for individual likes
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
    
    # Create counter table if not exists
    cassandra_session.execute(
        """
        CREATE TABLE IF NOT EXISTS mini_twitter.like_counts (
            tweet_id TEXT PRIMARY KEY,
            count COUNTER
        )
        """
    )
    
    # Check if already liked to avoid duplicates
    rows = cassandra_session.execute(
        "SELECT * FROM mini_twitter.likes WHERE tweet_id = %s AND user_id = %s",
        (tweet_id, current_user["id"])
    )
    
    already_liked = len(list(rows)) > 0
    
    if not already_liked:
        # Insert the like record
        cassandra_session.execute(
            "INSERT INTO mini_twitter.likes (tweet_id, user_id, created_at) VALUES (%s, %s, %s)",
            (tweet_id, current_user["id"], timestamp)
        )
        
        # Increment the counter
        cassandra_session.execute(
            "UPDATE mini_twitter.like_counts SET count = count + 1 WHERE tweet_id = %s",
            (tweet_id,)
        )
        
        # Publish like event
        if kafka_producer:
            kafka_producer.send("likes", {
                "event": "tweet_liked",
                "tweet_id": tweet_id,
                "user_id": current_user["id"],
                "created_at": timestamp.isoformat()
            })
    
    # Get the current count
    rows = cassandra_session.execute(
        "SELECT count FROM mini_twitter.like_counts WHERE tweet_id = %s",
        (tweet_id,)
    )
    
    count = 0
    for row in rows:
        count = row.count
        break
    
    # Ensure count is always non-negative
    count = max(0, count)
    
    return {"status": "success", "likes_count": count}

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
    
    # Fix media URLs if needed
    media_urls = original_tweet.get("media_urls", [])
    fixed_media_urls = []
    for url in media_urls:
        if "minio:9000" in url:
            fixed_url = url.replace("minio:9000", "localhost:9000")
            fixed_media_urls.append(fixed_url)
        else:
            fixed_media_urls.append(url)
    
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
        "media_urls": fixed_media_urls
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
    content: str = Form(...),
    media_urls: Optional[str] = Form(None),
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
    hashtags = [word[1:] for word in content.split() if word.startswith('#')]
    
    # Parse media_urls from string to list, if provided
    media_urls_list = []
    if media_urls:
        try:
            media_urls_list = json.loads(media_urls)
            if not isinstance(media_urls_list, list):
                media_urls_list = [media_urls]
        except:
            # If parsing fails, treat as a single URL
            media_urls_list = [media_urls]
        
        # Fix URLs if needed
        fixed_urls = []
        for url in media_urls_list:
            if "minio:9000" in url:
                fixed_url = url.replace("minio:9000", "localhost:9000")
                fixed_urls.append(fixed_url)
            else:
                fixed_urls.append(url)
        
        media_urls_list = fixed_urls
    
    # Create reply
    reply_id = str(uuid.uuid4())
    created_at = datetime.utcnow()
    
    reply_doc = {
        "id": reply_id,
        "user_id": current_user["id"],
        "content": content,
        "hashtags": hashtags,
        "created_at": created_at,
        "in_reply_to": tweet_id,
        "in_reply_to_user_id": parent_tweet["user_id"],
        "media_urls": media_urls_list
    }
    
    tweets_collection.insert_one(reply_doc)
    
    # Publish reply event
    if kafka_producer:
        kafka_producer.send("tweets", {
            "event": "tweet_replied",
            "tweet_id": reply_id,
            "parent_tweet_id": tweet_id,
            "user_id": current_user["id"],
            "content": content,
            "hashtags": hashtags,
            "media_urls": media_urls_list,
            "created_at": created_at.isoformat()
        })
    
    return {
        "id": reply_id,
        "user_id": current_user["id"],
        "username": current_user["username"],
        "content": content,
        "hashtags": hashtags,
        "created_at": created_at,
        "in_reply_to": tweet_id,
        "likes_count": 0,
        "media_urls": media_urls_list
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
            
        # Ensure media_urls is always a list and fix URLs if needed
        if "media_urls" not in reply:
            reply["media_urls"] = []
        else:
            # Fix URLs if needed
            fixed_urls = []
            for url in reply["media_urls"]:
                if "minio:9000" in url:
                    fixed_url = url.replace("minio:9000", "localhost:9000")
                    fixed_urls.append(fixed_url)
                else:
                    fixed_urls.append(url)
            
            reply["media_urls"] = fixed_urls
        
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
            
        # Ensure media_urls is always a list and fix URLs if needed
        if "media_urls" not in tweet:
            tweet["media_urls"] = []
        else:
            # Fix URLs if needed
            fixed_urls = []
            for url in tweet["media_urls"]:
                if "minio:9000" in url:
                    fixed_url = url.replace("minio:9000", "localhost:9000")
                    fixed_urls.append(fixed_url)
                else:
                    fixed_urls.append(url)
            
            tweet["media_urls"] = fixed_urls
            
        timeline.append({
            **tweet,
            "username": usernames.get(tweet["user_id"], "Unknown"),
            "likes_count": 0,  # In a real app, we'd query Cassandra for this
        })
    
    return timeline
@app.get("/trending")
def get_trending_hashtags(mongo_client = Depends(get_mongo_client)):
    """Get trending hashtags"""
    try:
        # First try to get data from Spark analytics
        analytics_db = mongo_client.mini_twitter_analytics
        trending = list(analytics_db.trending_hashtags_daily.find(
            {},
            sort=[("count", -1)],
            limit=10
        ))
        
        # Transform document IDs to strings
        for trend in trending:
            if "_id" in trend:
                trend["_id"] = str(trend["_id"])
        
        if trending:
            return trending
        
        # Fallback: Simple aggregation if Spark analytics data is not available
        tweets_collection = mongo_client.mini_twitter.tweets
        one_day_ago = datetime.utcnow() - timedelta(days=1)
        
        pipeline = [
            {"$match": {"created_at": {"$gte": one_day_ago}}},
            {"$unwind": "$hashtags"},
            {"$group": {"_id": "$hashtags", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 10}
        ]
        
        results = list(tweets_collection.aggregate(pipeline))
        return [{"hashtag": r["_id"], "count": r["count"]} for r in results]
    except Exception as e:
        print(f"Error in trending hashtags: {e}")
        # Return empty list in case of any error
        return []
    
    # Database Explorer Endpoints
db_router = APIRouter(prefix="/db", tags=["database"])

@db_router.get("/cassandra/{keyspace}/{table}")
def get_cassandra_data(keyspace: str, table: str, limit: int = 100, cassandra_session = Depends(get_cassandra_session)):
    """Get data from a Cassandra table"""
    try:
        cassandra_session.set_keyspace(keyspace)
        rows = cassandra_session.execute(f"SELECT * FROM {table} LIMIT {limit}")
        
        # Convert to list of dicts
        result = []
        for row in rows:
            row_dict = {}
            for key in row._fields:
                value = getattr(row, key)
                # Handle non-serializable types
                if hasattr(value, 'isoformat'):  # For datetime objects
                    value = value.isoformat()
                row_dict[key] = value
            result.append(row_dict)
        
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@db_router.post("/postgres")
def execute_postgres_query(query_data: PostgresQuery, conn = Depends(get_pg_conn)):
    """Execute a PostgreSQL query and return the results"""
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
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

# Function to create MongoDB indexes for nested comments
def create_comment_indexes(mongo_client):
    """Create MongoDB indexes for efficient comment queries"""
    comments_collection = mongo_client.mini_twitter.comments
    
    # Index for fetching comments by tweet_id and parent_id (main listing query)
    comments_collection.create_index([("tweet_id", 1), ("parent_id", 1)])
    
    # Index for fetching replies to a specific comment
    comments_collection.create_index([("parent_id", 1)])
    
    # Index for path-based queries (finding all descendants)
    comments_collection.create_index([("path", 1)])
    
    # Index for user's comments (profile page)
    comments_collection.create_index([("user_id", 1)])
    
    print("Created indexes for nested comments")

# Create indexes on application startup
@app.on_event("startup")
async def startup_event():
    """Run startup tasks"""
    # Connect to MongoDB
    client = MongoClient(MONGODB_URL)
    
    # Create indexes for comments
    create_comment_indexes(client)
    
    # Close the client
    client.close()

# Include database router
app.include_router(db_router)