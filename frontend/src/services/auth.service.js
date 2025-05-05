import axios from 'axios';

const API_URL = 'http://localhost:8000';

const register = (username, email, password) => {
  return axios.post(`${API_URL}/register`, {
    username,
    email,
    password,
  });
};

const login = async (username, password) => {
  const formData = new URLSearchParams();
  formData.append('username', username);
  formData.append('password', password);

  const response = await axios.post(`${API_URL}/token`, formData, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  if (response.data.access_token) {
    localStorage.setItem('user', JSON.stringify(response.data));
  }

  return response.data;
};

const logout = () => {
  localStorage.removeItem('user');
};

const getCurrentUser = () => {
  return JSON.parse(localStorage.getItem('user'));
};

const isAuthenticated = () => {
  const user = getCurrentUser();
  return !!user;
};

const authService = {
  register,
  login,
  logout,
  getCurrentUser,
  isAuthenticated,
};

export default authService;
