# Deployment Guide

This game has two parts that can be deployed separately:
1. **Frontend (Static Files)** - The game interface
2. **Multiplayer Server** - WebSocket server for multiplayer matchmaking

## Option 1: Single-Player Only (Static Deployment)

Deploy to any static hosting service (Vercel, Netlify, GitHub Pages, etc.):

### Vercel
```bash
vercel
```

### Netlify
```bash
netlify deploy
```

The game will work in single-player mode only. The multiplayer button will show an error message.

## Option 2: Full Multiplayer Support

Deploy the frontend and backend separately:

### Step 1: Deploy the Multiplayer Server

The multiplayer server needs to be deployed to a service that supports WebSockets and Node.js.

#### Option A: Railway.app (Recommended)

1. Sign up at https://railway.app
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Railway will auto-detect `server.js` and deploy it
5. Note the deployment URL (e.g., `https://your-app.railway.app`)

#### Option B: Render.com

1. Sign up at https://render.com
2. Click "New +" → "Web Service"
3. Connect your repository
4. Configure:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: Node
5. Click "Create Web Service"
6. Note the deployment URL (e.g., `https://your-app.onrender.com`)

#### Option C: Fly.io

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Deploy
fly launch
fly deploy
```

Note the deployment URL.

### Step 2: Deploy the Frontend

1. Update `game.js` with your multiplayer server URL:
   ```javascript
   const MULTIPLAYER_SERVER_URL = 'https://your-multiplayer-server.com';
   ```

2. Deploy the static files to Vercel/Netlify:
   ```bash
   vercel
   # or
   netlify deploy --prod
   ```

### Step 3: Test

1. Open your deployed game URL
2. Click "Multiplayer"
3. Open another browser window/tab or share with a friend
4. Both players click "Multiplayer"
5. You should be matched and the game begins!

## Environment Variables

For the multiplayer server, you can optionally set:

- `PORT` - The port to run on (default: 3000)

## CORS Configuration

The server is configured to accept connections from any origin. For production, you may want to restrict this in `server.js`:

```javascript
const io = socketIo(server, {
  cors: {
    origin: "https://your-frontend-domain.com",
    methods: ["GET", "POST"]
  }
});
```

## Troubleshooting

### "Multiplayer server is not available"
- Ensure your multiplayer server is deployed and running
- Check that `MULTIPLAYER_SERVER_URL` in `game.js` is set correctly
- Verify the server URL is accessible (try opening it in a browser)
- Check browser console for connection errors

### Players can't find each other
- Make sure both players are connected to the same server
- Check server logs for matchmaking activity
- Try refreshing both browser windows

### Connection keeps dropping
- Some hosting services may have timeout limits for idle connections
- Check if your hosting service supports WebSockets (Railway and Render do)
- Consider implementing a reconnection strategy with longer timeouts
