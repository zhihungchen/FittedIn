# Nginx Configuration for FittedIn

This document provides Nginx configuration templates for FittedIn. You should place these configurations in your own Nginx configuration directory (typically `/etc/nginx/sites-available/` on Ubuntu/Debian).

## Overview

FittedIn uses Nginx as a reverse proxy to:
- Serve static frontend files
- Proxy API requests to the Node.js backend (running on port 3000)
- Handle SSL/TLS termination (when configured)
- Provide rate limiting and security headers

## Configuration Files

### 1. HTTP-Only Configuration (Initial Setup)

Use this configuration when you haven't set up SSL certificates yet.

**File**: `/etc/nginx/sites-available/fittedin`

```nginx
# FittedIn Nginx Configuration (HTTP only - for initial setup without SSL)
# The Node.js backend runs on the EC2 host (managed by PM2) and listens on port 3000.

# Upstream backend server
upstream fittedin_backend {
    server 127.0.0.1:3000;
    keepalive 64;
}

# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=general_limit:10m rate=30r/s;

# HTTP server
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;  # Replace with your domain or use _ for any domain

    # Logging
    access_log /var/log/nginx/fittedin-access.log;
    error_log /var/log/nginx/fittedin-error.log;

    # Root directory for static files
    root /var/www/fittedin/frontend/public;
    index index.html;

    # Client body size limit
    client_max_body_size 10M;
    client_body_timeout 60s;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml font/truetype font/opentype application/vnd.ms-fontobject image/svg+xml;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https: http:; connect-src 'self' https: http:; frame-ancestors 'self';" always;

    # API endpoints - proxy to Node.js backend
    location /api {
        limit_req zone=api_limit burst=20 nodelay;
        
        proxy_pass http://fittedin_backend;
        proxy_http_version 1.1;
        
        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $server_name;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Buffering
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
        proxy_busy_buffers_size 8k;
        
        # WebSocket support (if needed in future)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Health check endpoint
    location /api/health {
        access_log off;
        proxy_pass http://fittedin_backend;
        proxy_set_header Host $host;
    }

    # Static files with caching
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        limit_req zone=general_limit burst=50 nodelay;
        
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
        
        try_files $uri =404;
    }

    # HTML files - no cache
    location ~* \.html$ {
        limit_req zone=general_limit burst=50 nodelay;
        
        expires -1;
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0";
        
        try_files $uri =404;
    }

    # Main SPA routing - serve index.html for all routes
    location / {
        limit_req zone=general_limit burst=50 nodelay;
        
        try_files $uri $uri/ /index.html;
        
        # Security headers for HTML
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
    }

    # Deny access to hidden files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
```

### 2. HTTPS Configuration (Production with SSL)

Use this configuration when you have SSL certificates set up.

**File**: `/etc/nginx/sites-available/fittedin`

```nginx
# FittedIn Nginx Configuration (HTTPS with SSL)
# The Node.js backend runs on the EC2 host (managed by PM2) and listens on port 3000.

# Upstream backend server
upstream fittedin_backend {
    server 127.0.0.1:3000;
    keepalive 64;
}

# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=general_limit:10m rate=30r/s;

# HTTP to HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;  # Replace with your domain

    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Redirect all HTTP to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;  # Replace with your domain

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;  # Replace with your certificate path
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;  # Replace with your key path
    
    # SSL Security Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_session_tickets off;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https: http:; connect-src 'self' https: http:; frame-ancestors 'self';" always;

    # Logging
    access_log /var/log/nginx/fittedin-access.log;
    error_log /var/log/nginx/fittedin-error.log;

    # Root directory for static files
    root /var/www/fittedin/frontend/public;
    index index.html;

    # Client body size limit
    client_max_body_size 10M;
    client_body_timeout 60s;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml font/truetype font/opentype application/vnd.ms-fontobject image/svg+xml;

    # API endpoints - proxy to Node.js backend
    location /api {
        limit_req zone=api_limit burst=20 nodelay;
        
        proxy_pass http://fittedin_backend;
        proxy_http_version 1.1;
        
        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $server_name;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Buffering
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
        proxy_busy_buffers_size 8k;
        
        # WebSocket support (if needed in future)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Health check endpoint
    location /api/health {
        access_log off;
        proxy_pass http://fittedin_backend;
        proxy_set_header Host $host;
    }

    # Static files with caching
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        limit_req zone=general_limit burst=50 nodelay;
        
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
        
        try_files $uri =404;
    }

    # HTML files - no cache
    location ~* \.html$ {
        limit_req zone=general_limit burst=50 nodelay;
        
        expires -1;
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0";
        
        try_files $uri =404;
    }

    # Main SPA routing - serve index.html for all routes
    location / {
        limit_req zone=general_limit burst=50 nodelay;
        
        try_files $uri $uri/ /index.html;
        
        # Security headers for HTML
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
    }

    # Deny access to hidden files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
```

## Setup Instructions

### Step 1: Create Configuration File

```bash
# Copy the appropriate configuration above to your Nginx sites-available directory
sudo nano /etc/nginx/sites-available/fittedin

# Or if you prefer, create it directly:
sudo tee /etc/nginx/sites-available/fittedin > /dev/null << 'EOF'
# Paste the configuration here
EOF
```

### Step 2: Update Configuration

Replace the following placeholders in the configuration:
- `yourdomain.com` → Your actual domain name
- `/var/www/fittedin/frontend/public` → Path to your FittedIn frontend static files
- SSL certificate paths (if using HTTPS)

### Step 3: Enable Configuration

```bash
# Create symlink to enable the site
sudo ln -s /etc/nginx/sites-available/fittedin /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default
```

### Step 4: Test and Reload

```bash
# Test configuration
sudo nginx -t

# If test passes, reload Nginx
sudo systemctl reload nginx
```

## Important Paths

- **Frontend static files**: `/var/www/fittedin/frontend/public`
- **Backend API**: `http://127.0.0.1:3000` (Node.js app managed by PM2)
- **Logs**: `/var/log/nginx/fittedin-access.log` and `/var/log/nginx/fittedin-error.log`

## SSL Certificate Setup

To set up SSL certificates with Let's Encrypt:

```bash
# Install Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Certbot will automatically update your Nginx configuration
```

## Troubleshooting

### Check Nginx Status
```bash
sudo systemctl status nginx
```

### View Error Logs
```bash
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/fittedin-error.log
```

### Test Configuration
```bash
sudo nginx -t
```

### Reload Configuration
```bash
sudo systemctl reload nginx
```

## Multiple Applications

If you're hosting multiple applications on the same EC2 instance, you can:
1. Create separate configuration files for each app (e.g., `fittedin`, `app2`, `app3`)
2. Use different `server_name` directives to route by domain
3. Or use different ports if using IP-based access

Example for multiple apps:
```nginx
# In /etc/nginx/sites-available/fittedin
server_name fittedin.yourdomain.com;

# In /etc/nginx/sites-available/app2
server_name app2.yourdomain.com;
```

## Additional Resources

- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [SSL Setup Guide](./SSL_SETUP.md)

