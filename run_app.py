import os
import sys
import threading
import webbrowser
import logging
import time
import json
import tkinter as tk
from tkinter import filedialog, messagebox, ttk
import requests

# Third-party imports
from pystray import Icon, MenuItem as item, Menu
from PIL import Image

# Configuration & Persistence
APP_NAME = "Gemini Photo Sync Client"
CONFIG_FILE = "sync_config.json"
DEFAULT_CONFIG = {
    "web_app_url": "https://gemini-photo-sync-app.web.app", # Example Firebase URL
    "local_folder": "",
    "auto_sync": False,
    "api_key": ""
}

# Global State
config = DEFAULT_CONFIG.copy()
sync_thread_active = False
stop_event = threading.Event()

# Setup Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def load_config():
    global config
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r') as f:
                config = json.load(f)
        except Exception as e:
            logging.error(f"Failed to load config: {e}")

def save_config():
    try:
        with open(CONFIG_FILE, 'w') as f:
            json.dump(config, f, indent=4)
    except Exception as e:
        logging.error(f"Failed to save config: {e}")

# --- Background Sync Logic ---
def sync_worker():
    global sync_thread_active
    sync_thread_active = True
    logging.info("Sync Worker Started")
    
    while not stop_event.is_set():
        if config["auto_sync"] and config["local_folder"] and config["web_app_url"]:
            folder = config["local_folder"]
            if os.path.exists(folder):
                logging.info(f"Scanning {folder} for changes...")
                
                # Mock Sync Process: Walk through files
                for root, dirs, files in os.walk(folder):
                    for file in files:
                        if file.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
                            # In a real app, you would check hash/DB if file exists in Cloud
                            # Then upload via requests.post()
                            # e.g., upload_file(os.path.join(root, file), config["web_app_url"])
                            pass
                
                logging.info("Sync cycle complete. Waiting...")
            else:
                logging.warning("Configured local folder does not exist.")
        
        # Sleep for 30 seconds before next scan
        time.sleep(30)
    
    sync_thread_active = False
    logging.info("Sync Worker Stopped")

def start_sync_thread():
    if not sync_thread_active:
        stop_event.clear()
        t = threading.Thread(target=sync_worker, daemon=True)
        t.start()

# --- GUI Settings Window (Tkinter) ---
def open_settings_window(icon, item):
    root = tk.Tk()
    root.title("Gemini Sync Settings")
    root.geometry("500x450")
    
    # Styles
    style = ttk.Style()
    style.configure("TLabel", padding=5, font=('Segoe UI', 10))
    style.configure("TButton", padding=5, font=('Segoe UI', 10))
    style.configure("TEntry", padding=5)

    # Variables
    url_var = tk.StringVar(value=config.get("web_app_url", ""))
    folder_var = tk.StringVar(value=config.get("local_folder", ""))
    key_var = tk.StringVar(value=config.get("api_key", ""))
    auto_sync_var = tk.BooleanVar(value=config.get("auto_sync", False))

    def browse_folder():
        folder_selected = filedialog.askdirectory()
        if folder_selected:
            folder_var.set(folder_selected)

    def save_settings():
        config["web_app_url"] = url_var.get()
        config["local_folder"] = folder_var.get()
        config["api_key"] = key_var.get()
        config["auto_sync"] = auto_sync_var.get()
        save_config()
        messagebox.showinfo("Success", "Settings saved successfully! Sync service updated.")
        start_sync_thread() # Restart/Update sync
        root.destroy()

    # Layout
    frame = ttk.Frame(root, padding="20")
    frame.pack(fill=tk.BOTH, expand=True)

    ttk.Label(frame, text="Google Hosted App URL", font=('Segoe UI', 10, 'bold')).pack(anchor=tk.W)
    ttk.Entry(frame, textvariable=url_var, width=50).pack(fill=tk.X, pady=(0, 10))
    ttk.Label(frame, text="The full URL provided by Firebase (e.g., https://myapp.web.app)", foreground="gray", font=('Segoe UI', 8)).pack(anchor=tk.W, pady=(0, 10))

    ttk.Label(frame, text="Local Album Folder", font=('Segoe UI', 10, 'bold')).pack(anchor=tk.W)
    f_frame = ttk.Frame(frame)
    f_frame.pack(fill=tk.X, pady=(0, 10))
    ttk.Entry(f_frame, textvariable=folder_var).pack(side=tk.LEFT, fill=tk.X, expand=True)
    ttk.Button(f_frame, text="Browse...", command=browse_folder).pack(side=tk.RIGHT, padx=(5, 0))

    ttk.Label(frame, text="Google Gemini API Key", font=('Segoe UI', 10, 'bold')).pack(anchor=tk.W)
    ttk.Entry(frame, textvariable=key_var, show="*", width=50).pack(fill=tk.X, pady=(0, 10))

    ttk.Checkbutton(frame, text="Enable Automatic Background Sync", variable=auto_sync_var).pack(anchor=tk.W, pady=(10, 20))

    ttk.Button(frame, text="Save Configuration", command=save_settings).pack(fill=tk.X)
    
    root.mainloop()

# --- Tray Logic ---
def open_web_app(icon, item):
    url = config.get("web_app_url", "https://google.com")
    if not url.startswith("http"):
        url = "https://" + url
    webbrowser.open(url)

def quit_app(icon, item):
    stop_event.set()
    icon.stop()
    sys.exit()

def main():
    load_config()
    start_sync_thread()

    # Create Tray Icon
    # In a real app, use a real .ico or .png file
    image = Image.new('RGB', (64, 64), color=(33, 150, 243)) 
    
    menu = Menu(
        item('Open Web Gallery', open_web_app, default=True),
        item('Settings & Login', open_settings_window),
        Menu.SEPARATOR,
        item('Sync Now', lambda i, it: logging.info("Manual sync triggered")),
        item('Quit', quit_app)
    )

    icon = Icon("GeminiSyncClient", image, "Gemini Sync Client", menu)
    logging.info("Desktop Sync Client started in System Tray.")
    icon.run()

if __name__ == "__main__":
    main()
