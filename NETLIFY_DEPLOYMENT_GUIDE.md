# Netlify Deployment Guide for AzVirt DMS

## Overview

This guide provides step-by-step instructions for deploying the AzVirt Document Management System to Netlify.

## Prerequisites

1. **Netlify Account**: Sign up at [https://www.netlify.com](https://www.netlify.com)
2. **GitHub Account**: Connect your GitHub repository to Netlify
3. **Clerk Account**: Set up authentication at [https://clerk.com](https://clerk.com)
4. **Domain**: Optional but recommended for production

## Deployment Steps

### 1. Prepare Your Repository

1. **Commit all changes** to your GitHub repository:
   ```bash
   git add .
   git commit -m "Prepare for Netlify deployment"
   git push origin main
   ```

2. **Ensure you have the following files** in your repository:
   - `netlify.toml` - Netlify configuration
   - `.env.netlify` - Environment variables template
   - Updated `client/index.html` with proper script types

### 2. Connect to Netlify

1. **Log in** to your Netlify account
2. Click **"Add new site"** > **"Import an existing project"**
3. **Connect to GitHub** and select your repository
4. **Configure build settings**:
   - Build command: `pnpm install && pnpm build`
   - Publish directory: `dist/public`
   - Node version: `20.x`

### 3. Configure Environment Variables

1. Go to **Site settings** > **Environment variables**
2. Add all required variables from `.env.netlify`:
   ```
   VITE_APP_ID=your_app_id
   VITE_ANALYTICS_ENDPOINT=https://analytics.yourdomain.com
   VITE_ANALYTICS_WEBSITE_ID=your_analytics_id
   JWT_SECRET=your_secure_secret
   DATABASE_URL=file:./db/custom.db
   OAUTH_SERVER_URL=https://api.yourdomain.com
   CLERK_SECRET_KEY=your_clerk_secret
   CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
   VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
   CLERK_FRONTEND_API=your-instance.clerk.accounts.dev
   CLERK_JWKS_URL=https://your-instance.clerk.accounts.dev/.well-known/jwks.json
   ```

### 4. Configure Domain (Optional)

1. Go to **Site settings** > **Domain management**
2. Click **"Add custom domain"** and follow instructions
3. Set up DNS records with your domain provider

### 5. Deploy Your Site

1. Click **"Deploy site"** in Netlify
2. Wait for the build process to complete
3. Your site will be available at `https://your-site-name.netlify.app`

## Post-Deployment Configuration

### 1. Set Up Analytics

1. Create an account with Umami or similar analytics service
2. Update `VITE_ANALYTICS_ENDPOINT` and `VITE_ANALYTICS_WEBSITE_ID` in Netlify environment variables

### 2. Configure Authentication

1. Set up Clerk authentication in production mode
2. Update all Clerk-related environment variables with production keys
3. Configure allowed domains in Clerk dashboard

### 3. Database Configuration

1. For production, consider using a cloud database instead of SQLite
2. Update `DATABASE_URL` to point to your production database
3. Run database migrations:
   ```bash
   pnpm db:push
   ```

## Troubleshooting

### Common Issues

1. **Build failures**:
   - Check build logs for specific errors
   - Ensure all dependencies are listed in `package.json`
   - Verify Node.js version matches requirements

2. **Environment variable issues**:
   - Double-check all variables are correctly set in Netlify
   - Ensure sensitive variables are not exposed in client-side code

3. **Authentication problems**:
   - Verify Clerk API keys are correct
   - Check CORS settings in Clerk dashboard
   - Ensure redirect URIs are properly configured

### Debugging Tips

1. **Check Netlify build logs** for detailed error information
2. **Test locally** before deploying:
   ```bash
   pnpm build
   pnpm start
   ```
3. **Use Netlify CLI** for local testing:
   ```bash
   npm install -g netlify-cli
   netlify dev
   ```

## Maintenance

### Updating Your Site

1. Make changes to your codebase
2. Test locally
3. Commit and push changes:
   ```bash
   git add .
   git commit -m "Your changes"
   git push origin main
   ```
4. Netlify will automatically deploy updates

### Monitoring

1. Set up Netlify alerts for deployment failures
2. Monitor site performance in Netlify dashboard
3. Use analytics to track user behavior

## Security Best Practices

1. **Keep dependencies updated**
2. **Use strong, unique secrets** for all environment variables
3. **Enable HTTPS** (automatically provided by Netlify)
4. **Set up proper CORS headers**
5. **Regularly audit** environment variables and access controls

## Performance Optimization

1. **Enable Netlify's CDN** for faster content delivery
2. **Set up caching headers** for static assets
3. **Use Netlify's edge functions** for performance-critical routes
4. **Optimize images** and other media assets

## Support

For additional help with Netlify deployment:
- Netlify Documentation: [https://docs.netlify.com](https://docs.netlify.com)
- Netlify Community: [https://community.netlify.com](https://community.netlify.com)
- Netlify Support: [https://www.netlify.com/support](https://www.netlify.com/support)
