# Gemini Smart Photo Sync

A smart, AI-powered photo organization and gallery tool that works with Google Photos and local storage. It utilizes Google's Gemini API for semantic search, auto-tagging, and generative AI features.

## Prerequisites

1.  **Google Gemini API Key**: Get one from [Google AI Studio](https://aistudio.google.com/).
2.  **Docker Desktop**: Installed and running.

---

## 🐳 Option 1: Standard Docker (Linux Containers)

Use this method if your Docker Desktop is in **Linux Containers** mode (default).

### 1. Build and Run
Run the following command in your terminal. Replace `YOUR_API_KEY` with your actual key.

```bash
# Build the image
docker build -t gemini-photo-sync .

# Run the container
# We pass the API key as an environment variable to the container
docker run -d -p 3000:3000 -e API_KEY="YOUR_API_KEY" --name gemini-sync-app gemini-photo-sync
```

### 2. Access the App
Open your browser and navigate to: [http://localhost:3000](http://localhost:3000)

---

## 🪟 Option 2: Windows Native Containers

Use this method **only** if you have switched Docker Desktop to **Windows Containers** mode. This is useful for native Windows integration.

### 1. Switch Mode
1.  Right-click the Docker Desktop icon in the system tray.
2.  Select **"Switch to Windows containers..."**.
3.  Wait for Docker to restart.

### 2. Build and Run
Use the specific Windows configuration files provided.

**Using Docker Compose (Recommended):**

1.  Open `docker-compose.windows.yml`.
2.  Update the `API_KEY` environment variable directly in the file, OR export it in your PowerShell session:
    ```powershell
    $env:API_KEY="YOUR_ACTUAL_API_KEY"
    ```
3.  Run the compose command:
    ```powershell
    docker-compose -f docker-compose.windows.yml up -d --build
    ```

**Using Manual Docker Build:**

```powershell
# Build using the Windows Dockerfile
docker build -f Dockerfile.windows -t gemini-photo-sync-win .

# Run the container
docker run -d -p 3000:3000 -e API_KEY="YOUR_API_KEY" --name gemini-sync-win gemini-photo-sync-win
```

### 3. Access the App
Open your browser and navigate to: [http://localhost:3000](http://localhost:3000)

---

## 🛠️ Troubleshooting

*   **"image operating system 'windows' cannot be used on this platform"**:
    You are trying to run the Windows setup while Docker is in Linux mode. Switch Docker Desktop to Windows Containers, or use Option 1.
*   **"image operating system 'linux' cannot be used on this platform"**:
    You are trying to run Option 1 while Docker is in Windows mode. Switch Docker Desktop to Linux Containers.
*   **API Key Issues**:
    Ensure `process.env.API_KEY` is correctly passed. If the features requiring AI (Search/Upload) fail, check the container logs.
