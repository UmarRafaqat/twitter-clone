// Create database
db = db.getSiblingDB('mini_twitter');

// Create tweets collection
db.createCollection('tweets');

// Create indexes
db.tweets.createIndex({ user_id: 1 });
db.tweets.createIndex({ created_at: -1 });
db.tweets.createIndex({ hashtags: 1 });