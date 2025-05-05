import React, { useState, useEffect } from 'react';
import axios from 'axios';

const DbExplorer = () => {
  const [activeTab, setActiveTab] = useState('postgres');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('SELECT * FROM users LIMIT 10');
  const [collection, setCollection] = useState('tweets');
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
          // This endpoint would need to be added to your API
          response = await axios.post(`${API_URL}/db/postgres`, { query });
          break;
        case 'mongodb':
          response = await axios.get(`${API_URL}/db/mongodb/${collection}`);
          break;
        case 'cassandra':
          response = await axios.get(`${API_URL}/db/cassandra/${cassandraKeyspace}/${cassandraTable}`);
          break;
        default:
          setError('Invalid database selection');
          setLoading(false);
          return;
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

  // This component is just a UI - you'll need to add backend endpoints for it to work
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Database Explorer</h1>
      
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('postgres')}
              className={`py-4 px-6 font-medium text-sm ${
                activeTab === 'postgres'
                  ? 'border-b-2 border-twitter-blue text-twitter-blue'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              PostgreSQL
            </button>
            <button
              onClick={() => setActiveTab('mongodb')}
              className={`py-4 px-6 font-medium text-sm ${
                activeTab === 'mongodb'
                  ? 'border-b-2 border-twitter-blue text-twitter-blue'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              MongoDB
            </button>
            <button
              onClick={() => setActiveTab('cassandra')}
              className={`py-4 px-6 font-medium text-sm ${
                activeTab === 'cassandra'
                  ? 'border-b-2 border-twitter-blue text-twitter-blue'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Cassandra
            </button>
          </nav>
        </div>
      </div>
      
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        {activeTab === 'postgres' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              SQL Query
            </label>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md mb-4 font-mono"
              rows={3}
            />
          </div>
        )}
        
        {activeTab === 'mongodb' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Collection
            </label>
            <select
              value={collection}
              onChange={(e) => setCollection(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md mb-4"
            >
              <option value="tweets">tweets</option>
              <option value="users">users</option>
            </select>
          </div>
        )}
        
        {activeTab === 'cassandra' && (
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Keyspace
              </label>
              <input
                type="text"
                value={cassandraKeyspace}
                onChange={(e) => setCassandraKeyspace(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Table
              </label>
              <input
                type="text"
                value={cassandraTable}
                onChange={(e) => setCassandraTable(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
        )}
        
        <button
          onClick={fetchData}
          disabled={loading}
          className={`bg-twitter-blue text-white py-2 px-4 rounded-md ${
            loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'
          }`}
        >
          {loading ? 'Loading...' : 'Execute'}
        </button>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded-md mb-6">
          {error}
        </div>
      )}
      
      <div className="bg-white shadow-md rounded-lg p-6 overflow-x-auto">
        <h2 className="text-xl font-bold mb-4">Results</h2>
        
        {loading ? (
          <div className="flex justify-center items-center p-8">
            <svg className="animate-spin h-8 w-8 text-twitter-blue" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        ) : data.length === 0 ? (
          <p className="text-gray-500">No results to display</p>
        ) : (
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
                <tr key={i}>
                  {Object.values(row).map((value, j) => (
                    <td key={j} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      
      <div className="mt-6 bg-yellow-50 border-l-4 border-yellow-400 p-4">
        <p className="text-yellow-700">
          <strong>Note:</strong> To make this page functional, you need to add the corresponding API endpoints to your backend. 
          These endpoints should allow querying your databases securely.
        </p>
      </div>
    </div>
  );
};

export default DbExplorer;
