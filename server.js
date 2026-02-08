// server.js - Node.js backend for MSFT Stock Forecast Email Service
// Install dependencies: npm install express node-cron nodemailer axios @google/generative-ai dotenv

require('dotenv').config();
const express = require('express');
const cron = require('node-cron');
const nodemailer = require('nodemailer');
const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration
const EMAIL_RECIPIENT = 'aitechdev2@gmail.com';
const MARKET_OPEN_HOUR = 9; // 9:30 AM EST
const MARKET_OPEN_MINUTE = 30;
const EMAIL_SEND_HOUR = 8; // 8:30 AM EST (1 hour before market)
const EMAIL_SEND_MINUTE = 30;

// Initialize Google Gemini client for AI forecasts
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// Email transporter setup (using Gmail as example)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD, // Use App Password for Gmail
  },
});

// Function to fetch MSFT stock data and generate forecast
async function generateMSFTForecast() {
  try {
    console.log('Generating MSFT stock forecast...');
    
    // First, get current MSFT stock data from a free API
    let stockData = '';
    try {
      const stockResponse = await axios.get('https://query1.finance.yahoo.com/v8/finance/chart/MSFT');
      const quote = stockResponse.data.chart.result[0].meta;
      const currentPrice = quote.regularMarketPrice;
      const previousClose = quote.previousClose;
      const change = ((currentPrice - previousClose) / previousClose * 100).toFixed(2);
      
      stockData = `Current MSFT Price: $${currentPrice}\nPrevious Close: $${previousClose}\nChange: ${change}%\n\n`;
    } catch (err) {
      console.log('Could not fetch stock data, continuing with AI analysis...');
    }
    
    // Get AI-powered forecast using direct REST API call
    const prompt = `${stockData}Based on your knowledge and the latest available information, provide a comprehensive daily forecast for MSFT (Microsoft) stock. Include:
1. Analysis of the current price and recent performance
2. Key factors that may affect the stock today
3. Technical analysis insights
4. Market sentiment analysis
5. Price prediction for today's trading session
6. Any relevant recent news or events affecting Microsoft

Format this as a clear, professional daily briefing for an investor.`;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GOOGLE_API_KEY}`,
      {
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    const forecastText = response.data.candidates[0].content.parts[0].text;

    const forecastData = {
      date: new Date().toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      time: new Date().toLocaleTimeString('en-US'),
      forecast: forecastText,
      marketOpen: `${MARKET_OPEN_HOUR}:${MARKET_OPEN_MINUTE.toString().padStart(2, '0')} AM EST`,
    };

    console.log('Forecast generated successfully');
    return forecastData;
    
  } catch (error) {
    console.error('Error generating forecast:', error);
    
    // Return a basic forecast if AI service fails
    return {
      date: new Date().toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      time: new Date().toLocaleTimeString('en-US'),
      forecast: 'Unable to generate AI forecast at this time. Please check MSFT stock manually.',
      marketOpen: `${MARKET_OPEN_HOUR}:${MARKET_OPEN_MINUTE.toString().padStart(2, '0')} AM EST`,
      error: error.message
    };
  }
}

// Function to send email
async function sendForecastEmail(forecastData) {
  const emailHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
        .header h1 { margin: 0; font-size: 28px; }
        .header p { margin: 10px 0 0 0; opacity: 0.9; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .forecast-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
        .info-box { background: #e0e7ff; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; }
        .market-time { background: #10b981; color: white; padding: 10px 20px; border-radius: 8px; display: inline-block; font-weight: bold; margin: 10px 0; }
        pre { white-space: pre-wrap; word-wrap: break-word; font-family: inherit; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📈 MSFT Daily Forecast</h1>
          <p>${forecastData.date}</p>
        </div>
        <div class="content">
          <div class="info-box">
            <strong>🕐 Market Opens:</strong> <span class="market-time">${forecastData.marketOpen}</span>
          </div>
          
          <div class="forecast-box">
            <h2 style="color: #667eea; margin-top: 0;">Today's Forecast</h2>
            <pre>${forecastData.forecast}</pre>
          </div>

          <div class="info-box">
            <strong>⚠️ Disclaimer:</strong> This forecast is for informational purposes only and should not be considered financial advice. Always do your own research and consult with a financial advisor before making investment decisions.
          </div>

          <div class="footer">
            <p>Generated automatically at ${forecastData.time}</p>
            <p>MSFT Stock Forecast Service</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: EMAIL_RECIPIENT,
    subject: `MSFT Stock Forecast - ${forecastData.date}`,
    html: emailHTML,
    text: `MSFT Stock Forecast - ${forecastData.date}\n\n${forecastData.forecast}\n\nMarket Opens: ${forecastData.marketOpen}\n\nGenerated at ${forecastData.time}`,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
}

// Main function to generate and send daily forecast
async function sendDailyForecast() {
  console.log('\n=== Starting Daily MSFT Forecast Process ===');
  console.log('Time:', new Date().toLocaleString());
  
  const forecastData = await generateMSFTForecast();
  const result = await sendForecastEmail(forecastData);
  
  if (result.success) {
    console.log('✓ Daily forecast sent successfully!');
  } else {
    console.error('✗ Failed to send daily forecast:', result.error);
  }
  
  console.log('=== Process Complete ===\n');
}

// Schedule daily email at 8:30 AM EST (Monday-Friday)
// Cron format: minute hour day month dayOfWeek
// 30 8 * * 1-5 = 8:30 AM Monday through Friday
const cronSchedule = `${EMAIL_SEND_MINUTE} ${EMAIL_SEND_HOUR} * * 1-5`;

console.log('Setting up cron job...');
console.log(`Schedule: ${cronSchedule} (${EMAIL_SEND_HOUR}:${EMAIL_SEND_MINUTE} AM EST, Monday-Friday)`);

const job = cron.schedule(cronSchedule, sendDailyForecast, {
  timezone: "America/New_York"
});

console.log('✓ Cron job scheduled successfully!');

// API endpoints
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'running',
    service: 'MSFT Stock Forecast Email Service',
    recipient: EMAIL_RECIPIENT,
    schedule: `${EMAIL_SEND_HOUR}:${EMAIL_SEND_MINUTE} AM EST (Monday-Friday)`,
    nextExecution: job.nextDates().toString()
  });
});

// Manual trigger endpoint
app.post('/send-forecast', async (req, res) => {
  try {
    await sendDailyForecast();
    res.json({ success: true, message: 'Forecast sent successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Test endpoint
app.get('/test-forecast', async (req, res) => {
  try {
    const forecast = await generateMSFTForecast();
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
