// Define types for the Twitter-like application

export interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url?: string;
  bio?: string;
  followers_count: number;
  following_count: number;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  name: string;
  username: string;
  avatar: string;
  bio?: string;
  followersCount: number;
  followingCount: number;
  verified?: boolean;
}

export interface Tweet {
  id: string;
  content: string;
  createdAt: string;
  authorId: string;
  likes: number;
  retweets: number;
  replies: number;
  hasLiked: boolean;
  hasRetweeted: boolean;
  images?: string[];
  hashtags?: string[];
}

export interface Trend {
  id: string;
  hashtag: string;
  tweetCount: number;
  category?: string;
}

export type TimelineType = 'home' | 'explore' | 'notifications' | 'profile' | 'analytics';