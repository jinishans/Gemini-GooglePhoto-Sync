import os
import sys
import threading
import webbrowser
import logging
import time
from http.server import SimpleHTTPRequestHandler, HTTPServer
from socketserver import ThreadingMixIn
import winreg

# Third-party imports (install via pip install -r requirements.txt)
from pystray import Icon, MenuItem as item, Menu
from PIL import Image

# Configuration
PORT = 3000
APP_NAME = "Gemini Photo Sync"
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
BUILD_DIR = os.path.join(ROOT_DIR, 'build')
ICON_PATH = os.path.join(ROOT_DIR, 'public', 'favicon.ico') # Fallback icon

# Setup Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class ThreadingHTTPServer(ThreadingMixIn, HTTPServer):
    """Handle requests in a separate thread."""
    daemon_threads = True

class ReactHandler(SimpleHTTPRequestHandler):
    """Serves the React Build directory."""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BUILD_DIR, **kwargs)

    def log_message(self, format, *args):
        # Suppress generic HTTP logs to keep console clean
        pass

    def do_GET(self):
        # Handle SPA routing: if file doesn't exist, serve index.html
        path = self.translate_path(self.path)
        if not os.path.exists(path) or os.path.isdir(path):
            self.path = '/index.html'
        super().do_GET()

def start_server():
    """Starts the web server."""
    if not os.path.exists(BUILD_DIR):
        print(f"Error: Build directory not found at {BUILD_DIR}")
        print("Please run 'npm run build' first.")
        return

    server = ThreadingHTTPServer(('localhost', PORT), ReactHandler)
    logging.info(f"Serving React app at http://localhost:{PORT}")
    server.serve_forever()

def open_browser(icon, item):
    """Opens the app in the default browser."""
    webbrowser.open(f'http://localhost:{PORT}')

def set_autostart(enable=True):
    """Adds or removes the app from Windows Startup Registry."""
    key_path = r"Software\Microsoft\Windows\CurrentVersion\Run"
    try:
        key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, key_path, 0, winreg.KEY_ALL_ACCESS)
        # Use pythonw.exe to run without console window if possible, or python.exe
        python_exe = sys.executable.replace("python.exe", "pythonw.exe") if "python.exe" in sys.executable else sys.executable
        script_path = os.path.abspath(__file__)
        cmd = f'"{python_exe}" "{script_path}"'

        if enable:
            winreg.SetValueEx(key, "GeminiPhotoSync", 0, winreg.REG_SZ, cmd)
            logging.info("Added to Windows Startup")
        else:
            try:
                winreg.DeleteValue(key, "GeminiPhotoSync")
                logging.info("Removed from Windows Startup")
            except FileNotFoundError:
                pass
        winreg.CloseKey(key)
    except Exception as e:
        logging.error(f"Failed to modify registry: {e}")

def toggle_autostart(icon, item):
    """Toggles the checked state of auto-start."""
    current_state = item.checked
    set_autostart(not current_state)

def is_autostart_enabled(item):
    """Checks if registry key exists to update menu checkbox."""
    key_path = r"Software\Microsoft\Windows\CurrentVersion\Run"
    try:
        key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, key_path, 0, winreg.KEY_READ)
        winreg.QueryValueEx(key, "GeminiPhotoSync")
        winreg.CloseKey(key)
        return True
    except FileNotFoundError:
        return False
    except Exception:
        return False

def quit_app(icon, item):
    """Stops the app."""
    icon.stop()
    os._exit(0)

def main():
    # 1. Start Web Server in Background Thread
    server_thread = threading.Thread(target=start_server, daemon=True)
    server_thread.start()

    # 2. Prepare Tray Icon
    image = Image.open(ICON_PATH) if os.path.exists(ICON_PATH) else Image.new('RGB', (64, 64), color='blue')
    
    menu = Menu(
        item('Open Dashboard', open_browser, default=True),
        item('Run on Startup', toggle_autostart, checked=is_autostart_enabled),
        Menu.SEPARATOR,
        item('Quit', quit_app)
    )

    icon = Icon("GeminiPhotoSync", image, "Gemini Photo Sync", menu)

    # 3. Open browser immediately on first run
    threading.Timer(1.0, lambda: webbrowser.open(f'http://localhost:{PORT}')).start()
    
    logging.info("System Tray started.")
    icon.run()

if __name__ == "__main__":
    main()
