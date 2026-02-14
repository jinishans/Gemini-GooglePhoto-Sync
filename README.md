# Gemini Smart Photo Sync

A smart, AI-powered photo organization and gallery tool that works with Google Photos and local storage.

## Prerequisites

1.  **Node.js**: Installed to build the React application.
2.  **Python 3.x**: Installed to run the desktop tray utility.

## 🚀 Installation & Running

### 1. Build the Application
First, compile the React application into static files.

```bash
npm install
npm run build
```

### 2. Install Python Dependencies
Install the required libraries for the system tray icon and server.

```bash
pip install -r requirements.txt
```

### 3. Run the Desktop Utility
Run the Python script. This will start the local web server and place an icon in your system tray.

```bash
# Run normally (keeps console open)
python run_app.py

# OR Run silently (background)
pythonw run_app.py
```

*   **Open Dashboard**: Double-click the tray icon or select "Open Dashboard".
*   **Auto-Start**: Right-click the tray icon and check "Run on Startup" to have it start with Windows automatically.

## 🔑 API Key Configuration

The application requires a Google GenAI API Key.
Make sure you have a `.env` file in the root directory before running `npm run build`:

```
REACT_APP_API_KEY=your_actual_api_key_here
```
*(Note: Since this is a client-side build, the key is embedded during the build process)*.

## Features

*   **Smart Upload**: Drag & drop photos to auto-tag using Gemini Vision.
*   **Vector Search**: Semantic search for your photos ("dog on the beach").
*   **Tray Integration**: Runs in the background, capable of auto-starting.
