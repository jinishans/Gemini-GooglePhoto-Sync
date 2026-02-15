# Gemini Smart Photo Sync

A smart, AI-powered photo organization and gallery tool.

## 🚨 Critical Setup: Fixing Google Login (Error 403)

If you see `Error 403: access_denied` when logging in, it is because the Google Photos API is **Restricted**. You must configure your Google Cloud Project correctly for development.

### Step 1: Create Project & Enable API
1.  Go to [Google Cloud Console](https://console.cloud.google.com/).
2.  Create a **New Project**.
3.  Go to **APIs & Services > Library**.
4.  Search for **"Google Photos Library API"**.
5.  Click **Enable**.

### Step 2: Configure OAuth Consent Screen (The Fix for 403)
1.  Go to **APIs & Services > OAuth consent screen**.
2.  **User Type**: Select **External**. Click Create.
3.  **App Information**: Fill in App Name (e.g., "Gemini Photo Sync") and User Support Email.
4.  **Scopes**: Click "Add or Remove Scopes".
    *   Search for `photoslibrary.readonly` and select it.
    *   Also select `userinfo.email` and `userinfo.profile`.
    *   Click Update.
5.  **Test Users** (CRITICAL STEP):
    *   Under the "Test Users" section, click **+ ADD USERS**.
    *   **Enter the exact Google Email address you are trying to log in with.**
    *   *Note: While in "Testing" status, only emails listed here can log in.*
6.  Save and Continue.

### Step 3: Create Credentials
1.  Go to **APIs & Services > Credentials**.
2.  Click **+ CREATE CREDENTIALS** > **OAuth client ID**.
3.  **Application type**: Select **Web application**.
4.  **Authorized JavaScript origins**:
    *   Add `http://localhost:3000`
5.  **Authorized redirect URIs**:
    *   Add `http://localhost:3000`
6.  Click **Create**.
7.  Copy the **Client ID** (it ends in `.apps.googleusercontent.com`).

---

## 🛠️ Installation & Running

### 1. Environment Setup
Create a `.env` file in the root directory:
```
# From Google AI Studio (aistudio.google.com)
REACT_APP_API_KEY=your_gemini_api_key

# From Google Cloud Console (Step 3 above)
REACT_APP_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
```

### 2. Build Web App
```bash
npm install
npm run build
```

### 3. Run Application (Option 1: Fully Local)
*Best for privacy and offline usage.*
1.  Install Python dependencies: `pip install -r requirements.txt`
2.  Run the host script:
    ```bash
    python run_local_host.py
    ```
3.  A Green Icon will appear in your tray. Browser opens at `http://localhost:3000`.

### 4. Run Application (Option 2: Cloud Sync)
*Best for specific album downloading.*
1.  Deploy the `dist` folder to Firebase/Vercel (or just run `npm run preview`).
2.  Run the sync tool:
    ```bash
    python run_cloud_sync.py
    ```
3.  Right-click the Blue Tray Icon > **Settings**.
4.  Paste your **Access Token** (get this from the Web App Settings screen after logging in).

---

## 🔑 Features

*   **Google Photos Integration**: Lists real albums and allows downloading them to your PC.
*   **Smart Upload**: Drag & drop photos to auto-tag using Gemini Vision.
*   **Vector Search**: Semantic search for your photos ("dog on the beach").
*   **Tray Integration**: Runs in the background with auto-start capabilities.
