# Quick Start Guide - 100% FREE Setup

## Get Your MSFT Stock Forecast Service Running in 5 Minutes (Completely Free!)

### Step 1: Get Your FREE Google Gemini API Key

1. Go to https://aistudio.google.com/app/apikey
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key - you'll need it in Step 3

**Note:** The free tier gives you 1,500 requests/day. You only need ~1 per day, so you're covered!

### Step 2: Set Up Gmail App Password

1. Go to your Google Account: https://myaccount.google.com/
2. Enable 2-Factor Authentication (Security → 2-Step Verification)
3. Go to App Passwords: https://myaccount.google.com/apppasswords
4. Select "Mail" and "Other (Custom name)"
5. Name it "Stock Forecast Service"
6. Copy the 16-character password

### Step 3: Install and Configure

```bash
# Install dependencies
npm install

# Create your .env file
cp .env.example .env

# Edit .env file and add:
# GOOGLE_API_KEY=your_key_from_step_1
# EMAIL_USER=your-email@gmail.com
# EMAIL_PASSWORD=your_app_password_from_step_2
```

### Step 4: Test It Locally

```bash
# Start the service
npm start

# In another terminal, test it:
curl -X POST http://localhost:3000/send-forecast
```

You should receive an email with today's MSFT forecast!

### Step 5: Deploy for FREE (Choose One)

#### Option A: Railway (Easiest - Recommended)

1. Go to https://railway.app/
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Connect your repo (or upload the files)
5. Add environment variables:
   - `GOOGLE_API_KEY`
   - `EMAIL_USER`
   - `EMAIL_PASSWORD`
6. Deploy! ✨

Railway's free tier ($5 credit/month) is more than enough for this service.

#### Option B: Fly.io (Always Free)

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Launch app
fly launch

# Set secrets
fly secrets set GOOGLE_API_KEY=your_key
fly secrets set EMAIL_USER=your_email
fly secrets set EMAIL_PASSWORD=your_password

# Deploy
fly deploy
```

#### Option C: Render (Free Tier)

1. Go to https://render.com/
2. Sign up
3. Click "New" → "Web Service"
4. Connect your GitHub repo
5. Add environment variables
6. Deploy!

**Note:** Render's free tier sleeps after 15 minutes of inactivity, which might cause missed emails. Use Railway or Fly.io instead.

### Step 6: Verify It's Working

After deployment, check your service:

```bash
# Replace with your deployed URL
curl https://your-app.railway.app/health
```

You should see:
```json
{
  "status": "running",
  "schedule": "8:30 AM EST (Monday-Friday)",
  "nextExecution": "..."
}
```

## That's It! 🎉

Your service is now running 24/7 and will send you MSFT stock forecasts every trading day at 8:30 AM EST.

## Total Cost: $0.00/month

- ✅ Google Gemini API: FREE
- ✅ Gmail: FREE
- ✅ Railway/Fly.io: FREE

## Customization

### Change the Stock Symbol

Edit `server.js` and replace `MSFT` with any stock symbol (AAPL, GOOGL, TSLA, etc.)

### Change the Email Time

Edit `server.js`:
```javascript
const EMAIL_SEND_HOUR = 7; // Change to 7:30 AM
const EMAIL_SEND_MINUTE = 30;
```

### Change the Recipient

Edit `server.js`:
```javascript
const EMAIL_RECIPIENT = 'newemail@example.com';
```

## Need Help?

Check the main README.md for detailed documentation and troubleshooting.

## Pro Tips

1. **Test before deploying**: Always test locally first
2. **Check logs**: Use `fly logs` or Railway dashboard to monitor
3. **Set up monitoring**: Use UptimeRobot (free) to ping your `/health` endpoint
4. **Backup your .env**: Store your keys securely (don't commit to Git!)

Happy forecasting! 📈
