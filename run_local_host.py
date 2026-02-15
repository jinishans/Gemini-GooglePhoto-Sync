import os
import sys
import threading
import webbrowser
import logging
import json
from http.server import SimpleHTTPRequestHandler, HTTPServer
from socketserver import ThreadingMixIn

# Third-party imports
from pystray import Icon, MenuItem as item, Menu
from PIL import Image

# Configuration
PORT = 3000
APP_NAME = "Gemini Photo Sync (Local)"
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
BUILD_DIR = os.path.join(ROOT_DIR, 'dist')
ICON_PATH = os.path.join(ROOT_DIR, 'public', 'favicon.ico')
CONFIG_FILE = os.path.join(ROOT_DIR, "sync_config.json")

# Setup Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Global Config State
sync_config = {}

def load_config():
    global sync_config
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r') as f:
                sync_config = json.load(f)
                logging.info(f"Loaded config: {sync_config.get('local_folder', 'No folder set')}")
        except Exception as e:
            logging.error(f"Failed to load config: {e}")

class ThreadingHTTPServer(ThreadingMixIn, HTTPServer):
    """Handle requests in a separate thread."""
    daemon_threads = True

class ReactHandler(SimpleHTTPRequestHandler):
    """Serves the React Build directory and handles API requests."""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BUILD_DIR, **kwargs)

    def log_message(self, format, *args):
        # Suppress generic HTTP logs
        pass

    def do_GET(self):
        # API: Get Config
        if self.path == '/api/config':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            # Reload from disk to ensure freshness
            if os.path.exists(CONFIG_FILE):
                with open(CONFIG_FILE, 'r') as f:
                    content = f.read()
                    self.wfile.write(content.encode('utf-8'))
            else:
                self.wfile.write(json.dumps({}).encode('utf-8'))
            return

        # Handle SPA routing: if file doesn't exist, serve index.html
        path = self.translate_path(self.path)
        if not os.path.exists(path) or os.path.isdir(path):
            self.path = '/index.html'
        super().do_GET()

    def do_POST(self):
        # API: Update Config
        if self.path == '/api/config':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            try:
                new_data = json.loads(post_data.decode('utf-8'))
                
                # Load existing to preserve other keys like local_folder
                current_config = {}
                if os.path.exists(CONFIG_FILE):
                    with open(CONFIG_FILE, 'r') as f:
                        current_config = json.load(f)
                
                # Update allowed fields
                if 'selected_albums' in new_data:
                    current_config['selected_albums'] = new_data['selected_albums']
                if 'api_key' in new_data:
                    current_config['api_key'] = new_data['api_key']
                
                # Save back to file
                with open(CONFIG_FILE, 'w') as f:
                    json.dump(current_config, f, indent=4)

                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "success", "config": current_config}).encode('utf-8'))
                logging.info("Config updated via Web API")
            except Exception as e:
                logging.error(f"Error updating config: {e}")
                self.send_response(500)
                self.end_headers()
            return
            
    def do_OPTIONS(self):
        # Handle CORS preflight
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

def start_server():
    """Starts the web server."""
    if not os.path.exists(BUILD_DIR):
        logging.error(f"Build directory not found at {BUILD_DIR}")
        return

    server = ThreadingHTTPServer(('localhost', PORT), ReactHandler)
    logging.info(f"Serving React app locally at http://localhost:{PORT}")
    server.serve_forever()

def open_browser(icon, item):
    webbrowser.open(f'http://localhost:{PORT}')

def open_sync_folder(icon, item):
    # Reload config in case it changed
    load_config()
    folder = sync_config.get("local_folder")
    if folder and os.path.exists(folder):
        os.startfile(folder) if os.name == 'nt' else webbrowser.open(folder)
    else:
        logging.warning("No valid local folder configured in sync_config.json")
        webbrowser.open(ROOT_DIR)

def quit_app(icon, item):
    icon.stop()
    os._exit(0)

def main():
    # 0. Load Config
    load_config()

    # 1. Start Web Server
    server_thread = threading.Thread(target=start_server, daemon=True)
    server_thread.start()

    # 2. Setup Tray Icon
    # Create a simple colored square if icon doesn't exist
    if os.path.exists(ICON_PATH):
        image = Image.open(ICON_PATH)
    else:
        image = Image.new('RGB', (64, 64), color=(76, 175, 80)) # Green for Local

    menu = Menu(
        item('Open Local Gallery', open_browser, default=True),
        item('Open Sync Folder', open_sync_folder),
        Menu.SEPARATOR,
        item('Quit', quit_app)
    )

    icon = Icon("GeminiLocalHost", image, "Gemini Local Server", menu)
    
    # Open browser on start
    threading.Timer(1.5, lambda: webbrowser.open(f'http://localhost:{PORT}')).start()
    
    logging.info("Local Host Tray App started.")
    icon.run()

if __name__ == "__main__":
    main()