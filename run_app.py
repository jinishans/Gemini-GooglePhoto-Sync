import os
import sys
import threading
import webbrowser
import logging
import time
import json
import tkinter as tk
from tkinter import filedialog, messagebox, ttk
from PIL import Image, ImageDraw

# Third-party imports
from pystray import Icon, MenuItem as item, Menu
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

# Configuration
CONFIG_FILE = "sync_config.json"
DEFAULT_CONFIG = {
    "web_app_url": "http://localhost:3000", 
    "local_folder": "",
    "auto_sync": False,
    "api_key": ""
}

# Setup Logging
logging.basicConfig(
    level=logging.INFO, 
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%H:%M:%S'
)

# Global State
config = DEFAULT_CONFIG.copy()
observer = None
tray_icon = None

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

# --- Real-time File Watcher (OneDrive-like) ---
class GeminiSyncHandler(FileSystemEventHandler):
    def on_created(self, event):
        if not event.is_directory and self.is_image(event.src_path):
            self.process_file(event.src_path, "Created")

    def on_modified(self, event):
        if not event.is_directory and self.is_image(event.src_path):
            self.process_file(event.src_path, "Modified")

    def is_image(self, path):
        return path.lower().endswith(('.png', '.jpg', '.jpeg', '.webp', '.bmp', '.heic'))

    def process_file(self, file_path, action):
        logging.info(f"[{action}] Detected: {file_path}")
        if tray_icon:
            tray_icon.title = f"Syncing: {os.path.basename(file_path)}..."
        
        # Simulate Upload Delay
        time.sleep(1)
        
        # In a real implementation:
        # 1. Generate local embedding or description using Gemini API (Python SDK)
        # 2. Upload to Web App via API
        logging.info(f"✔ Synced: {file_path}")
        
        if tray_icon:
            tray_icon.title = "Gemini Sync: Up to date"

def start_watching():
    global observer
    if observer:
        observer.stop()
        observer.join()
    
    if config["auto_sync"] and config["local_folder"] and os.path.exists(config["local_folder"]):
        event_handler = GeminiSyncHandler()
        observer = Observer()
        observer.schedule(event_handler, config["local_folder"], recursive=True)
        observer.start()
        logging.info(f"Started watching: {config['local_folder']}")
    else:
        logging.info("Sync watcher not started (Check config or disabled).")

# --- GUI Settings Window ---
def open_settings_window(icon, item):
    root = tk.Tk()
    root.title("Gemini Sync Settings")
    root.geometry("500x480")
    
    # Force focus
    root.lift()
    root.attributes('-topmost',True)
    root.after_idle(root.attributes,'-topmost',False)

    # Styles
    style = ttk.Style()
    style.configure("TButton", padding=6)
    style.configure("TEntry", padding=4)

    # State Variables
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
        
        # Restart Watcher
        start_watching()
        
        messagebox.showinfo("Success", "Settings saved. Sync service updated.")
        root.destroy()

    # Layout
    pad_opts = {'padx': 20, 'pady': 5}
    
    ttk.Label(root, text="Gemini Sync Preferences", font=("Segoe UI", 16, "bold")).pack(pady=20)
    
    # Form
    frame = ttk.Frame(root)
    frame.pack(fill=tk.BOTH, expand=True, padx=20)

    ttk.Label(frame, text="Web App / Server URL:").pack(anchor=tk.W)
    ttk.Entry(frame, textvariable=url_var).pack(fill=tk.X, pady=(0, 10))

    ttk.Label(frame, text="Local Folder to Sync:").pack(anchor=tk.W)
    f_frame = ttk.Frame(frame)
    f_frame.pack(fill=tk.X, pady=(0, 10))
    ttk.Entry(f_frame, textvariable=folder_var).pack(side=tk.LEFT, fill=tk.X, expand=True)
    ttk.Button(f_frame, text="Browse", command=browse_folder).pack(side=tk.RIGHT, padx=5)

    ttk.Label(frame, text="Gemini API Key (Optional for Local AI):").pack(anchor=tk.W)
    ttk.Entry(frame, textvariable=key_var, show="*").pack(fill=tk.X, pady=(0, 10))

    ttk.Checkbutton(frame, text="Enable Real-time Sync", variable=auto_sync_var).pack(anchor=tk.W, pady=10)

    # Footer
    ttk.Button(root, text="Save & Apply", command=save_settings).pack(fill=tk.X, side=tk.BOTTOM, padx=20, pady=20)
    
    root.mainloop()

# --- System Tray ---
def create_image():
    # Generate a simple icon if file missing
    w, h = 64, 64
    image = Image.new('RGB', (w, h), color=(255, 255, 255))
    dc = ImageDraw.Draw(image)
    # Draw a blue circle (Gemini Blue)
    dc.ellipse([8, 8, 56, 56], fill=(33, 150, 243))
    # Draw a white G
    dc.text((24, 20), "G", fill="white", font_size=20)
    return image

def open_web(icon, item):
    webbrowser.open(config.get("web_app_url", "http://localhost:3000"))

def quit_app(icon, item):
    if observer:
        observer.stop()
        observer.join()
    icon.stop()
    sys.exit()

def main():
    global tray_icon
    load_config()
    start_watching()

    # Try to load icon file, fallback to generated
    icon_path = "public/icon.ico"
    if os.path.exists(icon_path):
        try:
            image = Image.open(icon_path)
        except:
            image = create_image()
    else:
        image = create_image()

    menu = Menu(
        item('Gemini Sync: Active' if config["auto_sync"] else 'Gemini Sync: Paused', lambda i, x: None, enabled=False),
        Menu.SEPARATOR,
        item('Open Web Gallery', open_web, default=True),
        item('Settings', open_settings_window),
        Menu.SEPARATOR,
        item('Quit', quit_app)
    )

    tray_icon = Icon("GeminiSync", image, "Gemini Sync", menu)
    logging.info("Gemini Sync Client started in System Tray.")
    tray_icon.run()

if __name__ == "__main__":
    main()