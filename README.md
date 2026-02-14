# Gemini Smart Photo Sync (Cloud Edition)

A dual-architecture photo management solution:
1.  **Web App (Hosted on Firebase)**: View, search, and share albums publicly without exposing direct Google Photos links.
2.  **Desktop Tray Client (Python)**: Syncs local photos and Google Photos content to the Cloud Web App securely.

## 🚀 Deployment & Usage

### 1. Deploy Web App to Firebase
First, build the React application and deploy it to Firebase Hosting.

```bash
# Install dependencies
npm install

# Build the React App
npm run build

# Install Firebase Tools (if not already installed)
npm install -g firebase-tools

# Login to Google
firebase login

# Initialize Project (select Hosting)
firebase init

# Deploy
firebase deploy
```
*Note the Hosting URL provided by Firebase (e.g., `https://your-project.web.app`).*

### 2. Setup Desktop Sync Client
The Python script runs on your computer to handle the actual file synchronization.

```bash
# Install Python dependencies
pip install -r requirements.txt

# Run the Tray App
python run_app.py
```

### 3. Configure Sync
1.  Right-click the **Tray Icon**.
2.  Select **Settings & Login**.
3.  Enter the **Firebase App URL** from Step 1.
4.  Select the **Local Folder** you want to sync.
5.  Click **Save Configuration**.

## Features

*   **Public Link Sharing**: Host your own gallery on Firebase. Share links to albums that are viewable by anyone, independent of your Google Photos privacy settings.
*   **Desktop Sync**: Automatically pushes local files to the cloud app.
*   **Gemini AI Search**: Uses Google Gemini to analyze and search photos semantically.

## Architecture

*   **Frontend**: React + Tailwind + Lucide Icons (Hosted on Firebase).
*   **Backend/Sync**: Python `pystray` + `requests` (Running locally on Desktop).
