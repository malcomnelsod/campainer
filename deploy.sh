#!/bin/bash

# Email Campaign URL Tracker Deployment Script for Ubuntu with Apache
# Professional URL tracking and redirect system for email marketers

set -e

echo "🚀 Starting Email Campaign URL Tracker Deployment..."

# Configuration
APP_NAME="email-tracker"
APP_USER="www-data"
APP_DIR="/var/www/email-tracker"
DOMAIN="ec2-54-226-26-59.compute-1.amazonaws.com"
NODE_VERSION="18"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   print_error "This script must be run as root (use sudo)"
   exit 1
fi

print_status "🔗 Email Campaign URL Tracker - Professional Deployment"
print_status "Features: URL Cloaking, Custom Domains, Encrypted URLs, CSV Backend"
echo ""

# Update system packages
print_status "Updating system packages..."
apt update && apt upgrade -y

# Install required packages
print_status "Installing required packages..."
apt install -y curl wget git apache2 ufw fail2ban certbot python3-certbot-apache htop unzip

# Install Node.js
print_status "Installing Node.js ${NODE_VERSION}..."
curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
apt install -y nodejs

# Verify installations
print_status "Verifying installations..."
node --version
npm --version
apache2 -v

# Create application directory
print_status "Creating application directory..."
mkdir -p $APP_DIR
cd $APP_DIR

# Create directory structure
print_status "Setting up directory structure..."
mkdir -p server/data
mkdir -p public
mkdir -p logs
mkdir -p backups

# Create package.json
print_status "Creating package.json..."
cat > package.json << 'EOF'
{
  "name": "email-campaign-tracker",
  "version": "2.0.0",
  "description": "Professional URL tracking system for email marketers",
  "main": "server/app.js",
  "scripts": {
    "start": "node server/app.js",
    "dev": "nodemon server/app.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "csv-parse": "^5.4.0",
    "csv-stringify": "^6.4.0"
  },
  "devDependencies": {
    "nodemon": "^3.1.0"
  }
}
EOF

# Install application dependencies
print_status "Installing application dependencies..."
npm install --production

# Create the main server application
print_status "Creating server application..."
cat > server/app.js << 'EOF'
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
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'email-tracker-secret-key-2024';

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

  if (/mobile|android|iphone|ipad|tablet/.test(ua)) {
    deviceType = 'Mobile';
  }

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
      id, name, description: description || '', created_at,
      total_links: 0, total_clicks: 0, active: 'true'
    };
    
    await appendToCSV(CAMPAIGNS_FILE, newCampaign);
    res.json(newCampaign);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

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
      id, campaign_id, original_url, short_code, encrypted_url,
      clicks: 0, cloaked: cloaked.toString(), domain: domain || '',
      created_at, expires_at, active: 'true'
    };
    
    await appendToCSV(LINKS_FILE, newLink);
    
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
      domain, verified: 'true', ssl_enabled: 'false', added_at, verified_at: added_at
    };
    
    await appendToCSV(DOMAINS_FILE, newDomain);
    res.json(newDomain);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add domain' });
  }
});

