---
title: Data Alchemy
emoji: ⚗️
colorFrom: blue
colorTo: purple
sdk: docker
app_port: 7860
pinned: false
short_description: No-code AutoML Tools.
---

# Data Alchemy

Raw data in. Trained intelligence out. No PhD required.

Data Alchemy is a no-code tabular ML app built around a React frontend and a FastAPI backend. A typical run looks like this:

1. Upload a CSV or Excel file
2. Clean columns and optionally engineer features with AutoFeat
3. Explore the dataset with D-Tale or YData Profiling
4. Train models with AutoGluon
5. Download processed data, reports, and deployment-ready model ZIPs

## Privacy

Project files are session-scoped. When the browser session is cleaned up, generated datasets, reports, models, and temporary ZIP exports under `static/projects/` are deleted.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend API | [FastAPI](https://fastapi.tiangolo.com/) + Gunicorn |
| Frontend | React + Vite + Framer Motion |
| ML Engine | [AutoGluon](https://auto.gluon.ai/) |
| Feature Engineering | [AutoFeat](https://github.com/cod3licious/autofeat) |
| Data Profiling | [YData Profiling](https://docs.profiling.ydata.ai/) |
| Data Explorer | [D-Tale](https://github.com/man-group/dtale) |

## Current Product Flow

- `Upload CSV`: accepts `.csv`, `.xlsx`, `.xls`
- `Operations`: remove columns, reset to original, run AutoFeat, add suggested features
- `Exploration`: launch D-Tale and generate a profiling report
- `AutoML Forge`: choose target, problem type, metric, preset, holdout fraction, and time limit
- `Downloads`: export processed CSV, profiling report, and full/selective model ZIPs

## Model ZIP Contents

Every valid model ZIP includes:

- `autogluon_model/`
- `processed_data.csv`
- `feature_engineering.json`
- `README.md`

Optional files are included only if they exist for that project:

- `autofeat_model.pkl`
- `profile_report.html`

## Running Locally

```bash
# Backend
pip install -r requirements.txt
python app.py

# Frontend (separate terminal for dev mode)
cd frontend
npm install
npm run dev
```

Then open `http://localhost:5173`.

## Docker

```bash
docker build -t data-alchemy .
docker run -p 7860:7860 data-alchemy
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `SECRET_KEY` | random | Session secret. Set this in production. |
| `PROJECT_TTL_HOURS` | `2` | Hours before inactive projects are auto-deleted |
| `ALLOWED_ORIGINS` | localhost | Comma-separated CORS origins |
| `PROJECTS_DIR` | `static/projects` | Where project files are stored |
| `PORT` | `7860` | App port for Docker / Hugging Face Spaces |

## Project Structure

```text
data-alchemy/
├── app.py
├── workers.py
├── requirements.txt
├── Dockerfile
├── DEPLOY.md
├── .github/
│   └── workflows/
│       └── sync-to-hf.yml
└── frontend/
    ├── package.json
    └── src/
        ├── api/
        ├── components/
        ├── context/
        └── pages/
```

## Notes

- The backend keeps active project state in memory, so the Docker setup intentionally runs a single Gunicorn worker.
- The chatbot is client-side and lives in `frontend/src/components/ChatBot.jsx`.
- Built frontend assets and generated project files are not meant to be committed because deployment rebuilds them.

## License

MIT
