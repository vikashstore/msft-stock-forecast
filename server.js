// server.js - Top 10 S&P 500 Stock Forecast Email Service
// Install dependencies: npm install express node-cron axios @google/generative-ai dotenv

require('dotenv').config();
const express = require('express');
const cron = require('node-cron');
const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration
// EMAIL_RECIPIENTS can be a comma-separated list in environment variable
// Example: "email1@example.com,email2@example.com,email3@example.com"
const EMAIL_RECIPIENTS = process.env.EMAIL_RECIPIENTS 
  ? process.env.EMAIL_RECIPIENTS.split(',').map(email => email.trim())
  : ['aitechdev2@gmail.com']; // Default if not set

const MARKET_OPEN_HOUR = 9; // 9:30 AM EST
const MARKET_OPEN_MINUTE = 30;
const EMAIL_SEND_HOUR = 8; // 8:30 AM EST (1 hour before market)
const EMAIL_SEND_MINUTE = 30;

// Top 10 S&P 500 stocks by market cap
const TOP_STOCKS = [
  { ticker: 'AAPL', name: 'Apple Inc.' },
  { ticker: 'MSFT', name: 'Microsoft Corporation' },
  { ticker: 'NVDA', name: 'NVIDIA Corporation' },
  { ticker: 'GOOGL', name: 'Alphabet Inc.' },
  { ticker: 'AMZN', name: 'Amazon.com Inc.' },
  { ticker: 'META', name: 'Meta Platforms Inc.' },
  { ticker: 'TSLA', name: 'Tesla Inc.' },
  { ticker: 'BRK-B', name: 'Berkshire Hathaway Inc.' },
  { ticker: 'LLY', name: 'Eli Lilly and Company' },
  { ticker: 'JPM', name: 'JPMorgan Chase & Co.' }
];

// Initialize Google Gemini client
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// Note: Using SendGrid Web API instead of SMTP for Railway compatibility
// No transporter needed - we'll use axios to call SendGrid API directly

