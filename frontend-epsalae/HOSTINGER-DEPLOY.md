# 🚀 Hostinger Deployment Guide - Epasaley Frontend

## Step 1: Build Your Project Locally

```bash
# Navigate to frontend folder
cd frontend

# Install dependencies
npm install

# Build for production
npm run build
```

This creates a `dist/` folder with your production files.

---

## Step 2: Upload to Hostinger

### Option A: Using File Manager (Easiest)

1. **Login to Hostinger** → Go to hPanel
2. **Open File Manager**
3. **Navigate to** `public_html` folder
4. **Delete** existing files (if any)
5. **Upload** all contents from your local `dist/` folder:
   - `index.html`
   - `assets/` folder
   - All other files

### Option B: Using FTP Client

1. **Get FTP Credentials** from Hostinger hPanel → Files → FTP Accounts
2. **Download FileZilla** or similar FTP client
3. **Connect using:**
   - Host: Your domain or FTP hostname
   - Username: Your FTP username
   - Password: Your FTP password
   - Port: 21
4. **Upload** contents of `dist/` to `public_html/`

---

## Step 3: Configure .htaccess for SPA Routing

Create a `.htaccess` file in `public_html/` with this content:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  
  # Handle React Router - redirect all requests to index.html
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteCond %{REQUEST_FILENAME} !-l
  RewriteRule . /index.html [L]
</IfModule>

# Enable GZIP compression
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/css text/javascript application/javascript application/json
</IfModule>

# Cache static assets
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/gif "access plus 1 year"
  ExpiresByType image/svg+xml "access plus 1 year"
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
</IfModule>

# Security headers
<IfModule mod_headers.c>
  Header set X-Content-Type-Options "nosniff"
  Header set X-Frame-Options "DENY"
  Header set X-XSS-Protection "1; mode=block"
</IfModule>
```

---

## Step 4: SSL Certificate (HTTPS)

1. Go to **hPanel** → **SSL**
2. **Install Free SSL** (Let's Encrypt)
3. Wait for installation (usually takes a few minutes)
4. **Force HTTPS** - Enable this option

---

## Step 5: Point Domain (if using custom domain)

### If domain is with Hostinger:
1. Go to **hPanel** → **Domains**
2. Select your domain
3. It should auto-point to your hosting

### If domain is elsewhere:
Update your domain's DNS to point to Hostinger:
1. Get Hostinger nameservers from hPanel
2. Update at your domain registrar:
   - `ns1.dns-parking.com`
   - `ns2.dns-parking.com`

Or use A record:
- Get your hosting IP from hPanel
- Add A record: `@` → `YOUR_HOSTINGER_IP`
- Add A record: `www` → `YOUR_HOSTINGER_IP`

---

## Quick Deployment Script

Run this locally before uploading:

```bash
# Build the project
npm run build

# The dist folder is ready for upload
```

Then upload the `dist/` folder contents to Hostinger's `public_html/`.

---

## Folder Structure on Hostinger

After upload, your `public_html/` should look like:

```
public_html/
├── .htaccess          (create this)
├── index.html
└── assets/
    ├── index-xxxxx.js
    ├── index-xxxxx.css
    ├── react-vendor-xxxxx.js
    ├── ui-vendor-xxxxx.js
    ├── state-vendor-xxxxx.js
    ├── logo1080-xxxxx.png
    └── webicon-xxxxx.png
```

---

## Troubleshooting

### Page shows 404 on refresh
→ Make sure `.htaccess` file exists in `public_html/`

### Site not loading
→ Clear browser cache or try incognito mode

### Images not showing
→ Check file paths are correct and files are uploaded

### API not connecting
→ Backend URL is hardcoded, should work automatically

---

## Post-Deployment Checklist

- [ ] Homepage loads correctly
- [ ] All pages work (Products, Cart, Checkout)
- [ ] Images load from Cloudinary
- [ ] Admin panel works (/admin)
- [ ] SSL is active (https://)
- [ ] Mobile responsive works
- [ ] Payment flow works (Khalti, eSewa, COD)
