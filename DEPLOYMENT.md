# Azure Deployment Guide

This guide will help you deploy the Asset Risk Management Dashboard to Azure Static Web Apps.

## Prerequisites

- An Azure account (free tier works)
- A GitHub account
- Your code pushed to a GitHub repository

## Option 1: Deploy via Azure Portal (Recommended for first-time setup)

1. **Push your code to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

2. **Create Azure Static Web App**
   - Go to [Azure Portal](https://portal.azure.com)
   - Click "Create a resource"
   - Search for "Static Web App" and select it
   - Click "Create"
   - Fill in the details:
     - **Subscription**: Your Azure subscription
     - **Resource Group**: Create new or use existing
     - **Name**: Choose a unique name (e.g., `asset-risk-dashboard`)
     - **Plan type**: Free (for testing)
     - **Region**: Choose closest to you
     - **Source**: GitHub
     - **GitHub account**: Sign in and authorize
     - **Organization**: Your GitHub username
     - **Repository**: Select your repository
     - **Branch**: `main`
     - **Build Presets**: Custom
     - **App location**: `/` (root)
     - **Api location**: (leave empty)
     - **Output location**: `dist`
   - Click "Review + create", then "Create"

3. **Get the deployment token**
   - After creation, go to your Static Web App resource
   - Click on "Manage deployment token"
   - Copy the token

4. **Add token to GitHub Secrets** (if not done automatically)
   - Go to your GitHub repository
   - Settings → Secrets and variables → Actions
   - Add new secret:
     - Name: `AZURE_STATIC_WEB_APPS_API_TOKEN`
     - Value: Paste the token you copied

5. **Wait for deployment**
   - Azure will automatically trigger the GitHub Actions workflow
   - Check the Actions tab in your GitHub repo to see the deployment progress
   - Once complete, your app will be available at: `https://<your-app-name>.azurestaticapps.net`

## Option 2: Deploy via Azure CLI

1. **Install Azure CLI** (if not already installed)
   ```bash
   # macOS
   brew install azure-cli
   
   # Or download from: https://docs.microsoft.com/cli/azure/install-azure-cli
   ```

2. **Login to Azure**
   ```bash
   az login
   ```

3. **Create the Static Web App**
   ```bash
   az staticwebapp create \
     --name asset-risk-dashboard \
     --resource-group <your-resource-group> \
     --location "East US 2" \
     --source https://github.com/<your-username>/<your-repo> \
     --branch main \
     --app-location "/" \
     --output-location "dist"
   ```

4. **Get deployment token and add to GitHub**
   ```bash
   az staticwebapp secrets list \
     --name asset-risk-dashboard \
     --resource-group <your-resource-group> \
     --query "properties.apiKey" \
     -o tsv
   ```
   Then add this as a GitHub secret (see Option 1, step 4)

## Option 3: Deploy manually (without GitHub)

If you prefer not to use GitHub Actions, you can deploy directly:

1. **Build the app locally**
   ```bash
   npm run build
   ```

2. **Install Azure Static Web Apps CLI**
   ```bash
   npm install -g @azure/static-web-apps-cli
   ```

3. **Deploy**
   ```bash
   swa deploy dist \
     --deployment-token <your-deployment-token> \
     --env production
   ```

## Custom Domain (Optional)

1. Go to your Static Web App in Azure Portal
2. Click "Custom domains"
3. Add your domain and follow the DNS configuration steps

## Troubleshooting

- **Build fails**: Check that `output_location` is set to `dist` (Vite's default output)
- **404 errors**: The `staticwebapp.config.json` should handle SPA routing
- **Deployment token issues**: Regenerate the token in Azure Portal if needed

## Notes

- The free tier includes:
  - 100 GB bandwidth per month
  - Custom domains
  - SSL certificates
  - Staging environments for pull requests

- Your app will automatically redeploy on every push to the `main` branch
