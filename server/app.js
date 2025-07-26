import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { parse } from 'csv-parse';
import { stringify } from 'csv-stringify';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Data directories
const DATA_DIR = path.join(__dirname, 'data');
const LINKS_FILE = path.join(DATA_DIR, 'links.csv');
const CLICKS_FILE = path.join(DATA_DIR, 'clicks.csv');
const DOMAINS_FILE = path.join(DATA_DIR, 'domains.csv');
const CAMPAIGNS_FILE = path.join(DATA_DIR, 'campaigns.csv');

// Encryption key for URL cloaking
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-secret-key-change-this-in-production';

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize CSV files
const initializeCSVFiles = () => {
  if (!fs.existsSync(LINKS_FILE)) {
    const linksHeader = 'id,campaign_id,original_url,short_code,encrypted_url,clicks,cloaked,domain,created_at,expires_at,active\n';
    fs.writeFileSync(LINKS_FILE, linksHeader);
  }
  
  if (!fs.existsSync(CLICKS_FILE)) {
    const clicksHeader = 'id,link_id,campaign_id,ip_address,user_agent,country,city,referrer,timestamp,device_type,browser\n';
    fs.writeFileSync(CLICKS_FILE, clicksHeader);
  }
  
  if (!fs.existsSync(DOMAINS_FILE)) {
    const domainsHeader = 'domain,verified,ssl_enabled,added_at,verified_at\n';
    fs.writeFileSync(DOMAINS_FILE, domainsHeader);
  }

  if (!fs.existsSync(CAMPAIGNS_FILE)) {
    const campaignsHeader = 'id,name,description,created_at,total_links,total_clicks,active\n';
    fs.writeFileSync(CAMPAIGNS_FILE, campaignsHeader);
  }
};

initializeCSVFiles();

// Utility functions
const generateShortCode = () => {
  return crypto.randomBytes(4).toString('hex');
};

const encryptUrl = (url) => {
  const cipher = crypto.createCipher('aes192', ENCRYPTION_KEY);
  let encrypted = cipher.update(url, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
};

const decryptUrl = (encryptedUrl) => {
  try {
    const decipher = crypto.createDecipher('aes192', ENCRYPTION_KEY);
    let decrypted = decipher.update(encryptedUrl, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    return null;
  }
};

const readCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    if (!fs.existsSync(filePath)) {
      resolve([]);
      return;
    }
    
    fs.createReadStream(filePath)
      .pipe(parse({ columns: true, skip_empty_lines: true }))
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
};

const writeCSV = (filePath, data, headers) => {
  return new Promise((resolve, reject) => {
    stringify(data, { header: true, columns: headers }, (err, output) => {
      if (err) reject(err);
      else {
        fs.writeFileSync(filePath, output);
        resolve();
      }
    });
  });
};

const appendToCSV = (filePath, data) => {
  return new Promise((resolve, reject) => {
    stringify([data], (err, output) => {
      if (err) reject(err);
      else {
        fs.appendFileSync(filePath, output);
        resolve();
      }
    });
  });
};

const getClientIP = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0] || 
         req.headers['x-real-ip'] ||
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         '127.0.0.1';
};

const getDeviceInfo = (userAgent) => {
  const ua = userAgent.toLowerCase();
  let deviceType = 'Desktop';
  let browser = 'Unknown';

  // Device detection
  if (/mobile|android|iphone|ipad|tablet/.test(ua)) {
    deviceType = 'Mobile';
  }

  // Browser detection
  if (ua.includes('chrome')) browser = 'Chrome';
  else if (ua.includes('firefox')) browser = 'Firefox';
  else if (ua.includes('safari')) browser = 'Safari';
  else if (ua.includes('edge')) browser = 'Edge';
  else if (ua.includes('opera')) browser = 'Opera';

  return { deviceType, browser };
};

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// Dashboard route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/dashboard.html'));
});

// API Routes

