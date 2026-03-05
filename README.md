---
title: Data Alchemy
emoji: ⚗️
colorFrom: blue
colorTo: purple
sdk: docker
app_port: 7860
pinned: false
short_description: No-code AutoML, Upload CSV get trained model in minutes.
---

# ⚗️ Data Alchemy — AutoML Platform v3.2

**Raw data in. Trained intelligence out. No PhD required.**

Upload any CSV or Excel file and Data Alchemy will:
1. **Profile it** — deep statistical analysis with YData Profiling
2. **Let you clean it** — drop noisy columns, reset to original
3. **Engineer features** — AI-powered feature discovery with AutoFeat
4. **Train dozens of models** — XGBoost, LightGBM, CatBoost, Neural Nets via AutoGluon
5. **Hand you the champion** — download the best model as a ready-to-use ZIP

## 🔒 Privacy
All user data is **deleted automatically** when you close the browser tab. Nothing is stored between sessions.

## 🛠️ Tech Stack
| Layer | Technology |
|---|---|
| ML Engine | [AutoGluon](https://auto.gluon.ai/) |
| Feature Engineering | [AutoFeat](https://github.com/cod3licious/autofeat) |
| Data Profiling | [YData Profiling](https://docs.profiling.ydata.ai/) |
| Data Explorer | [D-Tale](https://github.com/man-group/dtale) |
| Backend | Flask + Gunicorn |
| Frontend | React + Vite + Framer Motion |

## 🚀 Running Locally

```bash
# Backend
pip install -r requirements.txt
python app.py

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

Then open http://localhost:5173

## 🐳 Docker

```bash
docker build -t data-alchemy .
docker run -p 7860:7860 data-alchemy
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `SECRET_KEY` | random | Flask session key — **set this in production** |
| `PROJECT_TTL_HOURS` | `2` | Hours before inactive projects are auto-deleted |
| `ALLOWED_ORIGINS` | localhost | Comma-separated CORS origins |
| `PROJECTS_DIR` | `static/projects` | Where project files are stored |

## 📁 Project Structure

```
data-alchemy/
├── app.py              # Flask REST API
├── bot_logic.py        # Alchemy Assistant response engine
├── requirements.txt
├── Dockerfile
└── frontend/
    └── src/
        ├── pages/      # Upload, Operations, Exploration, AutoML, Downloads
        ├── components/ # Layout, ChatBot, DataTable, DropZone
        ├── api/        # Axios client
        └── context/    # ProjectContext
```

## License
MIT
