import React, { useState } from 'react';
import { Tweet } from '../../types';
import { getTweetAuthor, getFormattedTweetDate } from '../../data/mockData';
import { useAppContext } from '../../context/AppContext';
import { MessageSquare, Repeat, Heart, Share } from 'lucide-react';

interface TweetItemProps {
  tweet: Tweet;
}

const TweetItem: React.FC<TweetItemProps> = ({ tweet }) => {
  const { likeTweet, retweetTweet } = useAppContext();
  const author = getTweetAuthor(tweet.authorId);
  const [isExpanded, setIsExpanded] = useState(false);

  if (!author) {
    return null;
  }

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const renderContent = () => {
    // Process hashtags in the content
    const parts = tweet.content.split(/(#\w+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('#')) {
        return (
          <span key={i} className="text-blue-500 hover:underline cursor-pointer">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="p-4 hover:bg-gray-50 transition-colors duration-200 cursor-pointer" onClick={toggleExpanded}>
      <div className="flex">
        <div className="mr-3">
          <img
            src={author.avatar}
            alt={author.name}
            className="w-12 h-12 rounded-full"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center mb-1">
            <span className="font-bold text-gray-900 mr-1 truncate">{author.name}</span>
            {author.verified && (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="#1DA1F2" className="ml-0.5 mr-1">
                <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z" />
              </svg>
            )}
            <span className="text-gray-500 truncate">@{author.username}</span>
            <span className="text-gray-500 mx-1">·</span>
            <span className="text-gray-500">{getFormattedTweetDate(tweet.createdAt)}</span>
          </div>
          <div className="mb-3 text-gray-900">{renderContent()}</div>
          
          {tweet.images && tweet.images.length > 0 && (
            <div className="mb-3 rounded-2xl overflow-hidden">
              <img
                src={tweet.images[0]}
                alt="Tweet media"
                className="w-full h-auto object-cover"
              />
            </div>
          )}
          
          <div className="flex justify-between max-w-md text-gray-500">
            <button 
              className="flex items-center group"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <div className="p-2 rounded-full group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors duration-200">
                <MessageSquare size={18} />
              </div>
              {tweet.replies > 0 && (
                <span className="ml-1 text-sm group-hover:text-blue-500">{tweet.replies}</span>
              )}
            </button>
            
            <button 
              className={`flex items-center group ${tweet.hasRetweeted ? 'text-green-500' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                retweetTweet(tweet.id);
              }}
            >
              <div className={`p-2 rounded-full ${
                tweet.hasRetweeted ? 'bg-green-50' : 'group-hover:bg-green-50 group-hover:text-green-500'
              } transition-colors duration-200`}>
                <Repeat size={18} />
              </div>
              {tweet.retweets > 0 && (
                <span className={`ml-1 text-sm ${
                  tweet.hasRetweeted ? '' : 'group-hover:text-green-500'
                }`}>
                  {tweet.retweets}
                </span>
              )}
            </button>
            
            <button 
              className={`flex items-center group ${tweet.hasLiked ? 'text-red-500' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                likeTweet(tweet.id);
              }}
            >
              <div className={`p-2 rounded-full ${
                tweet.hasLiked ? 'bg-red-50' : 'group-hover:bg-red-50 group-hover:text-red-500'
              } transition-colors duration-200`}>
                <Heart size={18} fill={tweet.hasLiked ? 'currentColor' : 'none'} />
              </div>
              {tweet.likes > 0 && (
                <span className={`ml-1 text-sm ${
                  tweet.hasLiked ? '' : 'group-hover:text-red-500'
                }`}>
                  {tweet.likes}
                </span>
              )}
            </button>
            
            <button 
              className="flex items-center group"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <div className="p-2 rounded-full group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors duration-200">
                <Share size={18} />
              </div>
            </button>
          </div>
        </div>
      </div>
      
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="text-gray-500 mb-3">
            <span className="mr-1">{tweet.replies} Replies</span>·
            <span className="mx-1">{tweet.retweets} Retweets</span>·
            <span className="ml-1">{tweet.likes} Likes</span>
          </div>
          
          <div className="flex text-gray-500 justify-around border-t border-b border-gray-200 py-2">
            <button className="flex items-center hover:text-blue-500 transition-colors duration-200 p-2">
              <MessageSquare size={18} className="mr-2" />
              <span>Reply</span>
            </button>
            
            <button className={`flex items-center ${
              tweet.hasRetweeted ? 'text-green-500' : 'hover:text-green-500'
            } transition-colors duration-200 p-2`}
            onClick={() => retweetTweet(tweet.id)}>
              <Repeat size={18} className="mr-2" />
              <span>{tweet.hasRetweeted ? 'Retweeted' : 'Retweet'}</span>
            </button>
            
            <button className={`flex items-center ${
              tweet.hasLiked ? 'text-red-500' : 'hover:text-red-500'
            } transition-colors duration-200 p-2`}
            onClick={() => likeTweet(tweet.id)}>
              <Heart size={18} fill={tweet.hasLiked ? 'currentColor' : 'none'} className="mr-2" />
              <span>{tweet.hasLiked ? 'Liked' : 'Like'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TweetItem;