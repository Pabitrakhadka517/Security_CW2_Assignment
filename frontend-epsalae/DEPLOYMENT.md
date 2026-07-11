# 🚀 Deployment Guide - Epasaley Frontend

## Prerequisites
- Node.js 18+ installed
- npm or yarn package manager
- Git installed

## Build for Production

```bash
# Install dependencies
npm install

# Build for production
npm run build
```

This creates a `dist/` folder with optimized production files.

---

## Deployment Options

### Option 1: Vercel (Recommended) ⭐

1. **Connect Repository**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub/GitLab repository
   - Select the `frontend` folder as root directory

2. **Configure Build Settings**
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`

3. **Environment Variables**
   - Add `VITE_API_BASE_URL` = `https://backend-epasal.onrender.com`

4. **Custom Domain**
   - Go to Project Settings → Domains
   - Add your domain (e.g., `epasaley.com`)
   - Configure DNS with your domain provider:
     - Add an A record pointing to Vercel's IP
     - Or add a CNAME record pointing to your Vercel domain

---

### Option 2: Netlify

1. **Connect Repository**
   - Go to [netlify.com](https://netlify.com)
   - Click "New site from Git"
   - Select your repository

2. **Build Settings**
   - Build Command: `npm run build`
   - Publish Directory: `dist`
   - Base Directory: `frontend` (if in subdirectory)

3. **Environment Variables**
   - Go to Site Settings → Environment Variables
   - Add `VITE_API_BASE_URL` = `https://backend-epasal.onrender.com`

4. **Custom Domain**
   - Go to Domain Settings
   - Add your custom domain
   - Update DNS with provided nameservers

---

### Option 3: Render

1. **Create Static Site**
   - Go to [render.com](https://render.com)
   - New → Static Site
   - Connect your repository

2. **Build Settings**
   - Build Command: `npm install && npm run build`
   - Publish Directory: `dist`

3. **Environment Variables**
   - Add `VITE_API_BASE_URL` = `https://backend-epasal.onrender.com`

4. **Add Redirect Rule**
   - Rewrite: `/*` → `/index.html` (status 200)

---

### Option 4: Firebase Hosting

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize project
firebase init hosting

# Select options:
# - Public directory: dist
# - Single-page app: Yes
# - Overwrite index.html: No

# Deploy
npm run build
firebase deploy
```

---

### Option 5: Manual (VPS/cPanel)

1. Build the project locally:
   ```bash
   npm run build
   ```

2. Upload the contents of `dist/` folder to your server's public directory

3. Configure web server for SPA:

   **Nginx:**
   ```nginx
   location / {
     try_files $uri $uri/ /index.html;
   }
   ```

   **Apache (.htaccess):**
   ```apache
   <IfModule mod_rewrite.c>
     RewriteEngine On
     RewriteBase /
     RewriteRule ^index\.html$ - [L]
     RewriteCond %{REQUEST_FILENAME} !-f
     RewriteCond %{REQUEST_FILENAME} !-d
     RewriteRule . /index.html [L]
   </IfModule>
   ```

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Backend API URL | `https://backend-epasal.onrender.com` |
| `VITE_APP_NAME` | Application name | `Epasaley` |
| `VITE_APP_DESCRIPTION` | App description | `Nepal's Trusted Online Store` |

---

## Custom Domain Setup

### DNS Configuration

For `epasaley.com`:

| Type | Name | Value |
|------|------|-------|
| A | @ | (Hosting provider IP) |
| CNAME | www | your-app.vercel.app |

### SSL Certificate
Most hosting platforms (Vercel, Netlify, Render) provide free SSL certificates automatically.

---

## Post-Deployment Checklist

- [ ] Verify all pages load correctly
- [ ] Test checkout flow
- [ ] Verify images load from Cloudinary
- [ ] Check mobile responsiveness
- [ ] Test admin panel login
- [ ] Verify API connections work
- [ ] Check SSL certificate is active
- [ ] Test all payment methods (Khalti, eSewa, COD)
- [ ] Monitor for console errors

---

## Troubleshooting

### Page Not Found on Refresh
- Ensure SPA redirect rules are configured
- Vercel/Netlify: Check vercel.json or _redirects file

### API Connection Issues
- Verify `VITE_API_BASE_URL` is set correctly
- Check CORS settings on backend
- Ensure backend is running and accessible

### Images Not Loading
- Check Cloudinary URLs are correct
- Verify placeholder images are accessible
- Check browser console for errors

---

## Performance Tips

1. **Enable GZIP** - Most platforms do this automatically
2. **CDN** - Vercel/Netlify include CDN by default
3. **Image Optimization** - Cloudinary handles this
4. **Caching** - Asset caching is configured in vercel.json/netlify.toml

---

## Support

For deployment issues, check:
- [Vercel Docs](https://vercel.com/docs)
- [Netlify Docs](https://docs.netlify.com)
- [Vite Deployment Guide](https://vite.dev/guide/static-deploy.html)
