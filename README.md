# Parkinson Tremor Observatory

This repository is a GitHub Pages bundle for the static dashboard.

## What is included

- `frontend/`: static HTML, CSS, and JavaScript
- `results/run_20260410_235634/`: figures and CSV files referenced by the dashboard

## Notes

- The dashboard runs in static demo mode on GitHub Pages.
- Uploading videos and calling `/api` analysis endpoints is disabled in this deployment.
- To run live analysis, use the original project and start `python ui_server.py --host 0.0.0.0 --port 8765`.

## Publish

1. Create an empty GitHub repository.
2. From this directory, run:
   - `git add .`
   - `git commit -m "Publish GitHub Pages site"`
   - `git remote add origin <your-repo-url>`
   - `git push -u origin main`
3. In GitHub repository settings, enable Pages from the `main` branch and the repository root.
