import React, { useState } from 'react';
import { Heart, MessageCircle, Share, MoreHorizontal } from 'lucide-react';
import tweetService from '../services/tweet.service';
import moment from 'moment';

const Tweet = ({ tweet }) => {
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(tweet.likes_count || 0);

  const handleLike = async () => {
    try {
      if (!isLiked) {
        await tweetService.likeTweet(tweet.id);
        setIsLiked(true);
        setLikesCount(likesCount + 1);
      }
    } catch (error) {
      console.error('Error liking tweet:', error);
    }
  };

  const formatTimeAgo = (dateString) => {
    return moment(dateString).fromNow();
  };

  const formatContent = (content) => {
    // Highlight hashtags
    return content.split(' ').map((word, i) => {
      if (word.startsWith('#')) {
        return <span key={i} className="text-twitter-blue">{word} </span>;
      }
      return word + ' ';
    });
  };

  return (
    <div className="p-4 border-b border-gray-200 hover:bg-gray-50">
      <div className="flex">
        <div className="flex-shrink-0">
          <div className="h-12 w-12 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-bold text-xl">
            {tweet.username && tweet.username[0].toUpperCase()}
          </div>
        </div>
        <div className="ml-3 flex-1">
          <div className="flex items-center">
            <span className="font-bold text-gray-900">{tweet.username}</span>
            <span className="ml-2 text-gray-500">@{tweet.username}</span>
            <span className="mx-1 text-gray-500">·</span>
            <span className="text-gray-500">{formatTimeAgo(tweet.created_at)}</span>
            <button className="ml-auto text-gray-500 hover:text-twitter-blue">
              <MoreHorizontal size={18} />
            </button>
          </div>
          <p className="mt-1 text-gray-800">{formatContent(tweet.content)}</p>
          
          <div className="mt-3 flex justify-between max-w-md">
            <button className="flex items-center text-gray-500 hover:text-twitter-blue group">
              <div className="p-2 rounded-full group-hover:bg-blue-50">
                <MessageCircle size={18} />
              </div>
              <span className="ml-1 text-sm">{tweet.replies_count || 0}</span>
            </button>
            
            <button className="flex items-center text-gray-500 hover:text-green-500 group">
              <div className="p-2 rounded-full group-hover:bg-green-50">
                <Share size={18} />
              </div>
              <span className="ml-1 text-sm">{tweet.retweets_count || 0}</span>
            </button>
            
            <button 
              className={`flex items-center ${isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'} group`}
              onClick={handleLike}
            >
              <div className={`p-2 rounded-full ${isLiked ? 'bg-red-50' : 'group-hover:bg-red-50'}`}>
                <Heart size={18} fill={isLiked ? "currentColor" : "none"} />
              </div>
              <span className="ml-1 text-sm">{likesCount}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tweet;
