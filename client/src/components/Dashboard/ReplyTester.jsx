import React, { useState } from 'react';

const ReplyTester = () => {
  const [tweet, setTweet] = useState('');
  const [context, setContext] = useState('Be professional and friendly');
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(false);

  const generateReply = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/test-reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tweet, context }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);
      
      setReply(data.reply);
    } catch (error) {
      console.error('Error:', error);
      setReply('Error generating reply');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reply-tester">
      <h2>Test Reply Generation</h2>
      <div className="input-group">
        <label>Tweet:</label>
        <textarea
          value={tweet}
          onChange={(e) => setTweet(e.target.value)}
          placeholder="Enter a tweet to reply to..."
        />
      </div>
      <div className="input-group">
        <label>Context:</label>
        <textarea
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder="Enter context for the AI..."
        />
      </div>
      <button 
        onClick={generateReply}
        disabled={loading || !tweet}
      >
        {loading ? 'Generating...' : 'Generate Reply'}
      </button>
      {reply && (
        <div className="generated-reply">
          <h3>Generated Reply:</h3>
          <p>{reply}</p>
        </div>
      )}
    </div>
  );
};

export default ReplyTester; 