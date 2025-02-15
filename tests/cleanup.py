import os
import shutil

def cleanup_test_directories():
    """Bereinigt die Test-Verzeichnisse"""
    # Basis-Testverzeichnis
    test_base_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Zu bereinigende Verzeichnisse
    dirs_to_clean = [
        os.path.join(test_base_dir, 'data'),
        os.path.join(test_base_dir, 'reports'),
        os.path.join(test_base_dir, 'browser_data')
    ]
    
    for dir_path in dirs_to_clean:
        if os.path.exists(dir_path):
            print(f"Lösche {dir_path}...")
            shutil.rmtree(dir_path)
            # Erstelle leeres Verzeichnis neu
            os.makedirs(dir_path)
            # Erstelle .gitkeep Datei
            with open(os.path.join(dir_path, '.gitkeep'), 'w') as f:
                pass
            print(f"✓ {dir_path} bereinigt")

if __name__ == "__main__":
    print("=== Bereinige Test-Verzeichnisse ===")
    cleanup_test_directories()
    print("\n✅ Bereinigung abgeschlossen") 