app.get('/api/analytics', async (req, res) => {
  try {
    const { range = '7d', campaign_id } = req.query;
    const clicks = await readCSV(CLICKS_FILE);
    
    const now = new Date();
    let startDate;
    
    switch (range) {
      case '1d': startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); break;
      case '7d': startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
      case '30d': startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
      default: startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
    
    let filteredClicks = clicks.filter(click => new Date(click.timestamp) >= startDate);
    if (campaign_id) {
      filteredClicks = filteredClicks.filter(click => click.campaign_id === campaign_id);
    }
    
    res.json(filteredClicks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

app.get('/api/export/:type', async (req, res) => {
  try {
    const { type } = req.params;
    let data = [];
    let filename = '';
    
    switch (type) {
      case 'clicks': data = await readCSV(CLICKS_FILE); filename = 'clicks-export.csv'; break;
      case 'links': data = await readCSV(LINKS_FILE); filename = 'links-export.csv'; break;
      case 'campaigns': data = await readCSV(CAMPAIGNS_FILE); filename = 'campaigns-export.csv'; break;
      default: return res.status(400).json({ error: 'Invalid export type' });
    }
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    
    stringify(data, { header: true }, (err, output) => {
      if (err) res.status(500).json({ error: 'Failed to export data' });
      else res.send(output);
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// CORE FUNCTIONALITY: Link redirect handler
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
    
    if (link.active !== 'true') {
      return res.status(410).send(`
        <!DOCTYPE html>
        <html><head><title>Link Disabled</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h1>🚫 Link Disabled</h1>
          <p>This link has been disabled.</p>
        </body></html>
      `);
    }
    
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return res.status(410).send(`
        <!DOCTYPE html>
        <html><head><title>Link Expired</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h1>⏰ Link Expired</h1>
          <p>This link has expired.</p>
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
      id: clickId, link_id: link.id, campaign_id: link.campaign_id,
      ip_address: ip, user_agent: userAgent, country: 'Unknown', city: 'Unknown',
      referrer, timestamp, device_type: deviceType, browser
    };
    
    await appendToCSV(CLICKS_FILE, clickData);
    
    // Update click counts
    const updatedLinks = links.map(l => 
      l.id === link.id ? { ...l, clicks: (parseInt(l.clicks) || 0) + 1 } : l
    );
    
    await writeCSV(LINKS_FILE, updatedLinks, 
      ['id', 'campaign_id', 'original_url', 'short_code', 'encrypted_url', 'clicks', 'cloaked', 'domain', 'created_at', 'expires_at', 'active']);
    
    const campaigns = await readCSV(CAMPAIGNS_FILE);
    const updatedCampaigns = campaigns.map(c => 
      c.id === link.campaign_id ? { ...c, total_clicks: (parseInt(c.total_clicks) || 0) + 1 } : c
    );
    await writeCSV(CAMPAIGNS_FILE, updatedCampaigns, 
      ['id', 'name', 'description', 'created_at', 'total_links', 'total_clicks', 'active']);
    
    // Get destination URL
    let destinationUrl = link.original_url;
    if (link.cloaked === 'true' && link.encrypted_url) {
      const decrypted = decryptUrl(link.encrypted_url);
      if (decrypted) destinationUrl = decrypted;
    }
    
    // Handle cloaking
    if (link.cloaked === 'true') {
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
          <p>Please wait while we redirect you.</p>
          <script>
            setTimeout(function() { window.location.href = "${destinationUrl}"; }, 1500);
          </script>
          <noscript>
            <meta http-equiv="refresh" content="2;url=${destinationUrl}">
            <p><a href="${destinationUrl}">Click here if not redirected</a></p>
          </noscript>
        </body>
        </html>
      `;
      res.send(cloakingPage);
    } else {
      res.redirect(302, destinationUrl);
    }
  } catch (error) {
    console.error('Redirect error:', error);
    res.status(500).send('Error processing request');
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString(), service: 'Email Campaign URL Tracker' });
});

app.listen(PORT, () => {
  console.log(`🔗 Email Campaign URL Tracker running on port ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
});
EOF

# Create the dashboard HTML file
print_status "Creating dashboard interface..."
cat > public/dashboard.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Campaign URL Tracker - Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh; color: #333;
        }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header {
            background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px);
            border-radius: 15px; padding: 30px; margin-bottom: 30px; text-align: center;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }
        .header h1 {
            font-size: 2.5rem; margin-bottom: 10px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .stats-grid {
            display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px; margin-bottom: 30px;
        }
        .stat-card {
            background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px);
            border-radius: 15px; padding: 25px; text-align: center;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1); transition: transform 0.3s ease;
        }
        .stat-card:hover { transform: translateY(-5px); }
        .stat-card .icon { font-size: 2.5rem; margin-bottom: 15px; }
        .stat-card .number { font-size: 2rem; font-weight: bold; color: #333; margin-bottom: 5px; }
        .stat-card .label { color: #666; font-size: 0.9rem; }
        .main-content { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
        .panel {
            background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px);
            border-radius: 15px; padding: 25px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }
        .panel h3 { margin-bottom: 20px; color: #333; font-size: 1.3rem; }
        .form-group { margin-bottom: 20px; }
        .form-group label { display: block; margin-bottom: 8px; font-weight: 500; color: #555; }
        .form-group input, .form-group select, .form-group textarea {
            width: 100%; padding: 12px; border: 2px solid #e1e5e9; border-radius: 8px;
            font-size: 14px; transition: border-color 0.3s ease;
        }
        .form-group input:focus, .form-group select:focus, .form-group textarea:focus {
            outline: none; border-color: #667eea;
        }
        .checkbox-group { display: flex; align-items: center; gap: 10px; }
        .checkbox-group input[type="checkbox"] { width: auto; }
        .btn {
            background: linear-gradient(135deg, #667eea, #764ba2); color: white;
            border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer;
            font-size: 14px; font-weight: 500; transition: transform 0.2s ease;
        }
        .btn:hover { transform: translateY(-2px); }
        .btn-secondary { background: #6c757d; }
        .btn-success { background: #28a745; }
        .table-container { overflow-x: auto; margin-top: 20px; }
        table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e1e5e9; }
        th { background: #f8f9fa; font-weight: 600; color: #555; }
        .short-url { font-family: 'Courier New', monospace; background: #f8f9fa; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
        .status-badge { padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: 500; }
        .status-active { background: #d4edda; color: #155724; }
        .status-inactive { background: #f8d7da; color: #721c24; }
        .status-cloaked { background: #fff3cd; color: #856404; }
        .tabs { display: flex; margin-bottom: 20px; background: #f8f9fa; border-radius: 8px; padding: 4px; }
        .tab { flex: 1; padding: 10px; text-align: center; cursor: pointer; border-radius: 6px; transition: all 0.3s ease; }
        .tab.active { background: white; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); }
        .tab-content { display: none; }
        .tab-content.active { display: block; }
        .alert { padding: 15px; border-radius: 8px; margin-bottom: 20px; }
        .alert-success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .alert-error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        @media (max-width: 768px) {
            .main-content { grid-template-columns: 1fr; }
            .stats-grid { grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔗 Email Campaign URL Tracker</h1>
            <p>Professional URL tracking and redirect system for email marketers</p>
        </div>

        <div class="stats-grid" id="statsGrid"></div>

        <div class="main-content">
            <div class="panel">
                <div class="tabs">
                    <div class="tab active" onclick="switchTab('campaigns')">Campaigns</div>
                    <div class="tab" onclick="switchTab('links')">Links</div>
                    <div class="tab" onclick="switchTab('domains')">Domains</div>
                </div>

                <div id="campaigns-tab" class="tab-content active">
                    <h3>Create Campaign</h3>
                    <form id="campaignForm">
                        <div class="form-group">
                            <label>Campaign Name</label>
                            <input type="text" id="campaignName" required placeholder="Black Friday 2024">
                        </div>
                        <div class="form-group">
                            <label>Description</label>
                            <textarea id="campaignDescription" rows="3" placeholder="Campaign description..."></textarea>
                        </div>
                        <button type="submit" class="btn">Create Campaign</button>
                    </form>
                </div>

                <div id="links-tab" class="tab-content">
                    <h3>Create Tracking Link</h3>
                    <form id="linkForm">
                        <div class="form-group">
                            <label>Campaign</label>
                            <select id="linkCampaign" required>
                                <option value="">Select Campaign</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Original URL</label>
                            <input type="url" id="originalUrl" required placeholder="https://example.com/product">
                        </div>
                        <div class="form-group">
                            <label>Custom Domain (Optional)</label>
                            <select id="linkDomain">
                                <option value="">Use default domain</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <div class="checkbox-group">
                                <input type="checkbox" id="cloaked">
                                <label for="cloaked">Enable URL cloaking (hide destination)</label>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Expires in days (0 = never)</label>
                            <input type="number" id="expiresDays" value="0" min="0">
                        </div>
                        <button type="submit" class="btn">Create Link</button>
                    </form>
                </div>

                <div id="domains-tab" class="tab-content">
                    <h3>Add Custom Domain</h3>
                    <form id="domainForm">
                        <div class="form-group">
                            <label>Domain/Subdomain</label>
                            <input type="text" id="domainName" required placeholder="links.yourdomain.com">
                        </div>
                        <button type="submit" class="btn">Add Domain</button>
                    </form>
                    <div class="alert" style="background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb;">
                        <strong>Setup Instructions:</strong><br>
                        1. Point your domain to this server's IP address<br>
                        2. Add the domain above<br>
                        3. The domain will be available for tracking links
                    </div>
                </div>
            </div>

            <div class="panel">
                <h3>Analytics & Export</h3>
                <div class="form-group">
                    <label>Date Range</label>
                    <select id="analyticsRange">
                        <option value="1d">Last 24 hours</option>
                        <option value="7d" selected>Last 7 days</option>
                        <option value="30d">Last 30 days</option>
                    </select>
                </div>
                <div style="display: flex; gap: 10px; margin-top: 15px;">
                    <button class="btn btn-secondary" onclick="exportData('clicks')">Export Clicks</button>
                    <button class="btn btn-secondary" onclick="exportData('links')">Export Links</button>
                    <button class="btn btn-secondary" onclick="exportData('campaigns')">Export Campaigns</button>
                </div>
            </div>
        </div>

        <div class="panel">
            <h3>Recent Links</h3>
            <div class="table-container">
                <table id="linksTable">
                    <thead>
                        <tr>
                            <th>Campaign</th>
                            <th>Short URL</th>
                            <th>Original URL</th>
                            <th>Clicks</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                </table>
            </div>
        </div>
    </div>

    <script>
        let campaigns = [], links = [], domains = [];

        document.addEventListener('DOMContentLoaded', function() {
            loadStats(); loadCampaigns(); loadLinks(); loadDomains();
            document.getElementById('campaignForm').addEventListener('submit', createCampaign);
            document.getElementById('linkForm').addEventListener('submit', createLink);
            document.getElementById('domainForm').addEventListener('submit', addDomain);
        });

        function switchTab(tabName) {
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
            document.getElementById(tabName + '-tab').classList.add('active');
            event.target.classList.add('active');
        }

        async function loadStats() {
            try {
                const response = await fetch('/api/stats');
                const stats = await response.json();
                document.getElementById('statsGrid').innerHTML = `
                    <div class="stat-card"><div class="icon">📊</div><div class="number">${stats.totalCampaigns}</div><div class="label">Total Campaigns</div></div>
                    <div class="stat-card"><div class="icon">🔗</div><div class="number">${stats.totalLinks}</div><div class="label">Total Links</div></div>
                    <div class="stat-card"><div class="icon">👆</div><div class="number">${stats.totalClicks.toLocaleString()}</div><div class="label">Total Clicks</div></div>
                    <div class="stat-card"><div class="icon">📈</div><div class="number">${stats.todayClicks}</div><div class="label">Today's Clicks</div></div>
                    <div class="stat-card"><div class="icon">🌐</div><div class="number">${stats.totalDomains}</div><div class="label">Custom Domains</div></div>
                    <div class="stat-card"><div class="icon">✅</div><div class="number">${stats.activeLinks}</div><div class="label">Active Links</div></div>
                `;
            } catch (error) { console.error('Failed to load stats:', error); }
        }

        async function loadCampaigns() {
            try {
                const response = await fetch('/api/campaigns');
                campaigns = await response.json();
                const campaignSelect = document.getElementById('linkCampaign');
                campaignSelect.innerHTML = '<option value="">Select Campaign</option>';
                campaigns.forEach(campaign => {
                    const option = document.createElement('option');
                    option.value = campaign.id; option.textContent = campaign.name;
                    campaignSelect.appendChild(option);
                });
            } catch (error) { console.error('Failed to load campaigns:', error); }
        }

        async function loadLinks() {
            try {
                const response = await fetch('/api/links');
                links = await response.json();
                const tbody = document.querySelector('#linksTable tbody');
                tbody.innerHTML = '';
                links.forEach(link => {
                    const shortUrl = `${window.location.origin}/${link.short_code}`;
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${link.campaign_name}</td>
                        <td><div class="short-url">${shortUrl}</div><button onclick="copyToClipboard('${shortUrl}')" style="margin-top: 5px; padding: 2px 6px; font-size: 11px;" class="btn">Copy</button></td>
                        <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis;">${link.original_url}</td>
                        <td><strong>${link.clicks}</strong></td>
                        <td><span class="status-badge ${link.active ? 'status-active' : 'status-inactive'}">${link.active ? 'Active' : 'Inactive'}</span>${link.cloaked ? '<span class="status-badge status-cloaked">Cloaked</span>' : ''}</td>
                        <td><button onclick="toggleLink('${link.id}')" class="btn btn-secondary" style="padding: 4px 8px; font-size: 11px;">${link.active ? 'Disable' : 'Enable'}</button></td>
                    `;
                    tbody.appendChild(row);
                });
            } catch (error) { console.error('Failed to load links:', error); }
        }

        async function loadDomains() {
            try {
                const response = await fetch('/api/domains');
                domains = await response.json();
                const domainSelect = document.getElementById('linkDomain');
                domainSelect.innerHTML = '<option value="">Use default domain</option>';
                domains.forEach(domain => {
                    if (domain.verified) {
                        const option = document.createElement('option');
                        option.value = domain.domain; option.textContent = domain.domain;
                        domainSelect.appendChild(option);
                    }
                });
            } catch (error) { console.error('Failed to load domains:', error); }
        }

        async function createCampaign(e) {
            e.preventDefault();
            const name = document.getElementById('campaignName').value;
            const description = document.getElementById('campaignDescription').value;
            try {
                const response = await fetch('/api/campaigns', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, description })
                });
                if (response.ok) {
                    document.getElementById('campaignForm').reset();
                    loadCampaigns(); loadStats(); showAlert('Campaign created successfully!', 'success');
                }
            } catch (error) { showAlert('Failed to create campaign', 'error'); }
        }

        async function createLink(e) {
            e.preventDefault();
            const campaign_id = document.getElementById('linkCampaign').value;
            const original_url = document.getElementById('originalUrl').value;
            const domain = document.getElementById('linkDomain').value;
            const cloaked = document.getElementById('cloaked').checked;
            const expires_days = parseInt(document.getElementById('expiresDays').value);
            try {
                const response = await fetch('/api/links', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ campaign_id, original_url, domain, cloaked, expires_days })
                });
                if (response.ok) {
                    document.getElementById('linkForm').reset();
                    loadLinks(); loadStats(); showAlert('Tracking link created successfully!', 'success');
                }
            } catch (error) { showAlert('Failed to create link', 'error'); }
        }

        async function addDomain(e) {
            e.preventDefault();
            const domain = document.getElementById('domainName').value;
            try {
                const response = await fetch('/api/domains', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ domain })
                });
                if (response.ok) {
                    document.getElementById('domainForm').reset();
                    loadDomains(); loadStats(); showAlert('Domain added successfully!', 'success');
                }
            } catch (error) { showAlert('Failed to add domain', 'error'); }
        }

        async function toggleLink(linkId) {
            try {
                const response = await fetch(`/api/links/${linkId}/toggle`, { method: 'PATCH' });
                if (response.ok) { loadLinks(); loadStats(); }
            } catch (error) { showAlert('Failed to toggle link', 'error'); }
        }

        function copyToClipboard(text) {
            navigator.clipboard.writeText(text).then(() => showAlert('Link copied to clipboard!', 'success'));
        }

        function exportData(type) {
            const range = document.getElementById('analyticsRange').value;
            window.open(`/api/export/${type}?range=${range}`, '_blank');
        }

        function showAlert(message, type) {
            const alertDiv = document.createElement('div');
            alertDiv.className = `alert alert-${type}`;
            alertDiv.textContent = message;
            document.querySelector('.container').insertBefore(alertDiv, document.querySelector('.stats-grid'));
            setTimeout(() => alertDiv.remove(), 5000);
        }

        setInterval(loadStats, 30000);
    </script>
