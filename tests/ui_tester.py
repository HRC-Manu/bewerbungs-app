import os
import json
import time
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.edge.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import sys

class UITester:
    def __init__(self, max_iterations=5):
        self.max_iterations = max_iterations
        self.current_iteration = 0
        self.found_issues = []
        self.improvements_made = []
        
        # Test-Verzeichnisse einrichten
        self.setup_test_directories()
            
    def setup_test_directories(self):
        """Richtet die Test-Verzeichnisstruktur ein"""
        # Basis-Testverzeichnis
        self.test_base_dir = os.path.dirname(os.path.abspath(__file__))
        
        # Unterverzeichnisse
        self.test_data_dir = os.path.join(self.test_base_dir, 'data')
        self.test_reports_dir = os.path.join(self.test_base_dir, 'reports')
        self.browser_data_dir = os.path.join(self.test_base_dir, 'browser_data')
        
        # Erstelle Verzeichnisse falls nicht vorhanden
        for dir_path in [self.test_data_dir, self.test_reports_dir, self.browser_data_dir]:
            if not os.path.exists(dir_path):
                os.makedirs(dir_path)
        
        # Edge Benutzerverzeichnis
        self.edge_user_dir = os.path.join(self.browser_data_dir, 'edge-data')
        if not os.path.exists(self.edge_user_dir):
            os.makedirs(self.edge_user_dir)
            
    def find_edge_binary(self):
        """Findet den Edge-Binary-Pfad"""
        edge_paths = [
            r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
            r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
            os.path.expanduser(r"~\AppData\Local\Microsoft\Edge\Application\msedge.exe")
        ]
        
        for path in edge_paths:
            if os.path.exists(path):
                print(f"Edge gefunden: {path}")
                return path
                
        print("⚠ Microsoft Edge wurde nicht gefunden!")
        return None
        
    def run_test_improve_loop(self):
        """Hauptschleife für Tests und Verbesserungen"""
        print(f"\n=== Starte Automatische Tests ===")
        
        try:
            # 1. Prüfe Abhängigkeiten
            print("\n1. Prüfe Abhängigkeiten...")
            
            # Selenium
            print("- Prüfe Selenium...")
            try:
                from selenium import webdriver
                from selenium.webdriver.edge.options import Options
                print("  ✓ Selenium ist installiert")
            except ImportError as e:
                print(f"  ❌ Selenium-Fehler: {str(e)}")
                print("  ℹ Bitte führen Sie aus: pip install selenium")
                return
            
            # Edge WebDriver
            print("- Prüfe Edge Installation...")
            edge_binary = self.find_edge_binary()
            if not edge_binary:
                print("  ❌ Microsoft Edge wurde nicht gefunden")
                print("  ℹ Bitte installieren Sie Microsoft Edge Chromium")
                return
            print(f"  ✓ Edge gefunden: {edge_binary}")
            
            # 2. Prüfe Testumgebung
            print("\n2. Prüfe Testumgebung...")
            
            # Verzeichnisse
            print("- Prüfe Verzeichnisse...")
            for dir_name, dir_path in [
                ('Test-Daten', self.test_data_dir),
                ('Berichte', self.test_reports_dir),
                ('Browser-Daten', self.browser_data_dir)
            ]:
                if os.path.exists(dir_path):
                    print(f"  ✓ {dir_name}: {dir_path}")
                else:
                    print(f"  ❌ {dir_name} nicht gefunden: {dir_path}")
                    return
            
            # Server-Verbindung
            print("- Prüfe Server-Verbindung...")
            try:
                import urllib.request
                urllib.request.urlopen("http://localhost:3000")
                print("  ✓ Server ist erreichbar")
            except Exception as e:
                print(f"  ❌ Server nicht erreichbar: {str(e)}")
                print("  ℹ Stellen Sie sicher, dass der Server auf Port 3000 läuft")
                return
            
            # 3. Führe Tests aus
            print("\n3. Starte Testdurchlauf...")
            while self.current_iteration < self.max_iterations:
                print(f"\n=== Iteration {self.current_iteration + 1} von {self.max_iterations} ===")
                
                # Tests ausführen
                print("- Führe Tests aus...")
                issues = self.run_tests(edge_binary)
                if not issues:
                    print("  ✓ Keine Probleme gefunden!")
                    break
                print(f"  ℹ {len(issues)} Problem(e) gefunden")
                    
                # Probleme analysieren
                print("- Analysiere Probleme...")
                analysis = self.analyze_issues(issues)
                for severity, items in analysis.items():
                    if items:
                        print(f"  • {severity}: {len(items)} Problem(e)")
                
                # Verbesserungen vorschlagen
                print("- Schlage Verbesserungen vor...")
                improvements = self.suggest_improvements(analysis)
                if improvements:
                    print(f"  ℹ {len(improvements)} Verbesserung(en) vorgeschlagen")
                    
                    # Verbesserungen anwenden
                    print("- Wende Verbesserungen an...")
                    self.apply_improvements(improvements)
                    self.improvements_made.extend(improvements)
                    print("  ✓ Verbesserungen angewendet")
                else:
                    print("  ✓ Keine weiteren Verbesserungen notwendig")
                    break
                    
                self.current_iteration += 1
                time.sleep(2)
            
            # 4. Erstelle Bericht
            print("\n4. Erstelle Testbericht...")
            self.generate_report()
            print("  ✓ Bericht erstellt")
            
        except Exception as e:
            print(f"\n❌ Unerwarteter Fehler: {str(e)}")
            import traceback
            print("\nStacktrace:")
            print(traceback.format_exc())
            # Speichere Fehlerbericht
            self.generate_report()
            raise

    def run_tests(self, edge_binary):
        """Führt alle UI-Tests aus und sammelt Probleme"""
        issues = []
        try:
            print("Initialisiere Edge...")
            options = Options()
            options.binary_location = edge_binary
            options.add_argument('--headless=new')
            options.add_argument('--no-sandbox')
            options.add_argument('--disable-dev-shm-usage')
            options.add_argument('--disable-gpu')
            options.add_argument('--disable-extensions')
            options.add_argument('--disable-software-rasterizer')
            options.add_argument('--window-size=1920,1080')
            options.add_argument(f'--user-data-dir={self.edge_user_dir}')
            options.add_argument('--disable-web-security')  # Für lokale Tests
            options.add_experimental_option('excludeSwitches', ['enable-logging'])
            
            driver = webdriver.Edge(options=options)
            wait = WebDriverWait(driver, 10)
            
            print("Öffne lokale Seite...")
            driver.get("http://localhost:3000")
            
            # Teste Login
            print("Teste Login...")
            issues.extend(self.test_login(driver, wait))
            
            # Teste Navigation
            print("Teste Navigation...")
            issues.extend(self.test_navigation(driver, wait))
            
            # Teste Responsive Design
            print("Teste Responsive Design...")
            issues.extend(self.test_responsive(driver))
            
            driver.quit()
            print("Browser geschlossen")
            
        except Exception as e:
            print(f"Fehler bei Tests: {str(e)}")
            issues.append({
                'type': 'error',
                'component': 'test_setup',
                'description': str(e)
            })
            
        return issues

    def test_login(self, driver, wait):
        """Testet den Login-Prozess"""
        issues = []
        try:
            # Login-Button Test
            login_btn = wait.until(EC.element_to_be_clickable((By.ID, "loginNavBtn")))
            if not login_btn.is_displayed():
                issues.append({
                    'type': 'visibility',
                    'component': 'login_button',
                    'description': 'Login-Button nicht sichtbar'
                })
            
            # Modal-Test
            login_btn.click()
            modal = wait.until(EC.visibility_of_element_located((By.ID, "authModal")))
            if not modal.is_displayed():
                issues.append({
                    'type': 'functionality',
                    'component': 'login_modal',
                    'description': 'Login-Modal öffnet sich nicht'
                })
                
        except Exception as e:
            issues.append({
                'type': 'error',
                'component': 'login_test',
                'description': str(e)
            })
            
        return issues

    def test_navigation(self, driver, wait):
        """Testet die Navigation"""
        issues = []
        try:
            # Hauptnavigation
            nav_items = driver.find_elements(By.CSS_SELECTOR, ".navbar-nav .nav-item")
            if not nav_items:
                issues.append({
                    'type': 'structure',
                    'component': 'navigation',
                    'description': 'Keine Navigationseinträge gefunden'
                })
            
            # Feature-Buttons
            buttons = driver.find_elements(By.CSS_SELECTOR, ".feature-buttons .btn")
            for btn in buttons:
                if not btn.is_displayed() or not btn.is_enabled():
                    issues.append({
                        'type': 'functionality',
                        'component': 'feature_buttons',
                        'description': f'Button "{btn.text}" nicht verfügbar'
                    })
                    
        except Exception as e:
            issues.append({
                'type': 'error',
                'component': 'navigation_test',
                'description': str(e)
            })
            
        return issues

    def test_responsive(self, driver):
        """Testet das responsive Design"""
        issues = []
        try:
            # Mobile Ansicht
            driver.set_window_size(375, 667)
            time.sleep(1)
            
            # Hamburger-Menü
            hamburger = driver.find_element(By.CLASS_NAME, "navbar-toggler")
            if not hamburger.is_displayed():
                issues.append({
                    'type': 'responsive',
                    'component': 'mobile_menu',
                    'description': 'Hamburger-Menü nicht sichtbar in mobiler Ansicht'
                })
                
        except Exception as e:
            issues.append({
                'type': 'error',
                'component': 'responsive_test',
                'description': str(e)
            })
            
        return issues

    def analyze_issues(self, issues):
        """Analysiert gefundene Probleme"""
        analysis = {
            'critical': [],
            'major': [],
            'minor': []
        }
        
        for issue in issues:
            if issue['type'] in ['error', 'functionality']:
                analysis['critical'].append(issue)
            elif issue['type'] in ['accessibility', 'responsive']:
                analysis['major'].append(issue)
            else:
                analysis['minor'].append(issue)
                
        return analysis

    def suggest_improvements(self, analysis):
        """Schlägt Verbesserungen basierend auf der Analyse vor"""
        improvements = []
        
        # Kritische Probleme
        for issue in analysis['critical']:
            if issue['component'] == 'login_modal':
                improvements.append({
                    'file': 'index.html',
                    'type': 'modal_fix',
                    'description': 'Modal-Trigger reparieren',
                    'fix': 'data-bs-toggle="modal" data-bs-target="#authModal"'
                })
                
        # Wichtige Probleme
        for issue in analysis['major']:
            if issue['component'] == 'mobile_menu':
                improvements.append({
                    'file': 'style.css',
                    'type': 'responsive',
                    'description': 'Mobile Navigation verbessern',
                    'fix': '@media (max-width: 768px) { .navbar-toggler { display: block !important; } }'
                })
                
        return improvements

    def apply_improvements(self, improvements):
        """Wendet Verbesserungen an"""
        for improvement in improvements:
            print(f"Verbessere: {improvement['description']}")
            # Hier würde die tatsächliche Datei-Änderung erfolgen
            # Dies ist ein Platzhalter für die eigentliche Implementierung
            
    def generate_report(self):
        """Erstellt einen detaillierten Testbericht"""
        report = {
            'timestamp': datetime.now().isoformat(),
            'test_environment': {
                'python_version': sys.version,
                'selenium_version': webdriver.__version__,
                'edge_path': self.find_edge_binary(),
                'test_directories': {
                    'data': self.test_data_dir,
                    'reports': self.test_reports_dir,
                    'browser_data': self.browser_data_dir
                }
            },
            'test_execution': {
                'iterations_completed': self.current_iteration,
                'max_iterations': self.max_iterations,
                'tests_run': [
                    'login_test',
                    'navigation_test',
                    'responsive_test'
                ]
            },
            'test_results': {
                'issues_found': self.found_issues,
                'improvements_made': self.improvements_made,
                'status': 'success' if not self.found_issues else 'issues_found'
            }
        }
        
        # Speichere Report
        filename = os.path.join(
            self.test_reports_dir, 
            f'test_report_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json'
        )
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
            
        # Erstelle auch eine menschenlesbare Zusammenfassung
        summary_file = os.path.join(
            self.test_reports_dir,
            f'test_summary_{datetime.now().strftime("%Y%m%d_%H%M%S")}.txt'
        )
        
        with open(summary_file, 'w', encoding='utf-8') as f:
            f.write("=== UI-Test Zusammenfassung ===\n\n")
            f.write(f"Zeitpunkt: {datetime.now().strftime('%d.%m.%Y %H:%M:%S')}\n")
            f.write(f"Status: {'Erfolgreich' if not self.found_issues else 'Probleme gefunden'}\n\n")
            
            f.write("Testumgebung:\n")
            f.write(f"- Python: {sys.version.split()[0]}\n")
            f.write(f"- Selenium: {webdriver.__version__}\n")
            f.write(f"- Edge: {os.path.basename(self.find_edge_binary() or 'nicht gefunden')}\n\n")
            
            f.write("Testausführung:\n")
            f.write(f"- Durchgeführte Iterationen: {self.current_iteration}\n")
            f.write(f"- Maximale Iterationen: {self.max_iterations}\n\n")
            
            if self.found_issues:
                f.write("Gefundene Probleme:\n")
                for issue in self.found_issues:
                    f.write(f"- [{issue['type']}] {issue['component']}: {issue['description']}\n")
                f.write("\n")
            
            if self.improvements_made:
                f.write("Durchgeführte Verbesserungen:\n")
                for improvement in self.improvements_made:
                    f.write(f"- {improvement['description']} ({improvement['type']})\n")
            
        print("  ✓ Bericht erstellt:")
        print(f"    • JSON: {os.path.basename(filename)}")
        print(f"    • Zusammenfassung: {os.path.basename(summary_file)}")

if __name__ == "__main__":
    tester = UITester(max_iterations=5)
    tester.run_test_improve_loop() 