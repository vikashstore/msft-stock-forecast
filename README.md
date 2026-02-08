# MSFT Stock Forecast Email Service (100% FREE)

Automated daily email service that sends Microsoft (MSFT) stock forecasts to aitechdev2@gmail.com every trading day at 8:30 AM EST (1 hour before market opens).

**🎉 Completely FREE to run!** Uses Google Gemini API (free tier) + free email + free hosting.

## Features

- 🤖 AI-powered stock forecasts using Google Gemini with real-time web search (FREE!)
- 📧 Automated daily emails with professional HTML formatting
- ⏰ Smart scheduling (Monday-Friday only, skips weekends)
- 🔄 Manual trigger option via API endpoint
- 📊 Includes current price, trends, news, and predictions
- 🚀 Easy deployment to cloud platforms
- 💰 **100% FREE** - No API costs, no hosting costs

## Quick Start

### Prerequisites

- Node.js 18 or higher
- Google Gemini API key ([get one FREE here](https://aistudio.google.com/app/apikey))
- Gmail account with App Password enabled

### Installation

1. **Clone or download the files**

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
```

Edit `.env` and add your credentials:
```env
GOOGLE_API_KEY=your_google_api_key_here
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your_gmail_app_password
PORT=3000
```

### Getting a FREE Google Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the API key to `.env`
5. That's it! Free tier includes 1,500 requests/day (way more than you need)

### Setting Up Gmail App Password

1. Enable 2-Factor Authentication on your Google account
2. Go to [App Passwords](https://myaccount.google.com/apppasswords)
3. Select "Mail" and "Other (Custom name)"
4. Name it "MSFT Forecast Service"
5. Copy the 16-character password to `.env`

### Running Locally

**Development mode (with auto-restart):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The service will:
- Start the server on port 3000
- Schedule daily emails for 8:30 AM EST (Monday-Friday)
- Display next execution time in console

### Testing

**Check service status:**
```bash
curl http://localhost:3000/health
```

**Manually send a test forecast:**
```bash
curl -X POST http://localhost:3000/send-forecast
```

**Generate forecast without sending email:**
```bash
curl http://localhost:3000/test-forecast
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Check service status and next execution time |
| POST | `/send-forecast` | Manually trigger forecast email |
| GET | `/test-forecast` | Generate forecast preview (no email) |

## Deployment Options

### Option 1: Railway (Recommended - Free Tier Available)

1. Create account at [Railway.app](https://railway.app/)
2. Click "New Project" → "Deploy from GitHub repo"
3. Add environment variables in Railway dashboard
4. Deploy! Service runs 24/7 automatically

### Option 2: Heroku

```bash
# Install Heroku CLI
heroku login
heroku create msft-forecast-service

# Set environment variables
heroku config:set ANTHROPIC_API_KEY=your_key
heroku config:set EMAIL_USER=your_email
heroku config:set EMAIL_PASSWORD=your_password

# Deploy
git push heroku main
```

### Option 3: AWS EC2

1. Launch Ubuntu EC2 instance
2. SSH into instance
3. Install Node.js and clone repo
4. Set up PM2 for process management:
```bash
npm install -g pm2
pm2 start server.js --name msft-forecast
pm2 startup
pm2 save
```

### Option 4: Digital Ocean App Platform

1. Create new app from GitHub repo
2. Add environment variables
3. Deploy with one click

### Option 5: VPS (DigitalOcean, Linode, etc.)

```bash
# On your VPS
git clone <your-repo>
cd msft-stock-forecast-emailer
npm install
npm install -g pm2

# Create .env file with your credentials
nano .env

# Start with PM2
pm2 start server.js --name msft-forecast
pm2 startup
pm2 save

# Check logs
pm2 logs msft-forecast
```

## Email Schedule

- **Time:** 8:30 AM EST
- **Days:** Monday through Friday (trading days only)
- **Timezone:** America/New_York
- **Market Opens:** 9:30 AM EST

The service automatically skips weekends and holidays.

## Email Format

Each email includes:

- **Current Stock Price** - Latest MSFT price and after-hours data
- **Previous Day Performance** - Percentage change from previous close
- **Key Factors** - Major news and events affecting the stock
- **Technical Analysis** - Chart patterns and indicators
- **Market Sentiment** - Overall market mood and trends
- **Price Prediction** - Forecast for today's trading session
- **Relevant News** - Latest headlines affecting Microsoft

## Customization

### Change Email Time

Edit `server.js`:
```javascript
const EMAIL_SEND_HOUR = 7; // Send at 7:30 AM instead
const EMAIL_SEND_MINUTE = 30;
```

### Change Recipient

Edit `server.js`:
```javascript
const EMAIL_RECIPIENT = 'newemail@example.com';
```

### Use Different Email Service

Replace the `transporter` configuration in `server.js`:

**SendGrid:**
```javascript
const transporter = nodemailer.createTransport({
  host: 'smtp.sendgrid.net',
  port: 587,
  auth: {
    user: 'apikey',
    pass: process.env.SENDGRID_API_KEY
  }
});
```

**AWS SES:**
```javascript
const transporter = nodemailer.createTransport({
  SES: new AWS.SES({ region: 'us-east-1' })
});
```

## Monitoring

### Check if Service is Running

```bash
curl http://your-server:3000/health
```

### View Logs (if using PM2)

```bash
pm2 logs msft-forecast
```

### Set Up Alerts

Use a monitoring service like:
- UptimeRobot (free)
- Pingdom
- StatusCake

Point it to your `/health` endpoint.

## Troubleshooting

### Emails Not Sending

1. **Check Gmail App Password**
   - Make sure 2FA is enabled
   - Generate new App Password
   - Copy exactly (no spaces)

2. **Check Server Timezone**
   ```bash
   # On your server
   timedatectl
   ```

3. **Test Email Manually**
   ```bash
   curl -X POST http://localhost:3000/send-forecast
   ```

### API Key Issues

- Verify key at [Google AI Studio](https://aistudio.google.com/app/apikey)
- Check for extra spaces in `.env` file
- Make sure you're using GOOGLE_API_KEY not ANTHROPIC_API_KEY
- Regenerate key if needed (it's free!)

### Cron Job Not Running

- Check server time: `date`
- Verify timezone: `timedatectl`
- Check logs for errors

## Cost Estimation

### Google Gemini API
- ✅ **100% FREE**
- Free tier: 1,500 requests/day
- You only need ~20 requests/month
- **Monthly cost: $0.00**

### Email Service
- Gmail: Free (if sending < 500/day)
- SendGrid: Free tier (100 emails/day)
- AWS SES: $0.10 per 1,000 emails
- **Monthly cost: $0.00**

### Hosting (All Free Options)
- Railway: Free tier ($5 credit/month, uses ~$0-1)
- Fly.io: Free tier (3 shared VMs)
- Render: Free tier (sleeps after inactivity)
- Oracle Cloud: Always free tier (2 VMs forever)
- **Monthly cost: $0.00**

**🎉 Total cost: $0.00/month - Completely FREE!**

## Security Notes

- Never commit `.env` file to Git
- Use environment variables for all secrets
- Keep dependencies updated: `npm update`
- Use HTTPS in production
- Consider IP whitelisting for production API

## Support

For issues or questions:
1. Check the logs: `pm2 logs msft-forecast`
2. Test the `/health` endpoint
3. Try manual trigger: `curl -X POST .../send-forecast`

## License

MIT

## Disclaimer

This tool is for informational purposes only. The forecasts provided should not be considered financial advice. Always do your own research and consult with a qualified financial advisor before making investment decisions.

---

**Made with ❤️ for automated stock market insights**
