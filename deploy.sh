#!/bin/bash

# ClickTracker Pro Deployment Script for Ubuntu with Apache
# This script sets up the URL tracking system on Ubuntu server

set -e

echo "🚀 Starting ClickTracker Pro Deployment..."

# Configuration
APP_NAME="clicktracker-pro"
APP_USER="www-data"
APP_DIR="/var/www/clicktracker-pro"
DOMAIN="your-domain.com"
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

# Update system packages
print_status "Updating system packages..."
apt update && apt upgrade -y

# Install required packages
print_status "Installing required packages..."
apt install -y curl wget git apache2 ufw fail2ban certbot python3-certbot-apache

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

# Clone or copy application files (assuming files are in current directory)
print_status "Setting up application files..."
if [ -d "/tmp/clicktracker-pro" ]; then
    cp -r /tmp/clicktracker-pro/* $APP_DIR/
else
    print_warning "Application files not found in /tmp/clicktracker-pro"
    print_status "Please ensure your application files are available"
fi

# Set up package.json if not exists
if [ ! -f "package.json" ]; then
    print_status "Creating package.json..."
    cat > package.json << 'EOF'
{
  "name": "clicktracker-pro",
  "version": "1.0.0",
  "main": "server/app.js",
  "scripts": {
    "start": "node server/app.js",
    "build": "npm install --production"
  },
  "dependencies": {
    "express": "^4.18.2",
    "csv-parse": "^5.4.0",
    "csv-stringify": "^6.4.0"
  }
}
EOF
fi

# Install application dependencies
print_status "Installing application dependencies..."
npm install --production

# Create necessary directories
print_status "Creating application directories..."
mkdir -p server/data
mkdir -p logs

# Set up server/app.js if not exists
if [ ! -f "server/app.js" ]; then
    print_status "Creating basic server file..."
    mkdir -p server
    cat > server/app.js << 'EOF'
const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { parse } = require('csv-parse');
const { stringify } = require('csv-stringify');

const app = express();
const PORT = process.env.PORT || 3001;

// Basic server setup
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Basic route
app.get('/', (req, res) => {
    res.send('<h1>ClickTracker Pro</h1><p>URL tracking system is running!</p>');
});

app.listen(PORT, () => {
    console.log(`ClickTracker Pro running on port ${PORT}`);
});
EOF
fi

# Create public directory with basic HTML if not exists
if [ ! -d "public" ]; then
    print_status "Creating public directory..."
    mkdir -p public
    cat > public/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ClickTracker Pro</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px; text-align: center; }
        .status { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔗 ClickTracker Pro</h1>
        <p>Professional URL Click Tracking & Redirect System</p>
    </div>
    <div class="status">
        <h3>✅ System Status: Online</h3>
        <p>Your ClickTracker Pro installation is ready!</p>
    </div>
</body>
</html>
EOF
fi

# Set permissions
print_status "Setting file permissions..."
chown -R $APP_USER:$APP_USER $APP_DIR
chmod -R 755 $APP_DIR
chmod 644 $APP_DIR/server/app.js

# Create systemd service
print_status "Creating systemd service..."
cat > /etc/systemd/system/${APP_NAME}.service << EOF
[Unit]
Description=ClickTracker Pro - URL Tracking System
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

# Logging
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=$APP_NAME

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd and enable service
print_status "Enabling ClickTracker Pro service..."
systemctl daemon-reload
systemctl enable $APP_NAME
systemctl start $APP_NAME

# Configure Apache
print_status "Configuring Apache..."

# Enable required modules
a2enmod rewrite
a2enmod proxy
a2enmod proxy_http
a2enmod ssl
a2enmod headers

# Create Apache virtual host configuration
cat > /etc/apache2/sites-available/${APP_NAME}.conf << EOF
# Global Apache configuration
ServerTokens Prod
ServerSignature Off

<VirtualHost *:80>
    ServerName $DOMAIN
    ServerAlias www.$DOMAIN
    DocumentRoot $APP_DIR/public
    
    # Redirect API and short links to Node.js
    ProxyPreserveHost On
    ProxyPass /api/ http://localhost:3001/api/
    ProxyPassReverse /api/ http://localhost:3001/api/
    
    # Handle short links (single path segments)
    RewriteEngine On
    RewriteRule ^/([a-zA-Z0-9]+)$ http://localhost:3001/\$1 [P,L]
    
    # Security headers
    Header always set X-Frame-Options DENY
    Header always set X-Content-Type-Options nosniff
    Header always set Referrer-Policy strict-origin-when-cross-origin
    
    # Logging
    ErrorLog \${APACHE_LOG_DIR}/${APP_NAME}_error.log
    CustomLog \${APACHE_LOG_DIR}/${APP_NAME}_access.log combined
</VirtualHost>

# HTTPS Virtual Host (will be configured by Certbot)
<VirtualHost *:443>
    ServerName $DOMAIN
    ServerAlias www.$DOMAIN
    DocumentRoot $APP_DIR/public
    
    # SSL configuration will be added by Certbot
    
    # Redirect API and short links to Node.js
    ProxyPreserveHost On
    ProxyPass /api/ http://localhost:3001/api/
    ProxyPassReverse /api/ http://localhost:3001/api/
    
    # Handle short links
    RewriteEngine On
    RewriteRule ^/([a-zA-Z0-9]+)$ http://localhost:3001/\$1 [P,L]
    
    # Security headers
    Header always set X-Frame-Options DENY
    Header always set X-Content-Type-Options nosniff
    Header always set Referrer-Policy strict-origin-when-cross-origin
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
    
    # Logging
    ErrorLog \${APACHE_LOG_DIR}/${APP_NAME}_ssl_error.log
    CustomLog \${APACHE_LOG_DIR}/${APP_NAME}_ssl_access.log combined
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

[apache-noscript]
enabled = true

[apache-overflows]
enabled = true
EOF

systemctl restart fail2ban

# Create log rotation
print_status "Setting up log rotation..."
cat > /etc/logrotate.d/${APP_NAME} << EOF
$APP_DIR/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 $APP_USER $APP_USER
    postrotate
        systemctl reload $APP_NAME
    endscript
}
EOF

# Create backup script
print_status "Creating backup script..."
mkdir -p /opt/backups
cat > /opt/backups/backup-${APP_NAME}.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/backups"
APP_DIR="/var/www/clicktracker-pro"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup
tar -czf $BACKUP_DIR/clicktracker-backup-$DATE.tar.gz -C $APP_DIR server/data

# Keep only last 7 backups
find $BACKUP_DIR -name "clicktracker-backup-*.tar.gz" -mtime +7 -delete

echo "Backup completed: clicktracker-backup-$DATE.tar.gz"
EOF

chmod +x /opt/backups/backup-${APP_NAME}.sh

# Add to crontab
print_status "Setting up automated backups..."
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/backups/backup-${APP_NAME}.sh") | crontab -

# Create maintenance script
print_status "Creating maintenance script..."
cat > /usr/local/bin/${APP_NAME}-maintenance << EOF
#!/bin/bash

case "\$1" in
    start)
        systemctl start $APP_NAME
        systemctl start apache2
        echo "ClickTracker Pro started"
        ;;
    stop)
        systemctl stop $APP_NAME
        systemctl stop apache2
        echo "ClickTracker Pro stopped"
        ;;
    restart)
        systemctl restart $APP_NAME
        systemctl restart apache2
        echo "ClickTracker Pro restarted"
        ;;
    status)
        systemctl status $APP_NAME
        systemctl status apache2
        ;;
    logs)
        journalctl -u $APP_NAME -f
        ;;
    backup)
        /opt/backups/backup-${APP_NAME}.sh
        ;;
    update)
        cd $APP_DIR
        npm update
        systemctl restart $APP_NAME
        echo "ClickTracker Pro updated"
        ;;
    *)
        echo "Usage: \$0 {start|stop|restart|status|logs|backup|update}"
        exit 1
        ;;
esac
EOF

chmod +x /usr/local/bin/${APP_NAME}-maintenance

# SSL Certificate setup (optional)
print_status "Setting up SSL certificate..."
read -p "Do you want to set up SSL certificate with Let's Encrypt? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_status "Please ensure your domain points to this server before continuing..."
    read -p "Enter your domain name: " DOMAIN
    read -p "Enter your email for SSL certificate: " EMAIL
    
    # Update Apache configuration with actual domain
    sed -i "s/your-domain.com/$DOMAIN/g" /etc/apache2/sites-available/${APP_NAME}.conf
    systemctl reload apache2
    
    # Get SSL certificate
    certbot --apache -d $DOMAIN -d www.$DOMAIN --email $EMAIL --agree-tos --non-interactive
    
    if [ $? -eq 0 ]; then
        print_success "SSL certificate installed successfully"
        
        # Set up auto-renewal
        (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -
    else
        print_warning "SSL certificate installation failed. You can try again later with: certbot --apache -d $DOMAIN"
    fi
fi

# Final checks
print_status "Performing final checks..."

# Check if service is running
if systemctl is-active --quiet $APP_NAME; then
    print_success "ClickTracker Pro service is running"
else
    print_error "ClickTracker Pro service is not running"
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
print_status "Creating installation summary..."
cat > $APP_DIR/INSTALLATION_SUMMARY.txt << EOF
ClickTracker Pro Installation Summary
=====================================

Installation Date: $(date)
Server: $(hostname)
Application Directory: $APP_DIR
Domain: $DOMAIN

Services:
- ClickTracker Pro: $APP_NAME.service
- Web Server: Apache2
- Port: 3001 (internal), 80/443 (external)

Management Commands:
- Start: ${APP_NAME}-maintenance start
- Stop: ${APP_NAME}-maintenance stop  
- Restart: ${APP_NAME}-maintenance restart
- Status: ${APP_NAME}-maintenance status
- View Logs: ${APP_NAME}-maintenance logs
- Backup: ${APP_NAME}-maintenance backup
- Update: ${APP_NAME}-maintenance update

Configuration Files:
- Apache: /etc/apache2/sites-available/${APP_NAME}.conf
- Service: /etc/systemd/system/${APP_NAME}.service
- Application: $APP_DIR

Log Files:
- Application: journalctl -u $APP_NAME
- Apache Access: /var/log/apache2/${APP_NAME}_access.log
- Apache Error: /var/log/apache2/${APP_NAME}_error.log

Backup:
- Location: /opt/backups/
- Automated: Daily at 2 AM

Security:
- UFW Firewall: Enabled
- Fail2ban: Enabled
- SSL: $(if [ -f "/etc/letsencrypt/live/$DOMAIN/cert.pem" ]; then echo "Enabled"; else echo "Not configured"; fi)

Data Storage:
- CSV Files: $APP_DIR/server/data/
- Links: links.csv
- Clicks: clicks.csv  
- Domains: domains.csv
EOF

# Display completion message
echo ""
echo "🎉 ClickTracker Pro Deployment Complete!"
echo "==========================================="
echo ""
print_success "Installation completed successfully!"
echo ""
echo "📊 Application Details:"
echo "   URL: http://$DOMAIN (or https:// if SSL configured)"
echo "   Admin Panel: http://$DOMAIN"
echo "   API Endpoint: http://$DOMAIN/api/"
echo ""
echo "🔧 Management:"
echo "   Service: systemctl {start|stop|restart} $APP_NAME"
echo "   Quick commands: ${APP_NAME}-maintenance {start|stop|restart|status|logs}"
echo ""
echo "📁 Important Paths:"
echo "   Application: $APP_DIR"
echo "   Data: $APP_DIR/server/data/"
echo "   Logs: journalctl -u $APP_NAME"
echo ""
echo "🔒 Security:"
echo "   Firewall: UFW enabled"
echo "   Fail2ban: Active"
echo "   SSL: $(if [ -f "/etc/letsencrypt/live/$DOMAIN/cert.pem" ]; then echo "✅ Configured"; else echo "❌ Not configured"; fi)"
echo ""
echo "📋 Next Steps:"
echo "1. Access your ClickTracker Pro at: http://$DOMAIN"
echo "2. Create your first tracking link"
echo "3. Configure custom domains in the dashboard"
echo "4. Set up email campaigns with your tracking links"
echo ""
print_warning "Remember to:"
echo "   - Configure your domain DNS to point to this server"
echo "   - Update the domain in Apache config if needed"
echo "   - Review security settings"
echo "   - Set up monitoring"
echo ""
echo "📖 Full installation details saved to: $APP_DIR/INSTALLATION_SUMMARY.txt"
echo ""
print_success "Deployment completed! 🚀"
EOF

chmod +x deploy.sh