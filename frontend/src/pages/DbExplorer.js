import React, { useState, useEffect } from 'react';
import axios from 'axios';

const DbExplorer = () => {
  const [activeTab, setActiveTab] = useState('postgres');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // PostgreSQL state
  const [pgTable, setPgTable] = useState('users');
  const [query, setQuery] = useState('SELECT * FROM users LIMIT 10');
  
  // MongoDB state
  const [collection, setCollection] = useState('tweets');
  const [tweetId, setTweetId] = useState('');
  const [userId, setUserId] = useState('');
  const [parentId, setParentId] = useState('');
  
  // Cassandra state
  const [cassandraKeyspace, setCassandraKeyspace] = useState('mini_twitter');
  const [cassandraTable, setCassandraTable] = useState('likes');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      let response;
      const API_URL = 'http://localhost:8000';

      switch (activeTab) {
        case 'postgres':
          response = await axios.post(`${API_URL}/db/postgres`, { query });
          break;

        case 'mongodb':
          if (collection === 'comments') {
            const params = new URLSearchParams();
            if (tweetId) params.append('tweet_id', tweetId);
            if (userId) params.append('user_id', userId);
            if (parentId) params.append('parent_id', parentId);

            response = await axios.get(`${API_URL}/db/mongodb/comments?${params.toString()}`);
          } else {
            response = await axios.get(`${API_URL}/db/mongodb/${collection}`);
          }
          break;

        case 'cassandra':
          response = await axios.get(`${API_URL}/db/cassandra/${cassandraKeyspace}/${cassandraTable}`);
          break;

        default:
          throw new Error('Invalid database tab selected');
      }

      setData(response.data);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(`Failed to fetch data: ${err.response?.data?.detail || err.message}`);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  
  // Table schema information for better UI guidance
  const schemaInfo = {
    postgres: {
      users: ['id', 'username', 'email', 'password_hash', 'created_at', 'bio', 'location', 'website', 'profile_image_url'],
      follows: ['follower_id', 'followee_id', 'created_at']
    },
    mongodb: {
      tweets: ['id', 'user_id', 'content', 'hashtags', 'created_at', 'media_urls', 'retweeted_from', 'original_user_id'],
      comments: ['id', 'tweet_id', 'user_id', 'content', 'created_at', 'parent_id', 'path', 'depth', 'replies_count'],
      users: [] // MongoDB doesn't have users collection
    },
    cassandra: {
      'mini_twitter.likes': ['tweet_id', 'user_id', 'created_at'],
      'mini_twitter.like_counts': ['tweet_id', 'count']
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Database Explorer</h1>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {['postgres', 'mongodb', 'cassandra'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-6 font-medium text-sm ${
                  activeTab === tab
                    ? 'border-b-2 border-blue-500 text-blue-500'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Query Controls */}
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        {activeTab === 'postgres' && (
          <div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Table Reference</label>
              <div className="flex gap-2 mb-2">
                <select 
                  value={pgTable} 
                  onChange={(e) => {
                    setPgTable(e.target.value);
                    // Update query with a basic select for this table
                    setQuery(`SELECT * FROM ${e.target.value} LIMIT 10`);
                  }}
                  className="p-2 border border-gray-300 rounded-md"
                >
                  <option value="users">users</option>
                  <option value="follows">follows</option>
                </select>
                
                <div className="ml-4 text-xs text-gray-500">
                  <p className="font-semibold mb-1">Schema:</p>
                  <p>{schemaInfo.postgres[pgTable]?.join(', ')}</p>
                </div>
              </div>
              

            </div>

            <label className="block text-sm font-medium text-gray-700 mb-2">SQL Query</label>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md mb-4 font-mono"
              rows={3}
            />
          </div>
        )}

        {activeTab === 'mongodb' && (
          <>
            <label className="block text-sm font-medium text-gray-700 mb-2">Collection</label>
            <select
              value={collection}
              onChange={(e) => setCollection(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md mb-4"
            >
              <option value="tweets">tweets</option>
              <option value="comments">comments</option>
              {/* MongoDB doesn't have users collection */}
            </select>
            
            <div className="text-xs text-gray-500 mb-4">
              <p className="font-semibold mb-1">Fields:</p>
              <p>{schemaInfo.mongodb[collection]?.join(', ')}</p>
            </div>

            {collection === 'comments' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">tweet_id</label>
                  <input
                    type="text"
                    value={tweetId}
                    onChange={(e) => setTweetId(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    placeholder="Filter by tweet ID"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">user_id</label>
                  <input
                    type="text"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    placeholder="Filter by user ID"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">parent_id</label>
                  <input
                    type="text"
                    value={parentId}
                    onChange={(e) => setParentId(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    placeholder="For replies to comments"
                  />
                </div>
              </div>
            )}
            
            {collection === 'tweets' && (
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  Note: For tweets, we'll fetch the latest tweets. Use the API for more specific queries.
                </p>
              </div>
            )}
          </>
        )}

        {activeTab === 'cassandra' && (
          <div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Keyspace</label>
                <input
                  type="text"
                  value={cassandraKeyspace}
                  onChange={(e) => setCassandraKeyspace(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Table</label>
                <select
                  value={cassandraTable}
                  onChange={(e) => setCassandraTable(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="likes">likes</option>
                  <option value="like_counts">like_counts</option>
                </select>
              </div>
            </div>
            
            <div className="text-xs text-gray-500 mb-4">
              <p className="font-semibold mb-1">Schema:</p>
              <p>{schemaInfo.cassandra[`${cassandraKeyspace}.${cassandraTable}`]?.join(', ') || 'Schema information not available'}</p>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              Note: For Cassandra, we'll fetch all rows from the selected table (limited to 100).
            </p>
          </div>
        )}

        <button
          onClick={fetchData}
          disabled={loading}
          className={`bg-blue-500 text-white py-2 px-4 rounded-md ${
            loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'
          }`}
        >
          {loading ? 'Loading...' : 'Execute'}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded-md mb-6">
          {error}
        </div>
      )}

      {/* Results Table */}
      <div className="bg-white shadow-md rounded-lg p-6 overflow-x-auto">
        <h2 className="text-xl font-bold mb-4">Results {data.length > 0 ? `(${data.length} rows)` : ''}</h2>

        {loading ? (
          <div className="flex justify-center items-center p-8">
            <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : data.length === 0 ? (
          <p className="text-gray-500">No results to display</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {Object.keys(data[0]).map((key) => (
                    <th
                      key={key}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    {Object.entries(row).map(([key, value], j) => (
                      <td key={`${i}-${j}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {typeof value === 'object' ? (
                          <pre className="font-mono text-xs max-w-xs overflow-x-auto">
                            {JSON.stringify(value, null, 2)}
                          </pre>
                        ) : (
                          String(value !== null && value !== undefined ? value : '')
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DbExplorer;