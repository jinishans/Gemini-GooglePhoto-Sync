import os
import sys
import threading
import webbrowser
import logging
import time
import json
import random
import tkinter as tk
from tkinter import filedialog, messagebox, ttk
import requests

# Third-party imports
from pystray import Icon, MenuItem as item, Menu
from PIL import Image, ImageDraw

# Configuration
CONFIG_FILE = "sync_config.json"
DEFAULT_CONFIG = {
    "local_folder": os.path.join(os.path.expanduser("~"), "GeminiPhotos"),
    "selected_albums": ["Vacation 2023"], # Default mock selection
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
                loaded = json.load(f)
                config.update(loaded)
        except Exception as e:
            logging.error(f"Failed to load config: {e}")

def save_config():
    try:
        with open(CONFIG_FILE, 'w') as f:
            json.dump(config, f, indent=4)
    except Exception as e:
        logging.error(f"Failed to save config: {e}")

# --- MOCK Google Photos API (Simulating the Cloud) ---
# In a real app, this would use google-auth-oauthlib and googleapiclient
def fetch_mock_remote_albums():
    return [
        {"id": "alb1", "title": "Vacation 2023", "items_count": 15},
        {"id": "alb2", "title": "Pets", "items_count": 8},
        {"id": "alb3", "title": "Family Reunion", "items_count": 24},
        {"id": "alb4", "title": "Food Blog", "items_count": 6},
        {"id": "alb5", "title": "Nature Hikes", "items_count": 12},
    ]

def simulate_download_photo(album_name, folder_path):
    """Creates a placeholder image file to simulate downloading."""
    if not os.path.exists(folder_path):
        os.makedirs(folder_path)
    
    filename = f"{album_name.replace(' ', '_')}_{random.randint(1000, 9999)}.jpg"
    full_path = os.path.join(folder_path, filename)
    
    # Create a simple colored square image using PIL
    color = (random.randint(0, 255), random.randint(0, 255), random.randint(0, 255))
    img = Image.new('RGB', (400, 400), color=color)
    d = ImageDraw.Draw(img)
    d.text((10,10), f"Google Photos\n{album_name}", fill=(255,255,255))
    
    img.save(full_path)
    return filename

# --- Background Sync Logic ---
def sync_worker():
    global sync_thread_active
    sync_thread_active = True
    logging.info("Cloud Sync Worker Started")
    
    # Create default folder if not exists
    if config["local_folder"] and not os.path.exists(config["local_folder"]):
        try:
            os.makedirs(config["local_folder"])
        except:
            pass

    while not stop_event.is_set():
        if config["auto_sync"] and config["local_folder"]:
            selected = config.get("selected_albums", [])
            
            if not selected:
                logging.info("No albums selected for sync.")
            
            for album in selected:
                # Simulate checking for new items
                logging.info(f"Checking album '{album}' for new items...")
                time.sleep(1) # Network delay
                
                # 30% chance to "find" a new photo and download it
                if random.random() > 0.7:
                    logging.info(f"New item found in '{album}'. Downloading...")
                    album_path = os.path.join(config["local_folder"], album)
                    fname = simulate_download_photo(album, album_path)
                    logging.info(f"Downloaded: {fname}")
                    
                    # Notify user (Simulated Toast)
                    # In Windows: from win10toast import ToastNotifier...
            
        time.sleep(10) # Check every 10 seconds for demo purposes
    
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
    root.geometry("600x600")
    
    style = ttk.Style()
    style.configure("TLabel", padding=5)
    style.configure("TButton", padding=5)

    folder_var = tk.StringVar(value=config.get("local_folder", ""))
    auto_sync_var = tk.BooleanVar(value=config.get("auto_sync", False))
    
    # Album Selection State
    remote_albums = fetch_mock_remote_albums()
    album_vars = {}
    current_selected = set(config.get("selected_albums", []))

    def browse_folder():
        folder_selected = filedialog.askdirectory()
        if folder_selected:
            folder_var.set(folder_selected)

    def save_settings():
        # Collect selected albums
        new_selection = [alb['title'] for alb in remote_albums if album_vars[alb['id']].get()]
        
        config["local_folder"] = folder_var.get()
        config["auto_sync"] = auto_sync_var.get()
        config["selected_albums"] = new_selection
        
        save_config()
        messagebox.showinfo("Saved", f"Configuration updated.\nSyncing {len(new_selection)} albums to disk.")
        start_sync_thread()
        root.destroy()

    # Layout
    frame = ttk.Frame(root, padding="20")
    frame.pack(fill=tk.BOTH, expand=True)

    # Header
    ttk.Label(frame, text="Google Photos Sync", font=("Segoe UI", 16, "bold")).pack(pady=(0, 5))
    ttk.Label(frame, text="Configure which cloud albums to download to this computer.", foreground="gray").pack(pady=(0, 20))

    # Folder Selection
    ttk.Label(frame, text="Local Download Location:").pack(anchor=tk.W)
    f_frame = ttk.Frame(frame)
    f_frame.pack(fill=tk.X, pady=(0, 20))
    ttk.Entry(f_frame, textvariable=folder_var).pack(side=tk.LEFT, fill=tk.X, expand=True)
    ttk.Button(f_frame, text="Browse...", command=browse_folder).pack(side=tk.RIGHT, padx=(5, 0))

    # Album List
    ttk.Label(frame, text="Select Albums to Sync:", font=("Segoe UI", 10, "bold")).pack(anchor=tk.W)
    
    list_frame = ttk.Frame(frame, borderwidth=1, relief="solid")
    list_frame.pack(fill=tk.BOTH, expand=True, pady=5)
    
    canvas = tk.Canvas(list_frame, bg="white")
    scrollbar = ttk.Scrollbar(list_frame, orient="vertical", command=canvas.yview)
    scrollable_frame = ttk.Frame(canvas)

    scrollable_frame.bind(
        "<Configure>",
        lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
    )
    canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
    canvas.configure(yscrollcommand=scrollbar.set)

    # Populate Albums
    for album in remote_albums:
        var = tk.BooleanVar(value=(album['title'] in current_selected))
        album_vars[album['id']] = var
        chk = ttk.Checkbutton(scrollable_frame, text=f"{album['title']} ({album['items_count']} items)", variable=var)
        chk.pack(anchor=tk.W, padx=10, pady=2)

    canvas.pack(side="left", fill="both", expand=True)
    scrollbar.pack(side="right", fill="y")

    # Options
    ttk.Checkbutton(frame, text="Enable Background Auto-Sync", variable=auto_sync_var).pack(anchor=tk.W, pady=10)

    # Save
    ttk.Button(frame, text="Apply & Sync Now", command=save_settings).pack(fill=tk.X, pady=10)
    
    root.mainloop()

# --- Tray Logic ---
def open_folder(icon, item):
    folder = config.get("local_folder")
    if folder and os.path.exists(folder):
        os.startfile(folder) if os.name == 'nt' else webbrowser.open(folder)
    else:
        # Fallback if folder not set
        webbrowser.open(os.getcwd())

def quit_app(icon, item):
    stop_event.set()
    icon.stop()
    sys.exit()

def main():
    load_config()
    start_sync_thread()

    # Create a nice icon
    image = Image.new('RGB', (64, 64), color=(33, 150, 243)) 
    d = ImageDraw.Draw(image)
    d.ellipse([16, 16, 48, 48], fill=(255, 255, 255))
    
    menu = Menu(
        item('Sync Settings...', open_settings_window, default=True),
        item('Open Local Folder', open_folder),
        Menu.SEPARATOR,
        item('Quit', quit_app)
    )

    icon = Icon("GeminiCloudSync", image, "Gemini Cloud Sync", menu)
    logging.info("Cloud Sync Client started.")
    icon.run()

if __name__ == "__main__":
    main()