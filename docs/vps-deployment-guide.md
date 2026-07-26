# CodeBridge Academy — VPS Deployment Guide

> **Fresh Ubuntu 24.04 LTS setup on Namecheap VPS**
>
> Created after security incident — _all credentials rotated, all keys regenerated_
>
> Last updated: July 26, 2026

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Generate New SSH Keys (Local Machine)](#2-generate-new-ssh-keys-local-machine)
3. [Initial VPS Setup (Ubuntu 24.04)](#3-initial-vps-setup-ubuntu-2404)
4. [Security Hardening](#4-security-hardening)
5. [Install & Configure Web Server](#5-install--configure-web-server)
6. [Clone Repository with SSH Deploy Key](#6-clone-repository-with-ssh-deploy-key)
7. [Configure GitHub Secrets](#7-configure-github-secrets)
8. [Deploy Workflow (CI/CD)](#8-deploy-workflow-cicd)
9. [Credential Rotation Checklist](#9-credential-rotation-checklist)
10. [Post-Deployment Verification](#10-post-deployment-verification)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Architecture Overview

### Infrastructure Layers

| Layer | Provider | Purpose |
|-------|----------|---------|
| **Frontend Hosting** | **Netlify** | CDN, static site serving, image optimization, caching |
| **Backup / VPS Hosting** | **Namecheap VPS** (`159.198.36.184`) | nginx web server at `deployer@159.198.36.184` |
| **Database** | **Supabase** (managed PostgreSQL) | Student data, registrations, survey responses |
| **Backend Logic** | **Supabase Edge Functions** | Form submission handler (Deno) |
| **CI/CD** | **GitHub Actions** | Auto-deploy on push to `main` |

### VPS Services

| Service | Role |
|---------|------|
| **nginx** | Web server — serves static HTML/CSS/JS |
| **Git** | Pulls latest code from GitHub |
| **systemd** | Manages nginx service |
| **UFW** | Firewall (SSH, HTTP, HTTPS only) |
| **fail2ban** | Brute-force protection |
| **unattended-upgrades** | Automatic security patches |

### Data Flow

```
User Browser
      │
      ├───► Netlify CDN ──► Static assets (HTML/CSS/JS/images)
      │
      ├───► Namecheap VPS ──► nginx ──► /var/www/codebridgeacademy/
      │
      └───► Supabase Edge Function ──► PostgreSQL DB
                 (submit-form)
```

---

## 2. Generate New SSH Keys (Local Machine)

Run these commands on your **local computer** (not the VPS).

### 2a — VPS Access Key (for SSH into the server)

```bash
# Generate a strong ED25519 key pair
ssh-keygen -t ed25519 -f ~/.ssh/codebridge-vps -C "codebridge-vps-key-$(date +%Y%m%d)"

# Set a strong passphrase when prompted

# Display the PUBLIC key (this goes on the VPS)
cat ~/.ssh/codebridge-vps.pub
```

> **Keep this safe:** The private key (`~/.ssh/codebridge-vps`) will be stored as a GitHub secret named `VPS_SSH_KEY`.

### 2b — GitHub Deploy Key (for git pull on the VPS)

This key allows the VPS to pull code from GitHub without a password. Generate it **on the VPS** later (see [Step 6](#6-clone-repository-with-ssh-deploy-key)).

---

## 3. Initial VPS Setup (Ubuntu 24.04)

### 3a — Login as Root

Get the root password from your Namecheap dashboard, then:

```bash
ssh root@159.198.36.184
```

> **First time?** You'll see "The authenticity of host... can't be established." Type `yes` and press Enter to accept the host key. After the VPS is rebuilt, you may see a **WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED** error from your local machine — this is expected. Run `ssh-keygen -R 159.198.36.184` to clear the old fingerprint, then try again.

### 3b — Create a Non-Root User

```bash
# Create deployer user
adduser deployer
# └─ Set a strong password when prompted

# Add to sudo group
usermod -aG sudo deployer

# Switch to the new user
su - deployer

# Create SSH directory and set permissions
mkdir -p ~/.ssh && chmod 700 ~/.ssh

# Add your PUBLIC key (from Step 2a)
nano ~/.ssh/authorized_keys
# └─ Paste the key contents, then Ctrl+X, Y, Enter to save

chmod 600 ~/.ssh/authorized_keys

# Return to root session
exit
```

### 3c — Allow Passwordless Sudo for systemctl

The deploy script needs to reload nginx without a password prompt:

```bash
# Create a sudoers drop-in file
echo 'deployer ALL=(ALL) NOPASSWD: /usr/sbin/systemctl' | tee /etc/sudoers.d/deployer-systemctl

# Set correct permissions
chmod 440 /etc/sudoers.d/deployer-systemctl
```

> **Why this is required:** GitHub Actions runs SSH commands non-interactively. Without `NOPASSWD`, `sudo systemctl reload nginx` will hang forever waiting for a password that will never come.

### 3d — Update System Packages

```bash
apt update && apt upgrade -y
```

---

## 4. Security Hardening

### 4a — Harden SSH Configuration

```bash
nano /etc/ssh/sshd_config
```

Find and set these values:

```
Port 22                           # Keep default or change (e.g., 2222)
PermitRootLogin no                # DISABLE root login
PubkeyAuthentication yes          # Key-only auth
PasswordAuthentication no         # DISABLE password login
ChallengeResponseAuthentication no
UsePAM no
MaxAuthTries 3                    # Limit auth attempts
```

Apply changes:

```bash
systemctl restart sshd
```

> **⚠️ CRITICAL:** Before closing this root session, open a **second terminal** and verify key-based login works:
>
> ```bash
> ssh -i ~/.ssh/codebridge-vps deployer@159.198.36.184
> ```
>
> Keep the root session open until you confirm. If key login fails, you can still debug.

### 4b — Configure Firewall (UFW)

```bash
# Set default policies
ufw default deny incoming
ufw default allow outgoing

# Allow essential services
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'

# Enable the firewall
ufw --force enable

# Verify
ufw status verbose
```

### 4c — Install Fail2Ban (Brute Force Protection)

```bash
apt install fail2ban -y

# Create local config (overrides defaults)
cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

# Start and enable
systemctl enable fail2ban --now

# Verify
systemctl status fail2ban
```

### 4d — Enable Automatic Security Updates

```bash
apt install unattended-upgrades -y

# Configure (select "Yes" when prompted)
dpkg-reconfigure --priority=low unattended-upgrades
```

---

## 5. Install & Configure Web Server

### 5a — Install nginx and Git

```bash
sudo apt install nginx git -y

# Enable and start nginx
sudo systemctl enable nginx --now

# Verify it's running
sudo systemctl status nginx
```

### 5b — Create Web Root Directory

```bash
sudo mkdir -p /var/www/codebridgeacademy
sudo chown deployer:deployer /var/www/codebridgeacademy
```

### 5c — Configure nginx Site

```bash
sudo nano /etc/nginx/sites-available/codebridgeacademy
```

Paste the following configuration:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name codebridgecademy.com www.codebridgecademy.com 159.198.36.184;

    root /var/www/codebridgeacademy;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/javascript image/svg+xml;
    gzip_min_length 256;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Cache static assets
    location ~* \.(css|js|svg|webp|png|jpg|jpeg|gif|ico|woff2?)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Service worker must NOT be cached
    location = /sw.js {
        add_header Cache-Control "no-cache";
        add_header Service-Worker-Allowed "/";
    }

    # 404 handler
    error_page 404 /404.html;
    location = /404.html {
        internal;
    }

    # Deny access to hidden files
    location ~ /\. {
        deny all;
    }
}
```

> **Note:** For HTTPS (recommended), install Certbot after DNS is pointing to this IP:
> ```bash
> sudo apt install certbot python3-certbot-nginx -y
> sudo certbot --nginx -d codebridgecademy.com -d www.codebridgecademy.com
> ```

### 5d — Enable the Site

```bash
# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Link our site
sudo ln -s /etc/nginx/sites-available/codebridgeacademy /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

---

## 6. Clone Repository with SSH Deploy Key

The deploy script runs `git pull origin main` non-interactively, so **HTTPS will not work**. You must use SSH-based git authentication.

### 6a — Generate a Deploy Key on the VPS

```bash
# As deployer user
ssh-keygen -t ed25519 -f ~/.ssh/github-deploy -C "codebridge-github-deploy"

# Display the PUBLIC key
cat ~/.ssh/github-deploy.pub
```

Copy the output — you'll add it to GitHub in the next step.

### 6b — Add as a Deploy Key in GitHub

1. Go to your GitHub repo → **Settings** → **Deploy keys** → **Add deploy key**
2. **Title:** `VPS Auto-Deploy Key`
3. **Key:** Paste the public key from Step 6a
4. ✅ **Check "Allow write access"** (required for `git pull`)
5. Click **Add key**

### 6c — Configure SSH for GitHub

```bash
# Create SSH config file
nano ~/.ssh/config
```

Add:

```
Host github.com
  HostName github.com
  IdentityFile ~/.ssh/github-deploy
  StrictHostKeyChecking accept-new
```

Set correct permissions:

```bash
chmod 600 ~/.ssh/config
```

### 6d — Test the SSH Connection

```bash
ssh -T git@github.com
```

Expected output:
```
Hi codetraildevs/codebridge_academy! You've successfully authenticated...
```

### 6e — Clone the Repository

```bash
git clone git@github.com:codetraildevs/codebridge_academy.git /var/www/codebridgeacademy
```

---

## 7. Configure GitHub Secrets

These secrets are stored in your GitHub repository and used by the deploy workflow.

### 7a — On Your Local Machine, Get the Values

```bash
# Get the VPS SSH private key (for VPS_SSH_KEY secret)
cat ~/.ssh/codebridge-vps

# Get the VPS host key fingerprint (for VPS_HOST_KEY secret)
ssh-keyscan -H 159.198.36.184
```

### 7b — Update GitHub Secrets

Go to: **GitHub → Your Repo → Settings → Secrets and variables → Actions**

Update or add these secrets:

| Secret | Value | Purpose |
|--------|-------|---------|
| `VPS_SSH_KEY` | Entire contents of `~/.ssh/codebridge-vps` (including `-----BEGIN OPENSSH PRIVATE KEY-----`) | SSH into VPS for deployment |
| `VPS_HOST_KEY` | Output from `ssh-keyscan -H 159.198.36.184` (e.g., `159.198.36.184 ssh-ed25519 AAA...`) | Verify VPS host identity |
| `SUPABASE_DATABASE_URL` | Connection string from Supabase → Settings → Database | Run SQL migrations |
| `SMTP_SERVER` | SMTP server address | Deploy notification emails |
| `SMTP_PORT` | SMTP port (usually 587 or 465) | Deploy notification emails |
| `SMTP_USERNAME` | SMTP login email | Deploy notification emails |
| `SMTP_PASSWORD` | SMTP password | Deploy notification emails |
| `NOTIFY_EMAIL` | Email to receive deploy notifications | Deploy notification emails |

---

## 8. Deploy Workflow (CI/CD)

The GitHub Actions workflow (`.github/workflows/deploy.yml`) runs **automatically on every push to `main`**.

### Workflow Steps

```
Push to main
     │
     ▼
┌───────────────────────────┐
│ 1. Checkout code          │
└──────────┬────────────────┘
           ▼
┌───────────────────────────┐
│ 2. Run SQL migration      │  ← Applies schema changes to Supabase DB
│   (if migration file      │     Uses SUPABASE_DATABASE_URL secret
│    has changed)           │
└──────────┬────────────────┘
           ▼
┌───────────────────────────┐
│ 3. SSH into VPS           │  ← Uses VPS_SSH_KEY + VPS_HOST_KEY secrets
│   • cd /var/www/...       │     Connects as deployer@159.198.36.184
│   • git pull origin main  │     Pulls latest code from GitHub
│   • sudo systemctl        │     Reloads nginx
│     reload nginx          │
└──────────┬────────────────┘
           ▼
┌───────────────────────────┐
│ 4. Send email             │  ← Success/failure notification
│   notification            │     Uses SMTP secrets
└───────────────────────────┘
```

### Triggering a Deploy Manually

1. Go to **GitHub → Repo → Actions → "Deploy to VPS"**
2. Click **"Run workflow"** → select `main` branch → **"Run workflow"**

### Hooking Up a Custom Domain (Optional)

1. In your Namecheap DNS dashboard, point `codebridgecademy.com` to `159.198.36.184`:
   - **A Record:** `@` → `159.198.36.184`
   - **CNAME:** `www` → `codebridgecademy.com`
2. On the VPS, set up HTTPS with Certbot:
   ```bash
   sudo certbot --nginx -d codebridgecademy.com -d www.codebridgecademy.com
   ```
3. Update the nginx config to listen on port 443 with SSL
4. Set up auto-renewal:
   ```bash
   sudo systemctl enable certbot.timer
   ```

---

## 9. Credential Rotation Checklist

After a security incident, all credentials must be rotated. Use this checklist.

### 9a — VPS Credentials

| Credential | Status | How to Rotate |
|------------|--------|---------------|
| ✅ SSH private key (`codebridge-vps`) | **DONE** | Generate new key pair (Step 2a), update public key on VPS, update `VPS_SSH_KEY` GitHub secret |
| ✅ VPS host key fingerprint | **DONE** | Run `ssh-keyscan -H 159.198.36.184`, update `VPS_HOST_KEY` GitHub secret |
| ✅ Root password | **DONE** | Set during Ubuntu 24.04 fresh install |
| ✅ `deployer` user password | **DONE** | Set during user creation |

### 9b — GitHub Credentials

| Credential | Status | How to Rotate |
|------------|--------|---------------|
| ✅ `VPS_SSH_KEY` secret | **DONE** | Updated with new private key |
| ✅ `VPS_HOST_KEY` secret | **DONE** | Updated with new fingerprint |
| ✅ Deploy key (GitHub → Settings → Deploy keys) | **DONE** | Added new public key from VPS, removed old one |
| 🔄 `SUPABASE_DATABASE_URL` secret | **Rotate in dashboard** | Reset DB password in Supabase, update GitHub secret |
| 🔄 SMTP secrets | **Optional** | Update if SMTP credentials were stored on compromised VPS |

### 9c — Supabase Credentials

| Credential | Status | How to Rotate |
|------------|--------|---------------|
| 🔄 **Secret key** (Edge Function) | **Update in dashboard** | Go to Supabase → Settings → API Keys → Create new secret key → Update Edge Function env var |
| 🟢 **Publishable/anon key** (in `js/script.js`) | **No change needed** | Public key, low risk, RLS protects DB. Existing key works fine. |
| 🔄 **Database password** | **Rotate in dashboard** | Go to Supabase → Settings → Database → Reset database password |
| 🔄 **Service role key** (Edge Function env var) | **Update in dashboard** | Go to Supabase → Edge Functions → `submit-form` → Manage → Update `SUPABASE_SERVICE_ROLE_KEY` |

**Steps to rotate Supabase credentials (in dashboard):**

```
1. Supabase Dashboard → Project → Settings → API Keys
   └─ Click "Create new API key"
      ├─ Create new Secret key (for Edge Function)
      └─ Create new Publishable key (optional — existing anon key is fine)

2. Supabase Dashboard → Edge Functions → submit-form → Manage
   └─ Update SUPABASE_SERVICE_ROLE_KEY with new secret key

3. Supabase Dashboard → Settings → Database
   └─ Click "Reset database password"
   └─ Copy new connection string → Update GitHub secret SUPABASE_DATABASE_URL

4. Supabase Dashboard → Settings → API Keys
   └─ Delete old compromised keys (after verifying new ones work)
```

---

## 10. Post-Deployment Verification

### 10a — Test the Website

```bash
# From your local machine, check the VPS is serving correctly
curl -I http://159.198.36.184/

# Expected: HTTP/1.1 200 OK
```

Or visit `http://159.198.36.184/` in your browser.

### 10b — Verify nginx is Running

```bash
# On the VPS
sudo systemctl status nginx
sudo nginx -t
```

### 10c — Check Firewall Rules

```bash
sudo ufw status verbose
```

Expected output:
```
Status: active

To                         Action      From
--                         ------      ----
22/tcp (SSH)               ALLOW IN    Anywhere
80/tcp (HTTP)              ALLOW IN    Anywhere
443/tcp (HTTPS)            ALLOW IN    Anywhere
```

### 10d — Test the Deploy Workflow

Push a commit to `main` (or trigger manually from GitHub Actions UI), then check:

1. **GitHub Actions** → "Deploy to VPS" workflow completes successfully (green checkmark)
2. **VPS logs** — check `/var/log/nginx/access.log` for recent requests
3. **Email** — deploy notification is sent to `NOTIFY_EMAIL`

### 10e — Test Form Submissions

1. Visit the site → fill out the registration form → submit
2. Check Supabase → **Table Editor** → `registrations` table for new entry
3. Check Supabase → **Edge Functions** → `submit-form` → Logs for errors

---

## 11. Troubleshooting

### SSH: "Permission denied (publickey)"

```bash
# On the VPS, check authorized_keys
cat ~/.ssh/authorized_keys

# Check permissions (must be 600)
chmod 600 ~/.ssh/authorized_keys
chmod 700 ~/.ssh

# Check SSH config for correct key path
ssh -i ~/.ssh/codebridge-vps -v deployer@159.198.36.184
```

### Deploy: "Host key verification failed"

```bash
# On your local machine, re-scan the host key
ssh-keyscan -H 159.198.36.184

# Update the VPS_HOST_KEY GitHub secret with the new output
```

### nginx: "Permission denied" when serving files

```bash
# Fix directory permissions
sudo chown -R deployer:deployer /var/www/codebridgeacademy
sudo chmod -R 755 /var/www/codebridgeacademy
```

### Git pull: "Permission denied (publickey)"

```bash
# On the VPS, test GitHub SSH connection
ssh -T git@github.com

# Make sure the SSH config is correct
cat ~/.ssh/config

# Verify the deploy key is added in GitHub → Settings → Deploy keys
# Confirm "Allow write access" is checked
```

### Firewall blocking SSH

If you get locked out:
1. Log in via Namecheap's **VPS Console** (in browser dashboard)
2. Run: `ufw allow 22/tcp`
3. Verify: `ufw status`

### Certbot: "Could not automatically find a matching server block"

Make sure the `server_name` in your nginx config matches your actual domain:

```bash
sudo certbot --nginx -d codebridgecademy.com -d www.codebridgecademy.com
```

---

## Appendix: Useful Commands

### On the VPS

```bash
# Check nginx status
sudo systemctl status nginx

# View nginx access logs (live)
sudo tail -f /var/log/nginx/access.log

# View nginx error logs
sudo tail -f /var/log/nginx/error.log

# Check fail2ban status
sudo fail2ban-client status sshd

# Check firewall
sudo ufw status verbose

# Check disk usage
df -h

# Check memory
free -h

# View recent SSH login attempts
sudo journalctl -u sshd --no-pager | tail -20
```

### On Local Machine

```bash
# SSH into VPS
ssh -i ~/.ssh/codebridge-vps deployer@159.198.36.184

# Copy files to VPS
scp -i ~/.ssh/codebridge-vps <file> deployer@159.198.36.184:/var/www/codebridgeacademy/

# View GitHub Actions logs (requires gh CLI)
gh run watch
```

---

## Quick Recovery Summary

If you ever need to rebuild the VPS from scratch again:

```
1. Reinstall Ubuntu 24.04 LTS on Namecheap
2. Generate new SSH keys (local)          → Step 2
3. SSH in as root, create deployer user   → Step 3
4. Harden SSH, firewall, fail2ban         → Step 4
5. Install nginx, git, configure site     → Step 5
6. Generate deploy key, clone repo        → Step 6
7. Update GitHub secrets                  → Step 7
8. Push to main → auto-deploy             → Step 8
9. Rotate Supabase credentials            → Step 9
10. Verify everything works               → Step 10
```