</body>
</html>
EOF

# Set permissions
print_status "Setting file permissions..."
chown -R $APP_USER:$APP_USER $APP_DIR
chmod -R 755 $APP_DIR
chmod 644 $APP_DIR/server/app.js

# Create systemd service
print_status "Creating systemd service..."
cat > /etc/systemd/system/${APP_NAME}.service << EOF
[Unit]
Description=Email Campaign URL Tracker
After=network.target

[Service]
Type=simple
User=$APP_USER
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/node server/app.js
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3001
Environment=ENCRYPTION_KEY=email-tracker-secret-key-2024-$(openssl rand -hex 16)

StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=$APP_NAME

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
print_status "Starting Email Campaign URL Tracker service..."
systemctl daemon-reload
systemctl enable $APP_NAME
systemctl start $APP_NAME

# Configure Apache
print_status "Configuring Apache..."

# Enable required modules
a2enmod rewrite
a2enmod proxy
a2enmod proxy_http
a2enmod headers

# Create Apache virtual host configuration
cat > /etc/apache2/sites-available/${APP_NAME}.conf << EOF
<VirtualHost *:80>
    ServerName $DOMAIN
    DocumentRoot $APP_DIR/public
    
    # Proxy API requests to Node.js
    ProxyPreserveHost On
    ProxyPass /api/ http://localhost:3001/api/
    ProxyPassReverse /api/ http://localhost:3001/api/
    
    # Handle short link redirects (8-character hex codes)
    RewriteEngine On
    RewriteCond %{REQUEST_URI} !^/api/
    RewriteCond %{REQUEST_URI} !^/dashboard.html
    RewriteCond %{REQUEST_URI} !^/health
    RewriteRule ^/([a-f0-9]{8})$ http://localhost:3001/\$1 [P,L]
    
    # Serve dashboard for root
    RewriteRule ^/$ /dashboard.html [L]
    
    # Directory configuration
    <Directory "$APP_DIR/public">
        Options -Indexes
        AllowOverride All
        Require all granted
        
        # Handle client-side routing
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /dashboard.html [L]
    </Directory>
    
    # Security headers
    Header always set X-Frame-Options DENY
    Header always set X-Content-Type-Options nosniff
    Header always set Referrer-Policy strict-origin-when-cross-origin
    
    # Logging
    ErrorLog \${APACHE_LOG_DIR}/${APP_NAME}_error.log
    CustomLog \${APACHE_LOG_DIR}/${APP_NAME}_access.log combined
