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

# Configuration
CONFIG_FILE = "sync_config.json"
DEFAULT_CONFIG = {
    "web_app_url": "https://YOUR-PROJECT.web.app", 
    "local_folder": "",
    "auto_sync": False,
    "api_key": ""
}

# Global State
config = DEFAULT_CONFIG.copy()
sync_thread_active = False
stop_event = threading.Event()

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

# --- Background Sync Logic (Cloud Mode) ---
def sync_worker():
    global sync_thread_active
    sync_thread_active = True
    logging.info("Cloud Sync Worker Started")
    
    while not stop_event.is_set():
        if config["auto_sync"] and config["local_folder"] and config["web_app_url"]:
            folder = config["local_folder"]
            target_url = config["web_app_url"]
            
            if os.path.exists(folder):
                logging.info(f"Syncing {folder} -> {target_url} ...")
                # Actual logic to POST images to the cloud API would go here
                # Example: requests.post(f"{target_url}/api/upload", files={...})
            else:
                logging.warning("Configured local folder path invalid.")
        
        time.sleep(60) # Sync every minute
    
    sync_thread_active = False

def start_sync_thread():
    if not sync_thread_active:
        stop_event.clear()
        t = threading.Thread(target=sync_worker, daemon=True)
        t.start()

# --- GUI Settings Window ---
def open_settings_window(icon, item):
    root = tk.Tk()
    root.title("Gemini Cloud Sync Settings")
    root.geometry("500x500")
    
    style = ttk.Style()
    style.configure("TLabel", padding=5)
    style.configure("TButton", padding=5)

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
        messagebox.showinfo("Saved", "Configuration updated. Sync service restarting.")
        start_sync_thread()
        root.destroy()

    frame = ttk.Frame(root, padding="20")
    frame.pack(fill=tk.BOTH, expand=True)

    ttk.Label(frame, text="Setup Cloud Connection", font=("Arial", 14, "bold")).pack(pady=(0, 20))

    ttk.Label(frame, text="Firebase / Cloud App URL").pack(anchor=tk.W)
    ttk.Entry(frame, textvariable=url_var, width=50).pack(fill=tk.X, pady=(0, 10))
    ttk.Label(frame, text="e.g. https://my-photo-app.web.app", font=("Arial", 8), foreground="gray").pack(anchor=tk.W)

    ttk.Label(frame, text="Local Photos Folder").pack(anchor=tk.W, pady=(10,0))
    f_frame = ttk.Frame(frame)
    f_frame.pack(fill=tk.X, pady=(0, 10))
    ttk.Entry(f_frame, textvariable=folder_var).pack(side=tk.LEFT, fill=tk.X, expand=True)
    ttk.Button(f_frame, text="Browse", command=browse_folder).pack(side=tk.RIGHT, padx=(5, 0))

    ttk.Checkbutton(frame, text="Enable Background Sync", variable=auto_sync_var).pack(anchor=tk.W, pady=10)

    ttk.Button(frame, text="Save & Connect", command=save_settings).pack(fill=tk.X, pady=20)
    
    root.mainloop()

# --- Tray Logic ---
def open_cloud_app(icon, item):
    url = config.get("web_app_url", "https://google.com")
    webbrowser.open(url)

def quit_app(icon, item):
    stop_event.set()
    icon.stop()
    sys.exit()

def main():
    load_config()
    start_sync_thread()

    # Blue icon for Cloud Client
    image = Image.new('RGB', (64, 64), color=(33, 150, 243)) 
    
    menu = Menu(
        item('Open Web App (Cloud)', open_cloud_app, default=True),
        item('Settings & Sync', open_settings_window),
        Menu.SEPARATOR,
        item('Quit', quit_app)
    )

    icon = Icon("GeminiCloudSync", image, "Gemini Cloud Sync", menu)
    logging.info("Cloud Sync Client started.")
    icon.run()

if __name__ == "__main__":
    main()