// Get dashboard stats
app.get('/api/stats', async (req, res) => {
  try {
    const links = await readCSV(LINKS_FILE);
    const clicks = await readCSV(CLICKS_FILE);
    const campaigns = await readCSV(CAMPAIGNS_FILE);
    const domains = await readCSV(DOMAINS_FILE);
    
    const today = new Date().toISOString().split('T')[0];
    const todayClicks = clicks.filter(click => 
      click.timestamp.startsWith(today)
    ).length;
    
    res.json({
      totalLinks: links.length,
      totalClicks: clicks.length,
      totalCampaigns: campaigns.length,
      totalDomains: domains.length,
      todayClicks,
      activeLinks: links.filter(l => l.active === 'true').length
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Campaign management
app.get('/api/campaigns', async (req, res) => {
  try {
    const campaigns = await readCSV(CAMPAIGNS_FILE);
    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

app.post('/api/campaigns', async (req, res) => {
  try {
    const { name, description } = req.body;
    const id = crypto.randomUUID();
    const created_at = new Date().toISOString();
    
    const newCampaign = {
      id,
      name,
      description: description || '',
      created_at,
      total_links: 0,
      total_clicks: 0,
      active: 'true'
    };
    
    await appendToCSV(CAMPAIGNS_FILE, newCampaign);
    res.json(newCampaign);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

// Link management
app.get('/api/links', async (req, res) => {
  try {
    const links = await readCSV(LINKS_FILE);
    const campaigns = await readCSV(CAMPAIGNS_FILE);
    
    const linksWithCampaigns = links.map(link => {
      const campaign = campaigns.find(c => c.id === link.campaign_id);
      return {
        ...link,
        campaign_name: campaign ? campaign.name : 'Unknown',
        clicks: parseInt(link.clicks) || 0,
        cloaked: link.cloaked === 'true',
        active: link.active === 'true'
      };
    });
    
    res.json(linksWithCampaigns);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch links' });
  }
});

app.post('/api/links', async (req, res) => {
  try {
    const { campaign_id, original_url, cloaked = false, domain = '', expires_days = 0 } = req.body;
    const id = crypto.randomUUID();
    const short_code = generateShortCode();
    const encrypted_url = cloaked ? encryptUrl(original_url) : '';
    const created_at = new Date().toISOString();
    const expires_at = expires_days > 0 ? 
      new Date(Date.now() + expires_days * 24 * 60 * 60 * 1000).toISOString() : '';
    
    const newLink = {
      id,
      campaign_id,
      original_url,
      short_code,
      encrypted_url,
      clicks: 0,
      cloaked: cloaked.toString(),
      domain: domain || '',
      created_at,
      expires_at,
      active: 'true'
    };
    
    await appendToCSV(LINKS_FILE, newLink);
    
    // Update campaign stats
    const campaigns = await readCSV(CAMPAIGNS_FILE);
    const updatedCampaigns = campaigns.map(c => 
      c.id === campaign_id ? { ...c, total_links: (parseInt(c.total_links) || 0) + 1 } : c
    );
    await writeCSV(CAMPAIGNS_FILE, updatedCampaigns, 
      ['id', 'name', 'description', 'created_at', 'total_links', 'total_clicks', 'active']);
    
    res.json(newLink);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create link' });
  }
});

// Toggle link active status
app.patch('/api/links/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    const links = await readCSV(LINKS_FILE);
    
    const updatedLinks = links.map(link => 
      link.id === id ? { ...link, active: link.active === 'true' ? 'false' : 'true' } : link
    );
    
    await writeCSV(LINKS_FILE, updatedLinks, 
      ['id', 'campaign_id', 'original_url', 'short_code', 'encrypted_url', 'clicks', 'cloaked', 'domain', 'created_at', 'expires_at', 'active']);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle link' });
  }
});

// Domain management
app.get('/api/domains', async (req, res) => {
  try {
    const domains = await readCSV(DOMAINS_FILE);
    res.json(domains.map(domain => ({
      ...domain,
      verified: domain.verified === 'true',
      ssl_enabled: domain.ssl_enabled === 'true'
    })));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch domains' });
  }
});

app.post('/api/domains', async (req, res) => {
  try {
    const { domain } = req.body;
    const added_at = new Date().toISOString();
    
    const newDomain = {
      domain,
      verified: 'false',
      ssl_enabled: 'false',
      added_at,
      verified_at: ''
    };
    
    await appendToCSV(DOMAINS_FILE, newDomain);
    res.json(newDomain);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add domain' });
  }
});

// Analytics
app.get('/api/analytics', async (req, res) => {
  try {
    const { range = '7d', campaign_id } = req.query;
    const clicks = await readCSV(CLICKS_FILE);
    
    const now = new Date();
    let startDate;
    
    switch (range) {
      case '1d':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
    
    let filteredClicks = clicks.filter(click => 
      new Date(click.timestamp) >= startDate
    );
    
    if (campaign_id) {
      filteredClicks = filteredClicks.filter(click => click.campaign_id === campaign_id);
    }
    
    res.json(filteredClicks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Export analytics
app.get('/api/export/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { range = '30d' } = req.query;
    
    let data = [];
    let filename = '';
    
    switch (type) {
      case 'clicks':
        data = await readCSV(CLICKS_FILE);
        filename = `clicks-export-${range}.csv`;
        break;
      case 'links':
        data = await readCSV(LINKS_FILE);
        filename = `links-export.csv`;
        break;
      case 'campaigns':
        data = await readCSV(CAMPAIGNS_FILE);
        filename = `campaigns-export.csv`;
        break;
      default:
        return res.status(400).json({ error: 'Invalid export type' });
    }
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    
    stringify(data, { header: true }, (err, output) => {
      if (err) {
        res.status(500).json({ error: 'Failed to export data' });
      } else {
        res.send(output);
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// Link redirect handler - THIS IS THE CORE FUNCTIONALITY
app.get('/:shortCode', async (req, res) => {
  try {
    const { shortCode } = req.params;
    const links = await readCSV(LINKS_FILE);
    
    const link = links.find(l => l.short_code === shortCode);
    
    if (!link) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html><head><title>Link Not Found</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h1>🔗 Link Not Found</h1>
          <p>The requested link does not exist or has been removed.</p>
        </body></html>
      `);
    }
    
    // Check if link is active
    if (link.active !== 'true') {
      return res.status(410).send(`
        <!DOCTYPE html>
        <html><head><title>Link Disabled</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h1>🚫 Link Disabled</h1>
          <p>This link has been disabled by the administrator.</p>
        </body></html>
      `);
    }
    
    // Check if link has expired
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return res.status(410).send(`
        <!DOCTYPE html>
        <html><head><title>Link Expired</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h1>⏰ Link Expired</h1>
          <p>This link has expired and is no longer available.</p>
        </body></html>
      `);
    }
    
    // Track the click
    const clickId = crypto.randomUUID();
    const ip = getClientIP(req);
    const userAgent = req.headers['user-agent'] || '';
    const { deviceType, browser } = getDeviceInfo(userAgent);
    const referrer = req.headers.referer || '';
    const timestamp = new Date().toISOString();
    
    const clickData = {
      id: clickId,
      link_id: link.id,
      campaign_id: link.campaign_id,
      ip_address: ip,
      user_agent: userAgent,
      country: 'Unknown', // In production, use a GeoIP service
      city: 'Unknown',
      referrer,
      timestamp,
      device_type: deviceType,
      browser
    };
    
    await appendToCSV(CLICKS_FILE, clickData);
    
    // Update click count
    const updatedLinks = links.map(l => 
      l.id === link.id ? { ...l, clicks: (parseInt(l.clicks) || 0) + 1 } : l
    );
    
    await writeCSV(LINKS_FILE, updatedLinks, 
      ['id', 'campaign_id', 'original_url', 'short_code', 'encrypted_url', 'clicks', 'cloaked', 'domain', 'created_at', 'expires_at', 'active']);
    
    // Update campaign click count
    const campaigns = await readCSV(CAMPAIGNS_FILE);
    const updatedCampaigns = campaigns.map(c => 
      c.id === link.campaign_id ? { ...c, total_clicks: (parseInt(c.total_clicks) || 0) + 1 } : c
    );
    await writeCSV(CAMPAIGNS_FILE, updatedCampaigns, 
      ['id', 'name', 'description', 'created_at', 'total_links', 'total_clicks', 'active']);
    
    // Get the destination URL
    let destinationUrl = link.original_url;
    if (link.cloaked === 'true' && link.encrypted_url) {
      const decrypted = decryptUrl(link.encrypted_url);
      if (decrypted) {
        destinationUrl = decrypted;
      }
    }
    
    // Handle cloaking
    if (link.cloaked === 'true') {
      // For cloaked links, serve a page that redirects via JavaScript
      const cloakingPage = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Redirecting...</title>
          <meta name="robots" content="noindex, nofollow">
          <meta name="referrer" content="no-referrer">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
            .loader { border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 20px auto; }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          </style>
        </head>
        <body>
          <h2>🔄 Redirecting...</h2>
          <div class="loader"></div>
          <p>Please wait while we redirect you to your destination.</p>
          <script>
            setTimeout(function() {
              window.location.href = "${destinationUrl}";
            }, 1500);
          </script>
          <noscript>
            <meta http-equiv="refresh" content="2;url=${destinationUrl}">
            <p><a href="${destinationUrl}">Click here if you are not redirected automatically</a></p>
          </noscript>
        </body>
        </html>
      `;
      res.send(cloakingPage);
    } else {
      // Direct redirect
      res.redirect(302, destinationUrl);
    }
  } catch (error) {
    console.error('Redirect error:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html><head><title>Error</title></head>
      <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
        <h1>⚠️ Error</h1>
        <p>An error occurred while processing your request.</p>
      </body></html>
    `);
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Email Campaign URL Tracker'
  });
});

app.listen(PORT, () => {
  console.log(`🔗 Email Campaign URL Tracker running on port ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
  console.log(`💾 Data storage: ${DATA_DIR}`);
});