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
    "selected_albums": [], 
    "auto_sync": False,
    "api_key": "" # This is now the Google OAuth Access Token
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

# --- REAL Google Photos API Logic ---

def get_headers():
    token = config.get("api_key")
    if not token:
        return None
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

def fetch_real_remote_albums():
    headers = get_headers()
    if not headers:
        return []
    
    try:
        logging.info("Fetching real albums from Google Photos API...")
        response = requests.get('https://photoslibrary.googleapis.com/v1/albums?pageSize=50', headers=headers)
        
        if response.status_code == 401:
            logging.error("Invalid Token. Please copy a new one from Web App.")
            return []
            
        data = response.json()
        albums = []
        if 'albums' in data:
            for a in data['albums']:
                albums.append({
                    "id": a['id'],
                    "title": a['title'],
                    "items_count": int(a.get('mediaItemsCount', 0))
                })
        return albums
    except Exception as e:
        logging.error(f"API Error: {e}")
        return []

def download_file(url, folder_path, filename):
    if not os.path.exists(folder_path):
        os.makedirs(folder_path)
        
    full_path = os.path.join(folder_path, filename)
    if os.path.exists(full_path):
        return # Skip if exists
        
    try:
        # Google Photos Base URL requires size param
        download_url = f"{url}=d" # =d forces download original
        r = requests.get(download_url, stream=True)
        if r.status_code == 200:
            with open(full_path, 'wb') as f:
                for chunk in r.iter_content(1024):
                    f.write(chunk)
            logging.info(f"Downloaded: {filename}")
    except Exception as e:
        logging.error(f"Failed to download {filename}: {e}")

def sync_album_content(album_id, album_name, headers):
    logging.info(f"Syncing Album: {album_name}")
    album_path = os.path.join(config["local_folder"], album_name)
    
    # We need to search media items for this album
    payload = {
        "albumId": album_id,
        "pageSize": 50
    }
    
    try:
        resp = requests.post('https://photoslibrary.googleapis.com/v1/mediaItems:search', headers=headers, json=payload)
        data = resp.json()
        
        if 'mediaItems' in data:
            for item in data['mediaItems']:
                filename = item['filename']
                base_url = item['baseUrl']
                download_file(base_url, album_path, filename)
    except Exception as e:
        logging.error(f"Error syncing album content: {e}")

# --- Background Sync Logic ---
def sync_worker():
    global sync_thread_active
    sync_thread_active = True
    
    while not stop_event.is_set():
        if config["auto_sync"] and config["local_folder"] and config["api_key"]:
            selected_names = config.get("selected_albums", [])
            
            if selected_names:
                headers = get_headers()
                if headers:
                    # We need Album IDs, so fetch list first
                    # In a real efficient app, we'd store IDs in config, but names are more readable for this demo
                    all_albums = fetch_real_remote_albums()
                    
                    for name in selected_names:
                        # Find ID
                        album = next((a for a in all_albums if a['title'] == name), None)
                        if album:
                             sync_album_content(album['id'], album['title'], headers)
            
        time.sleep(60) # Check every minute
    
    sync_thread_active = False

def start_sync_thread():
    if not sync_thread_active:
        stop_event.clear()
        t = threading.Thread(target=sync_worker, daemon=True)
        t.start()

