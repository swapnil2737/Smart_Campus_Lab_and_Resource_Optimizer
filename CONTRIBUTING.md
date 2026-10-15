# Contributing to Smart Campus Lab & Resource Optimizer

_Contribution and local-development guidelines for the project._

---

## 🧭 Before you start

This repository is currently a student project for local demonstration. Contributions should preserve the existing Flask, SQL Server, and static frontend architecture unless a change explicitly documents a migration.

Never commit passwords, SQL Server connection strings, `.env` files, virtual environments, database backups, or generated Python cache files.

## 🛠️ Development setup

1. Create `backend\.venv` and install `backend\requirements.txt`.
2. Create a local SQL Server database by running `smart_campus_lab_SQLServer_SSMS_FIXED.sql`.
3. Set `DB_SERVER`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, and optionally `DB_DRIVER`.
4. Start the API with `backend\.venv\Scripts\python.exe backend\app.py`.
5. Serve the frontend through VS Code Live Server or `python -m http.server 5500`.

The full setup guide is in [README.md](README.md).

## 📐 Change guidelines

### Backend and API

- Keep route responses JSON-shaped and consistent with existing success/error responses.
- Use the helpers in `backend/database.py` for SQL Server connections and cleanup.
- Parameterize SQL values; do not build queries from untrusted string concatenation.
- Update `js/api.js` when adding or changing a frontend-consumed endpoint.

### Database

- Document schema changes in `smart_campus_lab_SQLServer_SSMS_FIXED.sql`.
- Preserve foreign-key relationships and seed-data ordering.
- Do not use real personal information in sample records.
- Explain destructive or data-migration steps in the pull request.

### Frontend

- Reuse existing shared styles and API helpers.
- Keep role-specific behavior in the corresponding page and JavaScript module.
- Test pages through an HTTP server so relative assets and API calls behave like deployment.

## 🧪 Validation

Run the smallest relevant checks before opening a pull request:

```powershell
backend\.venv\Scripts\python.exe scratch\test_api_suite.py
backend\.venv\Scripts\python.exe scratch\verify_system.py
```

If a check cannot run because SQL Server or the optional Team A package is unavailable, record that limitation rather than marking the test as passed.

## 🔀 Pull requests

Include:

- What changed and why
- Affected routes, pages, or database tables
- Setup or migration instructions
- Commands used for validation
- Known limitations or follow-up work

Keep pull requests focused. Do not mix unrelated formatting or generated-file changes with functional work.
