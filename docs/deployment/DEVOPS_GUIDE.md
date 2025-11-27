# FittedIn DevOps Guide

Complete DevOps documentation for FittedIn project, covering CI/CD pipeline, deployment automation, monitoring, and maintenance.

## 📋 Table of Contents

- [Overview](#overview)
- [CI/CD Architecture](#cicd-architecture)
- [Current Configuration](#current-configuration)
- [Workflow Details](#workflow-details)
- [Setup Guide](#setup-guide)
- [Deployment Process](#deployment-process)
- [Monitoring & Logging](#monitoring--logging)
- [Maintenance](#maintenance)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

---

## Overview

FittedIn uses **GitHub Actions** for Continuous Integration and Continuous Deployment (CI/CD) to AWS EC2. The pipeline automates testing, building, and deploying the application whenever code is pushed to the main branch.

### Key Features

- ✅ **Automated Testing**: Runs tests on every pull request
- ✅ **Automated Deployment**: Deploys to production on merge to main
- ✅ **Health Checks**: Verifies deployment success
- ✅ **Rollback Support**: Easy rollback through Git
- ✅ **Multi-Environment**: Support for staging and production

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Developer Workflow                       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              GitHub Repository (Source Control)              │
│  • Feature Branches                                         │
│  • Pull Requests                                            │
│  • Main Branch (Production)                                 │
└─────────────────────────────────────────────────────────────┘
                            │
            ┌───────────────┴───────────────┐
            │                               │
            ▼                               ▼
┌─────────────────────┐      ┌──────────────────────────────┐
│  Test Workflow      │      │   Deploy Workflow            │
│  (.github/workflows/│      │   (.github/workflows/        │
│   test.yml)         │      │    deploy.yml)               │
└─────────────────────┘      └──────────────────────────────┘
            │                               │
            ▼                               ▼
┌─────────────────────┐      ┌──────────────────────────────┐
│  • Install Deps     │      │  • Run Tests                 │
│  • Run Tests        │      │  • Configure SSH             │
│  • Lint Code        │      │  • Deploy to EC2             │
│  • Upload Coverage  │      │  • Health Check              │
└─────────────────────┘      └──────────────────────────────┘
                                        │
                                        ▼
                          ┌─────────────────────────────┐
                          │   AWS EC2 Instance          │
                          │  • Pull Latest Code         │
                          │  • Install Dependencies     │
                          │  • Run Migrations           │
                          │  • Restart PM2              │
                          │  • Reload Nginx             │
                          └─────────────────────────────┘
                                        │
                                        ▼
                          ┌─────────────────────────────┐
                          │   Production Application    │
                          │   (Available to Users)      │
                          └─────────────────────────────┘
```

---

## CI/CD Architecture

### Pipeline Stages

1. **Source** → Code pushed to GitHub
2. **Build** → Install dependencies, compile (if needed)
3. **Test** → Run unit tests, integration tests
4. **Deploy** → Deploy to AWS EC2
5. **Verify** → Health checks, smoke tests
6. **Monitor** → Application monitoring and logging

### Workflow Files

#### 1. Test Workflow (`test.yml`)

**Location**: `.github/workflows/test.yml`

**Triggers**:
- Pull requests to `main` or `develop`
- Pushes to `main` or `develop`

**Jobs**:
1. **Backend Tests**: Runs Jest tests with PostgreSQL service
2. **Lint**: Code linting and style checks

**Features**:
- PostgreSQL service container for database tests
- Test coverage upload to Codecov
- Parallel job execution

#### 2. Deploy Workflow (`deploy.yml`)

**Location**: `.github/workflows/deploy.yml`

**Triggers**:
- Push to `main` or `production` branch
- Manual trigger via `workflow_dispatch`

**Jobs**:
1. **Test**: Run tests before deployment
2. **Deploy**: Deploy to EC2 and verify

**Features**:
- Runs tests before deployment
- SSH-based deployment
- Health check verification
- Deployment status notifications

---

## Current Configuration

### Test Workflow Details

```yaml
Workflow: test.yml
├── Trigger: PR/push to main/develop
├── Jobs:
│   ├── backend-test
│   │   ├── PostgreSQL service (15-alpine)
│   │   ├── Node.js 20.x
│   │   ├── Install dependencies
│   │   ├── Setup test environment
│   │   ├── Run migrations
│   │   ├── Run tests
│   │   └── Upload coverage
│   └── lint
│       ├── Node.js 20.x
│       ├── Install dependencies
│       └── Run ESLint
```

### Deploy Workflow Details

```yaml
Workflow: deploy.yml
├── Trigger: Push to main/production
├── Jobs:
│   ├── test (dependency)
│   │   └── Must pass before deploy
│   └── deploy
│       ├── Configure AWS credentials
│       ├── Setup SSH
│       ├── Deploy to EC2
│       │   ├── Pull latest code
│       │   ├── Install dependencies
│       │   ├── Run migrations
│       │   ├── Restart PM2
│       │   └── Reload Nginx
│       ├── Health check
│       └── Notify status
```

---

## Workflow Details

### Test Workflow (`test.yml`)

#### Backend Test Job

**Purpose**: Run automated tests for the backend API

**Steps**:

1. **Checkout Code**
   - Gets the latest code from the repository

2. **Setup Node.js**
   - Installs Node.js 20.x
   - Sets up npm cache for faster builds

3. **PostgreSQL Service**
   - Starts PostgreSQL 15-alpine container
   - Configures test database
   - Waits for database to be ready

4. **Install Dependencies**
   - Runs `npm ci` for clean install
   - Installs all backend dependencies

5. **Setup Test Environment**
   - Creates `.env.test` file
   - Configures database connection
   - Sets test environment variables

6. **Run Database Migrations**
   - Creates test database schema
   - Prepares database for tests

7. **Run Tests**
   - Executes Jest test suite
   - Generates coverage reports

8. **Upload Coverage**
   - Uploads coverage to Codecov
   - Enables coverage tracking

#### Lint Job

**Purpose**: Check code quality and style

**Steps**:
1. Checkout code
2. Setup Node.js
3. Install dependencies
4. Run ESLint (if configured)

### Deploy Workflow (`deploy.yml`)

#### Test Job

**Purpose**: Ensure code passes tests before deployment

**Steps**:
1. Checkout code
2. Setup Node.js
3. Install dependencies
4. Run tests
5. Run linter (optional)

**Note**: Tests can fail without blocking deployment (`continue-on-error: true`). Adjust as needed.

#### Deploy Job

**Purpose**: Deploy application to AWS EC2

**Prerequisites**:
- Test job must complete (may pass or fail depending on config)
- GitHub Secrets must be configured

**Steps**:

1. **Checkout Code**
   - Gets the latest code

2. **Setup Node.js**
   - Installs Node.js for potential build steps

3. **Configure AWS Credentials**
   - Sets up AWS credentials for EC2 access
   - Uses GitHub Secrets for security

4. **Add SSH Key**
   - Configures SSH authentication
   - Uses `EC2_SSH_PRIVATE_KEY` secret

5. **Add EC2 to Known Hosts**
   - Adds EC2 host to SSH known_hosts
   - Prevents SSH connection prompts

6. **Deploy to EC2**
   - Connects to EC2 via SSH
   - Executes deployment script:
     ```bash
     cd /var/www/fittedin
     git fetch origin
     git reset --hard origin/main
     cd backend
     npm install --production
     npm run db:migrate
     pm2 restart fittedin-backend
     pm2 save
     sudo nginx -t && sudo systemctl reload nginx
     ```

7. **Health Check**
   - Waits 10 seconds for app to start
   - Tests `/api/health` endpoint
   - Fails deployment if health check fails

8. **Notify Deployment Status**
   - Reports success/failure
   - Can be extended for Slack/email notifications

---

## Setup Guide

### Prerequisites

1. **GitHub Repository**
   - Repository must be on GitHub (not local only)
   - GitHub Actions must be enabled (enabled by default)

2. **AWS EC2 Instance**
   - EC2 instance running and accessible
   - Application already deployed manually at least once
   - Project directory: `/var/www/fittedin`
   - Node.js, npm, PM2, Nginx installed

3. **Required Information**
   - EC2 instance IP address or domain
   - SSH username (usually `ubuntu` or `ec2-user`)
   - SSH private key (`.pem` file)
   - AWS credentials (if using AWS CLI features)

### Step-by-Step Setup

#### Step 1: Configure GitHub Secrets

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**

Add the following secrets:

| Secret Name | Description | How to Get |
|------------|-------------|------------|
| `EC2_SSH_PRIVATE_KEY` | Full content of SSH private key | Copy entire `.pem` file content (including `-----BEGIN...` and `-----END...`) |
| `EC2_HOST` | EC2 instance IP or domain | From AWS EC2 console or EC2 instance details |
| `EC2_USER` | SSH username | Usually `ubuntu` (Ubuntu) or `ec2-user` (Amazon Linux) |
| `AWS_ACCESS_KEY_ID` | AWS access key (optional) | Only needed if using AWS CLI features |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key (optional) | Only needed if using AWS CLI features |
| `AWS_REGION` | AWS region (optional) | e.g., `us-east-1` |

**Important Notes**:
- `EC2_SSH_PRIVATE_KEY` must include the complete key file content
- Never commit secrets to the repository
- Rotate keys regularly

#### Step 2: Verify Workflow Files

Ensure workflow files exist:
- `.github/workflows/test.yml`
- `.github/workflows/deploy.yml`

#### Step 3: Verify EC2 Setup

SSH to your EC2 instance and verify:

```bash
# SSH to EC2
ssh -i your-key.pem ubuntu@your-ec2-ip

# Verify project directory
ls -la /var/www/fittedin

# Verify Git is initialized
cd /var/www/fittedin
git remote -v

# Verify PM2 is installed
pm2 --version

# Verify Nginx is installed
nginx -v
```

#### Step 4: Test the Pipeline

1. **Test Test Workflow**:
   - Create a branch: `git checkout -b test-ci-cd`
   - Push: `git push origin test-ci-cd`
   - Create a Pull Request
   - Check Actions tab for test workflow

2. **Test Deploy Workflow**:
   - Merge PR to main
   - Or manually trigger: Actions → Deploy to AWS EC2 → Run workflow

---

## Deployment Process

### Automatic Deployment

When code is pushed to `main` branch:

1. **Test Workflow Runs** (in parallel with deploy)
   - Runs backend tests
   - Runs linting

2. **Deploy Workflow Starts**
   - Waits for test job to complete
   - Sets up SSH connection
   - Executes deployment commands on EC2

3. **Deployment Steps on EC2**:
   ```bash
   cd /var/www/fittedin
   git fetch origin
   git reset --hard origin/main  # Get latest code
   cd backend
   npm install --production      # Update dependencies
   npm run db:migrate            # Run migrations
   pm2 restart fittedin-backend  # Restart app
   pm2 save                      # Save PM2 config
   sudo nginx -t && sudo systemctl reload nginx  # Reload Nginx
   ```

4. **Health Check**:
   - Waits 10 seconds
   - Tests `https://your-domain.com/api/health`
   - Verifies status code 200

5. **Completion**:
   - Deployment marked as successful
   - Application available to users

### Manual Deployment

You can trigger deployment manually:

1. Go to GitHub repository
2. Click **Actions** tab
3. Select **Deploy to AWS EC2** workflow
4. Click **Run workflow**
5. Select branch (usually `main`)
6. Click **Run workflow**

### Deployment Time

Typical deployment takes **3-5 minutes**:
- Test: 1-2 minutes
- SSH setup: 10 seconds
- Code pull: 5-10 seconds
- Install dependencies: 30-60 seconds
- Migrations: 5-10 seconds
- Restart services: 5-10 seconds
- Health check: 10 seconds

---

## Monitoring & Logging

### GitHub Actions Monitoring

**View Deployment History**:
1. Go to repository → **Actions** tab
2. Select workflow (Test or Deploy)
3. View run history with status indicators:
   - ✅ Green = Success
   - ❌ Red = Failed
   - ⏳ Yellow = In Progress

**View Deployment Logs**:
1. Click on a workflow run
2. Expand job sections
3. Expand individual steps
4. View detailed logs

### Application Monitoring

**PM2 Monitoring**:
```bash
# SSH to EC2
ssh -i key.pem ubuntu@ec2-ip

# Check PM2 status
pm2 status

# View logs
pm2 logs fittedin-backend

# Monitor resources
pm2 monit

# View detailed info
pm2 show fittedin-backend
```

**Nginx Logs**:
```bash
# Access logs
sudo tail -f /var/log/nginx/fittedin-access.log

# Error logs
sudo tail -f /var/log/nginx/fittedin-error.log
```

**Application Logs**:
```bash
# PM2 logs
pm2 logs fittedin-backend --lines 100

# Backend logs (if configured)
tail -f /var/www/fittedin/backend/logs/*.log
```

### Health Check Endpoint

Monitor application health:

```bash
# Check health
curl https://your-domain.com/api/health

# Expected response
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": "production",
  "uptime": 3600,
  "database": "connected",
  "memory": {
    "used": "150MB",
    "total": "200MB"
  }
}
```

---

## Maintenance

### Regular Tasks

#### Weekly
- Review deployment history
- Check for failed deployments
- Review application logs for errors

#### Monthly
- Update dependencies: `npm audit` and `npm update`
- Review and rotate secrets
- Check disk space on EC2
- Review PM2 logs for memory leaks

#### As Needed
- Update workflow files
- Add new tests
- Improve deployment process
- Update documentation

### Updating Dependencies

```bash
# Local
cd backend
npm audit
npm update

# Commit and push
git add package*.json
git commit -m "chore: update dependencies"
git push origin main

# CI/CD will automatically deploy
```

### Updating Workflow Files

1. Edit `.github/workflows/*.yml` files
2. Commit changes
3. Push to repository
4. Workflow updates apply immediately

### Database Migrations

Migrations run automatically during deployment:

```bash
# In deploy workflow
npm run db:migrate
```

To rollback a migration:
```bash
# Manual rollback on EC2
cd /var/www/fittedin/backend
npx sequelize-cli db:migrate:undo
pm2 restart fittedin-backend
```

---

## Troubleshooting

### Common Issues

#### 1. Deployment Fails: SSH Connection Error

**Symptoms**:
- Error: "Permission denied (publickey)"
- Error: "Connection timeout"

**Solutions**:
1. Verify SSH key in GitHub Secrets:
   - Check `EC2_SSH_PRIVATE_KEY` includes full key
   - Ensure no extra spaces or newlines

2. Test SSH connection manually:
   ```bash
   ssh -i your-key.pem ubuntu@ec2-ip
   ```

3. Check EC2 security group:
   - Allow SSH (port 22) from GitHub Actions IPs
   - Or allow from `0.0.0.0/0` temporarily for testing

4. Verify EC2_HOST format:
   - Use IP address: `123.45.67.89`
   - Or domain: `ec2-xx-xx-xx-xx.compute-1.amazonaws.com`

#### 2. Deployment Fails: Git Pull Error

**Symptoms**:
- Error: "fatal: not a git repository"
- Error: "Permission denied"

**Solutions**:
1. Verify project directory exists:
   ```bash
   ssh ec2-ip
   ls -la /var/www/fittedin
   ```

2. Check Git remote configuration:
   ```bash
   cd /var/www/fittedin
   git remote -v
   git remote set-url origin https://github.com/user/repo.git
   ```

3. Check directory permissions:
   ```bash
   sudo chown -R ubuntu:ubuntu /var/www/fittedin
   ```

#### 3. Deployment Fails: PM2 Not Found

**Symptoms**:
- Error: "pm2: command not found"

**Solutions**:
1. Install PM2 on EC2:
   ```bash
   npm install -g pm2
   ```

2. Or use full path:
   ```bash
   /usr/bin/pm2 restart fittedin-backend
   ```

#### 4. Health Check Fails

**Symptoms**:
- Deployment succeeds but health check fails
- Error: "Health check failed with status: 000"

**Solutions**:
1. Check if application is running:
   ```bash
   pm2 status
   pm2 logs fittedin-backend
   ```

2. Verify health endpoint:
   ```bash
   curl http://localhost:3000/api/health
   ```

3. Check Nginx configuration:
   ```bash
   sudo nginx -t
   sudo systemctl status nginx
   ```

4. Update health check URL in `deploy.yml`:
   - If using HTTPS: change `http://` to `https://`
   - If using domain: update `EC2_HOST` secret

5. Increase wait time:
   ```yaml
   - name: Wait for application
     run: sleep 20  # Increase from 10 to 20 seconds
   ```

#### 5. Tests Fail in CI but Pass Locally

**Symptoms**:
- Tests pass on local machine
- Tests fail in GitHub Actions

**Solutions**:
1. Check Node.js version matches:
   ```yaml
   node-version: '20.x'  # Must match local version
   ```

2. Check environment variables:
   - Test environment needs `.env.test` file
   - Verify database connection settings

3. Check database setup:
   - PostgreSQL service in workflow must match local
   - Verify migrations run correctly

4. Review test logs in GitHub Actions

#### 6. Database Migration Fails

**Symptoms**:
- Error during `npm run db:migrate`

**Solutions**:
1. Check migration files:
   ```bash
   cd backend
   npm run db:migrate:status
   ```

2. Run migrations manually on EC2:
   ```bash
   ssh ec2-ip
   cd /var/www/fittedin/backend
   npm run db:migrate
   ```

3. Check database connection:
   - Verify `.env` file has correct DB credentials
   - Test connection: `psql -h host -U user -d database`

### Getting Help

1. **Check Logs**:
   - GitHub Actions logs
   - PM2 logs on EC2
   - Nginx logs

2. **Review Documentation**:
   - [CI/CD Pipeline Guide](CI_CD_PIPELINE.md)
   - [AWS EC2 Deployment Guide](AWS_EC2_DEPLOYMENT.md)
   - [Troubleshooting Guide](DEPLOYMENT_CHECKLIST.md#troubleshooting)

3. **Common Commands**:
   ```bash
   # Check deployment status
   pm2 status
   
   # View logs
   pm2 logs fittedin-backend
   
   # Restart manually
   pm2 restart fittedin-backend
   
   # Check Nginx
   sudo nginx -t
   sudo systemctl status nginx
   ```

---

## Best Practices

### 1. Code Quality

- ✅ Write tests for new features
- ✅ Run tests locally before pushing
- ✅ Use meaningful commit messages
- ✅ Keep PRs small and focused
- ✅ Review code before merging

### 2. Deployment

- ✅ Deploy during low-traffic periods (if possible)
- ✅ Monitor deployment logs
- ✅ Verify health checks pass
- ✅ Test in staging before production
- ✅ Have rollback plan ready

### 3. Security

- ✅ Never commit secrets
- ✅ Rotate keys regularly
- ✅ Use least privilege IAM policies
- ✅ Keep dependencies updated
- ✅ Monitor for security vulnerabilities

### 4. Monitoring

- ✅ Set up alerts for failed deployments
- ✅ Monitor application metrics
- ✅ Review logs regularly
- ✅ Track deployment frequency
- ✅ Measure deployment time

### 5. Documentation

- ✅ Keep workflow files commented
- ✅ Document deployment process
- ✅ Update troubleshooting guides
- ✅ Record known issues
- ✅ Maintain runbooks

---

## Quick Reference

### Workflow Files

- **Test**: `.github/workflows/test.yml`
- **Deploy**: `.github/workflows/deploy.yml`

### Key Commands

```bash
# Check workflow status
# → Go to GitHub Actions tab

# Manual deployment trigger
# → Actions → Deploy to AWS EC2 → Run workflow

# Check EC2 status
ssh -i key.pem ubuntu@ec2-ip
pm2 status
pm2 logs fittedin-backend

# Rollback deployment
cd /var/www/fittedin
git checkout <previous-commit>
cd backend
npm install --production
pm2 restart fittedin-backend
```

### Important URLs

- **GitHub Actions**: `https://github.com/USERNAME/REPO/actions`
- **Workflow Runs**: `https://github.com/USERNAME/REPO/actions/workflows/deploy.yml`
- **Application**: `https://your-domain.com`
- **Health Check**: `https://your-domain.com/api/health`

---

## Additional Resources

- [CI/CD Pipeline Guide](CI_CD_PIPELINE.md) - Detailed CI/CD setup
- [AWS EC2 Deployment Guide](AWS_EC2_DEPLOYMENT.md) - EC2 deployment details
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [AWS EC2 Documentation](https://docs.aws.amazon.com/ec2/)

---

**Last Updated**: 2024-12
**Maintained By**: FittedIn DevOps Team


