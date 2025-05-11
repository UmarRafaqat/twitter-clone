// frontend/src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Add Twitter blue color to Tailwind config
// Add to your tailwind.config.js:
// theme: {
//   extend: {
//     colors: {
//       'twitter-blue': '#1DA1F2',
//       'twitter-blue-dark': '#1a91da',
//     },
//   },
// },

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);