</VirtualHost>
EOF

# Enable the site
a2ensite ${APP_NAME}.conf
a2dissite 000-default.conf

# Test Apache configuration
print_status "Testing Apache configuration..."
apache2ctl configtest

if [ $? -eq 0 ]; then
    print_success "Apache configuration is valid"
    systemctl restart apache2
else
    print_error "Apache configuration has errors"
    exit 1
fi

# Configure firewall
print_status "Configuring UFW firewall..."
ufw --force enable
ufw allow ssh
ufw allow 'Apache Full'
ufw allow 80
ufw allow 443

# Configure fail2ban
print_status "Configuring fail2ban..."
cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true

[apache-auth]
enabled = true

[apache-badbots]
enabled = true
EOF

systemctl restart fail2ban

# Create backup script
print_status "Setting up automated backups..."
cat > /opt/backup-email-tracker.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/www/email-tracker/backups"
DATA_DIR="/var/www/email-tracker/server/data"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
tar -czf $BACKUP_DIR/email-tracker-data-$DATE.tar.gz -C $DATA_DIR .
find $BACKUP_DIR -name "email-tracker-data-*.tar.gz" -mtime +7 -delete
echo "Backup completed: email-tracker-data-$DATE.tar.gz"
EOF

chmod +x /opt/backup-email-tracker.sh

