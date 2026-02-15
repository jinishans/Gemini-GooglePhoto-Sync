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
    *   Add `http://localhost:3000` (For Local Dev)
    *   **Later:** Add your Firebase URL (e.g., `https://your-project.web.app`) once deployed.
5.  **Authorized redirect URIs**:
    *   Add `http://localhost:3000` (For Local Dev)
    *   **Later:** Add your Firebase URL (e.g., `https://your-project.web.app`) once deployed.
6.  Click **Create**.
7.  Copy the **Client ID** (it ends in `.apps.googleusercontent.com`).

---

## ⚙️ Environment Configuration

Create a `.env` file in the root directory:
```bash
# From Google AI Studio (aistudio.google.com)
REACT_APP_API_KEY=your_gemini_api_key

# From Google Cloud Console (Step 3 above)
REACT_APP_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
```

---

## 🚀 Usage Option 1: Fully Local Development
*Best for testing, privacy, and offline usage.*

1.  **Install Dependencies**:
    ```bash
    npm install
    pip install -r requirements.txt
    ```

2.  **Build the Web App**:
    ```bash
    npm run build
    ```

3.  **Run the Local Host Script (`run_local_host.py`)**:
    This script acts as a simple web server for the React app and provides a tray icon for quick access.
    ```bash
    python run_local_host.py
    ```
    *   **What it does**: 
        *   Starts a local web server on port 3000.
        *   Opens your browser to `http://localhost:3000`.
        *   Loads your `sync_config.json` settings to allow quick access to your configured sync folder via the Tray Menu.
    *   **Tray Menu**: Right-click the **Green Icon** in your system tray to open the gallery or your sync folder.

---

## ☁️ Usage Option 2: Cloud Deployment (Firebase)
*Best for accessing your gallery from anywhere while syncing to your home PC.*

### Part A: Deploy Web App to Firebase
1.  **Install Firebase Tools**:
    ```bash
    npm install -g firebase-tools
    ```
2.  **Login & Initialize**:
    ```bash
    firebase login
    firebase init hosting
    ```
    *   Select **"Use an existing project"** (or create new).
    *   Public directory: `dist`
    *   Configure as a single-page app? **Yes**
    *   Set up automatic builds and deploys with GitHub? **No** (unless you want to).
3.  **Build & Deploy**:
    ```bash
    npm run build
    firebase deploy
    ```
4.  **Update Google Cloud Console**:
    *   Go back to [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials).
    *   Edit your OAuth Client ID.
    *   Add your new Firebase URL (e.g., `https://project-id.web.app`) to **Authorized JavaScript origins** and **Authorized redirect URIs**.

### Part B: Connect Desktop Sync Client (`run_cloud_sync.py`)
Now that your web app is online, run the desktop client on your PC to download photos.

1.  **Open your deployed Firebase App** in a browser and **Log In**.
2.  Go to **Settings** in the Web App and click **"Copy Access Token"**.
3.  **Run the Sync Tool**:
    ```bash
    python run_cloud_sync.py
    ```
4.  **Configure the Client**:
    *   Right-click the **Blue Tray Icon** > **Sync Settings...**
    *   **Paste the Access Token** you copied from the web app into the "Google Access Token" field.
    *   Select your local download folder (e.g., `D:\MyPhotos`).
    *   Click **Fetch Albums** to see your list, select albums, and click **Save & Sync**.

---

## 🔧 Troubleshooting

### "Catastrophic Failure" or GUI Crashes
If the Python script crashes when opening settings, it is likely a threading issue.
*   Ensure you are using the latest version of `run_cloud_sync.py`.
*   We have separated the Tray Icon and the Settings Window into different threads to prevent conflicts.

### "403 Access Denied"
*   Review "Critical Setup" at the top of this file. 
*   Ensure your email is in the **Test Users** list in Google Cloud Console.
