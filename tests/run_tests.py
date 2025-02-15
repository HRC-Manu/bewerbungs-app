import os
import sys
import http.server
import socketserver
import threading
import time
from ui_tester import UITester

def start_test_server(port=3000):
    """Startet einen lokalen Testserver"""
    try:
        Handler = http.server.SimpleHTTPRequestHandler
        
        # Wechsle ins docs Verzeichnis
        docs_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'docs')
        print(f"Wechsle zu: {docs_dir}")
        if not os.path.exists(docs_dir):
            print(f"⚠ Verzeichnis nicht gefunden: {docs_dir}")
            return False
            
        os.chdir(docs_dir)
        print("✓ Verzeichniswechsel erfolgreich")
        
        with socketserver.TCPServer(("", port), Handler) as httpd:
            print(f"✓ Server gestartet auf Port {port}")
            httpd.serve_forever()
            
    except Exception as e:
        print(f"❌ Fehler beim Starten des Servers: {str(e)}")
        return False

def main():
    print("\n=== Starte Test-Umgebung ===")
    
    # Prüfe Verzeichnisstruktur
    current_dir = os.getcwd()
    print(f"Aktuelles Verzeichnis: {current_dir}")
    
    # Starte Server in einem separaten Thread
    print("\n1. Starte lokalen Server...")
    server_thread = threading.Thread(target=start_test_server)
    server_thread.daemon = True
    server_thread.start()
    
    # Warte kurz bis Server gestartet ist
    time.sleep(2)
    
    try:
        print("\n2. Starte UI-Tests...")
        tester = UITester(max_iterations=5)
        tester.run_test_improve_loop()
        
    except KeyboardInterrupt:
        print("\n⚠ Tests werden durch Benutzer beendet...")
    except Exception as e:
        print(f"\n❌ Fehler bei der Testausführung: {str(e)}")
        sys.exit(1)
    finally:
        print("\n=== Test-Umgebung wird beendet ===")

if __name__ == "__main__":
    main() 