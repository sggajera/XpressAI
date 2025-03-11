// Define mockTweets first since it's used in mockTrackedAccounts
const mockTweets = {
  data: [
    {
      id: 'tweet1',
      text: 'Just launched our new AI product! Check it out at https://example.com #AI #Tech',
      created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      public_metrics: {
        like_count: 100,
        retweet_count: 50,
        reply_count: 25
      }
    },
    {
      id: 'tweet2',
      text: 'Looking for feedback on our latest feature. What do you think about the new UI? #UX #ProductDevelopment',
      created_at: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
      public_metrics: {
        like_count: 200,
        retweet_count: 75,
        reply_count: 30
      }
    },
    {
      id: 'tweet3',
      text: 'Excited to announce we\'re hiring! Looking for talented developers to join our team. #Hiring #TechJobs',
      created_at: new Date(Date.now() - 10800000).toISOString(), // 3 hours ago
      public_metrics: {
        like_count: 150,
        retweet_count: 60,
        reply_count: 20
      }
    }
  ]
};

const mockUserData = {
  data: {
    id: 'mock_user_id',
    name: 'Tech Company',
    username: 'techcompany',
    description: 'Leading innovation in AI and technology solutions'
  }
};

// Now define mockTrackedAccounts using the mockTweets data
const mockTrackedAccounts = [
  {
    _id: 'mock_account_1',
    username: 'techcompany',
    twitterId: 'mock_id_1',
    lastChecked: new Date().toISOString(),
    keywords: ['AI', 'technology', 'innovation'],
    tweets: mockTweets.data,
    callCount: 15,
    user: 'mock_user_id'
  },
  {
    _id: 'mock_account_2',
    username: 'competitor',
    twitterId: 'mock_id_2',
    lastChecked: new Date().toISOString(),
    keywords: ['tech', 'startup', 'AI'],
    tweets: mockTweets.data.map(tweet => ({
      ...tweet,
      id: `competitor_${tweet.id}`,
      text: tweet.text.replace('our', 'their')
    })),
    callCount: 8,
    user: 'mock_user_id'
  }
];

module.exports = {
  mockTrackedAccounts,
  mockUserData,
  mockTweets
}; 