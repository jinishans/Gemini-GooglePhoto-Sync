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

3.  **Run the Local Host Script**:
    This script serves the React app locally and provides a System Tray icon.
    ```bash
    python run_local_host.py
    ```
    *   A Green Icon will appear in your tray.
    *   Browser opens at `http://localhost:3000`.

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

### Part B: Connect Desktop Sync Client
Now that your web app is online, run the desktop client on your PC to download photos.

1.  **Open your deployed Firebase App** in a browser and **Log In**.
2.  Go to **Settings** in the Web App and click **"Copy Access Token"**.
3.  **Run the Sync Tool** on your PC:
    ```bash
    python run_cloud_sync.py
    ```
4.  **Configure the Client**:
    *   Right-click the **Blue Tray Icon** > **Sync Settings...**
    *   **Paste the Access Token** you copied from the web app into the "Google Access Token" field.
    *   Select your local download folder (e.g., `D:\MyPhotos`).
    *   Click **Fetch Albums** to see your list, select albums, and click **Save & Sync**.

---

## 🔑 Key Features

*   **Google Photos Integration**: Lists real albums and allows downloading them to your PC.
*   **Smart Upload**: Drag & drop photos to auto-tag using Gemini Vision.
*   **Vector Search**: Semantic search for your photos ("dog on the beach").
*   **Tray Integration**: Runs in the background with auto-start capabilities.
