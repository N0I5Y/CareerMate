# Careermate Web

A minimal single-page React app for uploading resume templates and resumes, polling for results, and previewing generated PDFs.

## Dev Setup

```sh
cp .env.example .env
npm install
npm run dev
```

- The app will run at http://localhost:5173
- Set `VITE_API_BASE` in `.env` if your backend is not at the same origin.

## Docker

```sh
docker build -t careermate-web .
docker run -p 8080:80 careermate-web
```

- The app will be available at http://localhost:8080
- Backend API is proxied to `host.docker.internal:3000` by default (see `nginx.conf`).

## Features
- Upload a DOCX template and preview the generated PDF.
- Upload a resume with options (role, company, prompt, JD text).
- Polls for generated DOCX/PDF and enables download/preview when ready.
- Inline PDF preview.
- Mobile-friendly, minimal UI.
- Errors and disabled states for all actions.

---
MIT License