// Function to fetch stock data for a single ticker
async function fetchStockData(ticker) {
  try {
    const stockResponse = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}`);
    const quote = stockResponse.data.chart.result[0].meta;
    const currentPrice = quote.regularMarketPrice.toFixed(2);
    const previousClose = quote.previousClose.toFixed(2);
    const change = ((currentPrice - previousClose) / previousClose * 100).toFixed(2);
    const fiftyTwoWeekHigh = quote.fiftyTwoWeekHigh ? quote.fiftyTwoWeekHigh.toFixed(2) : 'N/A';
    const fiftyTwoWeekLow = quote.fiftyTwoWeekLow ? quote.fiftyTwoWeekLow.toFixed(2) : 'N/A';
    
    return {
      currentPrice,
      previousClose,
      change,
      fiftyTwoWeekHigh,
      fiftyTwoWeekLow
    };
  } catch (err) {
    console.log(`Could not fetch data for ${ticker}:`, err.message);
    return null;
  }
}

// Function to generate AI forecast for a stock with retry logic
async function generateStockForecast(ticker, name, stockData, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const prompt = `Analyze ${ticker} (${name}) and provide forecast in EXACT JSON format:

{
  "recommendation": "BUY" or "SELL" or "HOLD",
  "priceTarget": {
    "low": number,
    "high": number
  },
  "keyInsight": "One powerful sentence explaining recommendation with data"
}

Current: $${stockData.currentPrice}, Change: ${stockData.change}%, 52W High: $${stockData.fiftyTwoWeekHigh}, 52W Low: $${stockData.fiftyTwoWeekLow}

Make keyInsight specific and data-driven (max 20 words). Respond ONLY with JSON.`;

      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GOOGLE_API_KEY}`,
        {
          contents: [{
            parts: [{ text: prompt }]
          }]
        },
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );

      const forecastText = response.data.candidates[0].content.parts[0].text;
      const cleanedText = forecastText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const forecast = JSON.parse(cleanedText);
      
      return forecast;
    } catch (error) {
      if (error.response?.status === 429 && attempt < retries) {
        // Rate limited - wait longer before retry
        const waitTime = attempt * 5000; // 5s, 10s, 15s
        console.log(`Rate limited on ${ticker}, retrying in ${waitTime/1000}s... (attempt ${attempt}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        console.error(`Error forecasting ${ticker}:`, error.message);
        return {
          recommendation: "HOLD",
          priceTarget: { 
            low: Math.max(0, parseFloat(stockData.currentPrice) - 5).toFixed(2), 
            high: (parseFloat(stockData.currentPrice) + 5).toFixed(2)
          },
          keyInsight: "Analysis temporarily unavailable."
        };
      }
    }
  }
  
  // If all retries failed
  return {
    recommendation: "HOLD",
    priceTarget: { 
      low: Math.max(0, parseFloat(stockData.currentPrice) - 5).toFixed(2), 
      high: (parseFloat(stockData.currentPrice) + 5).toFixed(2)
    },
    keyInsight: "Analysis temporarily unavailable due to rate limits."
  };
}

// Function to generate forecasts for all stocks
async function generateAllForecasts() {
  console.log('Generating forecasts for top 10 S&P 500 stocks...');
  
  const forecasts = [];
  
  for (const stock of TOP_STOCKS) {
    console.log(`Processing ${stock.ticker}...`);
    
    const stockData = await fetchStockData(stock.ticker);
    if (!stockData) {
      console.log(`Skipping ${stock.ticker} - data unavailable`);
      continue;
    }
    
    const forecast = await generateStockForecast(stock.ticker, stock.name, stockData);
    
    forecasts.push({
      ticker: stock.ticker,
      name: stock.name,
      ...stockData,
      ...forecast
    });
    
    // 5 second delay to avoid rate limiting
    console.log('Waiting 5 seconds before next stock...');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  return {
    date: new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }),
    time: new Date().toLocaleTimeString('en-US'),
    stocks: forecasts,
    marketOpen: `${MARKET_OPEN_HOUR}:${MARKET_OPEN_MINUTE.toString().padStart(2, '0')} AM EST`
  };
}

// Function to send email with all forecasts
async function sendForecastEmail(forecastData) {
  // Generate stock cards HTML
  const stockCardsHTML = forecastData.stocks.map(stock => {
    const changeValue = parseFloat(stock.change);
    const isPositive = changeValue >= 0;
    const changeClass = isPositive ? 'positive' : 'negative';
    const changeSymbol = isPositive ? '+' : '';
    
    let recClass = '';
    let recIcon = '✓';
    if (stock.recommendation === 'BUY') {
      recClass = 'buy';
      recIcon = '✓';
    } else if (stock.recommendation === 'SELL') {
      recClass = 'sell';
      recIcon = '✗';
    } else {
      recClass = 'hold';
      recIcon = '●';
    }
    
    return `
      <div class="stock-card">
        <div class="stock-header">
          <table style="width: 100%;">
            <tr>
              <td style="vertical-align: top;">
                <div class="stock-ticker">${stock.ticker}</div>
                <div class="stock-name">${stock.name}</div>
              </td>
              <td style="vertical-align: top; text-align: right;">
                <div class="stock-price">$${stock.currentPrice}</div>
                <div class="stock-change ${changeClass}">${changeSymbol}${Math.abs(changeValue).toFixed(2)}%</div>
              </td>
            </tr>
          </table>
        </div>
        
        <table class="stats-table">
          <tr>
            <td class="stat-item">
              <div class="stat-label">Prev Close</div>
              <div class="stat-value">$${stock.previousClose}</div>
            </td>
            <td style="width: 2%;"></td>
            <td class="stat-item">
              <div class="stat-label">52W High</div>
              <div class="stat-value">$${stock.fiftyTwoWeekHigh}</div>
            </td>
            <td style="width: 2%;"></td>
            <td class="stat-item">
              <div class="stat-label">52W Low</div>
              <div class="stat-value">$${stock.fiftyTwoWeekLow}</div>
            </td>
          </tr>
        </table>
        
        <table class="target-insight-table">
          <tr>
            <td class="target-box">
              <div class="target-label">🎯 Target</div>
              <div class="target-value">$${stock.priceTarget.low}-$${stock.priceTarget.high}</div>
            </td>
            <td style="width: 5%;"></td>
            <td class="key-insight">
              <div class="insight-label">💡 Key Insight</div>
              <div class="insight-text">${stock.keyInsight}</div>
            </td>
          </tr>
        </table>
        
        <div style="margin-top: 12px; text-align: center;">
          <span class="recommendation-badge ${recClass}">${stock.recommendation} ${recIcon}</span>
        </div>
      </div>
    `;
  }).join('');

  const emailHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
          line-height: 1.6; 
          color: #333; 
          background: #f5f5f5;
          margin: 0;
          padding: 20px;
        }
        .container { 
          max-width: 800px; 
          margin: 0 auto; 
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .header { 
          background: linear-gradient(135deg, #0078d4 0%, #005a9e 100%); 
          color: white; 
          padding: 30px; 
          text-align: center;
        }
        .header h1 { 
          margin: 0; 
          font-size: 32px; 
          font-weight: 600;
        }
        .header .subtitle { 
          margin: 10px 0 0 0; 
          opacity: 0.95; 
          font-size: 16px;
        }
        .stock-grid {
          padding: 20px;
        }
        .stock-card {
          background: #fff;
          border: 1px solid #e0e0e0;
          border-radius: 10px;
          padding: 20px;
          margin-bottom: 15px;
        }
        .stock-header {
          margin-bottom: 15px;
          padding-bottom: 15px;
          border-bottom: 2px solid #f0f0f0;
        }
        .stock-header table {
          width: 100%;
        }
        .stock-ticker {
          font-size: 24px;
          font-weight: 700;
          color: #0078d4;
          margin-bottom: 2px;
        }
        .stock-name {
          font-size: 14px;
          color: #666;
        }
        .stock-price {
          font-size: 28px;
          font-weight: 700;
          color: #1a1a1a;
          margin-bottom: 4px;
          text-align: right;
        }
        .stock-change {
          font-size: 16px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 5px;
          display: inline-block;
          text-align: right;
        }
        .stock-change.positive {
          background: #d4edda;
          color: #155724;
        }
        .stock-change.negative {
          background: #f8d7da;
          color: #721c24;
        }
        .recommendation-badge {
          display: inline-block;
          padding: 6px 16px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .recommendation-badge.buy {
          background: #28a745;
          color: white;
        }
        .recommendation-badge.sell {
          background: #dc3545;
          color: white;
        }
        .recommendation-badge.hold {
          background: #ffc107;
          color: #1a1a1a;
        }
        .stats-table {
          width: 100%;
          margin-bottom: 12px;
        }
        .stat-item {
          text-align: center;
          padding: 8px;
          background: #f8f9fa;
          border-radius: 6px;
          width: 32%;
        }
        .stat-label {
          font-size: 10px;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 2px;
        }
        .stat-value {
          font-size: 14px;
          font-weight: 600;
          color: #1a1a1a;
        }
        .target-insight-table {
          width: 100%;
        }
        .target-box {
          background: #e3f2fd;
          padding: 12px;
          border-radius: 6px;
          text-align: center;
          width: 30%;
        }
        .target-label {
          font-size: 11px;
          color: #1565c0;
          font-weight: 600;
          margin-bottom: 4px;
        }
        .target-value {
          font-size: 16px;
          font-weight: 700;
          color: #0d47a1;
        }
        .key-insight {
          background: #f8f9fa;
          padding: 12px;
          border-radius: 6px;
          border-left: 3px solid #0078d4;
          width: 65%;
        }
        .insight-label {
          font-size: 11px;
          color: #666;
          font-weight: 600;
          margin-bottom: 4px;
        }
        .insight-text {
          font-size: 13px;
          color: #333;
          line-height: 1.4;
        }
        .disclaimer {
          background: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 15px 20px;
          margin: 20px;
          border-radius: 4px;
        }
        .disclaimer strong {
          color: #856404;
          font-size: 13px;
        }
        .disclaimer p {
          margin: 5px 0 0 0;
          font-size: 12px;
          color: #856404;
        }
        .footer {
          text-align: center;
          padding: 20px;
          background: #f8f9fa;
          border-top: 1px solid #e0e0e0;
          color: #666;
          font-size: 12px;
        }
        .footer p {
          margin: 4px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📊 Top 10 S&P 500 Stocks</h1>
          <p class="subtitle">Daily Forecast • ${forecastData.date}</p>
        </div>

        <div class="stock-grid">
          ${stockCardsHTML}
        </div>

        <div class="disclaimer">
          <strong>⚠️ Important Disclaimer</strong>
          <p>This forecast is for informational purposes only and should not be considered financial advice. Always do your own research and consult with a qualified financial advisor before making investment decisions.</p>
        </div>

        <div class="footer">
          <p><strong>Top 10 S&P 500 Daily Forecast Service</strong></p>
          <p>Generated at ${forecastData.time} • Powered by AI & Yahoo Finance</p>
        </div>
      </div>
    </body>
    </html>
  `;

  // Send email using SendGrid Web API (not SMTP)
  try {
    const response = await axios.post(
      'https://api.sendgrid.com/v3/mail/send',
      {
        personalizations: [{
          to: EMAIL_RECIPIENTS.map(email => ({ email })),
          subject: `📊 Top 10 S&P 500 Daily Forecast - ${forecastData.date}`
        }],
        from: { email: process.env.EMAIL_USER, name: 'Stock Forecast Service' },
        content: [{
          type: 'text/html',
          value: emailHTML
        }]
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log(`Email sent successfully to ${EMAIL_RECIPIENTS.length} recipients`);
    return { success: true, messageId: response.headers['x-message-id'] };
  } catch (error) {
    console.error('Error sending email:', error.response?.data || error.message);
    return { success: false, error: error.message };
  }
}

// Main function
async function sendDailyForecast() {
  console.log('\n=== Starting Top 10 S&P 500 Forecast Process ===');
  console.log('Time:', new Date().toLocaleString());
  
  const forecastData = await generateAllForecasts();
  
  console.log(`Generated forecasts for ${forecastData.stocks.length} stocks`);
  
  const result = await sendForecastEmail(forecastData);
  
  if (result.success) {
    console.log('✓ Daily forecast email sent successfully!');
  } else {
    console.error('✗ Failed to send email:', result.error);
  }
  
  console.log('=== Process Complete ===\n');
}

// Schedule daily email
const cronSchedule = `${EMAIL_SEND_MINUTE} ${EMAIL_SEND_HOUR} * * 1-5`;
console.log('Setting up cron job...');
console.log(`Schedule: ${cronSchedule} (${EMAIL_SEND_HOUR}:${EMAIL_SEND_MINUTE} AM EST, Monday-Friday)`);

const job = cron.schedule(cronSchedule, sendDailyForecast, {
  timezone: "America/New_York"
});

console.log('✓ Cron job scheduled successfully!');

// API endpoints
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ 
    status: 'running',
    service: 'Top 10 S&P 500 Stock Forecast Email Service',
    recipients: EMAIL_RECIPIENTS,
    schedule: `${EMAIL_SEND_HOUR}:${EMAIL_SEND_MINUTE} AM EST (Monday-Friday)`,
    stocks: TOP_STOCKS.map(s => s.ticker)
  });
});

app.post('/send-forecast', async (req, res) => {
  try {
    await sendDailyForecast();
    res.json({ success: true, message: 'Forecast sent successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/test-forecast', async (req, res) => {
  try {
    const forecast = await generateAllForecasts();
    res.json({ success: true, forecast });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`📧 Sending daily forecasts to: ${EMAIL_RECIPIENT}`);
  console.log(`⏰ Scheduled for: ${EMAIL_SEND_HOUR}:${EMAIL_SEND_MINUTE} AM EST (Monday-Friday)`);
  console.log(`📊 Tracking: ${TOP_STOCKS.map(s => s.ticker).join(', ')}`);
  console.log(`\nEndpoints:`);
  console.log(`  GET  /health - Check service status`);
  console.log(`  POST /send-forecast - Manually trigger forecast email`);
  console.log(`  GET  /test-forecast - Generate test forecast (no email)\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, stopping cron job...');
  job.stop();
  process.exit(0);
});
