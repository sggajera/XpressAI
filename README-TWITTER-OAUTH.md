# Twitter OAuth Integration

This document outlines the Twitter OAuth 2.0 integration implemented in the application, which allows users to connect their Twitter accounts and post tweets directly from the application.

## Features

- Connect multiple Twitter accounts to a user profile
- View connected Twitter accounts
- Disconnect Twitter accounts
- Post tweets as a connected user
- Reply to existing tweets

## Implementation Details

### Server-Side Components

1. **Twitter OAuth Service** (`server/src/services/twitterOAuth.js`)
   - Handles OAuth 2.0 flow with Twitter
   - Manages user tokens and refreshes them when needed
   - Provides functions for posting tweets and managing accounts

2. **Twitter OAuth Routes** (`server/src/routes/api.js`)
   - `/twitter/oauth/login` - Initiates the OAuth flow
   - `/twitter/oauth/callback` - Handles the OAuth callback
   - `/twitter/accounts` - Gets user's connected Twitter accounts
   - `/twitter/accounts/:twitterId` - Disconnects a Twitter account
   - `/twitter/tweet-as-user` - Posts a tweet as the user

3. **Session Support** (`server/src/index.js`)
   - Added express-session middleware for managing OAuth state

### Client-Side Components

1. **Twitter Connect Component** (`client/src/components/Profile/TwitterConnect.jsx`)
   - Displays connected Twitter accounts
   - Provides UI for connecting and disconnecting accounts
   - Handles OAuth flow initiation and callback

2. **Post As User Component** (`client/src/components/Dashboard/PostAsUser.jsx`)
   - Allows users to post tweets from connected accounts
   - Provides UI for selecting accounts and entering tweet content
   - Supports replying to existing tweets

3. **Profile Integration** (`client/src/components/Profile/Profile.jsx`)
   - Integrates the Twitter Connect component into the user profile

4. **Dashboard Integration** (`client/src/components/Dashboard/Dashboard.jsx`)
   - Integrates the Post As User component into the dashboard

## Environment Variables

The following environment variables need to be set for Twitter OAuth to work:

```
TWITTER_CLIENT_ID=your_twitter_client_id
TWITTER_CLIENT_SECRET=your_twitter_client_secret
TWITTER_CALLBACK_URL=http://localhost:8081/api/twitter/oauth/callback
```

## OAuth Flow

1. User clicks "Connect Twitter Account" button
2. Application generates a state parameter and code verifier
3. User is redirected to Twitter's authorization page
4. User authorizes the application
5. Twitter redirects back to the application's callback URL
6. Application verifies the state parameter and exchanges the code for tokens
7. Tokens are stored securely in the database
8. User can now post tweets from the connected account

## Security Considerations

- State parameters are used to prevent CSRF attacks
- Tokens are stored securely in the database
- Sessions are used to maintain state during the OAuth flow
- Refresh tokens are used to maintain access without requiring re-authorization

## Troubleshooting

### Common Issues

1. **"Something went wrong" error from Twitter**
   - Ensure your Twitter Developer App has the correct callback URL configured
   - The callback URL in your .env file must exactly match the one in your Twitter Developer Portal
   - Make sure your app has the required permissions (read/write)

2. **Session Issues**
   - Check that express-session is properly configured
   - Ensure cookies are being set correctly (check browser dev tools)
   - Verify that CORS is configured to allow credentials

3. **Callback URL Problems**
   - The callback URL should be: `http://localhost:8081/api/twitter/oauth/callback` for local development
   - For production, use your domain: `https://yourdomain.com/api/twitter/oauth/callback`
   - Update both your .env file and Twitter Developer Portal settings

### Debugging Steps

1. Check server logs for error messages
2. Verify that session data is being saved correctly
3. Ensure the Twitter API credentials are correct
4. Test the callback URL directly to ensure it's accessible
5. Check browser console for any client-side errors

### Twitter Developer Portal Setup

1. Create a project and app at [developer.twitter.com](https://developer.twitter.com)
2. Set the app permissions to Read and Write
3. Configure User authentication settings:
   - Enable OAuth 2.0
   - Set Type of App to "Web App"
   - Add the callback URL: `http://localhost:8081/api/twitter/oauth/callback`
   - Enable "Request email from users"
4. Save your Client ID and Client Secret to your .env file 