# --- GUI Settings Window ---
def open_settings_window(icon, item):
    root = tk.Tk()
    root.title("Gemini Sync Configuration")
    root.geometry("600x650")
    
    # Lift window to top
    root.attributes('-topmost',True)
    root.after_idle(root.attributes,'-topmost',False)
    
    folder_var = tk.StringVar(value=config.get("local_folder", ""))
    auto_sync_var = tk.BooleanVar(value=config.get("auto_sync", False))
    token_var = tk.StringVar(value=config.get("api_key", ""))
    
    # Album Selection State
    album_vars = {}
    current_selected = set(config.get("selected_albums", []))
    
    # Canvas for list
    list_frame_ref = [None]

    def browse_folder():
        folder_selected = filedialog.askdirectory(initialdir=folder_var.get())
        if folder_selected:
            folder_var.set(folder_selected)

    def fetch_albums_ui():
        # Update config with current token before fetching
        config["api_key"] = token_var.get()
        
        albums = fetch_real_remote_albums()
        
        if not albums:
            messagebox.showerror("Error", "Could not fetch albums. Check your Token.")
            return

        # Clear old list
        for widget in list_frame_ref[0].winfo_children():
            widget.destroy()
            
        album_vars.clear()
        
        for album in albums:
            var = tk.BooleanVar(value=(album['title'] in current_selected))
            album_vars[album['id']] = {"var": var, "title": album['title']}
            chk = ttk.Checkbutton(list_frame_ref[0], text=f"{album['title']} ({album['items_count']})", variable=var)
            chk.pack(anchor=tk.W, padx=10, pady=2)

    def save_settings():
        new_selection = []
        for aid, data in album_vars.items():
            if data["var"].get():
                new_selection.append(data["title"])
        
        config["local_folder"] = folder_var.get()
        config["auto_sync"] = auto_sync_var.get()
        config["selected_albums"] = new_selection
        config["api_key"] = token_var.get()
        
        save_config()
        messagebox.showinfo("Saved", f"Configuration updated.\nSelected {len(new_selection)} albums.")
        start_sync_thread()
        root.destroy()

    # Layout
    frame = ttk.Frame(root, padding="15")
    frame.pack(fill=tk.BOTH, expand=True)

    ttk.Label(frame, text="Gemini Photo Sync", font=("Segoe UI", 14, "bold")).pack(pady=(0, 5))

    # Token Input
    ttk.Label(frame, text="Google Access Token (From Web App Settings):", font=("Segoe UI", 9, "bold")).pack(anchor=tk.W)
    ttk.Entry(frame, textvariable=token_var).pack(fill=tk.X, pady=(0, 10))

    # Folder Selection
    ttk.Label(frame, text="Local Download Folder:", font=("Segoe UI", 9, "bold")).pack(anchor=tk.W)
    f_frame = ttk.Frame(frame)
    f_frame.pack(fill=tk.X, pady=(0, 10))
    ttk.Entry(f_frame, textvariable=folder_var).pack(side=tk.LEFT, fill=tk.X, expand=True)
    ttk.Button(f_frame, text="Browse...", command=browse_folder).pack(side=tk.RIGHT, padx=(5, 0))

    # Album List
    ttk.Label(frame, text="Select Albums to Sync:", font=("Segoe UI", 9, "bold")).pack(anchor=tk.W)
    ttk.Button(frame, text="Fetch Albums", command=fetch_albums_ui).pack(fill=tk.X, pady=(0,5))
    
    list_container = ttk.Frame(frame, borderwidth=1, relief="solid")
    list_container.pack(fill=tk.BOTH, expand=True, pady=5)
    
    canvas = tk.Canvas(list_container, bg="white")
    scrollbar = ttk.Scrollbar(list_container, orient="vertical", command=canvas.yview)
    scrollable_frame = ttk.Frame(canvas)
    list_frame_ref[0] = scrollable_frame

    scrollable_frame.bind(
        "<Configure>",
        lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
    )
    canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
    canvas.configure(yscrollcommand=scrollbar.set)

    canvas.pack(side="left", fill="both", expand=True)
    scrollbar.pack(side="right", fill="y")

    # Initial Load if token exists
    if config["api_key"]:
        # Defer slightly to let UI render
        root.after(500, fetch_albums_ui)

    # Options
    ttk.Checkbutton(frame, text="Enable Background Auto-Sync", variable=auto_sync_var).pack(anchor=tk.W, pady=10)

    # Save
    ttk.Button(frame, text="Save & Sync Now", command=save_settings).pack(fill=tk.X, pady=5)
    
    root.mainloop()

# --- Tray Logic ---
def open_folder(icon, item):
    folder = config.get("local_folder")
    if folder and os.path.exists(folder):
        os.startfile(folder) if os.name == 'nt' else webbrowser.open(folder)
    else:
        webbrowser.open(os.getcwd())

def quit_app(icon, item):
    stop_event.set()
    icon.stop()
    sys.exit()

def main():
    load_config()
    start_sync_thread()

    # Create icon
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