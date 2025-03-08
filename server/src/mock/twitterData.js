// Define mockTweets first since it's used in mockTrackedAccounts
const mockTweets = {
  data: [
    {
      id: '1',
      text: 'Just had a great meeting about Tesla Autopilot progress',
      username: 'elonmusk',
      public_metrics: {
        like_count: 50000,
        retweet_count: 5000,
        reply_count: 3000
      }
    },
    {
      id: '2',
      text: 'SpaceX Starship update coming soon',
      username: 'elonmusk',
      public_metrics: {
        like_count: 75000,
        retweet_count: 8000,
        reply_count: 4500
      }
    }
  ]
};

const mockUserData = {
  data: {
    id: '44196397',
    name: 'Elon Musk',
    username: 'elonmusk',
    description: 'Owner of X'
  }
};

// Now define mockTrackedAccounts using the mockTweets data
const mockTrackedAccounts = [
  {
    username: 'elonmusk',
    twitterId: '44196397',
    lastChecked: new Date().toISOString(),
    keywords: ['Tesla', 'SpaceX'],
    tweets: mockTweets.data
  },
  {
    username: 'BillGates',
    twitterId: '50393960',
    lastChecked: new Date().toISOString(),
    keywords: ['climate', 'health', 'technology'],
    tweets: [
      {
        id: '4',
        text: 'Climate change remains our biggest challenge. We need to act now and invest in clean energy solutions.',
        created_at: '2024-01-20T09:00:00.000Z',
        public_metrics: {
          retweet_count: 3000,
          reply_count: 1500,
          like_count: 30000
        }
      },
      {
        id: '5',
        text: 'Just finished reading a fascinating book about AI and its potential impact on healthcare.',
        created_at: '2024-01-19T14:20:00.000Z',
        public_metrics: {
          retweet_count: 2500,
          reply_count: 1200,
          like_count: 28000
        }
      }
    ]
  },
  {
    username: 'sundarpichai',
    twitterId: '14140253',
    lastChecked: new Date(),
    isActive: true,
    keywords: ['google', 'ai', 'technology'],
    tweets: [
      {
        id: '6',
        text: 'Excited to announce our latest AI breakthrough at Google. This will transform how we interact with technology.',
        created_at: '2024-01-20T08:30:00.000Z',
        public_metrics: {
          retweet_count: 2800,
          reply_count: 1300,
          like_count: 25000
        }
      },
      {
        id: '7',
        text: "Proud of our team's work on making technology more accessible to everyone around the world.",
        created_at: '2024-01-19T16:45:00.000Z',
        public_metrics: {
          retweet_count: 2200,
          reply_count: 1000,
          like_count: 20000
        }
      }
    ]
  },
  {
    username: 'satyanadella',
    twitterId: '20571756',
    lastChecked: new Date(),
    isActive: true,
    keywords: ['microsoft', 'cloud', 'ai'],
    tweets: [
      {
        id: '8',
        text: 'The cloud is transforming every industry. Excited to see how our customers are innovating with Azure.',
        created_at: '2024-01-20T11:15:00.000Z',
        public_metrics: {
          retweet_count: 1800,
          reply_count: 800,
          like_count: 15000
        }
      },
      {
        id: '9',
        text: 'AI and mixed reality are creating new possibilities for collaboration and creativity.',
        created_at: '2024-01-19T13:30:00.000Z',
        public_metrics: {
          retweet_count: 2100,
          reply_count: 900,
          like_count: 18000
        }
      },
      {
        id: '10',
        text: 'Sustainability is core to our mission. Proud to announce new initiatives to reduce our carbon footprint.',
        created_at: '2024-01-18T09:45:00.000Z',
        public_metrics: {
          retweet_count: 1500,
          reply_count: 700,
          like_count: 12000
        }
      }
    ]
  }
];

module.exports = {
  mockTrackedAccounts,
  mockUserData,
  mockTweets
}; 