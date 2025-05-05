import axios from 'axios';
import authService from './auth.service';

const API_URL = 'http://localhost:8000';

// Helper to set auth token in requests
const authHeader = () => {
  const user = authService.getCurrentUser();
  if (user && user.access_token) {
    return { Authorization: `Bearer ${user.access_token}` };
  } else {
    return {};
  }
};

const getTimeline = () => {
  return axios.get(`${API_URL}/timeline`, { headers: authHeader() });
};

const createTweet = (content) => {
  return axios.post(`${API_URL}/tweets`, { content }, { headers: authHeader() });
};

const likeTweet = (tweetId) => {
  return axios.post(`${API_URL}/tweets/${tweetId}/like`, {}, { headers: authHeader() });
};

const getTrendingHashtags = () => {
  return axios.get(`${API_URL}/trending`);
};

const tweetService = {
  getTimeline,
  createTweet,
  likeTweet,
  getTrendingHashtags,
};

export default tweetService;
