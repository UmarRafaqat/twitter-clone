import React, { useState, useRef } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Image, MapPin, Calendar, Smile } from 'lucide-react';

const TweetComposer: React.FC = () => {
  const [tweetContent, setTweetContent] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { addTweet, currentUser } = useAppContext();

  if (!currentUser) {
    return null;
  }

  const handleTweetSubmit = () => {
    if (tweetContent.trim()) {
      addTweet(tweetContent);
      setTweetContent('');
      setIsFocused(false);
    }
  };

  const focusTextarea = () => {
    setIsFocused(true);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Submit on Ctrl+Enter or Cmd+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      handleTweetSubmit();
    }
  };

  return (
    <div className="border-b border-gray-200 p-4">
      <div className="flex">
        <img
          src={currentUser.avatar}
          alt={currentUser.name}
          className="w-12 h-12 rounded-full mr-4"
        />
        <div className="flex-1">
          <div 
            className={`border-b border-transparent ${isFocused ? 'border-gray-200' : ''}`}
            onClick={focusTextarea}
          >
            <textarea
              ref={textareaRef}
              value={tweetContent}
              onChange={(e) => setTweetContent(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={handleKeyDown}
              placeholder="What's happening?"
              className="w-full focus:outline-none resize-none overflow-hidden placeholder-gray-500 text-lg py-2"
              rows={isFocused ? 4 : 2}
            />
          </div>
          
          {isFocused && (
            <div className="text-sm text-blue-500 font-bold mb-3">
              <span className="cursor-pointer hover:underline">Everyone can reply</span>
            </div>
          )}
          
          <div className="flex justify-between items-center mt-3">
            <div className="flex space-x-2">
              <button className="p-2 rounded-full text-blue-500 hover:bg-blue-50 transition-colors duration-200">
                <Image size={18} />
              </button>
              <button className="p-2 rounded-full text-blue-500 hover:bg-blue-50 transition-colors duration-200">
                <MapPin size={18} />
              </button>
              <button className="p-2 rounded-full text-blue-500 hover:bg-blue-50 transition-colors duration-200">
                <Smile size={18} />
              </button>
              <button className="p-2 rounded-full text-blue-500 hover:bg-blue-50 transition-colors duration-200">
                <Calendar size={18} />
              </button>
            </div>
            
            <button
              onClick={handleTweetSubmit}
              disabled={!tweetContent.trim()}
              className={`px-4 py-1.5 rounded-full font-bold text-white transition-colors duration-200 ${
                tweetContent.trim() ? 'bg-blue-500 hover:bg-blue-600' : 'bg-blue-300 cursor-not-allowed'
              }`}
            >
              Tweet
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TweetComposer;