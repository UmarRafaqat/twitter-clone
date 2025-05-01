import { User, Tweet, Trend } from '../types';
import { formatDistanceToNow } from '../utils/dateUtils';

// Mock Users Data
export const users: User[] = [
  {
    id: '1',
    name: 'John Doe',
    username: 'johndoe',
    avatar: 'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=150',
    bio: 'Software Engineer | React Enthusiast | Coffee Lover',
    followersCount: 1243,
    followingCount: 567,
    verified: true,
  },
  {
    id: '2',
    name: 'Jane Smith',
    username: 'janesmith',
    avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150',
    bio: 'UX Designer | Travel Enthusiast',
    followersCount: 2341,
    followingCount: 432,
    verified: false,
  },
  {
    id: '3',
    name: 'Alex Johnson',
    username: 'alexj',
    avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150',
    bio: 'Product Manager | Tech Blogger',
    followersCount: 5678,
    followingCount: 345,
    verified: true,
  },
  {
    id: '4',
    name: 'Sarah Wilson',
    username: 'sarahw',
    avatar: 'https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?auto=compress&cs=tinysrgb&w=150',
    bio: 'Data Scientist | Researcher',
    followersCount: 987,
    followingCount: 234,
    verified: false,
  },
  {
    id: '5',
    name: 'Michael Brown',
    username: 'mikebrown',
    avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150',
    bio: 'Full Stack Developer | Open Source Contributor',
    followersCount: 3456,
    followingCount: 789,
    verified: true,
  },
];

// Generate tweets with appropriate timestamps
const now = new Date();
const hoursAgo = (hours: number) => {
  const date = new Date(now);
  date.setHours(date.getHours() - hours);
  return date.toISOString();
};

// Mock Tweets Data
export const tweets: Tweet[] = [
  {
    id: '1',
    content: 'Just deployed a new feature to production! #coding #webdev',
    createdAt: hoursAgo(1),
    authorId: '1',
    likes: 42,
    retweets: 12,
    replies: 5,
    hasLiked: false,
    hasRetweeted: false,
    hashtags: ['coding', 'webdev'],
  },
  {
    id: '2',
    content: 'Working on a new design for our mobile app. What do you think? #design #ux',
    createdAt: hoursAgo(3),
    authorId: '2',
    likes: 78,
    retweets: 23,
    replies: 14,
    hasLiked: true,
    hasRetweeted: false,
    images: ['https://images.pexels.com/photos/326503/pexels-photo-326503.jpeg?auto=compress&cs=tinysrgb&w=500'],
    hashtags: ['design', 'ux'],
  },
  {
    id: '3',
    content: 'Just published my latest article on #AI and its impact on society. Check it out!',
    createdAt: hoursAgo(5),
    authorId: '3',
    likes: 124,
    retweets: 45,
    replies: 23,
    hasLiked: false,
    hasRetweeted: true,
    hashtags: ['AI'],
  },
  {
    id: '4',
    content: 'Excited to announce that I\'ll be speaking at the #DataScience conference next month!',
    createdAt: hoursAgo(7),
    authorId: '4',
    likes: 98,
    retweets: 32,
    replies: 11,
    hasLiked: false,
    hasRetweeted: false,
    hashtags: ['DataScience'],
  },
  {
    id: '5',
    content: 'Just merged a huge PR that fixes performance issues. The app is now 30% faster! #performance #optimization',
    createdAt: hoursAgo(10),
    authorId: '5',
    likes: 156,
    retweets: 67,
    replies: 18,
    hasLiked: true,
    hasRetweeted: true,
    hashtags: ['performance', 'optimization'],
  },
  {
    id: '6',
    content: 'Exploring new libraries for state management. Redux is great, but looking into alternatives. Any suggestions? #react #statemanagement',
    createdAt: hoursAgo(12),
    authorId: '1',
    likes: 87,
    retweets: 29,
    replies: 32,
    hasLiked: false,
    hasRetweeted: false,
    hashtags: ['react', 'statemanagement'],
  },
  {
    id: '7',
    content: 'Just released our new design system! It\'s now open source and available on GitHub. #designsystem #opensource',
    createdAt: hoursAgo(15),
    authorId: '2',
    likes: 211,
    retweets: 89,
    replies: 27,
    hasLiked: true,
    hasRetweeted: false,
    hashtags: ['designsystem', 'opensource'],
  },
  {
    id: '8',
    content: 'Working remotely from the mountains today. The view is amazing! #remotework #worklife',
    createdAt: hoursAgo(18),
    authorId: '3',
    likes: 342,
    retweets: 112,
    replies: 41,
    hasLiked: false,
    hasRetweeted: true,
    images: ['https://images.pexels.com/photos/417074/pexels-photo-417074.jpeg?auto=compress&cs=tinysrgb&w=500'],
    hashtags: ['remotework', 'worklife'],
  },
];

// Mock Trending Topics
export const trends: Trend[] = [
  {
    id: '1',
    hashtag: 'webdev',
    tweetCount: 12453,
    category: 'Technology',
  },
  {
    id: '2',
    hashtag: 'design',
    tweetCount: 8932,
    category: 'Design',
  },
  {
    id: '3',
    hashtag: 'AI',
    tweetCount: 23567,
    category: 'Technology',
  },
  {
    id: '4',
    hashtag: 'DataScience',
    tweetCount: 18765,
    category: 'Science',
  },
  {
    id: '5',
    hashtag: 'remotework',
    tweetCount: 7654,
    category: 'Work',
  },
];

// Function to get tweet author information
export const getTweetAuthor = (authorId: string): User | undefined => {
  return users.find(user => user.id === authorId);
};

// Function to format tweet date
export const getFormattedTweetDate = (dateString: string): string => {
  return formatDistanceToNow(new Date(dateString));
};