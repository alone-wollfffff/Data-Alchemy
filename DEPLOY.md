# Deployment Guide

This repo is set up to deploy to Hugging Face Spaces with Docker.

## What To Push

Push the project source, not runtime output.

Keep:

- `app.py`
- `workers.py`
- `requirements.txt`
- `Dockerfile`
- `README.md`
- `DEPLOY.md`
- `.github/workflows/sync-to-hf.yml`
- `frontend/`

Do not commit:

- `.venv/`
- `frontend/node_modules/`
- `static/projects/`
- `static/dist/`
- `.logs/`
- `__pycache__/`
- any local ZIP exports, reports, or temp files

## Step 1: Push To GitHub

```bash
cd data-alchemy
git init
git add .
git commit -m "feat: prepare deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/data-alchemy.git
git push -u origin main
```

## Step 2: Create Hugging Face Space

1. Go to [Hugging Face Spaces](https://huggingface.co/spaces)
2. Click `Create new Space`
3. Choose a name
4. Set SDK to `Docker`
5. Choose CPU Basic unless you want bigger hardware
6. Create the space

## Step 3: Configure GitHub Auto-Deploy

This repo includes a GitHub Action at `.github/workflows/sync-to-hf.yml`.

Set these in your GitHub repository:

- Secret: `HF_TOKEN`
- Variable: `HF_USERNAME`
- Variable: `HF_SPACE_NAME`

Example:

- `HF_USERNAME = lonewollff`
- `HF_SPACE_NAME = Data_Alchemy`

After that, every push to `main` will sync the repo to your Hugging Face Space.

## Step 4: Set Hugging Face Space Secrets

In your Hugging Face Space settings, add:

| Secret | Value |
|---|---|
| `SECRET_KEY` | a long random string |
| `ALLOWED_ORIGINS` | your Space URL |
| `PROJECT_TTL_HOURS` | `2` |
| `HTTPS` | `1` |

Example `SECRET_KEY`:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

## Step 5: Verify

After deployment:

1. Open the Space
2. Upload a CSV
3. Train a run
4. Download a model ZIP from the Downloads page
5. Confirm the app starts fresh after session cleanup

## Manual Push Option

If you do not want GitHub Actions:

```bash
git remote add hf https://YOUR_HF_USERNAME:YOUR_HF_TOKEN@huggingface.co/spaces/YOUR_HF_USERNAME/YOUR_SPACE_NAME
git push hf main
```