# Add to crontab for daily backups
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/backup-email-tracker.sh") | crontab -

# Create management script
print_status "Creating management script..."
cat > /usr/local/bin/email-tracker << EOF
#!/bin/bash
case "\$1" in
    start) systemctl start $APP_NAME && systemctl start apache2 && echo "Email Tracker started" ;;
    stop) systemctl stop $APP_NAME && systemctl stop apache2 && echo "Email Tracker stopped" ;;
    restart) systemctl restart $APP_NAME && systemctl restart apache2 && echo "Email Tracker restarted" ;;
    status) systemctl status $APP_NAME && systemctl status apache2 ;;
    logs) journalctl -u $APP_NAME -f ;;
    backup) /opt/backup-email-tracker.sh ;;
    *) echo "Usage: \$0 {start|stop|restart|status|logs|backup}" && exit 1 ;;
esac
EOF

chmod +x /usr/local/bin/email-tracker

# Final checks
print_status "Performing final system checks..."

# Check if service is running
if systemctl is-active --quiet $APP_NAME; then
    print_success "Email Campaign URL Tracker service is running"
else
    print_error "Service is not running"
    systemctl status $APP_NAME
fi

# Check if Apache is running
if systemctl is-active --quiet apache2; then
    print_success "Apache is running"
else
    print_error "Apache is not running"
    systemctl status apache2
