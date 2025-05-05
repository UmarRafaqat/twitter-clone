#!/usr/bin/env python3
"""
Mini-Twitter Test Data Generator

This script generates synthetic test data for the Mini-Twitter system.
"""

import json
import random
import uuid
import datetime
import argparse
from typing import List, Dict, Any
import sys

try:
    from faker import Faker
except ImportError:
    print("Installing required packages...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "faker"])
    from faker import Faker

# Configuration
DEFAULT_NUM_USERS = 50
DEFAULT_NUM_TWEETS = 200
DEFAULT_NUM_FOLLOWS = 100
DEFAULT_NUM_LIKES = 300

# Popular hashtags to make the data more realistic
POPULAR_HASHTAGS = [
    "BigData", "Spark", "Kafka", "DataScience", "NoSQL", "MongoDB", 
    "Cassandra", "PostgreSQL", "Python", "Java", "Scala", "Cloud",
    "AWS", "DevOps", "MachineLearning", "AI", "Analytics", "DataPipeline"
]

class TestDataGenerator:
    def __init__(self, seed=None):
        """Initialize the test data generator."""
        self.fake = Faker()
        
        # Set random seed for reproducibility if provided
        if seed is not None:
            random.seed(seed)
            self.fake.seed_instance(seed)
            
        # Storage for generated data
        self.users = []
        self.tweets = []
        self.follows = []
        self.likes = []
    
    def generate_users(self, count: int) -> List[Dict[str, Any]]:
        """Generate random user profiles."""
        users = []
        for _ in range(count):
            user_id = str(uuid.uuid4())
            username = self.fake.user_name()
            email = self.fake.email()
            created_at = self.fake.date_time_between(
                start_date="-1y", end_date="now"
            ).isoformat()
            
            user = {
                "id": user_id,
                "username": username,
                "email": email,
                "password_hash": "password123",  # For testing only!
                "created_at": created_at,
                "bio": self.fake.text(max_nb_chars=160) if random.random() > 0.3 else None,
                "profile_image_url": f"https://randomuser.me/api/portraits/{random.choice(['men', 'women'])}/{random.randint(1, 99)}.jpg"
            }
            users.append(user)
        
        self.users = users
        return users
    
    def generate_follows(self, count: int) -> List[Dict[str, Any]]:
        """Generate random follow relationships between users."""
        if not self.users:
            raise ValueError("Generate users first before generating follows")
        
        follows = []
        user_ids = [u["id"] for u in self.users]
        
        # Create a set to avoid duplicate follows
        follow_pairs = set()
        
        while len(follows) < count and len(follow_pairs) < len(user_ids) * (len(user_ids) - 1):
            # Ensure follower and followee are different users
            follower_id = random.choice(user_ids)
            followee_id = random.choice(user_ids)
            
            if follower_id != followee_id and (follower_id, followee_id) not in follow_pairs:
                follow_pairs.add((follower_id, followee_id))
                
                created_at = self.fake.date_time_between(
                    start_date="-6m", end_date="now"
                ).isoformat()
                
                follow = {
                    "follower_id": follower_id,
                    "followee_id": followee_id,
                    "created_at": created_at
                }
                follows.append(follow)
        
        self.follows = follows
        return follows
    
    def generate_tweets(self, count: int) -> List[Dict[str, Any]]:
        """Generate random tweets with hashtags."""
        if not self.users:
            raise ValueError("Generate users first before generating tweets")
        
        tweets = []
        for _ in range(count):
            tweet_id = str(uuid.uuid4())
            user = random.choice(self.users)
            user_id = user["id"]
            
            # Generate content with random hashtags
            num_hashtags = random.choices(
                [0, 1, 2, 3], 
                weights=[0.1, 0.4, 0.3, 0.2]
            )[0]
            
            hashtags = random.sample(POPULAR_HASHTAGS, num_hashtags) if num_hashtags > 0 else []
            
            # Create tweet content with hashtags
            content_parts = []
            for _ in range(random.randint(1, 3)):
                content_parts.append(self.fake.text(max_nb_chars=50))
            
            content = " ".join(content_parts)
            
            # Add hashtags to content
            for hashtag in hashtags:
                position = random.randint(0, len(content))
                content = content[:position] + f" #{hashtag} " + content[position:]
            
            content = content.strip()
            
            # Set created_at to a random time in the last month
            created_at = self.fake.date_time_between(
                start_date="-1m", end_date="now"
            ).isoformat()
            
            tweet = {
                "id": tweet_id,
                "user_id": user_id,
                "content": content,
                "hashtags": hashtags,
                "created_at": created_at
            }
            tweets.append(tweet)
        
        self.tweets = tweets
        return tweets
    
    def generate_likes(self, count: int) -> List[Dict[str, Any]]:
        """Generate random likes on tweets."""
        if not self.users or not self.tweets:
            raise ValueError("Generate users and tweets first before generating likes")
        
        likes = []
        
        # Create a set to avoid duplicate likes
        like_pairs = set()
        
        while len(likes) < count and len(like_pairs) < len(self.users) * len(self.tweets):
            user = random.choice(self.users)
            tweet = random.choice(self.tweets)
            
            if (user["id"], tweet["id"]) not in like_pairs:
                like_pairs.add((user["id"], tweet["id"]))
                
                # Ensure like happens after tweet creation
                tweet_created = datetime.datetime.fromisoformat(tweet["created_at"])
                
                # Set like time to be between tweet creation and now
                like_time = self.fake.date_time_between_dates(
                    datetime_start=tweet_created,
                    datetime_end=datetime.datetime.now()
                )
                
                like = {
                    "user_id": user["id"],
                    "tweet_id": tweet["id"],
                    "created_at": like_time.isoformat()
                }
                likes.append(like)
        
        self.likes = likes
        return likes
    
    def generate_all(self, num_users, num_tweets, num_follows, num_likes):
        """Generate all test data."""
        print(f"Generating {num_users} users...")
        self.generate_users(num_users)
        
        print(f"Generating {num_follows} follows...")
        self.generate_follows(num_follows)
        
        print(f"Generating {num_tweets} tweets...")
        self.generate_tweets(num_tweets)
        
        print(f"Generating {num_likes} likes...")
        self.generate_likes(num_likes)
        
        return {
            "users": self.users,
            "follows": self.follows,
            "tweets": self.tweets,
            "likes": self.likes
        }
    
    def save_to_files(self, output_dir="."):
        """Save generated data to JSON files."""
        with open(f"{output_dir}/users.json", "w") as f:
            json.dump(self.users, f, indent=2)
        
        with open(f"{output_dir}/follows.json", "w") as f:
            json.dump(self.follows, f, indent=2)
        
        with open(f"{output_dir}/tweets.json", "w") as f:
            json.dump(self.tweets, f, indent=2)
        
        with open(f"{output_dir}/likes.json", "w") as f:
            json.dump(self.likes, f, indent=2)
        
        print(f"Saved all data to JSON files in {output_dir}")

def main():
    parser = argparse.ArgumentParser(description="Generate test data for Mini-Twitter")
    parser.add_argument("--num-users", type=int, default=DEFAULT_NUM_USERS,
                        help=f"Number of users to generate (default: {DEFAULT_NUM_USERS})")
    parser.add_argument("--num-tweets", type=int, default=DEFAULT_NUM_TWEETS,
                        help=f"Number of tweets to generate (default: {DEFAULT_NUM_TWEETS})")
    parser.add_argument("--num-follows", type=int, default=DEFAULT_NUM_FOLLOWS,
                        help=f"Number of follow relationships to generate (default: {DEFAULT_NUM_FOLLOWS})")
    parser.add_argument("--num-likes", type=int, default=DEFAULT_NUM_LIKES,
                        help=f"Number of likes to generate (default: {DEFAULT_NUM_LIKES})")
    parser.add_argument("--output-dir", type=str, default=".",
                        help="Directory to save JSON files (default: current directory)")
    parser.add_argument("--seed", type=int, default=None,
                        help="Random seed for reproducibility")
    
    args = parser.parse_args()
    
    generator = TestDataGenerator(seed=args.seed)
    
    # Generate all test data
    generator.generate_all(
        args.num_users, 
        args.num_tweets, 
        args.num_follows, 
        args.num_likes
    )
    
    # Save to