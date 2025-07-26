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

// Serve static files - use dist in production, public in development
const staticPath = fs.existsSync(path.join(__dirname, '../dist')) 
  ? path.join(__dirname, '../dist')
  : path.join(__dirname, '../public');
app.use(express.static(staticPath));

// Data directories
const DATA_DIR = path.join(__dirname, 'data');
const LINKS_FILE = path.join(DATA_DIR, 'links.csv');
const CLICKS_FILE = path.join(DATA_DIR, 'clicks.csv');
const DOMAINS_FILE = path.join(DATA_DIR, 'domains.csv');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize CSV files if they don't exist
const initializeCSVFiles = () => {
  if (!fs.existsSync(LINKS_FILE)) {
    const linksHeader = 'id,original_url,short_code,campaign,clicks,cloaked,domain,created_at\n';
    fs.writeFileSync(LINKS_FILE, linksHeader);
  }
  
  if (!fs.existsSync(CLICKS_FILE)) {
    const clicksHeader = 'id,link_id,campaign,ip_address,user_agent,country,timestamp,referrer\n';
    fs.writeFileSync(CLICKS_FILE, clicksHeader);
  }
  
  if (!fs.existsSync(DOMAINS_FILE)) {
    const domainsHeader = 'domain,verified,added_at\n';
    fs.writeFileSync(DOMAINS_FILE, domainsHeader);
  }
};

initializeCSVFiles();

// Utility functions
const generateShortCode = () => {
  return crypto.randomBytes(4).toString('hex');
};