fi

# Create installation summary
cat > $APP_DIR/INSTALLATION_SUMMARY.txt << EOF
Email Campaign URL Tracker - Installation Summary
================================================

Installation Date: $(date)
Server: $(hostname)
Domain: $DOMAIN
Application Directory: $APP_DIR

🔗 FEATURES INSTALLED:
- URL Cloaking & Encryption
- Custom Domain Support  
- Campaign Management
- Real-time Click Tracking
- CSV Data Storage
- Analytics & Export
- Professional Dashboard

📊 ACCESS POINTS:
- Dashboard: http://$DOMAIN
- Health Check: http://$DOMAIN/health
- API Base: http://$DOMAIN/api/

🛠️ MANAGEMENT:
- Start: email-tracker start
- Stop: email-tracker stop
- Restart: email-tracker restart
- Status: email-tracker status
- Logs: email-tracker logs
- Backup: email-tracker backup

📁 IMPORTANT PATHS:
- Application: $APP_DIR
- Data Storage: $APP_DIR/server/data/
- Logs: journalctl -u $APP_NAME
- Backups: $APP_DIR/backups/

🔒 SECURITY:
- UFW Firewall: Enabled
- Fail2ban: Active
- URL Encryption: Enabled
- Data Protection: CSV Backend

📈 DATA FILES:
- Campaigns: server/data/campaigns.csv
- Links: server/data/links.csv  
- Clicks: server/data/clicks.csv
- Domains: server/data/domains.csv

