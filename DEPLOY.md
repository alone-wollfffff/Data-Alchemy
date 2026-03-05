# 🚀 Deployment Guide

## Step 1 — Push to GitHub

```bash
cd data-alchemy
git init
git add .
git commit -m "feat: initial Data Alchemy v3.2"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/data-alchemy.git
git push -u origin main
```

## Step 2 — Create HuggingFace Space

1. Go to https://huggingface.co/spaces
2. Click **Create new Space**
3. Name it `data-alchemy`
4. SDK: **Docker**
5. Hardware: **CPU Basic** (free tier works)
6. Click **Create Space**

## Step 3 — Connect GitHub → HuggingFace (auto-deploy)

### Option A: GitHub Action (recommended)
1. In your GitHub repo → **Settings → Secrets → Actions**
2. Add secret: `HF_TOKEN` = your HuggingFace write token
   (Get from: https://huggingface.co/settings/tokens)
3. Edit `.github/workflows/sync-to-hf.yml`:
   - Replace `YOUR_HF_USERNAME` with your HF username
4. Every `git push` to `main` will auto-deploy to HuggingFace ✅

### Option B: Manual push
```bash
git remote add hf https://YOUR_HF_USERNAME:YOUR_HF_TOKEN@huggingface.co/spaces/YOUR_HF_USERNAME/data-alchemy
git push hf main
```

## Step 4 — Set Space Secrets

In your HuggingFace Space → **Settings → Repository secrets**:

| Secret | Value |
|--------|-------|
| `SECRET_KEY` | `python -c "import secrets; print(secrets.token_hex(32))"` |
| `ALLOWED_ORIGINS` | `https://YOUR_HF_USERNAME-data-alchemy.hf.space` |
| `PROJECT_TTL_HOURS` | `2` |
| `HTTPS` | `1` |

## Step 5 — Verify

Your Space URL will be:
```
https://huggingface.co/spaces/YOUR_HF_USERNAME/data-alchemy
```

Build logs: Space page → **Logs** tab

## Making Changes

```bash
# Edit files locally, then:
git add .
git commit -m "fix: your change description"
git push origin main
# GitHub Action auto-deploys to HuggingFace within ~5 minutes
```
