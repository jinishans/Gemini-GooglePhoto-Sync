# Gemini Smart Photo Sync

A smart, AI-powered photo organization and gallery tool. You can run this application in two ways:
1.  **Fully Local**: Everything runs on your computer.
2.  **Cloud Hosted**: The web app lives on the internet (Firebase), and a small tray utility on your computer syncs your photos to it.

---

## 🛠️ Common Prerequisites

Before choosing an option, you must build the web application code.

1.  **Install Node.js** (for building the web app).
2.  **Install Python 3.x** (for running the desktop utility).
3.  **Setup Environment**:
    Create a `.env` file in the root directory:
    ```
    REACT_APP_API_KEY=your_google_genai_api_key
    ```
4.  **Build the App**:
    ```bash
    npm install
    npm run build
    ```
5.  **Install Python Libraries**:
    ```bash
    pip install -r requirements.txt
    ```

---

## 🏠 Option 1: Fully Local Setup
*Best for privacy and offline usage. The app runs entirely on your machine.*

1.  **Run the Local Host Script**:
    ```bash
    python run_local_host.py
    ```
2.  **Usage**:
    *   A **Green Icon** will appear in your system tray.
    *   Your browser will automatically open `http://localhost:3000`.
    *   The app serves the files directly from your computer.

---

## ☁️ Option 2: Cloud Hosted + Sync Client
*Best for sharing links with others and accessing your gallery from anywhere.*

### Step A: Deploy the Web App
1.  Install Firebase tools: `npm install -g firebase-tools`
2.  Login: `firebase login`
3.  Initialize: `firebase init` (Select **Hosting**, use `build` as the public directory, answer **Yes** to "Configure as single-page app").
4.  Deploy:
    ```bash
    firebase deploy
    ```
5.  **Copy the Hosting URL** provided (e.g., `https://your-project.web.app`).

### Step B: Run the Client Sync App
1.  Run the Cloud Sync Script on your computer:
    ```bash
    python run_cloud_sync.py
    ```
2.  **Configure**:
    *   Right-click the **Blue Icon** in your system tray.
    *   Select **Settings & Sync**.
    *   Paste your **Firebase App URL** from Step A.
    *   Select your local photos folder.
    *   Click **Save & Connect**.
3.  **Usage**:
    *   The Python script runs in the background uploading/syncing metadata to your Cloud App.
    *   You can visit your Firebase URL from any device to see your gallery.

---

## 🔑 Features

*   **Smart Upload**: Drag & drop photos to auto-tag using Gemini Vision.
*   **Vector Search**: Semantic search for your photos ("dog on the beach").
*   **Tray Integration**: Runs in the background with auto-start capabilities.
