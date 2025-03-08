import React, { useState } from 'react';

const TwitterTester = () => {
  const [tweetText, setTweetText] = useState('');
  const [replyToId, setReplyToId] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);

  const postTweet = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/twitter/tweet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          text: tweetText,
          replyToId: replyToId || null 
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);
      
      setResult(data);
    } catch (error) {
      console.error('Error:', error);
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const testTwitterConnection = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/twitter/test');
      const data = await response.json();
      setConnectionStatus(data);
    } catch (error) {
      console.error('Error:', error);
      setConnectionStatus({ success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="twitter-tester">
      <h2>Test Twitter Integration</h2>
      <button 
        onClick={testTwitterConnection}
        disabled={loading}
        className="test-connection-btn"
      >
        Test Twitter Connection
      </button>
      {connectionStatus && (
        <div className="connection-status">
          <h3>Connection Test Result:</h3>
          <pre>{JSON.stringify(connectionStatus, null, 2)}</pre>
        </div>
      )}
      <div className="input-group">
        <label>Tweet Text:</label>
        <textarea
          value={tweetText}
          onChange={(e) => setTweetText(e.target.value)}
          placeholder="Enter tweet text..."
        />
      </div>
      <div className="input-group">
        <label>Reply to Tweet ID (optional):</label>
        <input
          type="text"
          value={replyToId}
          onChange={(e) => setReplyToId(e.target.value)}
          placeholder="Enter tweet ID to reply to..."
        />
      </div>
      <button 
        onClick={postTweet}
        disabled={loading || !tweetText}
      >
        {loading ? 'Posting...' : 'Post Tweet'}
      </button>
      {result && (
        <div className="result">
          <h3>Result:</h3>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default TwitterTester; 