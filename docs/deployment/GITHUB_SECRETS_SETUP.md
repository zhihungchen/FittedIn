# GitHub Secrets Configuration Guide

Step-by-step guide to configure GitHub Secrets for CI/CD deployment.

## Overview

GitHub Secrets store sensitive information (like SSH keys and credentials) securely and allow GitHub Actions workflows to access them during deployment.

---

## Required Secrets

For basic CI/CD deployment, you need these secrets:

| Secret Name | Required | Description |
|------------|----------|-------------|
| `EC2_SSH_PRIVATE_KEY` | ✅ Yes | SSH private key for EC2 access |
| `EC2_HOST` | ✅ Yes | EC2 instance IP or domain |
| `EC2_USER` | ✅ Yes | SSH username (usually `ubuntu`) |
| `AWS_ACCESS_KEY_ID` | ❌ Optional | AWS access key (only if using AWS CLI) |
| `AWS_SECRET_ACCESS_KEY` | ❌ Optional | AWS secret key (only if using AWS CLI) |
| `AWS_REGION` | ❌ Optional | AWS region (default: `us-east-1`) |

---

## Step-by-Step Configuration

### Step 1: Access GitHub Secrets

1. Go to your GitHub repository
2. Click **Settings** tab (top menu)
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. You'll see the "Secrets" page

### Step 2: Get Your EC2 Information

Before adding secrets, gather this information:

#### EC2_HOST

Your EC2 instance IP address or domain:

**Option 1: IP Address**
- Go to AWS EC2 Console
- Find your instance
- Copy the "Public IPv4 address"
- Example: `54.123.45.67`

**Option 2: Domain Name**
- If you have a domain configured
- Example: `api.fittedin.com`
- Or EC2 public DNS: `ec2-54-123-45-67.compute-1.amazonaws.com`

#### EC2_USER

SSH username depends on your EC2 AMI:

- **Ubuntu**: `ubuntu`
- **Amazon Linux**: `ec2-user`
- **Debian**: `admin`
- **RHEL/CentOS**: `ec2-user`

To verify, check your EC2 AMI or try SSH:
```bash
ssh -i key.pem ubuntu@your-ec2-ip
# If fails, try:
ssh -i key.pem ec2-user@your-ec2-ip
```

#### EC2_SSH_PRIVATE_KEY

The content of your SSH private key file (`.pem` file):

1. Locate your `.pem` file (usually downloaded when creating EC2 instance)
2. Open the file in a text editor
3. Copy the **entire content** including:
   - `-----BEGIN RSA PRIVATE KEY-----` (or `BEGIN OPENSSH PRIVATE KEY`)
   - All the key content
   - `-----END RSA PRIVATE KEY-----` (or `END OPENSSH PRIVATE KEY`)

**Example format**:
```
-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA1234567890...
(several lines of key content)
...0987654321==
-----END RSA PRIVATE KEY-----
```

**Important**: Copy the entire key, including the BEGIN and END lines!

### Step 3: Add Each Secret

For each secret, follow these steps:

1. Click **New repository secret** button
2. Fill in:
   - **Name**: The secret name (exactly as listed above)
   - **Secret**: The value (paste your key/IP/username)
3. Click **Add secret**

---

## Detailed Instructions for Each Secret

### Secret 1: EC2_SSH_PRIVATE_KEY

**Name**: `EC2_SSH_PRIVATE_KEY`

**Value**: Complete content of your `.pem` file

**How to get it**:

**Method 1: Using Terminal (Mac/Linux)**
```bash
# Display the key content
cat /path/to/your-key.pem

# Copy everything from BEGIN to END
```

**Method 2: Using Text Editor**
1. Open `.pem` file in any text editor
2. Select all (Cmd+A / Ctrl+A)
3. Copy (Cmd+C / Ctrl+C)

**Important Notes**:
- ✅ Include the `-----BEGIN...` line
- ✅ Include all key content
- ✅ Include the `-----END...` line
- ❌ Don't add extra spaces
- ❌ Don't remove any characters
- ❌ Don't add newlines at the beginning/end

**Verification**:
After adding, you should see the secret name in the list (value will be hidden as `••••••••`)

### Secret 2: EC2_HOST

**Name**: `EC2_HOST`

**Value**: Your EC2 IP address or domain

**Examples**:
- IP: `54.123.45.67`
- Domain: `api.fittedin.com`
- EC2 DNS: `ec2-54-123-45-67.compute-1.amazonaws.com`

**How to get it**:

**From AWS Console**:
1. Go to EC2 Dashboard
2. Click "Instances"
3. Select your instance
4. Copy "Public IPv4 address" or "Public IPv4 DNS"

**From Terminal**:
```bash
# If you know instance ID
aws ec2 describe-instances --instance-ids i-1234567890abcdef0 \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --output text
```

### Secret 3: EC2_USER

**Name**: `EC2_USER`

**Value**: SSH username (usually `ubuntu` or `ec2-user`)

**Common Values**:
- `ubuntu` (most common for Ubuntu)
- `ec2-user` (Amazon Linux)
- `admin` (Debian)
- `ec2-user` (RHEL/CentOS)

