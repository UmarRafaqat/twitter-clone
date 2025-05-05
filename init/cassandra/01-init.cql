CREATE KEYSPACE IF NOT EXISTS mini_twitter 
WITH REPLICATION = { 
    'class' : 'SimpleStrategy', 
    'replication_factor' : 1 
};

-- Likes table for high-velocity writes
CREATE TABLE IF NOT EXISTS mini_twitter.likes (
    tweet_id TEXT,
    user_id TEXT,
    created_at TIMESTAMP,
    PRIMARY KEY ((tweet_id), user_id)
);

-- Timeline table for feed generation
CREATE TABLE IF NOT EXISTS mini_twitter.timelines (
    user_id TEXT,
    tweet_id TEXT,
    author_id TEXT,
    timestamp TIMESTAMP,
    PRIMARY KEY ((user_id), timestamp, tweet_id)
) WITH CLUSTERING ORDER BY (timestamp DESC);