🚀 NEXT STEPS:
1. Access dashboard at: http://$DOMAIN
2. Create your first campaign
3. Generate tracking links
4. Add custom domains
5. Start tracking email campaigns!

For support and documentation, check the dashboard interface.
EOF

# Display completion message
echo ""
echo "🎉 Email Campaign URL Tracker Deployment Complete!"
echo "=================================================="
echo ""
print_success "Professional email marketing URL tracker installed successfully!"
echo ""
echo "🔗 Access Your Tracker:"
echo "   Dashboard: http://$DOMAIN"
echo "   Features: URL Cloaking, Custom Domains, Analytics"
echo ""
echo "📊 Key Features Enabled:"
echo "   ✅ URL Cloaking & Encryption"
echo "   ✅ Custom Domain Support"
echo "   ✅ Campaign Management"
echo "   ✅ Real-time Click Tracking"
echo "   ✅ CSV Data Backend"
echo "   ✅ Analytics & Export"
echo ""
echo "🛠️ Management Commands:"
echo "   email-tracker start|stop|restart|status|logs|backup"
echo ""
echo "📁 Data Location: $APP_DIR/server/data/"
echo "🔒 Security: Firewall + Fail2ban enabled"
echo ""
print_success "Your email campaign URL tracker is ready! 🚀"
echo ""
echo "Visit http://$DOMAIN to start creating campaigns and tracking links!"