**How to determine**:
Try SSH with different usernames:
```bash
ssh -i key.pem ubuntu@ec2-ip
# If fails:
ssh -i key.pem ec2-user@ec2-ip
```

The one that works is your `EC2_USER`.

### Secret 4-6: AWS Credentials (Optional)

These are only needed if your workflow uses AWS CLI features:

**AWS_ACCESS_KEY_ID**:
- Get from AWS IAM Console
- Create IAM user with minimal permissions
- Generate access key

**AWS_SECRET_ACCESS_KEY**:
- Generated with access key
- Save securely (can't view again)

**AWS_REGION**:
- Usually `us-east-1`, `us-west-2`, etc.
- Check your EC2 instance region

---

## Verification

After adding all secrets, verify:

1. **Check Secret List**:
   - Go to Settings → Secrets and variables → Actions
   - You should see:
     - ✅ `EC2_SSH_PRIVATE_KEY`
     - ✅ `EC2_HOST`
     - ✅ `EC2_USER`
     - (Optional) AWS secrets

2. **Test SSH Connection** (locally):
   ```bash
   # Test that your SSH key works
   ssh -i your-key.pem EC2_USER@EC2_HOST
   
   # If successful, you can exit
   exit
   ```

3. **Test Workflow**:
   - Create a test branch
   - Push to trigger workflow
   - Check Actions tab for errors
   - If SSH fails, check secret values

---

## Troubleshooting

### Problem: "Permission denied (publickey)"

**Cause**: SSH key is incorrect or incomplete

**Solution**:
1. Verify `EC2_SSH_PRIVATE_KEY` includes full key
2. Check for extra spaces or missing lines
3. Ensure key format is correct
4. Try regenerating SSH key pair if needed

### Problem: "Could not resolve hostname"

**Cause**: `EC2_HOST` is incorrect

**Solution**:
1. Verify EC2 instance is running
2. Check IP address in AWS console
3. Ensure no typos in IP/domain
4. Try using IP instead of domain (or vice versa)

### Problem: "Permission denied" (wrong user)

**Cause**: `EC2_USER` is incorrect

**Solution**:
1. Try `ubuntu` first
2. If fails, try `ec2-user`
3. Check your EC2 AMI type
4. Verify with manual SSH test

### Problem: Secret not found in workflow

**Cause**: Secret name doesn't match exactly

**Solution**:
1. Check secret name spelling (case-sensitive)
2. Ensure secret is in the correct repository
3. Verify workflow uses correct secret name: `${{ secrets.SECRET_NAME }}`

---

## Security Best Practices

### 1. Key Management

- ✅ Use dedicated SSH key for CI/CD
- ✅ Don't reuse personal SSH keys
- ✅ Rotate keys regularly (every 90 days)
- ✅ Revoke old keys when rotating

### 2. Access Control

- ✅ Use least privilege principle
- ✅ Limit who can access secrets (repository settings)
- ✅ Use environment-specific secrets if possible
- ✅ Don't share secrets via email/chat

### 3. Monitoring

- ✅ Monitor failed deployments
- ✅ Review GitHub Actions logs regularly
- ✅ Set up alerts for suspicious activity
- ✅ Audit secret access (if using GitHub Enterprise)

### 4. Rotation

**When to rotate secrets**:
- Every 90 days (recommended)
- When team member leaves
- If key might be compromised
- After security incident

**How to rotate**:
1. Generate new SSH key pair
2. Add new public key to EC2
3. Update `EC2_SSH_PRIVATE_KEY` secret
4. Test deployment
5. Remove old key from EC2

---

## Quick Reference

### Secret Names Checklist

- [ ] `EC2_SSH_PRIVATE_KEY` - SSH private key (full content)
- [ ] `EC2_HOST` - EC2 IP or domain
- [ ] `EC2_USER` - SSH username (`ubuntu` or `ec2-user`)
- [ ] `AWS_ACCESS_KEY_ID` - (Optional) AWS access key
- [ ] `AWS_SECRET_ACCESS_KEY` - (Optional) AWS secret key
- [ ] `AWS_REGION` - (Optional) AWS region

### Common Values

| AMI Type | EC2_USER |
|----------|----------|
| Ubuntu 22.04 | `ubuntu` |
| Amazon Linux 2023 | `ec2-user` |
| Debian | `admin` |
| RHEL | `ec2-user` |
| CentOS | `ec2-user` |

### Secret Format Examples

**EC2_HOST**:
```
54.123.45.67
```
or
```
api.fittedin.com
```

**EC2_USER**:
```
ubuntu
```

**EC2_SSH_PRIVATE_KEY**:
```
-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA...
(entire key content)
...
-----END RSA PRIVATE KEY-----
```

---

## Additional Resources

- [GitHub Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [AWS EC2 SSH Key Pairs](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-key-pairs.html)
- [SSH Key Generation Guide](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent)

---

**Last Updated**: 2024-12
**Related Docs**: [DevOps Guide](DEVOPS_GUIDE.md) | [CI/CD Pipeline](CI_CD_PIPELINE.md)


