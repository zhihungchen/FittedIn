# CI/CD Quick Start Guide

Quick reference for setting up and using the CI/CD pipeline.

## 🚀 Quick Setup (5 Minutes)

### Step 1: Configure GitHub Secrets (Required)

Go to: **Repository → Settings → Secrets and variables → Actions**

Add these secrets:

| Secret | Value | How to Get |
|--------|-------|------------|
| `EC2_SSH_PRIVATE_KEY` | Full `.pem` file content | Copy entire key file (including BEGIN/END lines) |
| `EC2_HOST` | EC2 IP or domain | From AWS EC2 console |
| `EC2_USER` | SSH username | Usually `ubuntu` or `ec2-user` |

**Detailed guide**: See [GitHub Secrets Setup Guide](GITHUB_SECRETS_SETUP.md)

### Step 2: Verify Workflow Files

Workflow files are already configured:
- ✅ `.github/workflows/test.yml` - Runs tests
- ✅ `.github/workflows/deploy.yml` - Deploys to EC2

### Step 3: Test the Pipeline

1. **Create a test branch**:
   ```bash
   git checkout -b test-ci-cd
   git push origin test-ci-cd
   ```

2. **Create a Pull Request** → Triggers test workflow

3. **Merge to main** → Triggers deployment workflow

---

## 📋 How It Works

### Automatic Testing

**When**: Every pull request or push to `main`/`develop`

**What happens**:
1. Runs backend tests with PostgreSQL
2. Runs code linting
3. Uploads test coverage

**View results**: GitHub → Actions tab

### Automatic Deployment

**When**: Push to `main` branch

**What happens**:
1. Runs tests (must pass)
2. Connects to EC2 via SSH
3. Pulls latest code
4. Installs dependencies
5. Runs database migrations
6. Restarts application (PM2)
7. Reloads Nginx
8. Verifies health check

**Deployment time**: ~3-5 minutes

---

## 🎯 Common Workflows

### Deploy New Code

```bash
# 1. Create feature branch
git checkout -b feature/new-feature

# 2. Make changes and commit
git add .
git commit -m "feat: add new feature"

# 3. Push and create PR
git push origin feature/new-feature
# → Create PR on GitHub

# 4. Merge PR to main
# → Automatic deployment starts
```

### Manual Deployment

1. Go to GitHub → **Actions** tab
2. Select **Deploy to AWS EC2**
3. Click **Run workflow**
4. Select branch (`main`)
5. Click **Run workflow**

### Rollback Deployment

```bash
# SSH to EC2
ssh -i key.pem ubuntu@ec2-ip

# Navigate to project
cd /var/www/fittedin

# Checkout previous commit
git log --oneline  # Find commit hash
git checkout <previous-commit-hash>

# Restart application
cd backend
npm install --production
pm2 restart fittedin-backend
```

---

## ✅ Status Badges

Check deployment status in README:

- ✅ **Green badge** = Latest deployment successful
- ❌ **Red badge** = Deployment failed
- ⏳ **Yellow badge** = Deployment in progress

View badges: Look at top of [README.md](../../README.md)

---

## 🔍 Monitoring

### Check Deployment Status

**GitHub Actions**:
- Go to: **Repository → Actions** tab
- View workflow runs and logs
- Click on any run for details

**EC2 Application**:
```bash
# SSH to EC2
ssh -i key.pem ubuntu@ec2-ip

# Check PM2 status
pm2 status

# View logs
pm2 logs fittedin-backend

# Monitor resources
pm2 monit
```

### Health Check

```bash
# Check application health
curl https://your-domain.com/api/health

# Expected response:
# {"status":"OK","database":"connected",...}
```

---

## 🐛 Troubleshooting

### Deployment Failed: SSH Error

**Problem**: "Permission denied (publickey)"

**Solution**:
1. Check `EC2_SSH_PRIVATE_KEY` includes full key
2. Verify `EC2_HOST` and `EC2_USER` are correct
3. Test SSH manually: `ssh -i key.pem ubuntu@ec2-ip`

### Deployment Failed: Health Check

**Problem**: Health check returns 000 or 500

**Solution**:
1. Check application is running: `pm2 status`
2. View logs: `pm2 logs fittedin-backend`
3. Check Nginx: `sudo nginx -t`
4. Verify health endpoint: `curl http://localhost:3000/api/health`

### Tests Fail in CI

**Problem**: Tests pass locally but fail in CI

**Solution**:
1. Check Node.js version matches (20.x)
2. Verify environment variables are set
3. Check test logs in GitHub Actions

---

## 📚 Full Documentation

For detailed information:

- **[DevOps Guide](DEVOPS_GUIDE.md)** - Complete DevOps documentation
- **[GitHub Secrets Setup](GITHUB_SECRETS_SETUP.md)** - Detailed secrets configuration
- **[CI/CD Pipeline Guide](CI_CD_PIPELINE.md)** - Full pipeline documentation
- **[AWS EC2 Deployment](AWS_EC2_DEPLOYMENT.md)** - EC2 setup guide

---

## 💡 Tips

1. **Always test locally** before pushing
2. **Small commits** are easier to debug
3. **Monitor deployments** after merging
4. **Check logs** if something fails
5. **Use feature branches** for new features

---

**Need help?** Check the [Troubleshooting section](DEVOPS_GUIDE.md#troubleshooting) in the DevOps Guide.