const encryptUrl = (url) => {
  const cipher = crypto.createCipher('aes192', 'secretkey');
  let encrypted = cipher.update(url, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
};

const decryptUrl = (encryptedUrl) => {
  try {
    const decipher = crypto.createDecipher('aes192', 'secretkey');
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
  return req.headers['x-forwarded-for'] || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         (req.connection.socket ? req.connection.socket.remoteAddress : null);
};

const getCountryFromIP = (ip) => {
  // Simplified geolocation - in production, use a service like MaxMind
  if (ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
    return 'Local';
  }
  return 'Unknown'; // In production, implement proper geolocation
};

// API Routes

// Get stats
app.get('/api/stats', async (req, res) => {
  try {
    const links = await readCSV(LINKS_FILE);
    const clicks = await readCSV(CLICKS_FILE);
    const domains = await readCSV(DOMAINS_FILE);
    
    const today = new Date().toISOString().split('T')[0];
    const todayClicks = clicks.filter(click => 
      click.timestamp.startsWith(today)
    ).length;
    
    const totalClicks = clicks.length;
    
    res.json({
      totalLinks: links.length,
      totalClicks,
      totalDomains: domains.length,
      todayClicks
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Get all links
app.get('/api/links', async (req, res) => {
  try {
    const links = await readCSV(LINKS_FILE);
    res.json(links.map(link => ({
      ...link,
      clicks: parseInt(link.clicks) || 0,
      cloaked: link.cloaked === 'true'
    })));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch links' });
  }
});

// Create new link
app.post('/api/links', async (req, res) => {
  try {
    const { original_url, campaign, cloaked = false, domain = '' } = req.body;
    const id = crypto.randomUUID();
    const short_code = generateShortCode();
    const created_at = new Date().toISOString();
    
    const newLink = {
      id,
      original_url,
      short_code,
      campaign,
      clicks: 0,
      cloaked: cloaked.toString(),
      domain,
      created_at
    };
    
    await appendToCSV(LINKS_FILE, newLink);
    res.json(newLink);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create link' });
  }
});

// Delete link
app.delete('/api/links/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const links = await readCSV(LINKS_FILE);
    const filteredLinks = links.filter(link => link.id !== id);
    
    await writeCSV(LINKS_FILE, filteredLinks, 
      ['id', 'original_url', 'short_code', 'campaign', 'clicks', 'cloaked', 'domain', 'created_at']);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete link' });
  }
});

// Get domains
app.get('/api/domains', async (req, res) => {
  try {
    const domains = await readCSV(DOMAINS_FILE);
    res.json(domains.map(domain => ({
      ...domain,
      verified: domain.verified === 'true'
    })));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch domains' });
  }
});

// Add domain
app.post('/api/domains', async (req, res) => {
  try {
    const { domain } = req.body;
    const added_at = new Date().toISOString();
    
    const newDomain = {
      domain,
      verified: 'false',
      added_at
    };
    
    await appendToCSV(DOMAINS_FILE, newDomain);
    res.json(newDomain);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add domain' });
  }
});

// Verify domain
app.post('/api/domains/:domain/verify', async (req, res) => {
  try {
    const { domain } = req.params;
    const domains = await readCSV(DOMAINS_FILE);
    
    const updatedDomains = domains.map(d => 
      d.domain === domain ? { ...d, verified: 'true' } : d
    );
    
    await writeCSV(DOMAINS_FILE, updatedDomains, ['domain', 'verified', 'added_at']);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to verify domain' });
  }
});

// Delete domain
app.delete('/api/domains/:domain', async (req, res) => {
  try {
    const { domain } = req.params;
    const domains = await readCSV(DOMAINS_FILE);
    const filteredDomains = domains.filter(d => d.domain !== domain);
    
    await writeCSV(DOMAINS_FILE, filteredDomains, ['domain', 'verified', 'added_at']);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete domain' });
  }
});

// Get analytics
app.get('/api/analytics', async (req, res) => {
  try {
    const { range = '7d' } = req.query;
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
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
    
    const filteredClicks = clicks.filter(click => 
      new Date(click.timestamp) >= startDate
    );
    
    res.json(filteredClicks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Export analytics
app.get('/api/analytics/export', async (req, res) => {
  try {
    const { range = '7d' } = req.query;
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
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
    
    const filteredClicks = clicks.filter(click => 
      new Date(click.timestamp) >= startDate
    );
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=analytics-${range}.csv`);
    
    stringify(filteredClicks, { header: true }, (err, output) => {
      if (err) {
        res.status(500).json({ error: 'Failed to export data' });
      } else {
        res.send(output);
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to export analytics' });
  }
});

// Link redirect handler
app.get('/:shortCode', async (req, res) => {
  try {
    const { shortCode } = req.params;
    const links = await readCSV(LINKS_FILE);
    
    const link = links.find(l => l.short_code === shortCode);
    
    if (!link) {
      return res.status(404).send('Link not found');
    }
    
    // Track the click
    const clickId = crypto.randomUUID();
    const ip = getClientIP(req);
    const userAgent = req.headers['user-agent'] || '';
    const country = getCountryFromIP(ip);
    const referrer = req.headers.referer || '';
    const timestamp = new Date().toISOString();
    
    const clickData = {
      id: clickId,
      link_id: link.id,
      campaign: link.campaign,
      ip_address: ip,
      user_agent: userAgent,
      country,
      timestamp,
      referrer
    };
    
    await appendToCSV(CLICKS_FILE, clickData);
    
    // Update click count
    const updatedLinks = links.map(l => 
      l.id === link.id ? { ...l, clicks: (parseInt(l.clicks) || 0) + 1 } : l
    );
    
    await writeCSV(LINKS_FILE, updatedLinks, 
      ['id', 'original_url', 'short_code', 'campaign', 'clicks', 'cloaked', 'domain', 'created_at']);
    
    // Handle cloaking
    if (link.cloaked === 'true') {
      // For cloaked links, serve a page that redirects via JavaScript
      const cloakingPage = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Redirecting...</title>
          <meta name="robots" content="noindex, nofollow">
        </head>
        <body>
          <script>
            window.location.href = "${link.original_url}";
          </script>
          <noscript>
            <meta http-equiv="refresh" content="0;url=${link.original_url}">
          </noscript>
        </body>
        </html>
      `;
      res.send(cloakingPage);
    } else {
      // Direct redirect
      res.redirect(link.original_url);
    }
  } catch (error) {
    console.error('Redirect error:', error);
    res.status(500).send('Internal server error');
  }
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  const indexPath = fs.existsSync(path.join(__dirname, '../dist/index.html'))
    ? path.join(__dirname, '../dist/index.html')
    : path.join(__dirname, '../index.html');
  
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Application not built yet. Please run the build process.');
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});