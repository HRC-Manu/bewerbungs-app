import os
import subprocess
import sys

def run_cmd_command(command):
    """Führt einen Befehl über cmd.exe aus"""
    try:
        # CMD-Pfad
        cmd = r"C:\Windows\System32\cmd.exe"
        
        # Befehl ausführen
        process = subprocess.Popen([
            cmd,
            "/c",  # Führe Befehl aus und beende
            command
        ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        
        # Ausgabe in Echtzeit lesen und anzeigen
        while True:
            output = process.stdout.readline()
            if output == b'' and process.poll() is not None:
                break
            if output:
                print(output.decode('utf-8', errors='ignore').strip())
        
        # Warte auf Beendigung und hole Rückgabewert
        returncode = process.poll()
        
        # Hole verbleibende Fehlerausgabe
        stderr = process.stderr.read()
        
        return {
            'success': returncode == 0,
            'stderr': stderr.decode('utf-8', errors='ignore'),
            'returncode': returncode
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'returncode': -1
        }

def get_short_path(long_path):
    """Konvertiert einen langen Pfad in einen kurzen Windows-Pfad"""
    try:
        # Entferne Anführungszeichen falls vorhanden
        path = long_path.strip('"')
        # Hole den kurzen Pfad
        result = subprocess.run(
            ['cmd', '/c', f'for %I in ("{path}") do @echo %~sI'],
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            # Entferne Leerzeichen und Anführungszeichen
            short_path = result.stdout.strip().strip('"')
            return short_path
        return long_path
    except:
        return long_path

def main():
    print("=== Starte Tests über CMD ===\n")
    
    try:
        # 1. Aktuelles Verzeichnis
        current_dir = os.path.dirname(os.path.abspath(__file__))
        project_dir = os.path.dirname(os.path.dirname(current_dir))
        print(f"Projektverzeichnis: {project_dir}")
        
        # 2. Python-Pfad
        python_path = sys.executable
        print(f"Python-Pfad: {python_path}")
        
        # 3. Teste CMD
        print("\nPrüfe CMD...")
        test_result = run_cmd_command("ver")
        if test_result['success']:
            print("✓ CMD verfügbar")
        else:
            print("❌ CMD nicht verfügbar!")
            return
        
        # 4. Führe Tests aus
        print("\nStarte Tests...")
        
        # Erstelle DOS-kompatible Pfade
        project_path = project_dir.replace('\\', '/')
        python_path = python_path.replace('\\', '/')
        
        print(f"Verwende Pfade:")
        print(f"- Projekt: {project_path}")
        print(f"- Python: {python_path}")
        
        # Wechsle ins Projektverzeichnis und führe Tests aus
        test_command = f'cd /d "{project_path}" && "{python_path}" bewerbungs-app/tests/run_tests.py'
        
        result = run_cmd_command(test_command)
        
        if result['success']:
            print("\n=== Testausführung erfolgreich ===")
        else:
            print("\n=== Fehler bei Testausführung ===")
            print("Fehlercode:", result['returncode'])
            if 'error' in result:
                print("Fehler:", result['error'])
            if result['stderr']:
                print("\nFehlermeldung:")
                print(result['stderr'])
                
    except Exception as e:
        print(f"\n❌ Fehler: {str(e)}")
        return

if __name__ == "__main__":
    main() 