import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { Tweet, TimelineType } from '../types';
import { tweets as initialTweets, users } from '../data/mockData';

interface AppContextProps {
  currentUser: User | null;
  tweets: Tweet[];
  activeTimeline: TimelineType;
  setActiveTimeline: (timeline: TimelineType) => void;
  addTweet: (content: string) => void;
  likeTweet: (tweetId: string) => void;
  retweetTweet: (tweetId: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AppContext = createContext<AppContextProps | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

const supabase: SupabaseClient = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [tweets, setTweets] = useState<Tweet[]>(initialTweets);
  const [activeTimeline, setActiveTimeline] = useState<TimelineType>('home');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    // Check for existing session
    const session = supabase.auth.getSession();
    if (session) {
      setIsAuthenticated(true);
      setCurrentUser(session.data?.session?.user || null);
    }

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
      setCurrentUser(session?.user || null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const register = async (email: string, password: string, name: string) => {
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    });
    if (error) throw error;
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const addTweet = (content: string) => {
    const hashtagRegex = /#(\w+)/g;
    const matches = content.match(hashtagRegex) || [];
    const hashtags = matches.map(tag => tag.slice(1));

    const newTweet: Tweet = {
      id: (tweets.length + 1).toString(),
      content,
      createdAt: new Date().toISOString(),
      authorId: currentUser?.id || '',
      likes: 0,
      retweets: 0,
      replies: 0,
      hasLiked: false,
      hasRetweeted: false,
      hashtags,
    };

    setTweets([newTweet, ...tweets]);
  };

  const likeTweet = (tweetId: string) => {
    setTweets(prevTweets =>
      prevTweets.map(tweet => {
        if (tweet.id === tweetId) {
          return {
            ...tweet,
            likes: tweet.hasLiked ? tweet.likes - 1 : tweet.likes + 1,
            hasLiked: !tweet.hasLiked,
          };
        }
        return tweet;
      })
    );
  };

  const retweetTweet = (tweetId: string) => {
    setTweets(prevTweets =>
      prevTweets.map(tweet => {
        if (tweet.id === tweetId) {
          return {
            ...tweet,
            retweets: tweet.hasRetweeted ? tweet.retweets - 1 : tweet.retweets + 1,
            hasRetweeted: !tweet.hasRetweeted,
          };
        }
        return tweet;
      })
    );
  };

  const contextValue: AppContextProps = {
    currentUser,
    tweets,
    activeTimeline,
    setActiveTimeline,
    addTweet,
    likeTweet,
    retweetTweet,
    searchQuery,
    setSearchQuery,
    isAuthenticated,
    login,
    register,
    logout,
  };

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
};