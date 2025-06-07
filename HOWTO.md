# Corcel Platform – HOWTO Guide

This HOWTO provides step-by-step instructions for setting up, running, and extending the Corcel Platform.

---

## 1. Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/)
- (Optional) [Git](https://git-scm.com/)
- (Optional for development) Node.js, Python 3.9+, pip

---

## 2. Repository Structure

- `frontend/` – React web client
- `api/` – Flask API backend
- `docker-compose.yml` – Service orchestration
- `backups/` – Scripts and DB backups (if any)
- `images/` – UI and documentation images

---

## 3. Setup

### 3.1 Clone the Repository

```bash
git clone https://github.com/jhssilv/corcel-platform.git
cd corcel-platform
```

### 3.2 Configure Environment

- Edit `docker-compose.yml` to match your database credentials.
- For local development, ensure environment variables in `api/` (Flask) and `frontend/` (React) are set correctly.

### 3.3 Prepare Database

- By default, the platform expects a Postgres database.
- If you have essay/correction data, load it using scripts in `backups/` or via direct import.
- Update DB connection URLs as needed.

---

## 4. Running the Platform

### 4.1 Docker Compose (Recommended)

```bash
docker-compose up --build
```

- This will start:
  - The Flask API
  - The React frontend
  - The Postgres database (if configured)
  - Nginx as a reverse proxy

- Access the application at: [http://localhost:8080](http://localhost:8080)

### 4.2 Manual (For Development)

- **Backend:**  
  ```bash
  cd api
  pip install -r requirements.txt
  flask run
  ```
- **Frontend:**  
  ```bash
  cd frontend
  npm install
  npm start
  ```

---

## 5. Usage

- **Login:** Use the authentication page to log in.
- **Main UI:** Upload essays, view corrections, and interact with grading data.
- **Admin/Research:** Access API endpoints (see `api/` docs) for advanced features or data export.

---

## 6. Customization

- **Add Correction Models:** Place new models in `api/` and update endpoints.
- **Change UI:** Modify React components in `frontend/`.
- **Database Schema:** Update migrations and models in `api/`.

---

## 7. Troubleshooting

- **Database Connection Errors:** Double-check DB URLs and credentials.
- **Ports in Use:** Ensure required ports (default 8080) are available.
- **Docker Issues:** Run `docker-compose down` to reset and try again.

---

## 8. Contributing

- Fork the repo and create a feature branch.
- Submit pull requests with clear descriptions.
- Open issues for bugs or suggestions.

---

## 9. License & Credits

- See [LICENSE](LICENSE) for details.
- Main author: @jhssilv

---

*Questions? Open an issue on GitHub!*
