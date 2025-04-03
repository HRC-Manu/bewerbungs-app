#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Bewerbungs-App - Hauptmodul
----------------------------
Eine Anwendung zum Generieren und Verwalten von Bewerbungsschreiben.
"""

import os
import tkinter as tk
from tkinter import messagebox
from dotenv import load_dotenv
import json
import re

try:
    # Versuche, die Konfiguration zu laden
    from config import create_directories, DEBUG
    
    # Erstelle benötigte Verzeichnisse
    create_directories()
    
    # Versuche, die Anwendungsklasse zu importieren
    # In der Entwicklungsphase ist es normal, auf Fehler zu stoßen
    try:
        from gui.app import BewerbungsApp
    except ImportError:
        # Fallback auf die integrierte Version, wenn modular noch nicht implementiert
        from simple_app import BewerbungsApp
    
    # Lade die Umgebungsvariablen
    load_dotenv()
    
    def main():
        """Hauptfunktion der Anwendung"""
        try:
            # Hauptfenster erstellen
            root = tk.Tk()
            root.title("Bewerbungsmanager")
            
            # Bildschirmgröße und Positionierung
            screen_width = root.winfo_screenwidth()
            screen_height = root.winfo_screenheight()
            window_width = min(1200, screen_width - 100)
            window_height = min(800, screen_height - 100)
            position_x = (screen_width - window_width) // 2
            position_y = (screen_height - window_height) // 2
            
            # Fenstergröße und -position setzen
            root.geometry(f"{window_width}x{window_height}+{position_x}+{position_y}")
            
            # App-Instanz erstellen
            app = BewerbungsApp(root)
            
            # Hauptloop starten
            root.mainloop()
            
        except Exception as e:
            if DEBUG:
                import traceback
                traceback.print_exc()
            messagebox.showerror("Fehler", f"Ein Fehler ist beim Starten der Anwendung aufgetreten: {str(e)}")
    
    if __name__ == "__main__":
        main()

except ImportError as e:
    # Fallback, wenn die Modularisierung noch nicht vollständig ist
    import tkinter as tk
    from tkinter import messagebox
    import traceback
    
    try:
        from simple_app import BewerbungsApp
        
        # Lade die Umgebungsvariablen
        load_dotenv()
        
        def fallback_main():
            """Fallback-Funktion für die Anwendung"""
            root = tk.Tk()
            root.title("Bewerbungsmanager")
            
            # Bildschirmgröße und Positionierung
            screen_width = root.winfo_screenwidth()
            screen_height = root.winfo_screenheight()
            window_width = min(1200, screen_width - 100)
            window_height = min(800, screen_height - 100)
            position_x = (screen_width - window_width) // 2
            position_y = (screen_height - window_height) // 2
            
            # Fenstergröße und -position setzen
            root.geometry(f"{window_width}x{window_height}+{position_x}+{position_y}")
            
            # App-Instanz erstellen
            app = BewerbungsApp(root)
            
            # Hauptloop starten
            root.mainloop()
        
        if __name__ == "__main__":
            fallback_main()
            
    except Exception as e:
        # Kritischer Fehler: Zeige Fehlermeldung an und beende
        print(f"Kritischer Fehler: {str(e)}")
        traceback.print_exc()
        
        try:
            # Versuche, ein Meldungsfenster zu öffnen
            root = tk.Tk()
            root.withdraw()  # Verstecke das Hauptfenster
            messagebox.showerror("Kritischer Fehler", 
                                f"Ein kritischer Fehler ist aufgetreten:\n\n{str(e)}\n\n"
                                f"Die Anwendung kann nicht gestartet werden.")
            root.destroy()
        except:
            # Letzter Ausweg: Konsolenausgabe
            print("Die Anwendung konnte nicht gestartet werden.") 

def _analyze_resume_with_ai(self, documents_text, api_key):
    """Analysiert Bewerbungsdokumente mit KI und extrahiert strukturierte Informationen im JSON-Format"""
    try:
        # Prompt für die strukturierte Datenextraktion
        extraction_prompt = f"""
        Analysiere die folgenden Dokumente und extrahiere alle relevanten Informationen in strukturiertem JSON-Format.
        
        DOKUMENTE:
        {documents_text}
        
        Extrahiere exakt folgende Informationen im spezifizierten Format:
        {{
          "personalData": {{
            "name": "Vollständiger Name",
            "address": "Vollständige Adresse",
            "phone": "Telefonnummer",
            "email": "E-Mail",
            "birthDate": "TT.MM.YYYY",
            "birthPlace": "Geburtsort",
            "nationality": "Nationalität"
          }},
          "workExperience": [
            {{
              "period": "MM/YYYY - MM/YYYY",
              "position": "Jobtitel",
              "company": "Firmenname",
              "location": "Ort",
              "responsibilities": ["Verantwortung 1", "Verantwortung 2"],
              "achievements": ["Erfolg 1", "Erfolg 2"]
            }}
          ],
          "education": [
            {{
              "period": "MM/YYYY - MM/YYYY",
              "degree": "Abschluss",
              "institution": "Bildungseinrichtung",
              "location": "Ort",
              "focus": "Schwerpunkte",
              "grade": "Note (falls angegeben)"
            }}
          ],
          "skills": {{
            "technical": ["Skill 1", "Skill 2"],
            "methodical": ["Methode 1", "Methode 2"],
            "social": ["Soziale Kompetenz 1", "Soziale Kompetenz 2"]
          }},
          "languages": [
            {{
              "language": "Sprache",
              "level": "CEFR-Niveau (A1-C2)",
              "certificates": "Zertifikate (falls vorhanden)"
            }}
          ],
          "certifications": [
            {{
              "date": "MM/YYYY",
              "title": "Zertifikatsname",
              "issuer": "Ausstellende Organisation"
            }}
          ],
          "interests": ["Interesse 1", "Interesse 2"]
        }}
        
        Fülle so viele Felder wie möglich basierend auf den Dokumenten aus. Bei fehlenden Informationen setze leere Strings oder leere Arrays.
        Bei widersprüchlichen Informationen in verschiedenen Dokumenten wähle die aktuellste oder detaillierteste Information.
        Gib NUR das JSON ohne jegliche zusätzliche Erklärungen zurück.
        """
        
        # API-Anfrage für Extraktion
        result = call_gemini_api(extraction_prompt, temperature=0.1, max_tokens=2000)
        
        # Versuche, JSON aus dem Text zu extrahieren und zu parsen
        if result:
            try:
                # Suche nach dem JSON-Teil im Text (falls zusätzlicher Text vorhanden ist)
                json_match = re.search(r'(\{.*\})', result, re.DOTALL)
                if json_match:
                    json_text = json_match.group(1)
                    # Parse das JSON
                    extracted_data = json.loads(json_text)
                    return extracted_data
                
                # Wenn kein expliziter JSON-Block gefunden wurde, versuche den gesamten Text zu parsen
                return json.loads(result)
            except json.JSONDecodeError as e:
                if DEBUG:
                    print(f"Fehler beim Parsen des JSON: {str(e)}")
                    print(f"Erhaltener Text: {result[:500]}...")  # Erste 500 Zeichen zur Diagnose
                return {}
        
        return {}
    except Exception as e:
        if DEBUG:
            print(f"Fehler bei der KI-Analyse der Dokumente: {str(e)}")
        return {} 