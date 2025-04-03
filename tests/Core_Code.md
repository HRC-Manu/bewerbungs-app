import os
import sys
import tkinter as tk
from tkinter import ttk, filedialog, messagebox, simpledialog, scrolledtext
import threading
import json
import re
import shutil
import datetime
import time
import requests
from PIL import Image, ImageTk
import subprocess
import platform
import random
from io import StringIO
from pathlib import Path
from functools import partial
from dotenv import load_dotenv

# Globale Konstanten und Konfiguration
DEBUG = True  # Debug-Modus (True für Entwicklung, False für Produktion)

# Lade Umgebungsvariablen
load_dotenv()

try:
    import numpy as np
    import pytesseract
    from pdf2image import convert_from_path
    ENHANCED_EXTRACTION = True
except ImportError:
    ENHANCED_EXTRACTION = False
    
try:
    import PyPDF2
    PDF_SUPPORT = True
except ImportError:
    PDF_SUPPORT = False
    
try:
    import docx
    DOCX_SUPPORT = True
except ImportError:
    DOCX_SUPPORT = False

# Versuche docx2txt für Fallback zu importieren, falls docx nicht funktioniert
try:
    import docx2txt
    DOCX2TXT_SUPPORT = True
except ImportError:
    DOCX2TXT_SUPPORT = False

# Standardpfad für Bewerberprofil
PROFILE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "bewerberprofil.json")

# Ersetze die OpenAI-Bibliothek durch Google Gemini API mit neuester Modellversion
def call_gemini_api(prompt, temperature=0.7, max_tokens=2000):
    """Rufe die Google Gemini API direkt über HTTP auf"""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return "Fehler: Google Gemini API-Schlüssel nicht gefunden."
    
    # Die Gemini API-URL mit den neuesten Modellnamen laut Google-Dokumentation
    models_to_try = [
        # Neueste Modellversionen zuerst probieren
        "gemini-2.0-flash",  # Aktuellstes Modell laut Google-Dokumentation
        "gemini-1.5-flash",
        "gemini-1.5-pro",
        "gemini-1.0-pro", 
        "gemini-pro"
    ]
    
    # API-Versionen, die probiert werden sollen
    api_versions = ["v1beta", "v1"]
    
    # Versuche jedes Modell mit jeder API-Version
    for model in models_to_try:
        for api_version in api_versions:
            api_url = f"https://generativelanguage.googleapis.com/{api_version}/models/{model}:generateContent?key={api_key}"
            
            # Die Anfrage-Daten vorbereiten - Format gemäß aktueller Google-Dokumentation
            data = {
                "contents": [
                    {
                        "parts": [
                            {
                                "text": f"Du bist ein Experte für Bewerbungsschreiben in Deutschland und anderen deutschsprachigen Ländern. {prompt}"
                            }
                        ]
                    }
                ],
                "generationConfig": {
                    "temperature": temperature,
                    "maxOutputTokens": max_tokens,
                    "topP": 0.8,
                    "topK": 40
                }
            }
            
            try:
                # Debug-Ausgabe
                print(f"Versuche API-Anfrage mit Modell: {model}, API-Version: {api_version}")
                print(f"API-URL: {api_url}")
                
                headers = {
                    "Content-Type": "application/json"
                }
                
                response = requests.post(
                    api_url,
                    headers=headers,
                    json=data,
                    timeout=60  # Längeres Timeout für große Anfragen
                )
                
                # Debug-Ausgabe
                print(f"Status-Code: {response.status_code}")
                print(f"API-Antwort: {response.text[:100]}...")  # Zeige die ersten 100 Zeichen der Antwort
                
                # Wenn die Anfrage erfolgreich war, verarbeite die Antwort
                if response.status_code == 200:
                    response_data = response.json()
                    print("API-Antwort erfolgreich erhalten")
                    
                    # Extraktion des Textes aus der Antwort (angepasst an Gemini-Antwortformat)
                    if "candidates" in response_data and len(response_data["candidates"]) > 0:
                        if "content" in response_data["candidates"][0] and "parts" in response_data["candidates"][0]["content"]:
                            parts = response_data["candidates"][0]["content"]["parts"]
                            if len(parts) > 0 and "text" in parts[0]:
                                return parts[0]["text"]
                    
                    print(f"Unerwartetes Antwortformat: {response_data}")
                    continue  # Versuche das nächste Modell/API-Version, wenn das Format nicht passt
                else:
                    error_info = "Unbekannter Fehler"
                    try:
                        error_info = response.json()
                        print(f"Fehlerdetails mit Modell {model}, API-Version {api_version}: {error_info}")
                    except:
                        error_info = response.text
                        print(f"Fehlertext mit Modell {model}, API-Version {api_version}: {error_info}")
                    
                    # Weiter mit dem nächsten Modell/API-Version
                    continue
                    
            except requests.exceptions.RequestException as e:
                print(f"API-Anfragefehler mit Modell {model}, API-Version {api_version}: {str(e)}")
                continue  # Versuche das nächste Modell/API-Version
            except Exception as e:
                print(f"Unerwarteter Fehler mit Modell {model}, API-Version {api_version}: {str(e)}")
                continue  # Versuche das nächste Modell/API-Version
    
    # Wenn alle Modelle fehlgeschlagen sind, versuche eine alternative Lösung:
    # Einfache lokale Textgenerierung als Fallback
    print("Alle Modelle und API-Versionen fehlgeschlagen. Verwende lokale Textgenerierung als Fallback.")
    
    try:
        # Einfache lokale Texterstellung als Fallback
        fallback_text = generate_fallback_application_letter(prompt)
        return fallback_text
    except Exception as e:
        return f"Fehler bei der API-Anfrage mit allen Modellen und API-Versionen, und Fallback fehlgeschlagen: {str(e)}"

def generate_fallback_application_letter(prompt):
    """Generiert ein einfaches Bewerbungsschreiben ohne KI-API als Fallback"""
    current_date = time.strftime("%d.%m.%Y")
    
    # Extrahiere ein paar Schlüsselwörter aus dem Prompt
    job_title = "die ausgeschriebene Stelle"
    if "STELLENBESCHREIBUNG:" in prompt:
        description_part = prompt.split("STELLENBESCHREIBUNG:")[1].split("REGION:")[0]
        # Versuche, einen Jobtitel zu extrahieren
        lines = description_part.strip().split('\n')
        if lines and len(lines) > 0:
            # Nehme die erste nicht-leere Zeile als ungefähren Jobtitel
            for line in lines:
                if line.strip():
                    job_title = line.strip()
                    if len(job_title) > 50:  # Zu lang, wahrscheinlich nicht der Titel
                        job_title = "die ausgeschriebene Stelle"
                    break
    
    # Erstelle ein allgemeines Bewerbungsschreiben
    return f"""Max Mustermann
Musterstraße 123
12345 Musterstadt

Musterstadt, {current_date}

Bewerbung für {job_title}

Sehr geehrte Damen und Herren,

mit großem Interesse habe ich Ihre Stellenausschreibung gelesen und bewerbe mich hiermit um die Position. Meine Qualifikationen und Erfahrungen entsprechen den in der Ausschreibung genannten Anforderungen.

Gerne stelle ich Ihnen meine Kenntnisse und Erfahrungen in einem persönlichen Gespräch näher vor. Ich freue mich auf Ihre Rückmeldung.

Mit freundlichen Grüßen

Max Mustermann

Anlagen:
- Lebenslauf
- Zeugnisse

Hinweis: Dies ist ein automatisch generiertes Fallback-Bewerbungsschreiben, da die KI-API nicht verfügbar war. Bitte passen Sie es an Ihre persönlichen Daten und die spezifische Stelle an.
"""

def extract_text_from_pdf(file_path):
    """Extrahiere Text aus PDF-Datei"""
    if not PDF_SUPPORT:
        return "PDF-Unterstützung ist nicht verfügbar. Bitte installiere PyPDF2."
    
    pdf_reader = PyPDF2.PdfReader(file_path)
    text = ""
    for page in pdf_reader.pages:
        text += page.extract_text()
    return text

def extract_text_from_docx(file_path):
    """Extrahiere Text aus DOCX-Datei"""
    if not DOCX_SUPPORT:
        return "DOCX-Unterstützung ist nicht verfügbar. Bitte installiere docx2txt."
    
    text = docx2txt.process(file_path)
    return text

def extract_text_from_file(file_path):
    """Extrahiere Text aus Datei basierend auf dem Dateityp"""
    if not os.path.exists(file_path):
        return "Datei existiert nicht."
    
    file_extension = file_path.split(".")[-1].lower()
    
    if file_extension == "pdf":
        return extract_text_from_pdf(file_path)
    elif file_extension in ["docx", "doc"]:
        return extract_text_from_docx(file_path)
    elif file_extension == "txt":
        with open(file_path, "r", encoding="utf-8") as f:
            return f.read()
    else:
        return "Nicht unterstütztes Dateiformat. Bitte wähle eine PDF-, DOCX- oder TXT-Datei."

def generate_application_letter(resume_text, sample_letter_text, job_description, region="Deutschland", applicant_profile=None):
    """Generiere Bewerbungsschreiben mit Google Gemini API"""
    try:
        # Erstelle Prompt für die API
        prompt = f"""
        Erstelle ein professionelles Bewerbungsschreiben basierend auf folgenden Informationen:
        
        LEBENSLAUF:
        {resume_text}
        
        BEISPIEL BEWERBUNGSSCHREIBEN:
        {sample_letter_text}
        
        STELLENBESCHREIBUNG:
        {job_description}
        
        REGION: {region}
        """
        
        # Füge Bewerberprofil-Daten hinzu, falls vorhanden
        if applicant_profile and isinstance(applicant_profile, dict) and len(applicant_profile) > 0:
            prompt += f"""
        BEWERBERPROFIL (verwende diese Daten für die Kontaktinformationen im Bewerbungsschreiben):
        """
            # Füge die einzelnen Profildaten hinzu
            for key, value in applicant_profile.items():
                if key in ['name', 'address', 'phone', 'email', 'birthdate', 'profession', 'website', 'linkedin', 'xing']:
                    # Formatiere den Schlüssel für bessere Lesbarkeit
                    formatted_key = key.capitalize()
                    if key == 'phone':
                        formatted_key = "Telefon"
                    elif key == 'email':
                        formatted_key = "E-Mail"
                    elif key == 'address':
                        formatted_key = "Adresse"
                    elif key == 'birthdate':
                        formatted_key = "Geburtsdatum"
                    elif key == 'name':
                        formatted_key = "Name"
                    elif key == 'profession':
                        formatted_key = "Beruf/Position"
                    
                    prompt += f"{formatted_key}: {value}\n"
            
            # Spezielle Anweisung, wenn Profildaten vorhanden sind
            prompt += """
        WICHTIG: Verwende die Daten aus dem BEWERBERPROFIL für die Kontaktangaben im Bewerbungsschreiben,
        auch wenn sie vom Lebenslauf abweichen sollten. Diese Daten sind vom Bewerber bestätigt.
        """
        
        prompt += """
        Bitte erstelle ein maßgeschneidertes Bewerbungsschreiben, das:
        1. Die relevanten Qualifikationen und Erfahrungen aus dem Lebenslauf hervorhebt
        2. Auf die spezifischen Anforderungen der Stellenbeschreibung eingeht
        3. Den Stil und Ton des Beispielbewerbungsschreibens beibehält
        4. Best Practices für Bewerbungen in der angegebenen Region berücksichtigt
        5. Professionell und überzeugend ist
        6. Keine falschen Informationen enthält, die nicht im Lebenslauf stehen
        
        Das Bewerbungsschreiben sollte folgende Struktur haben:
        - Anschrift und Datum
        - Betreffzeile
        - Anrede
        - Einleitung (Interesse wecken, Bezug zur Stelle)
        - Hauptteil (Qualifikationen, Erfahrungen, Bezug zur Stellenbeschreibung)
        - Abschluss (Gesprächswunsch, Verfügbarkeit)
        - Grußformel
        """
        
        # Rufe die Gemini API auf
        print("Versuche Gemini API zu nutzen...")
        generated_letter = call_gemini_api(prompt)
        
        # Überprüfe, ob die Antwort einen Fehler enthält
        if generated_letter and generated_letter.startswith("Fehler:"):
            print(f"Fehler beim Generieren: {generated_letter}")
        
        return generated_letter
    
    except Exception as e:
        error_msg = f"Fehler bei der Generierung des Bewerbungsschreibens: {str(e)}"
        print(error_msg)
        return error_msg

# Klasse für das interaktive Textfeld, das Satzalternativen anzeigt
class InteractiveTextEditor(tk.Frame):
    def __init__(self, parent, **kwargs):
        super().__init__(parent, **kwargs)
        
        # Text-Widget mit Scrollbar
        self.text_frame = tk.Frame(self)
        self.text_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        
        self.text = tk.Text(self.text_frame, wrap=tk.WORD, height=15)
        self.text.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        
        self.scrollbar = tk.Scrollbar(self.text_frame, command=self.text.yview)
        self.scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.text.config(yscrollcommand=self.scrollbar.set)
        
        # Alternativen-Panel auf der rechten Seite
        self.alternatives_frame = tk.Frame(self, width=250)
        self.alternatives_frame.pack(side=tk.RIGHT, fill=tk.BOTH, expand=False, padx=(10, 0))
        self.alternatives_frame.pack_propagate(False)  # Verhindere Größenänderungen
        
        # Label für den Alternatives Titel
        self.alt_title = tk.Label(self.alternatives_frame, text="Alternative Formulierungen", font=("Arial", 10, "bold"))
        self.alt_title.pack(anchor=tk.W, pady=(0, 5))
        
        # Scrollbares Textfeld für Alternativen
        self.alt_text_frame = tk.Frame(self.alternatives_frame)
        self.alt_text_frame.pack(fill=tk.BOTH, expand=True)
        
        self.alt_text = tk.Text(self.alt_text_frame, wrap=tk.WORD, width=30, height=10)
        self.alt_text.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        
        self.alt_scrollbar = tk.Scrollbar(self.alt_text_frame, command=self.alt_text.yview)
        self.alt_scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.alt_text.config(yscrollcommand=self.alt_scrollbar.set)
        
        # Button-Frame für Aktionen
        self.buttons_frame = tk.Frame(self.alternatives_frame)
        self.buttons_frame.pack(fill=tk.X, pady=5)
        
        # Nur den "Neu generieren"-Button behalten
        self.regenerate_button = ttk.Button(self.buttons_frame, text="Neu generieren", command=self.regenerate_alternatives)
        self.regenerate_button.pack(side=tk.LEFT, padx=2, fill=tk.X, expand=True)
        
        # Separater Button für "Abschnitt neu generieren"
        self.regenerate_section_button = ttk.Button(
            self.alternatives_frame, 
            text="Abschnitt neu generieren", 
            command=self.regenerate_current_paragraph
        )
        self.regenerate_section_button.pack(fill=tk.X, pady=(5, 0))
        
        # Speichere Text-Tags
        self.hover_tag = "hover"
        self.sentence_tag = "sentence"
        self.current_sentence = None
        self.current_paragraph = None
        self.sentences = []  # Liste der Sätze
        self.paragraphs = []  # Liste der Absätze
        self.sentence_indices = {}  # Dictionary: {Tag-ID: Satz-Index}
        
        # Konfiguriere Text-Tags
        self.text.tag_configure(self.hover_tag, underline=True, foreground="blue")
        
        # Text-Ereignisse binden
        self.text.bind("<Motion>", self.on_mouse_move)
        self.text.bind("<Button-1>", self.on_click)
        self.text.bind("<Leave>", self.on_leave)
        
        # Alternatives Text konfigurieren
        self.alt_text.config(state=tk.DISABLED)
        
        # Region-Variable für Kontextgenerierung
        self.region = "Deutschland"
        
        # Zusätzliche Bindings für Text-Bearbeitung
        self.text.bind("<Double-Button-1>", self.on_double_click)
        # Tastaturevent für Ctrl+Klick simulieren
        self.text.bind("<Control-Button-1>", self.on_double_click)  # Gleiche Funktion wie bei Doppelklick
        
        # Variable für den Bearbeitungsmodus
        self.editing_mode = False
        self.current_edit_tag = None
        
        # Variable um die Zeit des letzten Klicks zu speichern (für bessere Doppelklick-Erkennung)
        self.last_click_time = 0
        self.double_click_threshold = 300  # Millisekunden
        
    def set_region(self, region):
        """Setzt die Region für die Generierung von Alternativen"""
        self.region = region
        
    def set_content(self, content):
        """Setzt den Inhalt des Texteditors und markiert Sätze"""
        # Lösche bestehenden Inhalt
        self.text.config(state=tk.NORMAL)
        self.text.delete("1.0", tk.END)
        
        # Teile den Inhalt in Absätze auf
        paragraphs = content.split("\n\n")
        self.paragraphs = paragraphs
        
        # Füge jeden Absatz ein und markiere die Sätze
        for p_idx, paragraph in enumerate(paragraphs):
            if p_idx > 0:
                self.text.insert(tk.END, "\n\n")
            
            # Markiere den Absatz
            p_start = self.text.index(tk.END + "-1c")
            
            # Teile Absatz in Sätze auf
            sentences = split_text_into_sentences(paragraph)
            for s_idx, sentence in enumerate(sentences):
                # Berechne globalen Satz-Index
                global_s_idx = len(self.sentences)
                self.sentences.append(sentence)
                
                # Füge Satz ein und tagge ihn
                start_pos = self.text.index(tk.END + "-1c")
                self.text.insert(tk.END, sentence)
                if s_idx < len(sentences) - 1:
                    self.text.insert(tk.END, " ")
                
                end_pos = self.text.index(tk.END + "-1c")
                tag_name = f"{self.sentence_tag}_{global_s_idx}"
                self.text.tag_add(tag_name, start_pos, end_pos)
                self.sentence_indices[tag_name] = global_s_idx
                
            # Markiere den Absatzbereich
            p_end = self.text.index(tk.END + "-1c")
            self.text.tag_add(f"paragraph_{p_idx}", p_start, p_end)
        
        self.text.config(state=tk.DISABLED)
        
    def get_content(self):
        """Gibt den aktuellen Inhalt des Texteditors zurück"""
        return self.text.get("1.0", tk.END).strip()
        
    def on_mouse_move(self, event):
        """Verarbeitet Mausbewegungen über dem Text"""
        self.text.config(cursor="arrow")
        
        # Entferne Hover-Effekt
        self.text.tag_remove(self.hover_tag, "1.0", tk.END)
        
        # Hole aktuelle Mausposition
        mouse_pos = f"@{event.x},{event.y}"
        
        # Prüfe, ob Maus über einem Satz ist
        for tag in self.text.tag_names(mouse_pos):
            if tag.startswith(self.sentence_tag):
                # Füge Hover-Effekt hinzu
                ranges = self.text.tag_ranges(tag)
                if ranges:
                    self.text.tag_add(self.hover_tag, ranges[0], ranges[1])
                    self.text.config(cursor="hand2")
                    return
                    
    def on_click(self, event):
        """Verarbeitet Mausklicks auf Sätze"""
        # Prüfe, ob Doppelklick-Event in Bearbeitung ist
        current_time = time.time() * 1000  # Aktuelle Zeit in Millisekunden
        if current_time - self.last_click_time < self.double_click_threshold:
            # Ignoriere den zweiten Teil eines Doppelklicks
            return
        
        self.last_click_time = current_time
        
        # Hole aktuelle Mausposition
        mouse_pos = f"@{event.x},{event.y}"
        
        # Prüfe, ob Klick auf einem Satz ist
        for tag in self.text.tag_names(mouse_pos):
            if tag.startswith(self.sentence_tag):
                # Bestimme Satz und Absatz
                sentence_idx = self.sentence_indices.get(tag)
                paragraph_idx = self.find_paragraph_for_position(mouse_pos)
                
                if sentence_idx is not None:
                    # Hebe Satz hervor
                    self.highlight_sentence(tag)
                    
                    # Generiere Alternativen
                    if self.current_sentence != sentence_idx:
                        self.current_sentence = sentence_idx
                        self.current_paragraph = paragraph_idx
                        self.generate_alternatives_for_current_sentence()
                    
                    return
                    
        # Klick auf Nicht-Satz - Entferne Hervorhebung
        self.clear_highlights()
        
    def on_leave(self, event):
        """Verarbeitet Verlassen des Textes mit Maus"""
        self.text.tag_remove(self.hover_tag, "1.0", tk.END)
        
    def highlight_sentence(self, tag):
        """Hebt den ausgewählten Satz hervor"""
        # Entferne alte Hervorhebungen
        self.clear_highlights()
        
        # Füge neue Hervorhebung hinzu
        ranges = self.text.tag_ranges(tag)
        if ranges:
            self.text.tag_add("selected", ranges[0], ranges[1])
            self.text.tag_configure("selected", background="#e0f0ff")
            
    def clear_highlights(self):
        """Entfernt alle Satz-Hervorhebungen"""
        self.text.tag_remove("selected", "1.0", tk.END)
        self.current_sentence = None
        
        # Leere das Alternativen-Panel
        self.alt_text.config(state=tk.NORMAL)
        self.alt_text.delete("1.0", tk.END)
        self.alt_text.config(state=tk.DISABLED)
        
    def find_paragraph_for_position(self, position):
        """Findet den Absatz-Index für eine gegebene Textposition"""
        for i in range(len(self.paragraphs)):
            tag = f"paragraph_{i}"
            ranges = self.text.tag_ranges(tag)
            if ranges and self.text.compare(ranges[0], "<=", position) and self.text.compare(position, "<=", ranges[1]):
                return i
        return None
        
    def generate_alternatives_for_current_sentence(self):
        """Generiert Alternativen für den aktuell ausgewählten Satz"""
        if self.current_sentence is None:
            return
            
        # Hole API-Schlüssel
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            messagebox.showerror(
                "Fehler",
                "API-Schlüssel nicht gefunden. Bitte konfiguriere zuerst den API-Schlüssel."
            )
            return
            
        # Hole aktuellen Satz
        sentence = self.sentences[self.current_sentence]
        
        # Zeige Ladezustand
        self.alt_text.config(state=tk.NORMAL)
        self.alt_text.delete("1.0", tk.END)
        self.alt_text.insert(tk.END, "Generiere Alternativen...")
        self.alt_text.config(state=tk.DISABLED)
        self.update_idletasks()
        
        # Starte Generierung in separatem Thread
        threading.Thread(
            target=self._generate_alternatives_thread,
            args=(sentence, api_key),
            daemon=True
        ).start()
        
    def _generate_alternatives_thread(self, sentence, api_key):
        """Thread-Funktion für die Generierung von Alternativen"""
        try:
            # Generiere Alternativen
            alternatives = generate_alternatives_for_sentence(sentence, api_key, num_alternatives=4)
            
            # Zeige Alternativen
            self.display_alternatives(alternatives)
        except Exception as e:
            # Bei Fehler, zeige Fehlermeldung
            self.alt_text.config(state=tk.NORMAL)
            self.alt_text.delete("1.0", tk.END)
            self.alt_text.insert(tk.END, f"Fehler: {str(e)}")
            self.alt_text.config(state=tk.DISABLED)
            
    def display_alternatives(self, alternatives):
        """Zeigt die generierten Alternativen im Panel an"""
        # UI-Update im Haupt-Thread
        def update_ui():
            self.alt_text.config(state=tk.NORMAL)
            self.alt_text.delete("1.0", tk.END)
            
            # Hinweis zur Verwendung hinzufügen
            self.alt_text.insert(tk.END, "Klicke auf eine Alternative, um sie zu übernehmen:\n\n", "hint")
            self.alt_text.tag_configure("hint", font=("Arial", 9, "italic"))
            
            for i, alt in enumerate(alternatives):
                tag = f"alt_{i}"
                self.alt_text.insert(tk.END, f"{i+1}. ", tag)
                self.alt_text.insert(tk.END, f"{alt}\n\n", tag)
                
                # Konfiguriere Tags für Klick-Events
                self.alt_text.tag_configure(tag, wrap=tk.WORD)
                self.alt_text.tag_bind(tag, "<Button-1>", lambda e, idx=i: self.on_alternative_click(idx))
                self.alt_text.tag_bind(tag, "<Enter>", lambda e, idx=i: self.on_alternative_enter(idx))
                self.alt_text.tag_bind(tag, "<Leave>", lambda e, idx=i: self.on_alternative_leave(idx))
            
            # Hinweis für Direktbearbeitung
            self.alt_text.insert(tk.END, "\nTipp: Doppelklick oder Strg+Klick auf einen Satz für direkte Bearbeitung.", "hint")
            self.alt_text.config(state=tk.DISABLED)
            
        self.after(0, update_ui)
        
    def on_alternative_click(self, alt_idx):
        """Verarbeitet Klick auf eine Alternative - jetzt mit sofortiger Übernahme"""
        self.selected_alternative = alt_idx
        
        # Markiere die ausgewählte Alternative
        self.alt_text.config(state=tk.NORMAL)
        for i in range(4):  # Maximal 4 Alternativen
            tag = f"alt_{i}"
            if i == alt_idx:
                self.alt_text.tag_configure(tag, background="#e0f0ff")
            else:
                self.alt_text.tag_configure(tag, background="")
        self.alt_text.config(state=tk.DISABLED)
        
        # Übernehme die Alternative sofort
        self.apply_selected_alternative()
    
    def on_alternative_enter(self, alt_idx):
        """Mouse-Enter-Event für eine Alternative"""
        self.alt_text.config(cursor="hand2")
        
    def on_alternative_leave(self, alt_idx):
        """Mouse-Leave-Event für eine Alternative"""
        self.alt_text.config(cursor="")
        
    def apply_selected_alternative(self):
        """Übernimmt die ausgewählte Alternative"""
        if not hasattr(self, 'selected_alternative') or self.current_sentence is None:
            messagebox.showinfo("Info", "Bitte wähle erst eine Alternative aus.")
            return
            
        # Hole die ausgewählte Alternative
        alt_idx = self.selected_alternative
        alt_tag = f"alt_{alt_idx}"
        
        # Finde den Text der Alternative
        alt_ranges = self.alt_text.tag_ranges(alt_tag)
        if not alt_ranges or len(alt_ranges) < 2:
            return
            
        # Extrahiere den alternativen Text (ohne Nummerierung)
        alt_start = alt_ranges[0]
        alt_end = alt_ranges[1]
        alt_with_num = self.alt_text.get(alt_start, alt_end).strip()
        
        # Entferne Nummerierung (z.B. "1. ")
        alt_text = alt_with_num[alt_with_num.find(" ")+1:].strip()
        
        # Ersetze den aktuellen Satz durch die Alternative
        tag_name = f"{self.sentence_tag}_{self.current_sentence}"
        tag_ranges = self.text.tag_ranges(tag_name)
        
        if tag_ranges and len(tag_ranges) >= 2:
            self.text.config(state=tk.NORMAL)
            start_pos = tag_ranges[0]
            end_pos = tag_ranges[1]
            
            # Prüfe, ob ein Leerzeichen nach dem Satz folgt
            next_char_pos = f"{end_pos}+1c"
            has_space_after = False
            
            # Prüfe, ob wir das Ende des Textes überschreiten würden
            if self.text.compare(next_char_pos, "<", "end"):
                next_char = self.text.get(end_pos, next_char_pos)
                has_space_after = (next_char == " ")
            
            # Ersetze den Text
            self.text.delete(start_pos, end_pos)
            
            # Stelle sicher, dass ein Leerzeichen nach dem Satz steht, wenn der Satz mit einem Punkt endet
            if alt_text.endswith(".") or alt_text.endswith("!") or alt_text.endswith("?"):
                # Füge ein Leerzeichen hinzu, wenn keines folgen würde
                if not has_space_after and not self.text.compare(end_pos, "==", "end"):
                    alt_text = alt_text + " "
            
            self.text.insert(start_pos, alt_text)
            
            # Aktualisiere den Tag
            new_end_pos = f"{start_pos}+{len(alt_text)}c"
            self.text.tag_add(tag_name, start_pos, new_end_pos)
            
            # Aktualisiere den Satz in der Liste
            self.sentences[self.current_sentence] = alt_text
            
            self.text.config(state=tk.DISABLED)
            
            # Generiere neue Alternativen
            self.generate_alternatives_for_current_sentence()
        
    def regenerate_alternatives(self):
        """Generiert neue Alternativen für den aktuellen Satz"""
        if self.current_sentence is not None:
            self.generate_alternatives_for_current_sentence()
            
    def regenerate_current_paragraph(self):
        """Generiert den aktuellen Absatz neu"""
        if self.current_paragraph is None:
            messagebox.showinfo("Info", "Bitte wähle erst einen Satz in einem Absatz aus.")
            return
            
        # Hole den aktuellen Absatz
        paragraph = self.paragraphs[self.current_paragraph]
        
        # Kontext: Absätze vor und nach dem aktuellen
        context_before = ""
        if self.current_paragraph > 0:
            context_before = self.paragraphs[self.current_paragraph - 1]
            
        context_after = ""
        if self.current_paragraph < len(self.paragraphs) - 1:
            context_after = self.paragraphs[self.current_paragraph + 1]
            
        # Zeige Ladezustand
        self.alt_text.config(state=tk.NORMAL)
        self.alt_text.delete("1.0", tk.END)
        self.alt_text.insert(tk.END, "Generiere neuen Absatz...")
        self.alt_text.config(state=tk.DISABLED)
        self.update_idletasks()
        
        # Starte Generierung in separatem Thread
        threading.Thread(
            target=self._regenerate_paragraph_thread,
            args=(paragraph, context_before, context_after),
            daemon=True
        ).start()
            
    def _regenerate_paragraph_thread(self, paragraph, context_before, context_after):
        """Thread-Funktion für die Neugenerierung eines Absatzes"""
        try:
            # Generiere neuen Absatz
            new_paragraph = regenerate_section(paragraph, context_before, context_after, self.region)
            
            # Zeige das Ergebnis im Alternativen-Panel
            def update_ui():
                self.alt_text.config(state=tk.NORMAL)
                self.alt_text.delete("1.0", tk.END)
                self.alt_text.insert(tk.END, "Neuer Absatz:\n\n")
                self.alt_text.insert(tk.END, new_paragraph, "new_paragraph")
                
                # Konfiguriere Tags für Klick-Events
                self.alt_text.tag_configure("new_paragraph", wrap=tk.WORD)
                self.alt_text.tag_bind("new_paragraph", "<Button-1>", lambda e: self.apply_new_paragraph(new_paragraph))
                
                # Füge Hinweis hinzu
                self.alt_text.insert(tk.END, "\n\n(Klicke auf den Text, um ihn zu übernehmen)")
                self.alt_text.config(state=tk.DISABLED)
                
            self.after(0, update_ui)
            
        except Exception as e:
            # Bei Fehler, zeige Fehlermeldung
            def show_error():
                self.alt_text.config(state=tk.NORMAL)
                self.alt_text.delete("1.0", tk.END)
                self.alt_text.insert(tk.END, f"Fehler: {str(e)}")
                self.alt_text.config(state=tk.DISABLED)
                
            self.after(0, show_error)
            
    def apply_new_paragraph(self, new_paragraph):
        """Übernimmt den neu generierten Absatz direkt beim Klick"""
        if self.current_paragraph is None:
            return
            
        # Ersetze den aktuellen Absatz
        tag_name = f"paragraph_{self.current_paragraph}"
        tag_ranges = self.text.tag_ranges(tag_name)
        
        if tag_ranges and len(tag_ranges) >= 2:
            self.text.config(state=tk.NORMAL)
            start_pos = tag_ranges[0]
            end_pos = tag_ranges[1]
            
            # Ersetze den Text
            self.text.delete(start_pos, end_pos)
            self.text.insert(start_pos, new_paragraph)
            
            # Aktualisiere den Tag
            new_end_pos = f"{start_pos}+{len(new_paragraph)}c"
            self.text.tag_add(tag_name, start_pos, new_end_pos)
            
            # Aktualisiere den Absatz in der Liste
            self.paragraphs[self.current_paragraph] = new_paragraph
            
            # Aktualisiere Sätze im Absatz
            new_sentences = split_text_into_sentences(new_paragraph)
            
            # Finde die Satz-Indizes für diesen Absatz
            tags_to_remove = []
            first_sentence_idx = None
            for tag, sentence_idx in self.sentence_indices.items():
                tag_ranges = self.text.tag_ranges(tag)
                if tag_ranges and self.text.compare(tag_ranges[0], ">=", start_pos) and self.text.compare(tag_ranges[1], "<=", end_pos):
                    tags_to_remove.append((tag, sentence_idx))
                    if first_sentence_idx is None or sentence_idx < first_sentence_idx:
                        first_sentence_idx = sentence_idx
            
            # Entferne alte Tags
            for tag, _ in tags_to_remove:
                self.text.tag_remove(tag, "1.0", tk.END)
            
            # Ersetze die Sätze im Array
            if first_sentence_idx is not None:
                end_idx = first_sentence_idx
                for tag, idx in tags_to_remove:
                    end_idx = max(end_idx, idx + 1)
                
                # Ersetze die alten Sätze durch die neuen
                self.sentences[first_sentence_idx:end_idx] = new_sentences
                
                # Markiere die neuen Sätze
                cursor_pos = start_pos
                for i, sentence in enumerate(new_sentences):
                    # Berechne globalen Satz-Index
                    global_s_idx = first_sentence_idx + i
                    
                    # Finde den Satz im Text
                    sentence_start = cursor_pos
                    sentence_end = f"{sentence_start}+{len(sentence)}c"
                    
                    # Tagge den Satz
                    tag_name = f"{self.sentence_tag}_{global_s_idx}"
                    self.text.tag_add(tag_name, sentence_start, sentence_end)
                    self.sentence_indices[tag_name] = global_s_idx
                    
                    # Aktualisiere Cursor-Position für den nächsten Satz
                    cursor_pos = f"{sentence_end}+1c"
            
            self.text.config(state=tk.DISABLED)
            
            # Aktualisiere Alternativen-Panel
            self.alt_text.config(state=tk.NORMAL)
            self.alt_text.delete("1.0", tk.END)
            self.alt_text.insert(tk.END, "Absatz erfolgreich ersetzt!")
            self.alt_text.config(state=tk.DISABLED)
            
            # Entferne Hervorhebungen
            self.clear_highlights()

    def on_double_click(self, event):
        """Aktiviert den Bearbeitungsmodus für einen Satz bei Doppelklick oder Ctrl+Klick"""
        # Setze die letzte Klickzeit auf 0, um zu verhindern, dass der einfache Klick-Handler feuert
        self.last_click_time = 0
        
        # Hole aktuelle Mausposition
        mouse_pos = f"@{event.x},{event.y}"
        
        # Wenn bereits im Bearbeitungsmodus, diesen erst beenden
        if self.editing_mode:
            self.end_editing_mode()
            return "break"
        
        # Prüfe, ob Doppelklick auf einem Satz ist
        for tag in self.text.tag_names(mouse_pos):
            if tag.startswith(self.sentence_tag):
                # Aktiviere Bearbeitungsmodus für diesen Satz
                self.activate_editing_mode(tag)
                # Verhindere, dass der normale Klick-Handler ausgelöst wird
                return "break"
        
        return "break"
    
    def activate_editing_mode(self, tag):
        """Aktiviert den Bearbeitungsmodus für einen Satz"""
        # Hole den Satz-Index und -Text
        tag_ranges = self.text.tag_ranges(tag)
        if not tag_ranges or len(tag_ranges) < 2:
            return
        
        sentence_idx = self.sentence_indices.get(tag)
        if sentence_idx is None:
            return
        
        # Bereite die UI vor
        self.text.config(state=tk.NORMAL)
        
        # Hebe den zu bearbeitenden Satz hervor
        start_pos, end_pos = tag_ranges[0], tag_ranges[1]
        self.text.tag_remove("selected", "1.0", tk.END)
        self.text.tag_add("editing", start_pos, end_pos)
        self.text.tag_configure("editing", background="#ffff99")  # Gelber Hintergrund für Bearbeitung
        
        # Setze den Cursor in den Satz
        self.text.mark_set(tk.INSERT, start_pos)
        
        # Speichere den aktuellen Zustand
        self.editing_mode = True
        self.current_edit_tag = tag
        self.current_sentence = sentence_idx
        
        # Zeige Hinweis im Alternativen-Panel
        self.alt_text.config(state=tk.NORMAL)
        self.alt_text.delete("1.0", tk.END)
        self.alt_text.insert(tk.END, "Bearbeitungsmodus aktiv\n\n")
        self.alt_text.insert(tk.END, "Drücke Enter, um die Änderungen zu speichern.\n\n")
        self.alt_text.insert(tk.END, "Drücke Escape, um abzubrechen.")
        self.alt_text.config(state=tk.DISABLED)
        
        # Binde Tasten für Bearbeitungsende
        self.text.bind("<Return>", self.save_edit)
        self.text.bind("<Escape>", self.cancel_edit)
        
        # Gib dem Text-Widget den Fokus
        self.text.focus_set()
    
    def end_editing_mode(self):
        """Beendet den Bearbeitungsmodus"""
        if not self.editing_mode:
            return
        
        # Entferne Hervorhebung
        self.text.tag_remove("editing", "1.0", tk.END)
        
        # Setze Zustände zurück
        self.editing_mode = False
        self.current_edit_tag = None
        
        # Entferne Tastenbindungen
        self.text.unbind("<Return>")
        self.text.unbind("<Escape>")
        
        # Setze Text-Widget wieder auf read-only
        self.text.config(state=tk.DISABLED)
    
    def save_edit(self, event=None):
        """Speichert die Bearbeitung eines Satzes"""
        if not self.editing_mode or not self.current_edit_tag:
            return
        
        # Hole den bearbeiteten Text
        tag_ranges = self.text.tag_ranges(self.current_edit_tag)
        if not tag_ranges or len(tag_ranges) < 2:
            self.end_editing_mode()
            return
        
        start_pos, end_pos = tag_ranges[0], tag_ranges[1]
        edited_text = self.text.get(start_pos, end_pos)
        
        # Aktualisiere den Satz in der Liste
        self.sentences[self.current_sentence] = edited_text
        
        # Beende den Bearbeitungsmodus
        self.end_editing_mode()
        
        # Zeige Bestätigung
        self.alt_text.config(state=tk.NORMAL)
        self.alt_text.delete("1.0", tk.END)
        self.alt_text.insert(tk.END, "Änderungen gespeichert!")
        self.alt_text.config(state=tk.DISABLED)
        
        # Verhindere Standard-Event-Handling
        return "break"
    
    def cancel_edit(self, event=None):
        """Bricht die Bearbeitung ab"""
        if not self.editing_mode:
            return
        
        # Hole den Original-Satz
        original_text = self.sentences[self.current_sentence]
        
        # Stelle den Original-Text wieder her
        tag_ranges = self.text.tag_ranges(self.current_edit_tag)
        if tag_ranges and len(tag_ranges) >= 2:
            start_pos, end_pos = tag_ranges[0], tag_ranges[1]
            self.text.delete(start_pos, end_pos)
            self.text.insert(start_pos, original_text)
            self.text.tag_add(self.current_edit_tag, start_pos, f"{start_pos}+{len(original_text)}c")
        
        # Beende den Bearbeitungsmodus
        self.end_editing_mode()
        
        # Zeige Bestätigung
        self.alt_text.config(state=tk.NORMAL)
        self.alt_text.delete("1.0", tk.END)
        self.alt_text.insert(tk.END, "Bearbeitung abgebrochen.")
        self.alt_text.config(state=tk.DISABLED)
        
        # Verhindere Standard-Event-Handling
        return "break"

class BewerbungsApp:
    def __init__(self, root):
        """Initialisiert die Bewerbungs-App"""
        # Speichere eine Referenz auf das Root-Fenster
        self.root = root
        self.root.title("Bewerbungs-Generator")
        self.root.geometry("1000x800")
        
        # Lade das Bewerberprofil, falls vorhanden
        self.applicant_profile = self.load_applicant_profile()
        
        # Hauptframe
        main_frame = ttk.Frame(root, padding=15)
        main_frame.pack(fill=tk.BOTH, expand=True)
        
        # Speichere eine Referenz auf das Hauptframe
        self.main_frame = main_frame
        
        # Überschrift
        title_label = ttk.Label(main_frame, text="Bewerbungs-Generator", font=("Arial", 16, "bold"))
        title_label.pack(pady=10)
        
        description_label = ttk.Label(
            main_frame, 
            text="Diese App hilft dir, ein maßgeschneidertes Bewerbungsschreiben zu erstellen, "
                 "das auf deinen Lebenslauf, ein Beispielbewerbungsschreiben und die Stellenbeschreibung abgestimmt ist.",
            wraplength=900
        )
        description_label.pack(pady=10)
        
        # API-Schlüssel-Warnung
        if not os.getenv("GEMINI_API_KEY"):
            api_warning = ttk.Label(
                main_frame,
                text="⚠️ Google Gemini API-Schlüssel nicht gefunden! Bitte klicke auf 'Datei' > 'API-Schlüssel konfigurieren', "
                     "um deinen kostenlosen Gemini API-Schlüssel einzurichten. Einen Schlüssel kannst du kostenlos bei https://makersuite.google.com/app/apikey erhalten.",
                foreground="red",
                wraplength=900
            )
            api_warning.pack(pady=10)
        
        # Datei-Upload und Stellenbeschreibung
        content_frame = ttk.Frame(main_frame)
        content_frame.pack(fill=tk.BOTH, expand=True, pady=(0, 10))
        
        # Linke Spalte - Dateiupload
        left_frame = ttk.LabelFrame(content_frame, text="Dokumente auswählen", padding=10)
        left_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(0, 5))
        
        # Lebenslauf
        resume_frame = ttk.Frame(left_frame)
        resume_frame.pack(fill=tk.X, pady=5)
        
        resume_label = ttk.Label(resume_frame, text="Lebenslauf (PDF, DOCX, TXT):")
        resume_label.pack(anchor=tk.W)
        
        self.resume_path_var = tk.StringVar()
        resume_path_entry = ttk.Entry(resume_frame, textvariable=self.resume_path_var, width=40)
        resume_path_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, pady=5)
        
        resume_buttons_frame = ttk.Frame(resume_frame)
        resume_buttons_frame.pack(side=tk.RIGHT, pady=5)
        
        resume_select_button = ttk.Button(resume_buttons_frame, text="Auswählen", command=self.manage_documents)
        resume_select_button.pack(side=tk.LEFT, padx=(0, 5))
        
        resume_upload_button = ttk.Button(resume_buttons_frame, text="Hochladen", command=self.upload_resume)
        resume_upload_button.pack(side=tk.LEFT)
        
        # Beispielbewerbung
        sample_frame = ttk.Frame(left_frame)
        sample_frame.pack(fill=tk.X, pady=5)
        
        sample_label = ttk.Label(sample_frame, text="Beispielbewerbung (PDF, DOCX, TXT):")
        sample_label.pack(anchor=tk.W)
        
        self.sample_path_var = tk.StringVar()
        sample_path_entry = ttk.Entry(sample_frame, textvariable=self.sample_path_var, width=40)
        sample_path_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, pady=5)
        
        sample_buttons_frame = ttk.Frame(sample_frame)
        sample_buttons_frame.pack(side=tk.RIGHT, pady=5)
        
        sample_select_button = ttk.Button(sample_buttons_frame, text="Auswählen", command=self.manage_documents)
        sample_select_button.pack(side=tk.LEFT, padx=(0, 5))
        
        sample_upload_button = ttk.Button(sample_buttons_frame, text="Hochladen", command=self.upload_sample)
        sample_upload_button.pack(side=tk.LEFT)
        
        # Region
        region_frame = ttk.Frame(left_frame)
        region_frame.pack(fill=tk.X, pady=5)
        
        region_label = ttk.Label(region_frame, text="Region für Bewerbungs-Best-Practices:")
        region_label.pack(anchor=tk.W)
        
        self.region_var = tk.StringVar(value="Deutschland")
        region_combobox = ttk.Combobox(
            region_frame, 
            textvariable=self.region_var,
            values=["Deutschland", "Österreich", "Schweiz", "International"]
        )
        region_combobox.pack(fill=tk.X, pady=5)
        
        # Rechte Spalte - Stellenbeschreibung
        right_frame = ttk.LabelFrame(content_frame, text="Stellenbeschreibung", padding=10)
        right_frame.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True, padx=(5, 0))
        
        self.job_description_text = scrolledtext.ScrolledText(right_frame, wrap=tk.WORD, height=10)
        self.job_description_text.pack(fill=tk.BOTH, expand=True, pady=5)
        
        # Button zum Profil erstellen/bearbeiten
        profile_button = ttk.Button(
            left_frame,
            text="Bewerberprofil erstellen/bearbeiten",
            command=self.manage_applicant_profile
        )
        profile_button.pack(fill=tk.X, pady=10)
        
        # Button zur Generierung
        # Buttons-Frame für die Generierungsbuttons
        generation_buttons_frame = ttk.Frame(main_frame)
        generation_buttons_frame.pack(pady=10)

        # Button zum Generieren des Lebenslaufs
        generate_resume_button = ttk.Button(
            generation_buttons_frame, 
            text="Lebenslauf generieren", 
            command=self.generate_resume,
            style="Accent.TButton"
        )
        generate_resume_button.pack(side=tk.LEFT, padx=5)

        # Button zum Generieren des Bewerbungsschreibens
        generate_button = ttk.Button(
            generation_buttons_frame, 
            text="Bewerbungsschreiben generieren", 
            command=self.generate_letter,
            style="Accent.TButton"
        )
        generate_button.pack(side=tk.LEFT, padx=5)
        
        # Status-Label
        self.status_var = tk.StringVar()
        status_label = ttk.Label(main_frame, textvariable=self.status_var)
        status_label.pack(pady=5)
        
        # Ergebnisbereich mit interaktivem Editor
        result_frame = ttk.LabelFrame(main_frame, text="Generiertes Bewerbungsschreiben", padding=10)
        result_frame.pack(fill=tk.BOTH, expand=True, pady=10)
        
        self.result_text = InteractiveTextEditor(result_frame)
        self.result_text.pack(fill=tk.BOTH, expand=True)
        
        # Speicheren Bereich
        buttons_frame = ttk.Frame(main_frame)
        buttons_frame.pack(pady=10)

        # Bewerbung/Lebenslauf speichern Buttons
        save_letter_button = ttk.Button(buttons_frame, text="Bewerbung speichern", 
                          command=self.save_letter_with_suggested_name)
        save_letter_button.pack(side=tk.LEFT, padx=5)

        save_resume_button = ttk.Button(buttons_frame, text="Lebenslauf speichern", 
                          command=self.save_resume)
        save_resume_button.pack(side=tk.LEFT, padx=5)

        # Neuer scrollbarer Bereich für zusätzliche Dokumente
        attachment_frame_outer = ttk.LabelFrame(main_frame, text="Zusätzliche Dokumente für Bewerbung", padding=10)
        attachment_frame_outer.pack(fill=tk.X, expand=False, pady=10)
        
        # Canvas und Scrollbar für den scrollbaren Bereich
        attachment_canvas = tk.Canvas(attachment_frame_outer, height=200)  # Feste Höhe für den Canvas
        attachment_scrollbar = ttk.Scrollbar(attachment_frame_outer, orient="vertical", command=attachment_canvas.yview)
        attachment_scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        attachment_canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        attachment_canvas.configure(yscrollcommand=attachment_scrollbar.set)
        
        # Frame innerhalb des Canvas für den Inhalt
        self.attachment_frame = ttk.Frame(attachment_canvas)
        canvas_window = attachment_canvas.create_window((0, 0), window=self.attachment_frame, anchor="nw", width=attachment_canvas.winfo_width())
        
        # Aktualisiere die Breite des inneren Frames, wenn sich die Größe des Canvas ändert
        def update_canvas_window_width(event):
            attachment_canvas.itemconfig(canvas_window, width=event.width)
        attachment_canvas.bind("<Configure>", update_canvas_window_width)
        
        # Konfigurieren des Canvas für das Scrollen
        def update_scrollregion(event):
            attachment_canvas.configure(scrollregion=attachment_canvas.bbox("all"))
        self.attachment_frame.bind("<Configure>", update_scrollregion)
        
        # Maus-Scrolling aktivieren
        def _on_canvas_mousewheel(event):
            attachment_canvas.yview_scroll(int(-1*(event.delta/120)), "units")
        attachment_canvas.bind_all("<MouseWheel>", _on_canvas_mousewheel)
        
        # Dokumenttypen
        document_types = ["Lebenslauf", "E-Mail", "Zeugnisse", "Arbeitszeugnisse", "Weitere Dokumente"]
        
        # Variablen für Checkbox-Status und Dokumente
        self.document_vars = {}
        self.document_entries = {}
        self.document_upload_buttons = {}
        self.document_paths = {}
        
        # Erstelle Frames für jeden Dokumenttyp
        for doc_type in document_types:
            doc_frame = ttk.LabelFrame(self.attachment_frame, text=doc_type, padding=5)
            doc_frame.pack(fill=tk.X, expand=True, pady=5)
            
            # Variable für Checkbox-Status
            self.document_vars[doc_type] = []
            self.document_entries[doc_type] = []
            self.document_upload_buttons[doc_type] = []
            self.document_paths[doc_type] = []
            
            # Erstes Dokument-Entry und Upload-Button erstellen
            self._add_document_row(doc_type, doc_frame)
            
            # "Hinzufügen" Button für diesen Dokumenttyp
            add_button = ttk.Button(
                doc_frame, 
                text=f"+ Weiteres {doc_type} hinzufügen", 
                command=lambda dt=doc_type, df=doc_frame: self._add_document_row(dt, df)
            )
            add_button.pack(fill=tk.X, pady=5)
        
        # Style für Buttons
        style = ttk.Style()
        style.configure("Accent.TButton", font=("Arial", 11, "bold"))

        # Füge ein Menü hinzu
        menubar = tk.Menu(root)
        
        # Datei-Menü - nur Bewerbung speichern und Bewerberprofil speichern/bearbeiten
        file_menu = tk.Menu(menubar, tearoff=0)
        file_menu.add_command(label="API-Schlüssel konfigurieren", command=self.configure_api_key)
        file_menu.add_command(label="Bewerbung speichern", command=self.save_letter_with_suggested_name)
        file_menu.add_command(label="Bewerberprofil speichern/bearbeiten", command=self.manage_applicant_profile)
        file_menu.add_separator()
        file_menu.add_command(label="Beenden", command=root.quit)
        menubar.add_cascade(label="Datei", menu=file_menu)
        
        # Bewerbungen-Menü
        applications_menu = tk.Menu(menubar, tearoff=0)
        applications_menu.add_command(label="Bewerbungspakete verwalten", command=self.manage_application_packages)
        applications_menu.add_command(label="Dokumente verwalten", command=self.manage_documents)
        applications_menu.add_separator()
        applications_menu.add_command(label="Lebenslauf hochladen", command=self.upload_resume)
        applications_menu.add_command(label="Anschreiben hochladen", command=self.upload_sample)
        menubar.add_cascade(label="Bewerbungen", menu=applications_menu)
        
        # Profil-Menü
        profile_menu = tk.Menu(menubar, tearoff=0)
        profile_menu.add_command(label="Profil bearbeiten", command=self.manage_applicant_profile)
        profile_menu.add_separator()
        profile_menu.add_command(label="Profil importieren", command=self.import_profile)
        profile_menu.add_command(label="Profil exportieren", command=self.export_profile)
        menubar.add_cascade(label="Profil", menu=profile_menu)
        
        # Hilfe-Menü - ohne Bewerberprofil-Eintrag
        help_menu = tk.Menu(menubar, tearoff=0)
        help_menu.add_command(label="Anleitung", command=self.show_help)
        help_menu.add_command(label="Über", command=self.show_about)
        menubar.add_cascade(label="Hilfe", menu=help_menu)
        
        root.config(menu=menubar)
        
    def _add_document_row(self, doc_type, parent_frame):
        """Fügt eine neue Zeile für Dokumente mit Checkbox, Pfadanzeige und Upload-Button hinzu"""
        # Frame für diese Zeile
        row_frame = ttk.Frame(parent_frame)
        row_frame.pack(fill=tk.X, pady=2)
        
        # Checkbox
        var = tk.BooleanVar(value=False)
        self.document_vars[doc_type].append(var)
        checkbox = ttk.Checkbutton(row_frame, variable=var)
        checkbox.pack(side=tk.LEFT, padx=(0, 5))
        
        # Dateipfad Entry
        path_var = tk.StringVar()
        self.document_paths[doc_type].append(path_var)
        entry = ttk.Entry(row_frame, textvariable=path_var, width=40)
        entry.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 5))
        self.document_entries[doc_type].append(entry)
        
        # Upload Button
        upload_button = ttk.Button(
            row_frame, 
            text="Durchsuchen...", 
            command=lambda dt=doc_type, idx=len(self.document_paths[doc_type])-1: self._browse_document(dt, idx)
        )
        upload_button.pack(side=tk.RIGHT)
        self.document_upload_buttons[doc_type].append(upload_button)
        
        # Löschen Button (nur wenn nicht das erste Element)
        if len(self.document_vars[doc_type]) > 1:
            delete_button = ttk.Button(
                row_frame, 
                text="✕", 
                width=3,
                command=lambda rf=row_frame, dt=doc_type, idx=len(self.document_paths[doc_type])-1: self._remove_document_row(rf, dt, idx)
            )
            delete_button.pack(side=tk.RIGHT, padx=(0, 5))
    
    def _remove_document_row(self, row_frame, doc_type, index):
        """Entfernt eine Dokumentzeile"""
        # Entferne die GUI-Elemente
        row_frame.destroy()
        
        # Entferne die Daten aus den Listen
        # Hinweis: Die Listen werden nicht wirklich kleiner, aber das ist in Ordnung,
        # da wir den Index beim Hinzufügen auf die aktuelle Länge setzen
    
    def _browse_document(self, doc_type, index):
        """Öffnet den Dateidialog zum Auswählen eines Dokuments"""
        # Bestimme die geeigneten Dateitypen
        filetypes = [("Alle Dateien", "*.*")]
        if doc_type == "Lebenslauf":
            filetypes = [
                ("PDF-Dateien", "*.pdf"),
                ("Word-Dateien", "*.docx;*.doc"),
                ("Text-Dateien", "*.txt"),
                ("Alle Dateien", "*.*")
            ]
        elif doc_type == "E-Mail":
            filetypes = [
                ("E-Mail-Dateien", "*.eml;*.msg"),
                ("Text-Dateien", "*.txt"),
                ("Alle Dateien", "*.*")
            ]
        elif doc_type in ["Zeugnisse", "Arbeitszeugnisse"]:
            filetypes = [
                ("PDF-Dateien", "*.pdf"),
                ("Bild-Dateien", "*.jpg;*.jpeg;*.png"),
                ("Word-Dateien", "*.docx;*.doc"),
                ("Alle Dateien", "*.*")
            ]
        
        # Öffne den Dateidialog
        file_path = filedialog.askopenfilename(
            title=f"{doc_type} auswählen",
            filetypes=filetypes
        )
        
        if file_path:
            # Setze den Pfad im Entry
            self.document_paths[doc_type][index].set(file_path)
            # Aktiviere die Checkbox automatisch
            self.document_vars[doc_type][index].set(True)
    
    def get_selected_documents(self):
        """Gibt ein Dictionary mit allen ausgewählten Dokumenten zurück"""
        selected_docs = {}
        for doc_type in self.document_vars.keys():
            selected_docs[doc_type] = []
            for i, var in enumerate(self.document_vars[doc_type]):
                if var.get():  # Wenn die Checkbox aktiviert ist
                    path = self.document_paths[doc_type][i].get()
                    if path:  # Wenn ein Pfad angegeben ist
                        selected_docs[doc_type].append(path)
        return selected_docs
        
    def load_applicant_profile(self):
        """Lade das Bewerberprofil, falls vorhanden"""
        if os.path.exists(PROFILE_PATH):
            try:
                with open(PROFILE_PATH, 'r', encoding='utf-8') as file:
                    return json.load(file)
            except Exception as e:
                print(f"Fehler beim Laden des Bewerberprofils: {str(e)}")
        return {}
    
    def save_applicant_profile(self, profile_data):
        """Speichere das Bewerberprofil"""
        try:
            with open(PROFILE_PATH, 'w', encoding='utf-8') as file:
                json.dump(profile_data, file, ensure_ascii=False, indent=4)
            return True
        except Exception as e:
            print(f"Fehler beim Speichern des Bewerberprofils: {str(e)}")
            return False
    
    def manage_documents(self):
        """Verwaltet Dokumente im Benutzerprofil"""
        try:
            # Importiere den DocumentManager, falls verfügbar
            try:
                from gui.document_manager import DocumentManager
                doc_manager = DocumentManager(self.root, self.applicant_profile)
                doc_manager.show_document_manager()
            except ImportError:
                # Fallback, wenn die modularisierte Version nicht verfügbar ist
                self._show_document_manager()
        except Exception as e:
            messagebox.showerror("Fehler", f"Beim Öffnen der Dokumentenverwaltung ist ein Fehler aufgetreten: {str(e)}")
    
    def manage_application_packages(self):
        """Verwaltet Bewerbungspakete (Firmen und zugehörige Dokumente)"""
        try:
            # Erstelle ein neues Toplevel-Fenster
            app_window = tk.Toplevel(self.root)
            app_window.title("Bewerbungspakete verwalten")
            app_window.geometry("900x600")
            app_window.minsize(900, 600)
            
            # Hauptframe
            main_frame = ttk.Frame(app_window, padding=10)
            main_frame.pack(fill=tk.BOTH, expand=True)
            
            # Überschrift
            header_label = ttk.Label(main_frame, text="Bewerbungspakete verwalten", font=("Helvetica", 16, "bold"))
            header_label.pack(pady=(0, 10))
            
            # Info-Label
            info_label = ttk.Label(main_frame, text="Hier kannst du deine Bewerbungen pro Firma organisieren und verwalten.")
            info_label.pack(pady=(0, 20))
            
            # Frame für die Treeview und Scrollbar
            tree_frame = ttk.Frame(main_frame)
            tree_frame.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
            
            # Scrollbar für den Treeview
            tree_scroll = ttk.Scrollbar(tree_frame)
            tree_scroll.pack(side=tk.RIGHT, fill=tk.Y)
            
            # Treeview für Bewerbungen
            columns = ('firma', 'position', 'status', 'datum', 'lebenslauf', 'anschreiben', 'sonstiges')
            applications_tree = ttk.Treeview(tree_frame, columns=columns, show='headings', yscrollcommand=tree_scroll.set)
            
            # Konfiguriere die Spalten
            applications_tree.heading('firma', text='Firma')
            applications_tree.heading('position', text='Position')
            applications_tree.heading('status', text='Status')
            applications_tree.heading('datum', text='Datum')
            applications_tree.heading('lebenslauf', text='Lebenslauf')
            applications_tree.heading('anschreiben', text='Anschreiben')
            applications_tree.heading('sonstiges', text='Sonstige Dokumente')
            
            # Setze die Spaltenbreiten
            applications_tree.column('firma', width=150, anchor='w')
            applications_tree.column('position', width=150, anchor='w')
            applications_tree.column('status', width=100, anchor='center')
            applications_tree.column('datum', width=100, anchor='center')
            applications_tree.column('lebenslauf', width=100, anchor='center')
            applications_tree.column('anschreiben', width=100, anchor='center')
            applications_tree.column('sonstiges', width=150, anchor='center')
            
            applications_tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
            tree_scroll.config(command=applications_tree.yview)
            
            # APPLICATIONS_DIR festlegen
            APPLICATIONS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "bewerbungs_dokumente", "bewerbungen")
            os.makedirs(APPLICATIONS_DIR, exist_ok=True)
            
            # JSON-Datei für Bewerbungsdaten
            APPLICATIONS_FILE = os.path.join(APPLICATIONS_DIR, "bewerbungen.json")
            
            # Lade vorhandene Bewerbungen, falls vorhanden
            applications_data = []
            if os.path.exists(APPLICATIONS_FILE):
                try:
                    with open(APPLICATIONS_FILE, 'r', encoding='utf-8') as file:
                        applications_data = json.load(file)
                except Exception as e:
                    print(f"Fehler beim Laden der Bewerbungsdaten: {str(e)}")
            
            # Füge Bewerbungen zum Treeview hinzu
            for app in applications_data:
                applications_tree.insert('', 'end', values=(
                    app.get('firma', ''),
                    app.get('position', ''),
                    app.get('status', ''),
                    app.get('datum', ''),
                    '✓' if app.get('lebenslauf') else '',
                    '✓' if app.get('anschreiben') else '',
                    '✓' if app.get('sonstige_dokumente') else ''
                ))
            
            # Frame für Buttons
            button_frame = ttk.Frame(main_frame)
            button_frame.pack(fill=tk.X, pady=10)
            
            # Funktionen für die Buttons
            def add_application():
                """Fügt eine neue Bewerbung hinzu"""
                # Öffne Dialog für neue Bewerbung
                add_window = tk.Toplevel(app_window)
                add_window.title("Neue Bewerbung hinzufügen")
                add_window.geometry("500x400")
                add_window.minsize(500, 400)
                add_window.transient(app_window)
                add_window.grab_set()
                
                # Frame für die Eingabefelder
                add_frame = ttk.Frame(add_window, padding=10)
                add_frame.pack(fill=tk.BOTH, expand=True)
                
                # Überschrift
                add_label = ttk.Label(add_frame, text="Neue Bewerbung hinzufügen", font=("Helvetica", 14, "bold"))
                add_label.pack(pady=(0, 15))
                
                # Eingabefelder
                fields_frame = ttk.Frame(add_frame)
                fields_frame.pack(fill=tk.X, pady=5)
                
                # Firma
                ttk.Label(fields_frame, text="Firma:").grid(row=0, column=0, sticky='w', padx=5, pady=5)
                firma_var = tk.StringVar()
                ttk.Entry(fields_frame, textvariable=firma_var, width=30).grid(row=0, column=1, sticky='we', padx=5, pady=5)
                
                # Position
                ttk.Label(fields_frame, text="Position:").grid(row=1, column=0, sticky='w', padx=5, pady=5)
                position_var = tk.StringVar()
                ttk.Entry(fields_frame, textvariable=position_var, width=30).grid(row=1, column=1, sticky='we', padx=5, pady=5)
                
                # Status
                ttk.Label(fields_frame, text="Status:").grid(row=2, column=0, sticky='w', padx=5, pady=5)
                status_var = tk.StringVar(value="Vorbereitung")
                status_combo = ttk.Combobox(fields_frame, textvariable=status_var, width=27)
                status_combo['values'] = ('Vorbereitung', 'Gesendet', 'Rückmeldung erhalten', 'Einladung zum Gespräch', 'Absage erhalten', 'Angebot erhalten', 'Angenommen', 'Abgelehnt')
                status_combo.grid(row=2, column=1, sticky='we', padx=5, pady=5)
                
                # Datum
                ttk.Label(fields_frame, text="Datum:").grid(row=3, column=0, sticky='w', padx=5, pady=5)
                datum_var = tk.StringVar(value=datetime.datetime.now().strftime("%d.%m.%Y"))
                ttk.Entry(fields_frame, textvariable=datum_var, width=30).grid(row=3, column=1, sticky='we', padx=5, pady=5)
                
                # Dokumente
                docs_frame = ttk.LabelFrame(add_frame, text="Dokumente")
                docs_frame.pack(fill=tk.BOTH, expand=True, pady=10)
                
                # Lebenslauf
                lebenslauf_frame = ttk.Frame(docs_frame)
                lebenslauf_frame.pack(fill=tk.X, pady=5)
                
                lebenslauf_var = tk.StringVar()
                lebenslauf_label_var = tk.StringVar(value="Kein Dokument ausgewählt")
                ttk.Label(lebenslauf_frame, text="Lebenslauf:").pack(side=tk.LEFT, padx=5)
                ttk.Label(lebenslauf_frame, textvariable=lebenslauf_label_var, width=40, foreground="blue").pack(side=tk.LEFT, fill=tk.X, expand=True, padx=5)
                ttk.Button(lebenslauf_frame, text="Auswählen", command=lambda: browse_doc(lebenslauf_var, lebenslauf_label_var, "Lebenslauf")).pack(side=tk.RIGHT, padx=5)
                ttk.Button(lebenslauf_frame, text="Hochladen", command=lambda: upload_doc(lebenslauf_var, lebenslauf_label_var, "Lebenslauf")).pack(side=tk.RIGHT, padx=5)
                
                # Anschreiben
                anschreiben_frame = ttk.Frame(docs_frame)
                anschreiben_frame.pack(fill=tk.X, pady=5)
                
                anschreiben_var = tk.StringVar()
                anschreiben_label_var = tk.StringVar(value="Kein Dokument ausgewählt")
                ttk.Label(anschreiben_frame, text="Anschreiben:").pack(side=tk.LEFT, padx=5)
                ttk.Label(anschreiben_frame, textvariable=anschreiben_label_var, width=40, foreground="blue").pack(side=tk.LEFT, fill=tk.X, expand=True, padx=5)
                ttk.Button(anschreiben_frame, text="Auswählen", command=lambda: browse_doc(anschreiben_var, anschreiben_label_var, "Anschreiben")).pack(side=tk.RIGHT, padx=5)
                ttk.Button(anschreiben_frame, text="Hochladen", command=lambda: upload_doc(anschreiben_var, anschreiben_label_var, "Anschreiben")).pack(side=tk.RIGHT, padx=5)
                
                # Container für sonstige Dokumente
                sonstige_container = ttk.Frame(docs_frame)
                sonstige_container.pack(fill=tk.X, pady=5)
                
                # Liste für sonstige Dokumente
                sonstige_docs = []
                
                # Funktion zum Hinzufügen eines sonstigen Dokuments
                def add_sonstiges_doc():
                    doc_frame = ttk.Frame(sonstige_container)
                    doc_frame.pack(fill=tk.X, pady=2)
                    
                    path_var = tk.StringVar()
                    label_var = tk.StringVar(value="Kein Dokument ausgewählt")
                    
                    ttk.Label(doc_frame, text=f"Sonstiges {len(sonstige_docs) + 1}:").pack(side=tk.LEFT, padx=5)
                    doc_label = ttk.Label(doc_frame, textvariable=label_var, width=40, foreground="blue")
                    doc_label.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=5)
                    
                    # Erstelle einen Hyperlink zum Öffnen des Dokuments
                    doc_label.bind("<Button-1>", lambda e, path=path_var: open_document(path.get()))
                    
                    ttk.Button(doc_frame, text="Auswählen", 
                               command=lambda p=path_var, l=label_var: browse_doc(p, l, "Sonstiges Dokument")
                               ).pack(side=tk.RIGHT, padx=5)
                    ttk.Button(doc_frame, text="Hochladen", 
                               command=lambda p=path_var, l=label_var: upload_doc(p, l, "Sonstiges Dokument")
                               ).pack(side=tk.RIGHT, padx=5)
                    
                    # Button zum Entfernen
                    ttk.Button(doc_frame, text="✕", width=3, 
                               command=lambda f=doc_frame: remove_sonstiges_doc(f, sonstige_docs)
                               ).pack(side=tk.RIGHT, padx=5)
                    
                    sonstige_docs.append({
                        "frame": doc_frame,
                        "path_var": path_var,
                        "label_var": label_var
                    })
                
                # Funktion zum Entfernen eines sonstigen Dokuments
                def remove_sonstiges_doc(frame, doc_list):
                    # Entferne das Frame aus der UI
                    frame.pack_forget()
                    frame.destroy()
                    
                    # Entferne den Eintrag aus der Liste
                    for i, doc in enumerate(doc_list[:]):
                        if doc["frame"] == frame:
                            doc_list.remove(doc)
                            break
                    
                    # Aktualisiere die Nummerierung
                    for i, doc in enumerate(doc_list):
                        for child in doc["frame"].winfo_children():
                            if isinstance(child, ttk.Label) and "Sonstiges" in child.cget("text"):
                                child.config(text=f"Sonstiges {i + 1}:")
                
                # Füge ein erstes sonstiges Dokument hinzu
                add_sonstiges_doc()
                
                # Button zum Hinzufügen weiterer sonstiger Dokumente
                add_button_frame = ttk.Frame(docs_frame)
                add_button_frame.pack(fill=tk.X, pady=5)
                ttk.Button(add_button_frame, text="+ Weiteres Dokument hinzufügen", 
                           command=add_sonstiges_doc).pack(side=tk.LEFT, padx=20)
                
                # Hilfsfunktion zum Durchsuchen von Dokumenten (gespeicherte Dokumente auswählen)
                def browse_doc(var, label_var, doc_type):
                    # Bestimme die Kategorie basierend auf dem Dokumententyp
                    category = ""
                    if doc_type == "Lebenslauf":
                        category = "lebenslaeufe"
                    elif doc_type == "Anschreiben":
                        category = "anschreiben"
                    else:
                        category = "sonstiges"
                    
                    # Kategorie-Verzeichnis
                    category_dir = os.path.join(DOCUMENTS_DIR, category)
                    os.makedirs(category_dir, exist_ok=True)
                    
                    # Prüfe, ob Dokumente im Verzeichnis vorhanden sind
                    files = [f for f in os.listdir(category_dir) if os.path.isfile(os.path.join(category_dir, f))]
                    if not files:
                        messagebox.showinfo("Hinweis", f"Keine {doc_type}-Dokumente vorhanden. Bitte lade zuerst ein Dokument hoch.")
                        return
                    
                    # Erstelle Dialog für Dokumentauswahl
                    select_window = tk.Toplevel(add_window)
                    select_window.title(f"{doc_type} auswählen")
                    select_window.geometry("600x400")
                    select_window.minsize(600, 400)
                    select_window.transient(add_window)
                    select_window.grab_set()
                    
                    # Frame für die Auswahl
                    select_frame = ttk.Frame(select_window, padding=10)
                    select_frame.pack(fill=tk.BOTH, expand=True)
                    
                    # Überschrift
                    ttk.Label(select_frame, text=f"{doc_type} auswählen", font=("Helvetica", 14, "bold")).pack(pady=(0, 15))
                    
                    # Listbox für Dokumente
                    list_frame = ttk.Frame(select_frame)
                    list_frame.pack(fill=tk.BOTH, expand=True, pady=(0, 10))
                    
                    scrollbar = ttk.Scrollbar(list_frame)
                    scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
                    
                    listbox = tk.Listbox(list_frame, yscrollcommand=scrollbar.set, font=("Helvetica", 10))
                    listbox.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
                    scrollbar.config(command=listbox.yview)
                    
                    # Dokumente aus dem Verzeichnis laden
                    for file in sorted(files):
                        listbox.insert(tk.END, file)
                    
                    # Auswahl-Funktion
                    def select_document():
                        selected_indices = listbox.curselection()
                        if not selected_indices:
                            messagebox.showinfo("Hinweis", "Bitte wähle ein Dokument aus.")
                            return
                            
                        selected_index = selected_indices[0]
                        filename = listbox.get(selected_index)
                        file_path = os.path.join(category_dir, filename)
                        
                        if not os.path.exists(file_path):
                            messagebox.showerror("Fehler", "Die ausgewählte Datei existiert nicht mehr.")
                            return
                        
                        # Setze Pfad und Label
                        var.set(file_path)
                        label_var.set(filename)
                        
                        # Schließe das Fenster
                        select_window.destroy()
                    
                    # Button-Frame
                    button_frame = ttk.Frame(select_frame)
                    button_frame.pack(fill=tk.X, pady=10)
                    
                    # Buttons
                    ttk.Button(button_frame, text="Auswählen", command=select_document).pack(side=tk.RIGHT, padx=5)
                    ttk.Button(button_frame, text="Abbrechen", command=select_window.destroy).pack(side=tk.RIGHT, padx=5)
                    
                    # Doppelklick-Event für Listbox
                    listbox.bind('<Double-Button-1>', lambda e: select_document())
                
                # Hilfsfunktion zum Hochladen von Dokumenten
                def upload_doc(var, label_var, doc_type):
                    filetypes = [("Alle Dateien", "*.*")]
                    if doc_type == "Lebenslauf":
                        target_dir = os.path.join(DOCUMENTS_DIR, "lebenslaeufe")
                        filetypes = [
                            ("PDF-Dateien", "*.pdf"),
                            ("Word-Dateien", "*.docx;*.doc"),
                            ("Text-Dateien", "*.txt"),
                            ("Alle Dateien", "*.*")
                        ]
                    elif doc_type == "Anschreiben":
                        target_dir = os.path.join(DOCUMENTS_DIR, "anschreiben")
                        filetypes = [
                            ("PDF-Dateien", "*.pdf"),
                            ("Word-Dateien", "*.docx;*.doc"),
                            ("Text-Dateien", "*.txt"),
                            ("Alle Dateien", "*.*")
                        ]
                    else:
                        target_dir = os.path.join(DOCUMENTS_DIR, "sonstiges")
                    
                    # Stelle sicher, dass das Zielverzeichnis existiert
                    os.makedirs(target_dir, exist_ok=True)
                    
                    file_path = filedialog.askopenfilename(
                        title=f"{doc_type} hochladen",
                        filetypes=filetypes
                    )
                    
                    if file_path:
                        # Kopiere die Datei ins Zielverzeichnis
                        file_name = os.path.basename(file_path)
                        target_path = os.path.join(target_dir, file_name)
                        
                        # Wenn eine Datei mit dem gleichen Namen bereits existiert, hänge ein Suffix an
                        if os.path.exists(target_path):
                            name, ext = os.path.splitext(file_name)
                            target_path = os.path.join(target_dir, f"{name}_{int(time.time())}{ext}")
                        
                        try:
                            shutil.copy2(file_path, target_path)
                            var.set(target_path)
                            label_var.set(os.path.basename(target_path))
                            messagebox.showinfo("Erfolg", f"{doc_type} wurde erfolgreich hochgeladen.")
                        except Exception as e:
                            messagebox.showerror("Fehler", f"Beim Hochladen ist ein Fehler aufgetreten: {str(e)}")
                
                # Hilfsfunktion zum Öffnen des Dokuments
                def open_document(path):
                    if not path:
                        messagebox.showinfo("Hinweis", "Kein Dokument ausgewählt.")
                        return
                        
                    try:
                        if platform.system() == 'Windows':
                            os.startfile(path)
                        elif platform.system() == 'Darwin':  # macOS
                            subprocess.call(('open', path))
                        else:  # Linux
                            subprocess.call(('xdg-open', path))
                    except Exception as e:
                        messagebox.showerror("Fehler", f"Das Dokument konnte nicht geöffnet werden: {str(e)}")
                
                # Button-Frame
                add_button_frame = ttk.Frame(add_frame)
                add_button_frame.pack(fill=tk.X, pady=10)
                
                # Speichern-Funktion
                def save_application():
                    # Prüfe, ob Pflichtfelder ausgefüllt sind
                    if not firma_var.get().strip():
                        messagebox.showerror("Fehler", "Bitte gib den Firmennamen ein.")
                        return
                    
                    # Sammle alle sonstigen Dokumente
                    sonstige_dokumente = []
                    sonstige_dokumente_namen = []
                    for doc in sonstige_docs:
                        path = doc["path_var"].get()
                        label = doc["label_var"].get()
                        if path:
                            sonstige_dokumente.append(path)
                            sonstige_dokumente_namen.append(label)
                    
                    # Erstelle das Bewerbungsobjekt
                    new_application = {
                        'firma': firma_var.get().strip(),
                        'position': position_var.get().strip(),
                        'status': status_var.get().strip(),
                        'datum': datum_var.get().strip(),
                        'lebenslauf': lebenslauf_var.get().strip(),
                        'lebenslauf_label': lebenslauf_label_var.get(),
                        'anschreiben': anschreiben_var.get().strip(),
                        'anschreiben_label': anschreiben_label_var.get(),
                        'sonstige_dokumente': sonstige_dokumente,
                        'sonstige_dokumente_namen': sonstige_dokumente_namen
                    }
                    
                    # Füge die neue Bewerbung zur Liste hinzu
                    applications_data.append(new_application)
                    
                    # Speichere die Bewerbungsdaten
                    try:
                        with open(APPLICATIONS_FILE, 'w', encoding='utf-8') as file:
                            json.dump(applications_data, file, ensure_ascii=False, indent=4)
                    except Exception as e:
                        messagebox.showerror("Fehler", f"Beim Speichern der Bewerbungsdaten ist ein Fehler aufgetreten: {str(e)}")
                        return
                    
                    # Aktualisiere die Treeview
                    applications_tree.delete(*applications_tree.get_children())
                    for app in applications_data:
                        # Für sonstige Dokumente die Namen kommagetrennt anzeigen
                        sonstige_anzeige = ""
                        if app.get('sonstige_dokumente_namen'):
                            sonstige_anzeige = ", ".join(app.get('sonstige_dokumente_namen'))
                        elif app.get('sonstige_dokumente') and isinstance(app.get('sonstige_dokumente'), list):
                            # Fallback für ältere Einträge
                            sonstige_anzeige = f"{len(app.get('sonstige_dokumente'))} Dokument(e)"
                        
                        applications_tree.insert('', 'end', values=(
                            app.get('firma', ''),
                            app.get('position', ''),
                            app.get('status', ''),
                            app.get('datum', ''),
                            app.get('lebenslauf_label', '✓' if app.get('lebenslauf') else ''),
                            app.get('anschreiben_label', '✓' if app.get('anschreiben') else ''),
                            sonstige_anzeige
                        ))
                    
                    # Schließe das Fenster
                    add_window.destroy()
                    messagebox.showinfo("Erfolg", "Die Bewerbung wurde erfolgreich hinzugefügt.")
                
                # Speichern-Button
                ttk.Button(add_button_frame, text="Speichern", command=save_application).pack(side=tk.RIGHT, padx=5)
                
                # Abbrechen-Button
                ttk.Button(add_button_frame, text="Abbrechen", command=add_window.destroy).pack(side=tk.RIGHT, padx=5)
            
            def edit_application():
                """Bearbeitet eine ausgewählte Bewerbung"""
                selected_item = applications_tree.selection()
                if not selected_item:
                    messagebox.showinfo("Hinweis", "Bitte wähle eine Bewerbung aus.")
                    return
                
                # Hole den Index der ausgewählten Bewerbung
                index = applications_tree.index(selected_item[0])
                if index >= len(applications_data):
                    messagebox.showerror("Fehler", "Die ausgewählte Bewerbung konnte nicht gefunden werden.")
                    return
                
                # Öffne Dialog zum Bearbeiten
                edit_window = tk.Toplevel(app_window)
                edit_window.title("Bewerbung bearbeiten")
                edit_window.geometry("500x400")
                edit_window.transient(app_window)
                edit_window.grab_set()
                
                # Frame für die Eingabefelder
                edit_frame = ttk.Frame(edit_window, padding=10)
                edit_frame.pack(fill=tk.BOTH, expand=True)
                
                # Überschrift
                edit_label = ttk.Label(edit_frame, text="Bewerbung bearbeiten", font=("Helvetica", 14, "bold"))
                edit_label.pack(pady=(0, 15))
                
                # Eingabefelder
                fields_frame = ttk.Frame(edit_frame)
                fields_frame.pack(fill=tk.X, pady=5)
                
                # Hole die Daten der ausgewählten Bewerbung
                app = applications_data[index]
                
                # Firma
                ttk.Label(fields_frame, text="Firma:").grid(row=0, column=0, sticky='w', padx=5, pady=5)
                firma_var = tk.StringVar(value=app.get('firma', ''))
                ttk.Entry(fields_frame, textvariable=firma_var, width=30).grid(row=0, column=1, sticky='we', padx=5, pady=5)
                
                # Position
                ttk.Label(fields_frame, text="Position:").grid(row=1, column=0, sticky='w', padx=5, pady=5)
                position_var = tk.StringVar(value=app.get('position', ''))
                ttk.Entry(fields_frame, textvariable=position_var, width=30).grid(row=1, column=1, sticky='we', padx=5, pady=5)
                
                # Status
                ttk.Label(fields_frame, text="Status:").grid(row=2, column=0, sticky='w', padx=5, pady=5)
                status_var = tk.StringVar(value=app.get('status', 'Vorbereitung'))
                status_combo = ttk.Combobox(fields_frame, textvariable=status_var, width=27)
                status_combo['values'] = ('Vorbereitung', 'Gesendet', 'Rückmeldung erhalten', 'Einladung zum Gespräch', 'Absage erhalten', 'Angebot erhalten', 'Angenommen', 'Abgelehnt')
                status_combo.grid(row=2, column=1, sticky='we', padx=5, pady=5)
                
                # Datum
                ttk.Label(fields_frame, text="Datum:").grid(row=3, column=0, sticky='w', padx=5, pady=5)
                datum_var = tk.StringVar(value=app.get('datum', datetime.datetime.now().strftime("%d.%m.%Y")))
                ttk.Entry(fields_frame, textvariable=datum_var, width=30).grid(row=3, column=1, sticky='we', padx=5, pady=5)
                
                # Dokumente
                docs_frame = ttk.LabelFrame(edit_frame, text="Dokumente")
                docs_frame.pack(fill=tk.BOTH, expand=True, pady=10)
                
                # Lebenslauf
                lebenslauf_frame = ttk.Frame(docs_frame)
                lebenslauf_frame.pack(fill=tk.X, pady=5)
                
                lebenslauf_var = tk.StringVar(value=app.get('lebenslauf', ''))
                lebenslauf_label_var = tk.StringVar(value=app.get('lebenslauf_label', "Kein Dokument ausgewählt"))
                ttk.Label(lebenslauf_frame, text="Lebenslauf:").pack(side=tk.LEFT, padx=5)
                ttk.Label(lebenslauf_frame, textvariable=lebenslauf_label_var, width=40, foreground="blue").pack(side=tk.LEFT, fill=tk.X, expand=True, padx=5)
                ttk.Button(lebenslauf_frame, text="Auswählen", command=lambda: browse_doc(lebenslauf_var, lebenslauf_label_var, "Lebenslauf")).pack(side=tk.RIGHT, padx=5)
                ttk.Button(lebenslauf_frame, text="Hochladen", command=lambda: upload_doc(lebenslauf_var, lebenslauf_label_var, "Lebenslauf")).pack(side=tk.RIGHT, padx=5)
                
                # Anschreiben
                anschreiben_frame = ttk.Frame(docs_frame)
                anschreiben_frame.pack(fill=tk.X, pady=5)
                
                anschreiben_var = tk.StringVar(value=app.get('anschreiben', ''))
                anschreiben_label_var = tk.StringVar(value=app.get('anschreiben_label', "Kein Dokument ausgewählt"))
                ttk.Label(anschreiben_frame, text="Anschreiben:").pack(side=tk.LEFT, padx=5)
                ttk.Label(anschreiben_frame, textvariable=anschreiben_label_var, width=40, foreground="blue").pack(side=tk.LEFT, fill=tk.X, expand=True, padx=5)
                ttk.Button(anschreiben_frame, text="Auswählen", command=lambda: browse_doc(anschreiben_var, anschreiben_label_var, "Anschreiben")).pack(side=tk.RIGHT, padx=5)
                ttk.Button(anschreiben_frame, text="Hochladen", command=lambda: upload_doc(anschreiben_var, anschreiben_label_var, "Anschreiben")).pack(side=tk.RIGHT, padx=5)
                
                # Container für sonstige Dokumente
                sonstige_container = ttk.Frame(docs_frame)
                sonstige_container.pack(fill=tk.X, pady=5)
                
                # Liste für sonstige Dokumente
                sonstige_docs = []
                
                # Funktion zum Hinzufügen eines sonstigen Dokuments
                def add_sonstiges_doc():
                    doc_frame = ttk.Frame(sonstige_container)
                    doc_frame.pack(fill=tk.X, pady=2)
                    
                    path_var = tk.StringVar()
                    label_var = tk.StringVar(value="Kein Dokument ausgewählt")
                    
                    ttk.Label(doc_frame, text=f"Sonstiges {len(sonstige_docs) + 1}:").pack(side=tk.LEFT, padx=5)
                    doc_label = ttk.Label(doc_frame, textvariable=label_var, width=40, foreground="blue")
                    doc_label.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=5)
                    
                    # Erstelle einen Hyperlink zum Öffnen des Dokuments
                    doc_label.bind("<Button-1>", lambda e, path=path_var: open_document(path.get()))
                    
                    ttk.Button(doc_frame, text="Auswählen", 
                               command=lambda p=path_var, l=label_var: browse_doc(p, l, "Sonstiges Dokument")
                               ).pack(side=tk.RIGHT, padx=5)
                    ttk.Button(doc_frame, text="Hochladen", 
                               command=lambda p=path_var, l=label_var: upload_doc(p, l, "Sonstiges Dokument")
                               ).pack(side=tk.RIGHT, padx=5)
                    
                    # Button zum Entfernen
                    ttk.Button(doc_frame, text="✕", width=3, 
                               command=lambda f=doc_frame: remove_sonstiges_doc(f, sonstige_docs)
                               ).pack(side=tk.RIGHT, padx=5)
                    
                    sonstige_docs.append({
                        "frame": doc_frame,
                        "path_var": path_var,
                        "label_var": label_var
                    })
                
                # Funktion zum Entfernen eines sonstigen Dokuments
                def remove_sonstiges_doc(frame, doc_list):
                    # Entferne das Frame aus der UI
                    frame.pack_forget()
                    frame.destroy()
                    
                    # Entferne den Eintrag aus der Liste
                    for i, doc in enumerate(doc_list[:]):
                        if doc["frame"] == frame:
                            doc_list.remove(doc)
                            break
                    
                    # Aktualisiere die Nummerierung
                    for i, doc in enumerate(doc_list):
                        for child in doc["frame"].winfo_children():
                            if isinstance(child, ttk.Label) and "Sonstiges" in child.cget("text"):
                                child.config(text=f"Sonstiges {i + 1}:")
                
                # Füge ein erstes sonstiges Dokument hinzu
                add_sonstiges_doc()
                
                # Button zum Hinzufügen weiterer sonstiger Dokumente
                add_button_frame = ttk.Frame(docs_frame)
                add_button_frame.pack(fill=tk.X, pady=5)
                ttk.Button(add_button_frame, text="+ Weiteres Dokument hinzufügen", 
                           command=add_sonstiges_doc).pack(side=tk.LEFT, padx=20)
                
                # Hilfsfunktion zum Durchsuchen von Dokumenten
                def browse_doc(var, label_var, doc_type):
                    filetypes = [("Alle Dateien", "*.*")]
                    if doc_type == "Lebenslauf":
                        filetypes = [
                            ("PDF-Dateien", "*.pdf"),
                            ("Word-Dateien", "*.docx;*.doc"),
                            ("Text-Dateien", "*.txt"),
                            ("Alle Dateien", "*.*")
                        ]
                    elif doc_type == "Anschreiben":
                        filetypes = [
                            ("PDF-Dateien", "*.pdf"),
                            ("Word-Dateien", "*.docx;*.doc"),
                            ("Text-Dateien", "*.txt"),
                            ("Alle Dateien", "*.*")
                        ]
                    
                    file_path = filedialog.askopenfilename(
                        title=f"{doc_type} auswählen",
                        filetypes=filetypes
                    )
                    
                    if file_path:
                        var.set(file_path)
                        # Zeige nur den Dateinamen an, nicht den ganzen Pfad
                        label_var.set(os.path.basename(file_path))
                
                # Hilfsfunktion zum Hochladen von Dokumenten
                def upload_doc(var, label_var, doc_type):
                    filetypes = [("Alle Dateien", "*.*")]
                    if doc_type == "Lebenslauf":
                        target_dir = os.path.join(DOCUMENTS_DIR, "lebenslaeufe")
                        filetypes = [
                            ("PDF-Dateien", "*.pdf"),
                            ("Word-Dateien", "*.docx;*.doc"),
                            ("Text-Dateien", "*.txt"),
                            ("Alle Dateien", "*.*")
                        ]
                    elif doc_type == "Anschreiben":
                        target_dir = os.path.join(DOCUMENTS_DIR, "anschreiben")
                        filetypes = [
                            ("PDF-Dateien", "*.pdf"),
                            ("Word-Dateien", "*.docx;*.doc"),
                            ("Text-Dateien", "*.txt"),
                            ("Alle Dateien", "*.*")
                        ]
                    else:
                        target_dir = os.path.join(DOCUMENTS_DIR, "sonstiges")
                    
                    # Stelle sicher, dass das Zielverzeichnis existiert
                    os.makedirs(target_dir, exist_ok=True)
                    
                    file_path = filedialog.askopenfilename(
                        title=f"{doc_type} hochladen",
                        filetypes=filetypes
                    )
                    
                    if file_path:
                        # Kopiere die Datei ins Zielverzeichnis
                        file_name = os.path.basename(file_path)
                        target_path = os.path.join(target_dir, file_name)
                        
                        # Wenn eine Datei mit dem gleichen Namen bereits existiert, hänge ein Suffix an
                        if os.path.exists(target_path):
                            name, ext = os.path.splitext(file_name)
                            target_path = os.path.join(target_dir, f"{name}_{int(time.time())}{ext}")
                        
                        try:
                            shutil.copy2(file_path, target_path)
                            var.set(target_path)
                            label_var.set(os.path.basename(target_path))
                            messagebox.showinfo("Erfolg", f"{doc_type} wurde erfolgreich hochgeladen.")
                        except Exception as e:
                            messagebox.showerror("Fehler", f"Beim Hochladen ist ein Fehler aufgetreten: {str(e)}")
                
                # Hilfsfunktion zum Öffnen des Dokuments
                def open_document(path):
                    if not path:
                        messagebox.showinfo("Hinweis", "Kein Dokument ausgewählt.")
                        return
                        
                    try:
                        if platform.system() == 'Windows':
                            os.startfile(path)
                        elif platform.system() == 'Darwin':  # macOS
                            subprocess.call(('open', path))
                        else:  # Linux
                            subprocess.call(('xdg-open', path))
                    except Exception as e:
                        messagebox.showerror("Fehler", f"Das Dokument konnte nicht geöffnet werden: {str(e)}")
                
                # Button-Frame
                edit_button_frame = ttk.Frame(edit_frame)
                edit_button_frame.pack(fill=tk.X, pady=10)
                
                # Speichern-Funktion
                def update_application():
                    # Prüfe, ob Pflichtfelder ausgefüllt sind
                    if not firma_var.get().strip():
                        messagebox.showerror("Fehler", "Bitte gib den Firmennamen ein.")
                        return
                    
                    # Aktualisiere das Bewerbungsobjekt
                    applications_data[index] = {
                        'firma': firma_var.get().strip(),
                        'position': position_var.get().strip(),
                        'status': status_var.get().strip(),
                        'datum': datum_var.get().strip(),
                        'lebenslauf': lebenslauf_var.get().strip(),
                        'lebenslauf_label': lebenslauf_label_var.get(),
                        'anschreiben': anschreiben_var.get().strip(),
                        'anschreiben_label': anschreiben_label_var.get(),
                        'sonstige_dokumente': sonstige_dokumente,
                        'sonstige_dokumente_namen': sonstige_dokumente_namen
                    }
                    
                    # Speichere die Bewerbungsdaten
                    try:
                        with open(APPLICATIONS_FILE, 'w', encoding='utf-8') as file:
                            json.dump(applications_data, file, ensure_ascii=False, indent=4)
                    except Exception as e:
                        messagebox.showerror("Fehler", f"Beim Speichern der Bewerbungsdaten ist ein Fehler aufgetreten: {str(e)}")
                        return
                    
                    # Aktualisiere die Treeview
                    applications_tree.delete(*applications_tree.get_children())
                    for app in applications_data:
                        # Für sonstige Dokumente die Namen kommagetrennt anzeigen
                        sonstige_anzeige = ""
                        if app.get('sonstige_dokumente_namen'):
                            sonstige_anzeige = ", ".join(app.get('sonstige_dokumente_namen'))
                        elif app.get('sonstige_dokumente') and isinstance(app.get('sonstige_dokumente'), list):
                            # Fallback für ältere Einträge
                            sonstige_anzeige = f"{len(app.get('sonstige_dokumente'))} Dokument(e)"
                        
                        applications_tree.insert('', 'end', values=(
                            app.get('firma', ''),
                            app.get('position', ''),
                            app.get('status', ''),
                            app.get('datum', ''),
                            app.get('lebenslauf_label', '✓' if app.get('lebenslauf') else ''),
                            app.get('anschreiben_label', '✓' if app.get('anschreiben') else ''),
                            sonstige_anzeige
                        ))
                    
                    # Schließe das Fenster
                    edit_window.destroy()
                    messagebox.showinfo("Erfolg", "Die Bewerbung wurde erfolgreich aktualisiert.")
                
                # Speichern-Button
                ttk.Button(edit_button_frame, text="Speichern", command=update_application).pack(side=tk.RIGHT, padx=5)
                
                # Abbrechen-Button
                ttk.Button(edit_button_frame, text="Abbrechen", command=edit_window.destroy).pack(side=tk.RIGHT, padx=5)
            
            def delete_application():
                """Löscht eine ausgewählte Bewerbung"""
                selected_item = applications_tree.selection()
                if not selected_item:
                    messagebox.showinfo("Hinweis", "Bitte wähle eine Bewerbung aus.")
                    return
                
                # Bestätigungsdialog
                if not messagebox.askyesno("Löschen bestätigen", "Möchtest du diese Bewerbung wirklich löschen?"):
                    return
                
                # Hole den Index der ausgewählten Bewerbung
                index = applications_tree.index(selected_item[0])
                if index >= len(applications_data):
                    messagebox.showerror("Fehler", "Die ausgewählte Bewerbung konnte nicht gefunden werden.")
                    return
                
                # Entferne die Bewerbung aus der Liste
                del applications_data[index]
                
                # Speichere die aktualisierte Liste
                try:
                    with open(APPLICATIONS_FILE, 'w', encoding='utf-8') as file:
                        json.dump(applications_data, file, ensure_ascii=False, indent=4)
                except Exception as e:
                    messagebox.showerror("Fehler", f"Beim Speichern der Bewerbungsdaten ist ein Fehler aufgetreten: {str(e)}")
                    return
                
                # Aktualisiere die Treeview
                applications_tree.delete(*applications_tree.get_children())
                for app in applications_data:
                    applications_tree.insert('', 'end', values=(
                        app.get('firma', ''),
                        app.get('position', ''),
                        app.get('status', ''),
                        app.get('datum', ''),
                        '✓' if app.get('lebenslauf') else '',
                        '✓' if app.get('anschreiben') else '',
                        '✓' if app.get('sonstige_dokumente') else ''
                    ))
                
                messagebox.showinfo("Erfolg", "Die Bewerbung wurde erfolgreich gelöscht.")
            
            def view_document(doc_type):
                """Öffnet das ausgewählte Dokument"""
                selected_item = applications_tree.selection()
                if not selected_item:
                    messagebox.showinfo("Hinweis", "Bitte wähle eine Bewerbung aus.")
                    return
                
                # Hole den Index der ausgewählten Bewerbung
                index = applications_tree.index(selected_item[0])
                if index >= len(applications_data):
                    messagebox.showerror("Fehler", "Die ausgewählte Bewerbung konnte nicht gefunden werden.")
                    return
                
                # Hole das ausgewählte Dokument
                app = applications_data[index]
                doc_path = ""
                
                if doc_type == "lebenslauf":
                    doc_path = app.get('lebenslauf', '')
                elif doc_type == "anschreiben":
                    doc_path = app.get('anschreiben', '')
                elif doc_type == "sonstige":
                    doc_path = app.get('sonstige_dokumente', '')
                
                if not doc_path:
                    messagebox.showinfo("Hinweis", f"Kein {doc_type.capitalize()} für diese Bewerbung vorhanden.")
                    return
                
                # Öffne das Dokument mit dem Standardprogramm
                try:
                    if platform.system() == 'Windows':
                        os.startfile(doc_path)
                    elif platform.system() == 'Darwin':  # macOS
                        subprocess.call(('open', doc_path))
                    else:  # Linux
                        subprocess.call(('xdg-open', doc_path))
                except Exception as e:
                    messagebox.showerror("Fehler", f"Das Dokument konnte nicht geöffnet werden: {str(e)}")
            
            # Erstelle die Buttons
            ttk.Button(button_frame, text="Neue Bewerbung", command=add_application).pack(side=tk.LEFT, padx=5)
            ttk.Button(button_frame, text="Bearbeiten", command=edit_application).pack(side=tk.LEFT, padx=5)
            ttk.Button(button_frame, text="Löschen", command=delete_application).pack(side=tk.LEFT, padx=5)
            ttk.Button(button_frame, text="Lebenslauf öffnen", command=lambda: view_document("lebenslauf")).pack(side=tk.LEFT, padx=5)
            ttk.Button(button_frame, text="Anschreiben öffnen", command=lambda: view_document("anschreiben")).pack(side=tk.LEFT, padx=5)
            ttk.Button(button_frame, text="Sonstige Dokumente öffnen", command=lambda: view_document("sonstige")).pack(side=tk.LEFT, padx=5)
            
            # Schließen-Button
            ttk.Button(main_frame, text="Schließen", command=app_window.destroy).pack(side=tk.RIGHT, pady=10)
            
        except Exception as e:
            messagebox.showerror("Fehler", f"Beim Öffnen der Bewerbungsverwaltung ist ein Fehler aufgetreten: {str(e)}")
            
    def _show_document_manager(self):
        """Interne Dokumentenverwaltung, wenn das Modul nicht verfügbar ist"""
        # Erstelle ein neues Toplevel-Fenster
        doc_window = tk.Toplevel(self.root)
        doc_window.title("Dokumentenverwaltung")
        doc_window.geometry("800x600")
        doc_window.minsize(800, 600)
        
        # Hauptframe
        main_frame = ttk.Frame(doc_window, padding=10)
        main_frame.pack(fill=tk.BOTH, expand=True)
        
        # Überschrift
        header_label = ttk.Label(main_frame, text="Dokumentenverwaltung", font=("Helvetica", 16, "bold"))
        header_label.pack(pady=(0, 10))
        
        # Info-Label
        info_label = ttk.Label(main_frame, text="Hier kannst du all deine Bewerbungsdokumente zentral verwalten.")
        info_label.pack(pady=(0, 20))
        
        # Notebook für die Kategorien
        doc_notebook = ttk.Notebook(main_frame)
        doc_notebook.pack(fill=tk.BOTH, expand=True)
        
        # Kategorien für Dokumente
        categories = {
            "lebenslaeufe": "Lebensläufe",
            "anschreiben": "Anschreiben",
            "zeugnisse": "Zeugnisse & Zertifikate",
            "sonstiges": "Sonstige Dokumente"
        }
        
        # DOCUMENTS_DIR aus Umgebung oder standardmäßig festlegen
        DOCUMENTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "bewerbungs_dokumente")
        os.makedirs(DOCUMENTS_DIR, exist_ok=True)
        
        # Frames für jede Kategorie erstellen
        for category_key, category_name in categories.items():
            category_dir = os.path.join(DOCUMENTS_DIR, category_key)
            os.makedirs(category_dir, exist_ok=True)
            
            frame = ttk.Frame(doc_notebook, padding=10)
            doc_notebook.add(frame, text=category_name)
            
            # Split-Ansicht: Links Dokumentenliste, rechts Vorschau
            paned_window = ttk.PanedWindow(frame, orient=tk.HORIZONTAL)
            paned_window.pack(fill=tk.BOTH, expand=True)
            
            # Linke Seite: Dokumente und Buttons
            left_frame = ttk.Frame(paned_window)
            paned_window.add(left_frame, weight=1)
            
            # Listbox für Dokumente
            list_frame = ttk.Frame(left_frame)
            list_frame.pack(fill=tk.BOTH, expand=True, pady=(0, 10))
            
            scrollbar = ttk.Scrollbar(list_frame)
            scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
            
            listbox = tk.Listbox(list_frame, yscrollcommand=scrollbar.set, font=("Helvetica", 10))
            listbox.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
            scrollbar.config(command=listbox.yview)
            
            # Dokumente aus dem Verzeichnis laden
            if os.path.exists(category_dir):
                files = [f for f in os.listdir(category_dir) if os.path.isfile(os.path.join(category_dir, f))]
                for file in sorted(files):
                    listbox.insert(tk.END, file)
            
            # Buttons für Aktionen
            button_frame = ttk.Frame(left_frame)
            button_frame.pack(fill=tk.X, expand=False)
            
            # Auswählen-Button (neu)
            def create_select_handler(cat_dir, lb, category_key):
                def select_file():
                    selected_indices = lb.curselection()
                    if not selected_indices:
                        messagebox.showinfo("Hinweis", "Bitte wähle zuerst ein Dokument aus.")
                        return
                        
                    selected_index = selected_indices[0]
                    filename = lb.get(selected_index)
                    file_path = os.path.join(cat_dir, filename)
                    
                    if not os.path.exists(file_path):
                        messagebox.showerror("Fehler", "Die ausgewählte Datei existiert nicht mehr.")
                        return
                    
                    # Je nach Kategorie in entsprechendes Feld eintragen
                    if category_key == "lebenslaeufe":
                        self.resume_path_var.set(file_path)
                    elif category_key == "anschreiben":
                        self.sample_path_var.set(file_path)
                    
                    # Fenster schließen
                    doc_window.destroy()
                
                return select_file
            
            # Zeige "Auswählen"-Button nur für relevante Kategorien an
            if category_key in ["lebenslaeufe", "anschreiben"]:
                select_btn = ttk.Button(button_frame, text="Auswählen", 
                                       command=create_select_handler(category_dir, listbox, category_key))
                select_btn.pack(side=tk.LEFT, padx=5)
            
            # Upload-Button
            def create_upload_handler(cat_dir, lb):
                def upload_file():
                    filetypes = [("Alle Dateien", "*.*")]
                    if cat_dir.endswith("lebenslaeufe"):
                        filetypes = [
                            ("Unterstützte Dateien", "*.pdf;*.docx;*.doc;*.txt"),
                            ("PDF-Dateien", "*.pdf"),
                            ("Word-Dateien", "*.docx;*.doc"),
                            ("Text-Dateien", "*.txt"),
                            ("Alle Dateien", "*.*")
                        ]
                    
                    file_path = filedialog.askopenfilename(
                        title=f"Dokument auswählen",
                        filetypes=filetypes
                    )
                    
                    if file_path:
                        # Kopiere die Datei in das Kategorie-Verzeichnis
                        filename = os.path.basename(file_path)
                        target_path = os.path.join(cat_dir, filename)
                        
                        # Prüfe auf Namensduplikate
                        counter = 1
                        base_name, ext = os.path.splitext(filename)
                        while os.path.exists(target_path):
                            new_filename = f"{base_name}_{counter}{ext}"
                            target_path = os.path.join(cat_dir, new_filename)
                            counter += 1
                            
                        try:
                            shutil.copy2(file_path, target_path)
                            lb.insert(tk.END, os.path.basename(target_path))
                            messagebox.showinfo("Erfolg", f"Dokument '{os.path.basename(target_path)}' erfolgreich hinzugefügt.")
                        except Exception as e:
                            messagebox.showerror("Fehler", f"Fehler beim Kopieren der Datei: {str(e)}")
                return upload_file
            
            upload_btn = ttk.Button(button_frame, text="Dokument hinzufügen", 
                                   command=create_upload_handler(category_dir, listbox))
            upload_btn.pack(side=tk.LEFT, padx=5)
            
            # Löschen-Button
            def create_delete_handler(cat_dir, lb):
                def delete_file():
                    selected_indices = lb.curselection()
                    if not selected_indices:
                        messagebox.showinfo("Hinweis", "Bitte wähle zuerst ein Dokument aus.")
                        return
                        
                    selected_index = selected_indices[0]
                    filename = lb.get(selected_index)
                    file_path = os.path.join(cat_dir, filename)
                    
                    if messagebox.askyesno("Löschen bestätigen", f"Möchtest du '{filename}' wirklich löschen?"):
                        try:
                            os.remove(file_path)
                            lb.delete(selected_index)
                            messagebox.showinfo("Erfolg", f"Dokument '{filename}' wurde gelöscht.")
                        except Exception as e:
                            messagebox.showerror("Fehler", f"Fehler beim Löschen: {str(e)}")
                return delete_file
            
            delete_btn = ttk.Button(button_frame, text="Löschen", 
                                   command=create_delete_handler(category_dir, listbox))
            delete_btn.pack(side=tk.LEFT, padx=5)
            
            # Öffnen-Button
            def create_open_handler(cat_dir, lb):
                def open_file():
                    selected_indices = lb.curselection()
                    if not selected_indices:
                        messagebox.showinfo("Hinweis", "Bitte wähle zuerst ein Dokument aus.")
                        return
                        
                    selected_index = selected_indices[0]
                    filename = lb.get(selected_index)
                    file_path = os.path.join(cat_dir, filename)
                    
                    if os.path.exists(file_path):
                        try:
                            # Verwende den Standard-Viewer des Betriebssystems
                            os.startfile(file_path)
                        except AttributeError:
                            # Für nicht-Windows-Systeme
                            import subprocess
                            subprocess.call(('xdg-open', file_path)) 
                        except Exception as e:
                            messagebox.showerror("Fehler", f"Fehler beim Öffnen: {str(e)}")
                return open_file
            
            open_btn = ttk.Button(button_frame, text="Öffnen", 
                                 command=create_open_handler(category_dir, listbox))
            open_btn.pack(side=tk.LEFT, padx=5)
            
            # Rechte Seite: Vorschau-Bereich
            right_frame = ttk.Frame(paned_window)
            paned_window.add(right_frame, weight=2)
            
            preview_label = ttk.Label(right_frame, text="Vorschau:")
            preview_label.pack(anchor=tk.W)
            
            preview_text = scrolledtext.ScrolledText(right_frame, height=15, width=40)
            preview_text.pack(fill=tk.BOTH, expand=True)
            preview_text.config(state=tk.DISABLED)
            
            # Funktion zum Anzeigen einer Vorschau
            def show_preview(event):
                selected_indices = listbox.curselection()
                if not selected_indices:
                    return
                    
                selected_index = selected_indices[0]
                filename = listbox.get(selected_index)
                file_path = os.path.join(category_dir, filename)
                
                preview_text.config(state=tk.NORMAL)
                preview_text.delete(1.0, tk.END)
                
                if not os.path.exists(file_path):
                    preview_text.insert(tk.END, "Datei nicht gefunden.")
                    preview_text.config(state=tk.DISABLED)
                    return
                
                file_ext = os.path.splitext(filename)[1].lower()
                
                if file_ext == '.pdf' and 'PyPDF2' in sys.modules:
                    try:
                        with open(file_path, 'rb') as f:
                            pdf_reader = PyPDF2.PdfReader(f)
                            text = ""
                            for page_num in range(len(pdf_reader.pages)):
                                if page_num > 2:  # Begrenze auf 3 Seiten für die Vorschau
                                    text += "\n[...weitere Seiten...]"
                                    break
                                text += pdf_reader.pages[page_num].extract_text() + "\n\n"
                            preview_text.insert(tk.END, text or "Keine Textinhalte gefunden.")
                    except Exception as e:
                        preview_text.insert(tk.END, f"Fehler beim Lesen der PDF: {str(e)}")
                elif file_ext in ['.docx', '.doc']:
                    preview_text.insert(tk.END, "Vorschau für Word-Dokumente nicht verfügbar.")
                elif file_ext in ['.txt', '.text']:
                    try:
                        with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
                            preview_text.insert(tk.END, f.read())
                    except Exception as e:
                        preview_text.insert(tk.END, f"Fehler beim Lesen der Textdatei: {str(e)}")
                elif file_ext in ['.jpg', '.jpeg', '.png', '.gif', '.bmp']:
                    preview_text.insert(tk.END, "Bildvorschau nicht verfügbar.")
                else:
                    preview_text.insert(tk.END, f"Keine Vorschau verfügbar für {file_ext}-Dateien.")
                
                preview_text.config(state=tk.DISABLED)
            
            # Doppelklick zum Öffnen
            listbox.bind('<Double-Button-1>', create_open_handler(category_dir, listbox))
            # Einzelklick für Vorschau
            listbox.bind('<<ListboxSelect>>', show_preview)
        
        # Schließen-Button unten
        close_btn = ttk.Button(main_frame, text="Schließen", command=doc_window.destroy)
        close_btn.pack(pady=10)
    
    def import_profile(self):
        """Importiert ein Bewerberprofil aus einer JSON-Datei"""
        file_path = filedialog.askopenfilename(
            title="Bewerberprofil importieren",
            filetypes=[("JSON-Dateien", "*.json"), ("Alle Dateien", "*.*")]
        )
        
        if not file_path:
            return
            
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                imported_profile = json.load(file)
                
            # Validiere das importierte Profil
            if not isinstance(imported_profile, dict):
                messagebox.showerror("Fehler", "Die ausgewählte Datei enthält kein gültiges Bewerberprofil.")
                return
                
            # Speichere das importierte Profil
            if self.save_applicant_profile(imported_profile):
                # Aktualisiere das aktuelle Profil
                self.applicant_profile = imported_profile
                messagebox.showinfo("Import erfolgreich", "Das Bewerberprofil wurde erfolgreich importiert.")
            else:
                messagebox.showerror("Fehler", "Beim Speichern des importierten Profils ist ein Fehler aufgetreten.")
                
        except Exception as e:
            messagebox.showerror("Fehler", f"Beim Importieren des Profils ist ein Fehler aufgetreten: {str(e)}")
    
    def export_profile(self):
        """Exportiert das aktuelle Bewerberprofil in eine JSON-Datei"""
        if not self.applicant_profile:
            messagebox.showinfo("Kein Profil", "Es gibt kein Bewerberprofil zum Exportieren. "
                               "Bitte erstellen Sie zuerst ein Profil.")
            return
            
        # Schlage einen Dateinamen vor
        default_filename = "bewerberprofil.json"
        file_path = filedialog.asksaveasfilename(
            title="Bewerberprofil exportieren",
            defaultextension=".json",
            initialfile=default_filename,
            filetypes=[("JSON-Dateien", "*.json"), ("Alle Dateien", "*.*")]
        )
        
        if not file_path:
            return
            
        try:
            with open(file_path, 'w', encoding='utf-8') as file:
                json.dump(self.applicant_profile, file, ensure_ascii=False, indent=4)
                
            messagebox.showinfo("Export erfolgreich", 
                               f"Das Bewerberprofil wurde erfolgreich exportiert nach:\n{file_path}")
                
        except Exception as e:
            messagebox.showerror("Fehler", f"Beim Exportieren des Profils ist ein Fehler aufgetreten: {str(e)}")
    
    def extract_profile_data(self, resume_text="", sample_text="", application_text=""):
        """Extrahiere persönliche Daten aus allen verfügbaren Texten (Lebenslauf, Beispiel, generiertes Anschreiben)"""
        # Initialisiere leeres Profil-Wörterbuch oder kopiere bestehendes Profil als Basis
        profile_data = {}
        if self.applicant_profile:
            profile_data = self.applicant_profile.copy()
            print("Vorhandenes Profil geladen:", list(profile_data.keys()))
        
        # Kombiniere alle verfügbaren Texte für die Extraktion
        combined_text = ""
        if resume_text:
            combined_text += resume_text + "\n\n"
            print(f"Lebenslauf für Extraktion hinzugefügt: {len(resume_text)} Zeichen")
        if sample_text:
            combined_text += sample_text + "\n\n"
            print(f"Beispielanschreiben für Extraktion hinzugefügt: {len(sample_text)} Zeichen")
        if application_text:
            combined_text += application_text
            print(f"Generiertes Anschreiben für Extraktion hinzugefügt: {len(application_text)} Zeichen")
            
        if not combined_text:
            print("Keine Textdaten für die Extraktion verfügbar")
            return profile_data
            
        print(f"Beginne Datenextraktion aus {len(combined_text)} Zeichen Text")
        print("Die ersten 200 Zeichen des Textes:", combined_text[:200].replace('\n', ' '))
        
        # Extrahiere Namen - prüfe die erste Zeile und dann ein explizites Namensmuster
        if 'name' not in profile_data:
            # Erste Zeile prüfen (oft der Name)
            lines = combined_text.strip().split('\n')
            if lines and len(lines[0].strip()) < 50 and not re.search(r'\d', lines[0]):
                profile_data['name'] = lines[0].strip()
                print(f"Name aus erster Zeile extrahiert: '{profile_data['name']}'")
            else:
                # Explizite Namensangabe suchen
                name_patterns = [
                    r'(?:Name|Name:)\s*([^\n]+)', 
                    r'(?:Bewerber|Bewerberin|Kandidat)(?::|.)\s*([^\n]+)'
                ]
                for pattern in name_patterns:
                    match = re.search(pattern, combined_text, re.IGNORECASE)
                    if match:
                        profile_data['name'] = match.group(1).strip()
                        print(f"Name mit Muster '{pattern}' gefunden: '{profile_data['name']}'")
                        break
        
        # Extrahiere E-Mail - suche nach E-Mail-Mustern mit weniger Einschränkungen
        if 'email' not in profile_data:
            # Einfaches E-Mail-Muster ohne vorausgehendes Label
            simple_email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
            email_match = re.search(simple_email_pattern, combined_text)
            if email_match:
                profile_data['email'] = email_match.group(0)
                print(f"E-Mail gefunden: '{profile_data['email']}'")
            else:
                print("Keine E-Mail-Adresse gefunden")
        
        # Extrahiere Telefonnummer - vereinfachtes Muster für bessere Erkennung
        if 'phone' not in profile_data:
            # Suche nach Telefonnummern mit verschiedenen Formaten
            phone_patterns = [
                # Mit Label
                r'(?:Tel(?:efon)?|Mobil|Phone|Handy)[:\.]?\s*([+\d\s\(\)/\-]{5,20})',
                # Internationale Formate
                r'(?:\+\d{2}|\(\+\d{2}\))[\s\-\.]?\d{2,4}[\s\-\.]\d{3,10}',
                # Deutsche Formate
                r'0\d{2,5}[\s/\-]?\d{5,10}',
                # Einfache Zahlenfolgen mit Trennung
                r'\d{3,5}[\s\-\./]\d{5,10}'
            ]
            
            for pattern in phone_patterns:
                match = re.search(pattern, combined_text, re.IGNORECASE)
                if match:
                    # Wenn eine Gruppe gefunden wurde, verwende sie, sonst den ganzen Match
                    if match.groups() and match.group(1):
                        profile_data['phone'] = match.group(1).strip()
                    else:
                        profile_data['phone'] = match.group(0).strip()
                    print(f"Telefonnummer mit Muster '{pattern}' gefunden: '{profile_data['phone']}'")
                    break
            
            if 'phone' not in profile_data:
                print("Keine Telefonnummer gefunden")
        
        # Extrahiere Adresse - vereinfachtes Muster für bessere Erkennung
        if 'address' not in profile_data:
            # Suche nach PLZ-Stadt-Muster - häufiges und eindeutiges Muster
            plz_city_pattern = r'\b(\d{5}\s+[A-Za-zäöüÄÖÜß\s.-]+)\b'
            plz_city_match = re.search(plz_city_pattern, combined_text)
            if plz_city_match:
                profile_data['address'] = plz_city_match.group(1).strip()
                print(f"Adresse (PLZ-Stadt) gefunden: '{profile_data['address']}'")
            else:
                # Suche nach expliziter Adressangabe
                address_patterns = [
                    r'(?:Adresse|Anschrift|Address)[:\.]?\s*([^\n]+(?:\n[^\n]+)?)',
                    r'(?:Straße|Str\.|Street)[:\.]?\s*([^\n]+)'
                ]
                for pattern in address_patterns:
                    match = re.search(pattern, combined_text, re.IGNORECASE)
                    if match:
                        address = match.group(1).strip()
                        address = re.sub(r'\n+', ', ', address)
                        profile_data['address'] = address
                        print(f"Adresse mit Muster '{pattern}' gefunden: '{profile_data['address']}'")
                        break
                
                if 'address' not in profile_data:
                    print("Keine Adresse gefunden")
        
        # Extrahiere Geburtsdatum mit flexibleren Mustern
        if 'birthdate' not in profile_data:
            dob_patterns = [
                r'(?:Geburtsdatum|Geboren|Geb\.|Birth|DOB)[:\.]?\s*(\d{1,2}[.-]\d{1,2}[.-]\d{2,4})',
                r'(?:Geburtsdatum|Geboren|Geb\.|Birth|DOB)[:\.]?\s*(\d{2,4}[.-]\d{1,2}[.-]\d{1,2})',
                r'\b(\d{1,2}[.-]\d{1,2}[.-](?:19|20)\d{2})\b'
            ]
            for pattern in dob_patterns:
                match = re.search(pattern, combined_text, re.IGNORECASE)
                if match:
                    profile_data['birthdate'] = match.group(1).strip()
                    print(f"Geburtsdatum mit Muster '{pattern}' gefunden: '{profile_data['birthdate']}'")
                    break
            
            if 'birthdate' not in profile_data:
                print("Kein Geburtsdatum gefunden")
        
        # Ausgabe der extrahierten Felder
        print("Extraktion abgeschlossen. Extrahierte Felder:", list(profile_data.keys()))
        for key, value in profile_data.items():
            print(f"  - {key}: {value}")
        
        return profile_data

    def manage_applicant_profile(self):
        """Erstelle oder bearbeite das Bewerberprofil"""
        # Lade bereits vorhandenes Profil, falls existiert
        base_profile_data = self.applicant_profile.copy() if self.applicant_profile else {}
        
        # Prüfe, ob Dokumente für die Extraktion vorhanden sind
        resume_path = self.resume_path_var.get().strip()
        sample_path = self.sample_path_var.get().strip()
        application_text = self.result_text.get_content() if hasattr(self, 'result_text') else ""
        
        has_resume = bool(resume_path) and os.path.exists(resume_path)
        has_sample = bool(sample_path) and os.path.exists(sample_path)
        has_generated = bool(application_text)
        has_documents = has_resume or has_sample or has_generated
        
        print(f"Verfügbare Dokumente für Extraktion:")
        print(f"  - Lebenslauf: {has_resume} ({resume_path if has_resume else 'nicht vorhanden'})")
        print(f"  - Beispielanschreiben: {has_sample} ({sample_path if has_sample else 'nicht vorhanden'})")
        print(f"  - Generiertes Anschreiben: {has_generated} ({len(application_text) if has_generated else 0} Zeichen)")
        
        # Wenn Dokumente vorhanden sind, versuche Daten zu extrahieren
        extracted_data = {}
        if has_documents:
            try:
                # Extrahiere Text aus den vorhandenen Dokumenten
                resume_text = ""
                sample_text = ""
                
                if has_resume:
                    resume_text = extract_text_from_file(resume_path)
                    if resume_text.startswith("Fehler"):
                        print(f"Fehler beim Lesen des Lebenslaufs: {resume_text}")
                        resume_text = ""
                    else:
                        print(f"Lebenslauf erfolgreich gelesen: {len(resume_text)} Zeichen")
                
                if has_sample:
                    sample_text = extract_text_from_file(sample_path)
                    if sample_text.startswith("Fehler"):
                        print(f"Fehler beim Lesen des Beispielanschreibens: {sample_text}")
                        sample_text = ""
                    else:
                        print(f"Beispielanschreiben erfolgreich gelesen: {len(sample_text)} Zeichen")
                
                # Versuche Daten zu extrahieren
                if resume_text or sample_text or application_text:
                    print("Starte Extraktion persönlicher Daten...")
                    extracted_data = self.extract_profile_data(resume_text, sample_text, application_text)
                    print(f"Extrahierte Daten: {list(extracted_data.keys())}")
                else:
                    print("Keine Textdaten zum Extrahieren vorhanden")
            except Exception as e:
                print(f"Fehler bei der Extraktion: {e}")
                import traceback
                traceback.print_exc()
                extracted_data = {}
        else:
            print("Keine Dokumente für die Extraktion gefunden")
        
        # Kombiniere vorhandene und extrahierte Daten
        combined_data = base_profile_data.copy()
        # Füge extrahierte Daten hinzu, wenn sie nicht bereits existieren
        for key, value in extracted_data.items():
            if key not in combined_data or not combined_data[key]:
                combined_data[key] = value
                print(f"Daten für '{key}' aus Extraktion übernommen: {value}")
        
        # Öffne den Profile-Editor
        has_extracted = bool(extracted_data)
        print(f"Öffne Profileditor mit {len(combined_data)} Feldern (davon {len(extracted_data)} neu extrahiert)")
        self.show_profile_editor(combined_data, has_extracted_data=has_extracted)

    def show_profile_editor(self, profile_data, has_extracted_data=False):
        """Zeigt den Dialog zum Bearbeiten des Profils mit Tabs für verschiedene Kategorien an"""
        profile_dialog = tk.Toplevel(self.root)
        profile_dialog.title("Bewerberprofil erstellen/bearbeiten")
        profile_dialog.geometry("800x700")  # Größeres Fenster für bessere Übersicht
        profile_dialog.minsize(700, 600)
        profile_dialog.transient(self.root)
        profile_dialog.grab_set()  # Modal machen
        
        # Hauptframe
        main_frame = ttk.Frame(profile_dialog, padding=20)
        main_frame.pack(fill=tk.BOTH, expand=True)
        
        # Überschrift
        title_label = ttk.Label(main_frame, text="Bewerberprofil", font=("Arial", 16, "bold"))
        title_label.pack(pady=(0, 15))
        
        # Beschreibung
        if self.applicant_profile:
            description_text = "Hier kannst du deine gespeicherten persönlichen Daten bearbeiten."
        else:
            description_text = "Bitte fülle deine persönlichen Daten für zukünftige Bewerbungen aus. Diese Daten werden lokal gespeichert und verbessern die Qualität deiner Bewerbungen."
        
        description_label = ttk.Label(
            main_frame, 
            text=description_text,
            wraplength=750
        )
        description_label.pack(pady=(0, 15))
        
        # Hinweis zur manuellen Bearbeitung
        help_label = ttk.Label(
            main_frame,
            text="Tipp: Fülle mindestens die Pflichtfelder aus, um dein Bewerberprofil zu erstellen. Die Daten dienen als Basis für einen professionellen Lebenslauf.",
            wraplength=750,
            foreground="blue",
            font=("Arial", 9, "italic")
        )
        help_label.pack(pady=(0, 15))
        
        # Erstelle ein Notebook (Tab-Widget)
        notebook = ttk.Notebook(main_frame)
        notebook.pack(fill=tk.BOTH, expand=True)
        
        # Variablen für die Formularfelder
        self.profile_vars = {}
        
        # Extrahiere Adresse für die verschiedenen Felder
        address_data = profile_data.get('address', '')
        
        # Einfache Logik, um die Adresse aufzuteilen
        street_number = ""
        postal_city = ""
        co = ""
        
        if address_data:
            # Suche nach c/o 
            if 'c/o' in address_data.lower():
                # Extrahiere c/o Teil
                co_match = re.search(r'c/o\s+[^,]+', address_data, re.IGNORECASE)
                if co_match:
                    co = co_match.group(0)
                    # Entferne c/o aus der Adresse für weitere Verarbeitung
                    address_data = re.sub(r'c/o\s+[^,]+,?\s*', '', address_data, flags=re.IGNORECASE)
            
            # Teile die verbleibende Adresse
            parts = address_data.split(',')
            if len(parts) >= 1:
                street_number = parts[0].strip()
            if len(parts) >= 2:
                postal_city = parts[1].strip()
            
            # Wenn wir eine PLZ-Stadt-Kombination erkennen, aber keine Straße haben
            if not street_number and postal_city and re.match(r'\d{5}\s+', postal_city):
                # Tausche die Werte, weil wahrscheinlich die PLZ-Stadt als erstes Element kam
                street_number, postal_city = postal_city, street_number
        
        # Erstelle die Tabs und ihre Inhalte
        
        # Tab 1: Stammdaten
        personal_tab = ttk.Frame(notebook, padding=10)
        notebook.add(personal_tab, text="Stammdaten")
        
        # Tab 2: Berufserfahrung
        experience_tab = ttk.Frame(notebook, padding=10)
        notebook.add(experience_tab, text="Berufserfahrung")
        
        # Tab 3: Ausbildung
        education_tab = ttk.Frame(notebook, padding=10)
        notebook.add(education_tab, text="Ausbildung")
        
        # Tab 4: Fähigkeiten & Kompetenzen
        skills_tab = ttk.Frame(notebook, padding=10)
        notebook.add(skills_tab, text="Fähigkeiten")
        
        # Tab 5: Sprachen & Zertifikate
        languages_tab = ttk.Frame(notebook, padding=10)
        notebook.add(languages_tab, text="Sprachen & Zertifikate")
        
        # Tab 6: Zusätzliche Informationen
        additional_tab = ttk.Frame(notebook, padding=10)
        notebook.add(additional_tab, text="Zusätzliche Infos")
        
        # Definiere die Felder für jeden Tab
        # Tab 1: Stammdaten
        personal_fields = [
            {"key": "name", "label": "Vollständiger Name:", "required": True},
            {"key": "street_number", "label": "Straße, Hausnummer:", "required": True, "value": street_number},
            {"key": "postal_city", "label": "PLZ, Ort:", "required": True, "value": postal_city},
            {"key": "co", "label": "c/o:", "required": False, "value": co},
            {"key": "phone", "label": "Telefon:", "required": True},
            {"key": "mobile", "label": "Mobiltelefon:", "required": False},
            {"key": "email", "label": "E-Mail:", "required": True},
            {"key": "birthdate", "label": "Geburtsdatum:", "required": False},
            {"key": "birthplace", "label": "Geburtsort:", "required": False},
            {"key": "nationality", "label": "Nationalität:", "required": False},
            {"key": "website", "label": "Webseite:", "required": False},
            {"key": "linkedin", "label": "LinkedIn:", "required": False},
            {"key": "xing", "label": "Xing:", "required": False}
        ]
        
        # Tab 2: Berufserfahrung
        experience_fields = [
            {"key": "current_profession", "label": "Aktuelle Berufsbezeichnung:", "required": False},
            {"key": "current_employer", "label": "Aktueller Arbeitgeber:", "required": False},
            {"key": "current_start_date", "label": "Beginn aktuelle Tätigkeit (MM/YYYY):", "required": False},
            {"key": "current_responsibilities", "label": "Aktuelle Verantwortlichkeiten:", "required": False, "multiline": True},
            {"key": "previous_jobs", "label": "Frühere Berufstätigkeiten:", "required": False, "multiline": True, 
             "helper_text": "Format: Zeitraum | Position | Firma | Ort\nz.B.: 01/2018 - 12/2020 | Projektmanager | Musterfirma GmbH | Berlin"},
            {"key": "achievements", "label": "Besondere berufliche Erfolge:", "required": False, "multiline": True},
            {"key": "management_experience", "label": "Führungserfahrung:", "required": False, "multiline": True},
            {"key": "notice_period", "label": "Aktuelle Kündigungsfrist:", "required": False},
            {"key": "desired_position", "label": "Angestrebte Position:", "required": False},
            {"key": "salary_expectation", "label": "Gehaltsvorstellung:", "required": False},
            {"key": "earliest_start_date", "label": "Frühester Eintrittstermin:", "required": False},
            {"key": "willingness_to_relocate", "label": "Umzugsbereitschaft:", "required": False}
        ]
        
        # Tab 3: Ausbildung
        education_fields = [
            {"key": "highest_degree", "label": "Höchster Bildungsabschluss:", "required": False},
            {"key": "education_history", "label": "Bildungsweg:", "required": False, "multiline": True,
             "helper_text": "Format: Zeitraum | Abschluss | Institution | Ort\nz.B.: 09/2015 - 06/2020 | Bachelor Informatik | TU Berlin | Berlin"},
            {"key": "main_subjects", "label": "Schwerpunkte/Studienfächer:", "required": False, "multiline": True},
            {"key": "thesis_topic", "label": "Abschlussarbeitsthema:", "required": False, "multiline": True},
            {"key": "academic_achievements", "label": "Akademische Leistungen:", "required": False, "multiline": True},
            {"key": "training_courses", "label": "Weiterbildungen:", "required": False, "multiline": True}
        ]
        
        # Tab 4: Fähigkeiten & Kompetenzen
        skills_fields = [
            {"key": "technical_skills", "label": "Technische Fähigkeiten:", "required": False, "multiline": True,
             "helper_text": "z.B.: Programmiersprachen, Software, Tools"},
            {"key": "methodical_skills", "label": "Methodische Kompetenzen:", "required": False, "multiline": True,
             "helper_text": "z.B.: Projektmanagement, Agile, Scrum, Design Thinking"},
            {"key": "soft_skills", "label": "Soft Skills:", "required": False, "multiline": True,
             "helper_text": "z.B.: Teamfähigkeit, Kommunikationsstärke, Führungsqualitäten"},
            {"key": "industry_knowledge", "label": "Branchenkenntnisse:", "required": False, "multiline": True},
            {"key": "strengths", "label": "Persönliche Stärken:", "required": False, "multiline": True}
        ]
        
        # Tab 5: Sprachen & Zertifikate
        languages_fields = [
            {"key": "languages", "label": "Sprachkenntnisse:", "required": False, "multiline": True,
             "helper_text": "Format: Sprache | Niveau (A1-C2 oder Grundkenntnisse bis Muttersprache)\nz.B.: Deutsch | Muttersprache, Englisch | C1, Spanisch | B1"},
            {"key": "language_certificates", "label": "Sprachzertifikate:", "required": False, "multiline": True,
             "helper_text": "Format: Zertifikat | Ausstellungsdatum | Ergebnis\nz.B.: TOEFL | 06/2021 | 105 Punkte"},
            {"key": "professional_certificates", "label": "Berufliche Zertifikate:", "required": False, "multiline": True,
             "helper_text": "Format: Zertifikat | Aussteller | Datum\nz.B.: Certified Scrum Master | Scrum Alliance | 03/2022"},
            {"key": "licenses", "label": "Lizenzen & Berechtigungen:", "required": False, "multiline": True,
             "helper_text": "z.B.: Führerschein Klasse B, Staplerschein"}
        ]
        
        # Tab 6: Zusätzliche Informationen
        additional_fields = [
            {"key": "hobbies", "label": "Hobbys & Interessen:", "required": False, "multiline": True},
            {"key": "volunteering", "label": "Ehrenamtliche Tätigkeiten:", "required": False, "multiline": True},
            {"key": "awards", "label": "Auszeichnungen:", "required": False, "multiline": True},
            {"key": "publications", "label": "Publikationen:", "required": False, "multiline": True},
            {"key": "references", "label": "Referenzen:", "required": False, "multiline": True},
            {"key": "career_goals", "label": "Berufliche Ziele:", "required": False, "multiline": True},
            {"key": "cover_letter_style", "label": "Bevorzugter Anschreibenstil:", "required": False, "multiline": True, 
             "helper_text": "z.B.: förmlich, modern, kreativ, zurückhaltend"},
            {"key": "additional_notes", "label": "Zusätzliche Hinweise:", "required": False, "multiline": True}
        ]
        
        # Funktion zum Erstellen von Formularfeldern in einem Tab
        def create_fields_in_tab(tab, fields):
            # Erstelle einen Canvas mit Scrollbar für diesen Tab
            canvas_frame = ttk.Frame(tab)
            canvas_frame.pack(fill=tk.BOTH, expand=True)
            
            canvas = tk.Canvas(canvas_frame, highlightthickness=1, highlightbackground="#cccccc")
            scrollbar = ttk.Scrollbar(canvas_frame, orient="vertical", command=canvas.yview)
            scrollable_frame = ttk.Frame(canvas)
            
            scrollable_frame.bind(
                "<Configure>",
                lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
            )
            
            canvas.create_window((0, 0), window=scrollable_frame, anchor="nw", width=canvas.winfo_width())
            canvas.configure(yscrollcommand=scrollbar.set)
            
            # Mausrad-Bindung für Scrollen
            def _on_mousewheel(event):
                canvas.yview_scroll(int(-1*(event.delta/120)), "units")
            canvas.bind_all("<MouseWheel>", _on_mousewheel)
            
            # Konfiguriere Canvas-Größe bei Fenstergröße-Änderung
            def resize_canvas(event):
                canvas_width = event.width - scrollbar.winfo_width()
                canvas.itemconfig(1, width=canvas_width)
            canvas.bind("<Configure>", resize_canvas)
            
            canvas.pack(side="left", fill="both", expand=True, padx=(0, 5))
            scrollbar.pack(side="right", fill="y")
            
            # Größere Label-Breite für bessere Ausrichtung
            label_width = 25
            
            # Füge die Felder hinzu
            for field in fields:
                frame = ttk.Frame(scrollable_frame)
                frame.pack(fill=tk.X, pady=8, padx=5)
                
                label = ttk.Label(frame, text=field["label"], width=label_width, anchor="w")
                label.pack(side=tk.LEFT, padx=(0, 10))
                
                # Markiere Pflichtfelder
                if field.get("required", False):
                    label.config(text=field["label"] + " *")
                
                # Hole den aktuellen Wert aus dem Profil
                key = field["key"]
                default_value = ""
                
                # Priorität: 1. "value" aus dem field-Dict, 2. Wert aus profile_data
                if "value" in field:
                    default_value = field["value"]
                elif key in profile_data:
                    default_value = profile_data[key]
                
                # Erstelle entweder ein einzeiliges oder mehrzeiliges Eingabefeld
                if field.get("multiline", False):
                    var = tk.StringVar(value=default_value)
                    self.profile_vars[key] = var
                    
                    text_widget = scrolledtext.ScrolledText(frame, wrap=tk.WORD, height=5, width=50)
                    text_widget.insert("1.0", default_value)
                    text_widget.pack(side=tk.LEFT, fill=tk.X, expand=True)
                    
                    # Speichere Text-Widget für späteren Zugriff
                    self.profile_vars[key + "_widget"] = text_widget
                    
                    # Wenn es einen Hilfetext gibt, füge ihn unter dem Eingabefeld hinzu
                    if "helper_text" in field:
                        helper_frame = ttk.Frame(scrollable_frame)
                        helper_frame.pack(fill=tk.X, pady=(0, 8), padx=5)
                        
                        # Einrückung passend zum Label
                        spacer_label = ttk.Label(helper_frame, text="", width=label_width, anchor="w")
                        spacer_label.pack(side=tk.LEFT, padx=(0, 10))
                        
                        helper_label = ttk.Label(
                            helper_frame,
                            text=field["helper_text"],
                            wraplength=500,
                            foreground="gray",
                            font=("Arial", 8, "italic")
                        )
                        helper_label.pack(side=tk.LEFT, fill=tk.X)
                else:
                    var = tk.StringVar(value=default_value)
                    self.profile_vars[key] = var
                    
                    entry = ttk.Entry(frame, textvariable=var, width=50)
                    entry.pack(side=tk.LEFT, fill=tk.X, expand=True)
        
        # Erstelle Felder für jeden Tab
        create_fields_in_tab(personal_tab, personal_fields)
        create_fields_in_tab(experience_tab, experience_fields)
        create_fields_in_tab(education_tab, education_fields)
        create_fields_in_tab(skills_tab, skills_fields)
        create_fields_in_tab(languages_tab, languages_fields)
        create_fields_in_tab(additional_tab, additional_fields)
        
        # Buttons-Frame
        buttons_frame = ttk.Frame(main_frame)
        buttons_frame.pack(fill=tk.X, pady=(15, 0))
        
        # Speichern-Button
        def save_profile():
            # Validiere Pflichtfelder
            required_keys = ['name', 'street_number', 'postal_city', 'phone', 'email']
            empty_fields = []
            
            for key in required_keys:
                if key in self.profile_vars and not self.profile_vars[key].get().strip():
                    empty_fields.append(key)
            
            if empty_fields:
                # Sammle die Feldbezeichnungen für die Fehlermeldung
                field_labels = []
                all_fields = personal_fields + experience_fields + education_fields + skills_fields + languages_fields + additional_fields
                
                for key in empty_fields:
                    for field in all_fields:
                        if field["key"] == key:
                            field_labels.append(field["label"].replace(":", "").replace(" *", ""))
                            break
                
                error_message = f"Bitte fülle die folgenden Pflichtfelder aus:\n- " + "\n- ".join(field_labels)
                messagebox.showerror("Fehlende Pflichtfelder", error_message)
                
                # Wechsle zur Stammdaten-Tab, da dort die Pflichtfelder sind
                notebook.select(0)
                return
            
            # Sammle alle Daten aus den Eingabefeldern
            saved_profile = {}
            
            for key, var in self.profile_vars.items():
                if key.endswith("_widget"):  # Überspringe die gespeicherten Text-Widgets
                    continue
                
                # Bei mehrzeiligen Feldern, hole den Text aus dem Widget
                if key + "_widget" in self.profile_vars:
                    widget = self.profile_vars[key + "_widget"]
                    value = widget.get("1.0", tk.END).strip()
                else:
                    value = var.get().strip()
                
                saved_profile[key] = value
            
            # Kombiniere Straße, PLZ und Ort zu einer Adresse
            street = saved_profile.get('street_number', '')
            postal_city = saved_profile.get('postal_city', '')
            co = saved_profile.get('co', '')
            
            full_address = ""
            if street:
                full_address += street
            if postal_city:
                if full_address:
                    full_address += ", "
                full_address += postal_city
            if co:
                if full_address:
                    full_address = co + ", " + full_address
                else:
                    full_address = co
            
            saved_profile['address'] = full_address
            
            # Aktualisiere das Bewerberprofil
            self.applicant_profile = saved_profile
            
            # Speichere das Profil
            self.save_applicant_profile(saved_profile)
            
            # Schließe den Dialog
            profile_dialog.destroy()
            
            # Erfolgsmeldung
            messagebox.showinfo("Profil gespeichert", "Dein Bewerberprofil wurde erfolgreich gespeichert.")
        
        # "Speichern"-Button
        save_button = ttk.Button(buttons_frame, text="Speichern", command=save_profile)
        save_button.pack(side=tk.RIGHT, padx=5)
        
        # "Abbrechen"-Button
        cancel_button = ttk.Button(buttons_frame, text="Abbrechen", command=profile_dialog.destroy)
        cancel_button.pack(side=tk.RIGHT, padx=5)
        
        # Wenn Daten extrahiert wurden, zeige einen entsprechenden Hinweis
        if has_extracted_data:
            extract_label = ttk.Label(
                buttons_frame,
                text="Einige Daten wurden automatisch aus deinen Dokumenten extrahiert.",
                foreground="green",
                font=("Arial", 9, "italic")
            )
            extract_label.pack(side=tk.LEFT)
        
        # Starte auf der ersten Tab (Stammdaten)
        notebook.select(0)

    def extract_profile_data_with_ai(self, texts, api_key):
        """
        Extrahiert persönliche Daten aus Texten mit Hilfe der Gemini API
        texts: Liste von Texten (Lebenslauf, Bewerbungsschreiben, etc.)
        api_key: Google Gemini API-Schlüssel
        """
        if not texts or not api_key:
            print("Keine Texte oder API-Schlüssel für KI-Extraktion vorhanden")
            return {}
            
        # Zusammenführen aller Texte für die Analyse
        combined_text = "\n\n".join([text for text in texts if text])
        
        if not combined_text:
            print("Kein Text für die Analyse verfügbar")
            return {}
        
        # Strukturierte Anfrage an die Gemini API
        prompt = f"""
        Analysiere den folgenden Text aus einem Lebenslauf und/oder Bewerbungsschreiben und extrahiere die folgenden persönlichen Daten im JSON-Format:

        Text zur Analyse:
        ```
        {combined_text[:5000]}  # Begrenze die Länge, um API-Limits einzuhalten
        ```

        Extrahiere die folgenden Informationen im JSON-Format:
        - name: vollständiger Name des Bewerbers
        - street_number: Straße und Hausnummer
        - postal_city: Postleitzahl und Stadt
        - co: c/o Information (falls vorhanden, sonst leer)
        - phone: Telefonnummer
        - email: E-Mail-Adresse
        - birthdate: Geburtsdatum (falls vorhanden)
        - profession: Beruf oder aktuelle Position
        - languages: Sprachkenntnisse
        - hobbies: Hobbys oder Interessen
        - skills: Besondere Fähigkeiten oder Kenntnisse
        
        Antworte NUR im JSON-Format ohne zusätzliche Erklärungen. Wenn eine Information nicht gefunden werden kann, setze den Wert auf einen leeren String. Benutze folgendes Format:
        
        {{
          "name": "Max Mustermann",
          "street_number": "Beispielstraße 123",
          "postal_city": "12345 Musterstadt",
          "co": "",
          "phone": "+49 123 4567890",
          "email": "max@example.com",
          "birthdate": "01.01.1990",
          "profession": "Software-Entwickler",
          "languages": "Deutsch (Muttersprache), Englisch (fließend)",
          "hobbies": "Lesen, Wandern, Programmieren",
          "skills": "Python, Java, Projektmanagement"
        }}
        """
        
        # API-Anfrage
        try:
            url = f"https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key={api_key}"
            headers = {"Content-Type": "application/json"}
            data = {
                "contents": [{
                    "parts": [{
                        "text": prompt
                    }]
                }],
                "generationConfig": {
                    "temperature": 0.2,
                    "topP": 0.95,
                    "maxOutputTokens": 1024
                }
            }
            
            print("Sende KI-Anfrage zur Datenextraktion...")
            response = requests.post(url, headers=headers, json=data, timeout=30)
            
            # Debug-Output
            print(f"API-Antwort Status: {response.status_code}")
            
            if response.status_code == 200:
                response_data = response.json()
                
                # Extrahiere die JSON-Antwort
                if "candidates" in response_data and len(response_data["candidates"]) > 0:
                    if "content" in response_data["candidates"][0] and "parts" in response_data["candidates"][0]["content"]:
                        parts = response_data["candidates"][0]["content"]["parts"]
                        if len(parts) > 0 and "text" in parts[0]:
                            result_text = parts[0]["text"].strip()
                            
                            # Versuche, JSON aus dem Text zu extrahieren
                            try:
                                # Entferne alles außer den JSON-Teil (falls vorhanden)
                                json_match = re.search(r'{.*}', result_text, re.DOTALL)
                                if json_match:
                                    json_str = json_match.group(0)
                                    profile_data = json.loads(json_str)
                                    print("Erfolgreich Daten aus KI-Antwort extrahiert:", list(profile_data.keys()))
                                    return profile_data
                            except json.JSONDecodeError as e:
                                print(f"Fehler beim Parsen der JSON-Antwort: {e}")
                                print(f"Erhaltene Antwort: {result_text[:500]}")
        except Exception as e:
            print(f"Fehler bei der KI-Datenextraktion: {e}")
        
        print("KI-Datenextraktion fehlgeschlagen, verwende Fallback-Methode")
        return {}
    
    def extract_profile_data(self, resume_text="", sample_text="", application_text=""):
        """Extrahiere persönliche Daten aus allen verfügbaren Texten (Lebenslauf, Beispiel, generiertes Anschreiben)"""
        # Initialisiere leeres Profil-Wörterbuch oder kopiere bestehendes Profil als Basis
        profile_data = {}
        if self.applicant_profile:
            profile_data = self.applicant_profile.copy()
            print("Vorhandenes Profil geladen:", list(profile_data.keys()))
        
        # Kombiniere alle verfügbaren Texte für die Extraktion
        combined_text = ""
        if resume_text:
            combined_text += resume_text + "\n\n"
            print("Lebenslauf für Extraktion hinzugefügt:", len(resume_text), "Zeichen")
        if sample_text:
            combined_text += sample_text + "\n\n"
            print("Beispielanschreiben für Extraktion hinzugefügt:", len(sample_text), "Zeichen")
        if application_text:
            combined_text += application_text
            print("Generiertes Anschreiben für Extraktion hinzugefügt:", len(application_text), "Zeichen")
            
        if not combined_text:
            print("Keine Textdaten für die Extraktion verfügbar")
            return profile_data
            
        print("Beginne Datenextraktion aus", len(combined_text), "Zeichen")
        
        # Extrahiere Namen - prüfe die erste Zeile und dann ein explizites Namensmuster
        if 'name' not in profile_data:
            # Erste Zeile prüfen (oft der Name)
            lines = combined_text.strip().split('\n')
            if lines and len(lines[0].strip()) < 50 and not re.search(r'\d', lines[0]):
                profile_data['name'] = lines[0].strip()
                print("Name aus erster Zeile extrahiert:", profile_data['name'])
            else:
                # Explizite Namensangabe suchen
                name_patterns = [
                    r'(?:Name|Name:)\s*([^\n]+)', 
                    r'(?:Bewerber|Bewerberin|Kandidat)(?::|.)\s*([^\n]+)'
                ]
                for pattern in name_patterns:
                    match = re.search(pattern, combined_text, re.IGNORECASE)
                    if match:
                        profile_data['name'] = match.group(1).strip()
                        print("Name mit Muster gefunden:", profile_data['name'])
                        break
        
        # Extrahiere E-Mail - suche nach explizitem "Email:" und dann nach E-Mail-Mustern
        if 'email' not in profile_data:
            email_patterns = [
                r'(?:E-Mail|Email|Mail)(?::|.)\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})',
                r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
            ]
            for pattern in email_patterns:
                match = re.search(pattern, combined_text, re.IGNORECASE)
                if match:
                    if len(match.groups()) > 0:
                        profile_data['email'] = match.group(1).strip()
                    else:
                        profile_data['email'] = match.group(0).strip()
                    print("E-Mail gefunden:", profile_data['email'])
                    break
        
        # Extrahiere Telefonnummer - suche nach expliziten Telefonnummern
        if 'phone' not in profile_data:
            phone_patterns = [
                r'(?:Tel(?:efon)?|Mobil|Phone)[.:]\s*([+\d\s\(\)/\-]{5,20})',
                r'(?:\+\d{2}|\(0\))\s*[0-9\s\-\(\)/]{5,20}'
            ]
            for pattern in phone_patterns:
                match = re.search(pattern, combined_text, re.IGNORECASE)
                if match:
                    if len(match.groups()) > 0:
                        profile_data['phone'] = match.group(1).strip()
                    else:
                        profile_data['phone'] = match.group(0).strip()
                    print("Telefonnummer gefunden:", profile_data['phone'])
                    break
        
        # Extrahiere Adresse - suche nach expliziten Adressangaben und nach PLZ-Stadt-Mustern
        if 'address' not in profile_data:
            # Suche nach expliziter Adressangabe
            address_patterns = [
                r'(?:Adresse|Anschrift|Address)(?::|.)\s*([^\n]+(?:\n[^\n]+){0,2})',
                r'(?:\n|\r|\A)(\d{5}\s+[A-Za-zäöüÄÖÜß\s.-]+)(?:\n|\r|\Z)'
            ]
            for pattern in address_patterns:
                match = re.search(pattern, combined_text, re.IGNORECASE | re.DOTALL)
                if match:
                    address = match.group(1).strip()
                    address = re.sub(r'\n+', ', ', address)
                    profile_data['address'] = address
                    print("Adresse gefunden:", profile_data['address'])
                    break
            
        # Extrahiere Geburtsdatum
        if 'birthdate' not in profile_data:
            dob_patterns = [
                r'(?:Geburtsdatum|Geboren|Geb\.|Birth|DOB)(?::|.|\sam)\s*(\d{1,2}[.-]\d{1,2}[.-]\d{2,4}|\d{2,4}[.-]\d{1,2}[.-]\d{1,2})',
                r'(?:\n|\r|\A)(\d{1,2}[.-]\d{1,2}[.-]\d{4})(?:\n|\r|\Z)'
            ]
            for pattern in dob_patterns:
                match = re.search(pattern, combined_text, re.IGNORECASE)
                if match:
                    profile_data['birthdate'] = match.group(1).strip()
                    print("Geburtsdatum gefunden:", profile_data['birthdate'])
                    break
        
        print("Extraktion abgeschlossen. Extrahierte Felder:", list(profile_data.keys()))
        return profile_data

    def browse_resume(self):
        """Öffne Datei-Dialog für Lebenslauf"""
        file_path = filedialog.askopenfilename(
            title="Lebenslauf auswählen",
            filetypes=[
                ("Unterstützte Dateien", "*.pdf;*.docx;*.doc;*.txt"),
                ("PDF-Dateien", "*.pdf"),
                ("Word-Dateien", "*.docx;*.doc"),
                ("Text-Dateien", "*.txt"),
                ("Alle Dateien", "*.*")
            ]
        )
        if file_path:
            self.resume_path_var.set(file_path)
    
    def browse_sample(self):
        """Öffne Datei-Dialog für Beispielbewerbungsschreiben"""
        file_path = filedialog.askopenfilename(
            title="Beispielbewerbungsschreiben auswählen",
            filetypes=[
                ("Unterstützte Dateien", "*.pdf;*.docx;*.doc;*.txt"),
                ("PDF-Dateien", "*.pdf"),
                ("Word-Dateien", "*.docx;*.doc"),
                ("Text-Dateien", "*.txt"),
                ("Alle Dateien", "*.*")
            ]
        )
        if file_path:
            self.sample_path_var.set(file_path)
    
    def validate_inputs(self):
        """Überprüfe, ob alle erforderlichen Eingaben vorhanden sind"""
        resume_path = self.resume_path_var.get().strip()
        sample_path = self.sample_path_var.get().strip()
        job_description = self.job_description_text.get("1.0", tk.END).strip()
        
        # Prüfe, ob API-Schlüssel vorhanden ist
        if not os.getenv("GEMINI_API_KEY"):
            messagebox.showerror(
                "Fehler", 
                "Google Gemini API-Schlüssel nicht gefunden! Bitte klicke auf 'Datei' > 'API-Schlüssel konfigurieren', "
                "um deinen kostenlosen Gemini API-Schlüssel einzurichten. Einen Schlüssel kannst du kostenlos bei https://makersuite.google.com/app/apikey erhalten."
            )
            return False
        
        # Prüfe, ob mindestens ein Dokument oder eine Stellenbeschreibung vorhanden ist
        if not resume_path and not sample_path and not job_description:
            if messagebox.askyesno(
                "Keine Dokumente", 
                "Es wurden keine Dokumente hochgeladen und keine Stellenbeschreibung eingegeben. "
                "Möchtest du mit einer generierten Beispiel-Stellenanzeige fortfahren?"
            ):
                # Generiere eine Beispiel-Stellenanzeige
                example_job = self.generate_example_job_description()
                self.job_description_text.delete("1.0", tk.END)
                self.job_description_text.insert("1.0", example_job)
                return True
            return False
        
        # Warnungen für fehlende Dokumente, aber trotzdem fortfahren
        warnings = []
        
        if not resume_path:
            warnings.append("- Kein Lebenslauf ausgewählt")
        
        if not sample_path:
            warnings.append("- Kein Beispielbewerbungsschreiben ausgewählt")
        
        if not job_description:
            warnings.append("- Keine Stellenbeschreibung eingegeben")
        
        if warnings:
            warning_message = "Folgende Dokumente fehlen:\n\n" + "\n".join(warnings)
            warning_message += "\n\nDie Qualität des generierten Anschreibens könnte beeinträchtigt sein. Möchtest du trotzdem fortfahren?"
            
            if not messagebox.askyesno("Warnung", warning_message):
                return False
        
        return True
    
    def generate_example_job_description(self):
        """Generiert eine Beispiel-Stellenanzeige basierend auf dem Bewerberprofil oder allgemein"""
        # Verwende Bewerberprofil, falls vorhanden
        profile = self.applicant_profile if hasattr(self, 'applicant_profile') and self.applicant_profile else {}
        
        # Extrahiere relevante Informationen aus dem Profil
        position = profile.get('desired_position', '')
        skills = profile.get('skills', '')
        education = profile.get('education', '')
        experience = profile.get('current_position', '')
        
        # Erstelle Prompt für die API
        if position or skills or education or experience:
            # Personalisierte Stellenanzeige basierend auf Profil
            prompt = f"""
            Erstelle eine realistische Stellenanzeige für eine Position, die zum Profil des Bewerbers passt.
            
            Bewerberprofil:
            - Gewünschte Position: {position}
            - Fähigkeiten: {skills}
            - Bildung: {education}
            - Aktuelle Position: {experience}
            
            Die Stellenanzeige sollte folgende Elemente enthalten:
            1. Einen Firmennamen und kurze Firmenbeschreibung
            2. Einen passenden Jobtitel
            3. Eine Beschreibung der Aufgaben und Verantwortlichkeiten
            4. Anforderungen und Qualifikationen
            5. Was das Unternehmen bietet
            6. Informationen zur Bewerbung
            
            Halte die Stellenanzeige realistisch und auf das Profil des Bewerbers zugeschnitten.
            """
        else:
            # Generische Stellenanzeige
            prompt = """
            Erstelle eine realistische Stellenanzeige für eine typische Position im Bereich Büro/Verwaltung.
            
            Die Stellenanzeige sollte folgende Elemente enthalten:
            1. Einen Firmennamen und kurze Firmenbeschreibung
            2. Einen passenden Jobtitel
            3. Eine Beschreibung der Aufgaben und Verantwortlichkeiten
            4. Anforderungen und Qualifikationen
            5. Was das Unternehmen bietet
            6. Informationen zur Bewerbung
            
            Halte die Stellenanzeige realistisch und allgemein genug, dass sie für verschiedene Bewerberprofile passen könnte.
            """
        
        try:
            # API-Aufruf
            api_key = os.getenv("GEMINI_API_KEY")
            self.status_var.set("Generiere Beispiel-Stellenanzeige...")
            result = call_gemini_api(prompt, temperature=0.7, max_tokens=1000)
            self.status_var.set("")
            
            if result and isinstance(result, str) and result.strip():
                return result.strip()
            else:
                # Fallback, wenn API-Aufruf fehlschlägt
                return self._generate_fallback_job_description(position)
        except Exception as e:
            print(f"Fehler bei der Generierung der Beispiel-Stellenanzeige: {str(e)}")
            return self._generate_fallback_job_description(position)
    
    def _generate_fallback_job_description(self, position=""):
        """Generiert eine einfache Beispiel-Stellenanzeige ohne API-Aufruf"""
        if not position:
            position = "Bürokaufmann/Bürokauffrau"
            
        return f"""Musterfirma GmbH
Musterstraße 123
12345 Musterstadt

Stellenanzeige: {position}

Wir sind ein mittelständisches Unternehmen im Bereich [Branche] und suchen zum nächstmöglichen Zeitpunkt Verstärkung für unser Team.

Ihre Aufgaben:
- Allgemeine Büroorganisation und Verwaltungsaufgaben
- Korrespondenz mit Kunden und Geschäftspartnern
- Terminkoordination und Reiseplanung
- Unterstützung der Fachabteilungen

Ihr Profil:
- Abgeschlossene Ausbildung im kaufmännischen Bereich
- Gute MS-Office-Kenntnisse
- Teamfähigkeit und selbstständige Arbeitsweise
- Organisationstalent und Kommunikationsstärke

Wir bieten:
- Einen sicheren Arbeitsplatz in einem wachsenden Unternehmen
- Flexible Arbeitszeiten und attraktive Vergütung
- Angenehmes Arbeitsklima in einem motivierten Team
- Regelmäßige Weiterbildungsmöglichkeiten

Haben wir Ihr Interesse geweckt? Dann freuen wir uns auf Ihre aussagekräftige Bewerbung.

Kontakt:
Musterfirma GmbH
z.Hd. Personalabteilung
E-Mail: bewerbung@musterfirma.de
"""

    def generate_letter_thread(self):
        """Thread-Funktion zum Generieren des Bewerbungsschreibens"""
        try:
            self.status_var.set("Generiere Bewerbungsschreiben... Dies kann einige Minuten dauern.")
            
            # Pfade aus den Eingabefeldern holen und Leerzeichen entfernen
            resume_path = self.resume_path_var.get().strip() if self.resume_path_var.get() else ""
            sample_path = self.sample_path_var.get().strip() if self.sample_path_var.get() else ""
            
            # Initialisiere Text-Variablen
            resume_text = ""
            sample_letter_text = ""
            
            # Lese Lebenslauf-Datei, wenn vorhanden
            if resume_path:
                try:
                    resume_text = extract_text_from_file(resume_path)
                except Exception as e:
                    if DEBUG:
                        print(f"Fehler beim Lesen des Lebenslaufs: {str(e)}")
                    resume_text = self._generate_fallback_resume()
            else:
                # Fallback: Generiere einen einfachen Beispiel-Lebenslauf
                resume_text = self._generate_fallback_resume()
            
            # Lese Beispiel-Anschreiben, wenn vorhanden
            if sample_path:
                try:
                    sample_letter_text = extract_text_from_file(sample_path)
                except Exception as e:
                    if DEBUG:
                        print(f"Fehler beim Lesen des Beispiel-Anschreibens: {str(e)}")
                    sample_letter_text = self._generate_fallback_sample_letter()
            else:
                # Fallback: Generiere ein einfaches Beispiel-Anschreiben
                sample_letter_text = self._generate_fallback_sample_letter()
            
            # Hole den Text der Stellenbeschreibung
            job_description = self.job_description_text.get("1.0", tk.END).strip()
            
            # Wenn keine Stellenbeschreibung eingegeben wurde, generiere eine Beispiel-Stellenbeschreibung
            if not job_description:
                self.status_var.set("Keine Stellenbeschreibung gefunden. Generiere eine Beispiel-Stellenbeschreibung...")
                job_description = self.generate_example_job_description()
                # Aktualisiere das Textfeld mit der generierten Beschreibung
                self.job_description_text.delete("1.0", tk.END)
                self.job_description_text.insert("1.0", job_description)
            
            # Generiere das Anschreiben mit den verfügbaren Texten
            region = self.region_var.get()
            
            # Lade das Bewerberprofil
            applicant_profile = self.load_applicant_profile()
            
            # Generiere das Anschreiben und zeige es an
            letter = generate_application_letter(
                resume_text,
                sample_letter_text,
                job_description,
                region,
                applicant_profile
            )
            
            # Setze den generierten Text im Editor
            self.result_text.set_region(region)
            self.result_text.set_content(letter)
            
            # Update the result frame title to ensure it reflects we're showing a letter
            for child in self.main_frame.winfo_children():
                if isinstance(child, ttk.LabelFrame) and "Generiert" in child.cget('text'):
                    child.config(text="Generiertes Bewerbungsschreiben")
                    break
            
            self.status_var.set("Bewerbungsschreiben erfolgreich generiert.")
        
        except Exception as e:
            self.status_var.set(f"Fehler: {str(e)}")
            messagebox.showerror("Fehler", f"Ein Fehler ist aufgetreten: {str(e)}")
            if DEBUG:
                import traceback
                traceback.print_exc()
    
    def _generate_fallback_resume(self):
        """Generiert einen einfachen Beispiel-Lebenslauf"""
        # Verwende Bewerberprofil, falls vorhanden
        profile = self.applicant_profile if hasattr(self, 'applicant_profile') and self.applicant_profile else {}
        
        name = profile.get('name', 'Max Mustermann')
        address = profile.get('address', 'Musterstraße 123, 12345 Musterstadt')
        phone = profile.get('phone', '0123 / 456789')
        email = profile.get('email', 'max.mustermann@example.com')
        birthdate = profile.get('birthdate', '01.01.1990')
        position = profile.get('current_position', 'Bürokaufmann')
        education = profile.get('education', 'Kaufmännische Ausbildung')
        skills = profile.get('skills', 'MS Office, Teamarbeit, Kommunikation')
        languages = profile.get('languages', 'Deutsch (Muttersprache), Englisch (gut)')
        
        return f"""LEBENSLAUF

PERSÖNLICHE DATEN
Name: {name}
Adresse: {address}
Telefon: {phone}
E-Mail: {email}
Geburtsdatum: {birthdate}

BERUFSERFAHRUNG
seit 2018: {position} bei Beispielfirma GmbH
2015-2018: Sachbearbeiter bei Musterfirma AG
2012-2015: Kaufmännischer Angestellter bei Beispiel & Co. KG

AUSBILDUNG
2010-2012: {education}
2000-2010: Allgemeine Hochschulreife

KENNTNISSE UND FÄHIGKEITEN
Fachkenntnisse: {skills}
Sprachkenntnisse: {languages}

HOBBYS
Lesen, Sport, Reisen
"""
    
    def _generate_fallback_sample_letter(self):
        """Generiert ein einfaches Beispiel-Bewerbungsschreiben"""
        # Verwende Bewerberprofil, falls vorhanden
        profile = self.applicant_profile if hasattr(self, 'applicant_profile') and self.applicant_profile else {}
        
        name = profile.get('name', 'Max Mustermann')
        address = profile.get('address', 'Musterstraße 123\n12345 Musterstadt')
        phone = profile.get('phone', '0123 / 456789')
        email = profile.get('email', 'max.mustermann@example.com')
        
        current_date = time.strftime("%d.%m.%Y")
        
        return f"""{name}
{address}
Tel.: {phone}
E-Mail: {email}

{current_date}

Beispielfirma GmbH
z.Hd. Personalabteilung
Firmenstraße 1
54321 Firmenstadt

Bewerbung als Bürokaufmann

Sehr geehrte Damen und Herren,

mit großem Interesse habe ich Ihre Stellenanzeige gelesen und bewerbe mich hiermit um die ausgeschriebene Position.

Während meiner bisherigen Tätigkeit konnte ich umfangreiche Erfahrungen im Bereich Büroorganisation und Verwaltung sammeln. Zu meinen Aufgaben gehörten unter anderem die Korrespondenz mit Kunden, die Terminkoordination sowie allgemeine administrative Tätigkeiten. Durch meine strukturierte und selbstständige Arbeitsweise konnte ich stets zur Effizienz des Büroablaufs beitragen.

Meine Stärken liegen besonders in der Organisation und Koordination von Abläufen sowie in der Kommunikation mit Kunden und Geschäftspartnern. Ich arbeite gerne im Team, kann aber auch eigenverantwortlich Aufgaben übernehmen und umsetzen.

Gerne überzeuge ich Sie in einem persönlichen Gespräch von meinen Fähigkeiten und meiner Motivation. Ich freue mich auf Ihre Rückmeldung.

Mit freundlichen Grüßen

{name}
"""

    def generate_letter(self):
        """Starte Generierung des Bewerbungsschreibens"""
        if not self.validate_inputs():
            return
        
        # Starte Generierung in einem separaten Thread
        threading.Thread(target=self.generate_letter_thread, daemon=True).start()
    
    def save_letter(self):
        """Speichere das generierte Bewerbungsschreiben"""
        letter_text = self.result_text.get_content()
        
        if not letter_text:
            messagebox.showerror("Fehler", "Es gibt kein Bewerbungsschreiben zum Speichern.")
            return
        
        file_path = filedialog.asksaveasfilename(
            title="Bewerbungsschreiben speichern",
            defaultextension=".txt",
            filetypes=[("Text-Dateien", "*.txt"), ("Alle Dateien", "*.*")]
        )
        
        if file_path:
            try:
                with open(file_path, "w", encoding="utf-8") as f:
                    f.write(letter_text)
                messagebox.showinfo("Erfolg", "Bewerbungsschreiben erfolgreich gespeichert.")
            except Exception as e:
                messagebox.showerror("Fehler", f"Fehler beim Speichern der Datei: {str(e)}")
    
    def show_help(self):
        """Zeige Hilfe-Dialog"""
        help_text = """
        Anleitung zur Verwendung des Bewerbungs-Generators:
        
        1. Lebenslauf auswählen: Wähle deinen Lebenslauf im PDF-, DOCX- oder TXT-Format aus.
        
        2. Beispielbewerbung auswählen: Wähle ein Beispiel eines Bewerbungsschreibens im PDF-, DOCX- oder TXT-Format aus.
        
        3. Stellenbeschreibung einfügen: Kopiere die Stellenbeschreibung in das Textfeld.
        
        4. Region auswählen: Wähle die Region aus, für die du dich bewirbst, um regionale Best Practices zu berücksichtigen.
        
        5. Generieren: Klicke auf "Bewerbungsschreiben generieren" und warte, bis das Bewerbungsschreiben erstellt wurde.
        
        6. Speichern: Klicke auf "Bewerbungsschreiben speichern", um das generierte Bewerbungsschreiben als TXT-Datei zu speichern.
        
        Tipps für bessere Ergebnisse:
        - Stelle sicher, dass dein Lebenslauf aktuell und vollständig ist.
        - Wähle ein Beispielbewerbungsschreiben, das deinem gewünschten Stil entspricht.
        - Kopiere die vollständige Stellenbeschreibung, um alle relevanten Informationen zu erfassen.
        - Überprüfe das generierte Bewerbungsschreiben auf Richtigkeit und passe es bei Bedarf an.
        """
        
        help_window = tk.Toplevel(self.root)
        help_window.title("Anleitung")
        help_window.geometry("600x500")
        
        help_text_widget = scrolledtext.ScrolledText(help_window, wrap=tk.WORD, padding=20)
        help_text_widget.pack(fill=tk.BOTH, expand=True)
        help_text_widget.insert("1.0", help_text)
        help_text_widget.config(state=tk.DISABLED)
    
    def show_about(self):
        """Zeige Info-Dialog"""
        about_text = """
        Bewerbungs-Generator
        
        Eine Python-Anwendung, die mithilfe von KI personalisierte 
        Bewerbungsschreiben erstellt, die auf deinen Lebenslauf, 
        ein Beispielbewerbungsschreiben und die Stellenbeschreibung 
        abgestimmt sind.
        
        © 2023 Bewerbungs-Generator | Powered by Google Gemini
        
        Datenschutz:
        - Deine hochgeladenen Dokumente werden nur für die Generierung des Bewerbungsschreibens verwendet.
        - Die Daten werden nicht gespeichert und nach dem Schließen der App gelöscht.
        - Die Kommunikation mit der Google Gemini API erfolgt verschlüsselt.
        """
        
        messagebox.showinfo("Über", about_text)

    def configure_api_key(self):
        """API-Schlüssel konfigurieren und in .env-Datei speichern"""
        # Erstelle ein neues Top-Level-Fenster
        api_key_window = tk.Toplevel(self.root)
        api_key_window.title("API-Schlüssel konfigurieren")
        api_key_window.geometry("600x450")
        api_key_window.transient(self.root)
        api_key_window.grab_set()  # Modal machen
        
        # Hauptframe
        main_frame = ttk.Frame(api_key_window, padding=20)
        main_frame.pack(fill=tk.BOTH, expand=True)
        
        # Überschrift
        title_label = ttk.Label(main_frame, text="API-Schlüssel konfigurieren", font=("Arial", 14, "bold"))
        title_label.pack(pady=(0, 10))
        
        # Erklärung
        explanation_text = """
        Für den Bewerbungs-Generator benötigst du einen Google Gemini API-Schlüssel.
        Diese Schlüssel sind kostenlos erhältlich und haben ein großzügiges Kostenlimit.
        
        Der API-Schlüssel wird für folgende Funktionen verwendet:
        • Generierung von Bewerbungsschreiben
        • KI-gestützte Analyse und Extraktion deiner persönlichen Daten für das Bewerberprofil
        • Generierung von alternativen Formulierungen
        
        Dein API-Schlüssel wird lokal in einer .env-Datei gespeichert und nicht an Dritte weitergegeben.
        """
        
        explanation_label = ttk.Label(main_frame, text=explanation_text, wraplength=550, justify=tk.LEFT)
        explanation_label.pack(pady=(0, 15), fill=tk.X)
        
        # Link zur Schlüsselgenerierung
        link_label = ttk.Label(
            main_frame, 
            text="Schlüssel kostenlos bei Google MakerSuite erstellen", 
            foreground="blue", 
            cursor="hand2"
        )
        link_label.pack(pady=(0, 15))
        link_label.bind("<Button-1>", lambda e: webbrowser.open_new("https://makersuite.google.com/app/apikey"))
        
        # Bestehenden Schlüssel laden, falls vorhanden
        current_api_key = os.getenv("GEMINI_API_KEY", "")
        
        # Frame für Schlüsseleingabe
        key_frame = ttk.Frame(main_frame)
        key_frame.pack(fill=tk.X, pady=(0, 15))
        
        # Label für Eingabefeld
        key_label = ttk.Label(key_frame, text="API-Schlüssel:", width=15)
        key_label.pack(side=tk.LEFT, padx=(0, 10))
        
        # Eingabefeld für API-Schlüssel
        api_key_var = tk.StringVar(value=current_api_key)
        api_key_entry = ttk.Entry(key_frame, textvariable=api_key_var, width=40, show="*")
        api_key_entry.pack(side=tk.LEFT, fill=tk.X, expand=True)
        
        # Show/Hide Toggle
        show_var = tk.BooleanVar(value=False)
        
        def toggle_show_key():
            if show_var.get():
                api_key_entry.config(show="")
            else:
                api_key_entry.config(show="*")
        
        show_check = ttk.Checkbutton(key_frame, text="Zeigen", variable=show_var, command=toggle_show_key)
        show_check.pack(side=tk.LEFT, padx=(10, 0))
        
        # Test-Button und Status-Label
        test_frame = ttk.Frame(main_frame)
        test_frame.pack(fill=tk.X, pady=(0, 15))
        
        status_var = tk.StringVar()
        status_label = ttk.Label(test_frame, textvariable=status_var, foreground="gray")
        status_label.pack(side=tk.RIGHT)
        
        # Funktion zum Testen des Schlüssels
        def test_api_key():
            key = api_key_var.get().strip()
            if not key:
                status_var.set("Bitte gib einen API-Schlüssel ein")
                return
                
            status_var.set("Teste API-Verbindung...")
            api_key_window.update_idletasks()
            
            try:
                # Einfache Testanfrage an die API
                url = f"https://generativelanguage.googleapis.com/v1/models?key={key}"
                response = requests.get(url, timeout=10)
                
                if response.status_code == 200:
                    status_var.set("✅ API-Verbindung erfolgreich!")
                    return True
                else:
                    error_message = response.json().get("error", {}).get("message", "Unbekannter Fehler")
                    status_var.set(f"❌ Fehler: {error_message}")
                    return False
            except Exception as e:
                status_var.set(f"❌ Fehler: {str(e)}")
                return False
        
        test_button = ttk.Button(test_frame, text="API-Schlüssel testen", command=test_api_key)
        test_button.pack(side=tk.LEFT)
        
        # Informationstext zu KI-Datenextraktion
        extraction_label = ttk.Label(
            main_frame, 
            text="Mit einem gültigen API-Schlüssel kann die App automatisch Daten aus deinen Dokumenten für dein Bewerberprofil extrahieren.",
            wraplength=550,
            foreground="green"
        )
        extraction_label.pack(pady=(0, 15))
        
        # Buttons
        buttons_frame = ttk.Frame(main_frame)
        buttons_frame.pack(fill=tk.X, pady=(10, 0))
        
        def save_api_key():
            key = api_key_var.get().strip()
            
            if not key:
                messagebox.showerror("Fehler", "Bitte gib einen API-Schlüssel ein.")
                return
            
            # Teste den Schlüssel
            status_var.set("Teste API-Verbindung...")
            api_key_window.update_idletasks()
            
            if not test_api_key():
                if not messagebox.askyesno("Warnung", "Der API-Schlüssel konnte nicht verifiziert werden. Möchtest du ihn trotzdem speichern?"):
                    return
            
            # Speichere in .env Datei
            try:
                env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
                
                # Lese bestehende .env Datei, falls vorhanden
                env_vars = {}
                if os.path.exists(env_path):
                    load_dotenv(env_path)
                    with open(env_path, 'r') as f:
                        for line in f:
                            if '=' in line and not line.strip().startswith('#'):
                                key_name, value = line.strip().split('=', 1)
                                env_vars[key_name] = value
                
                # Aktualisiere Variablen
                env_vars["GEMINI_API_KEY"] = key
                
                # Schreibe zurück in .env
                with open(env_path, 'w') as f:
                    for key_name, value in env_vars.items():
                        f.write(f"{key_name}={value}\n")
                
                # Aktualisiere die Umgebungsvariable für die aktuelle Session
                os.environ["GEMINI_API_KEY"] = key
                
                messagebox.showinfo("Erfolg", "API-Schlüssel erfolgreich gespeichert!\n\nDu kannst jetzt die KI-Funktionen nutzen, einschließlich automatischer Datenextraktion für dein Bewerberprofil.")
                api_key_window.destroy()
                
            except Exception as e:
                messagebox.showerror("Fehler", f"Fehler beim Speichern des API-Schlüssels: {str(e)}")
        
        save_button = ttk.Button(buttons_frame, text="Speichern", command=save_api_key)
        save_button.pack(side=tk.RIGHT, padx=5)
        
        cancel_button = ttk.Button(buttons_frame, text="Abbrechen", command=api_key_window.destroy)
        cancel_button.pack(side=tk.RIGHT, padx=5)
    
    def extract_company_name(self, job_description):
        """Versucht, den Firmennamen aus der Stellenbeschreibung zu extrahieren"""
        if not job_description:
            return "Unbekannt"
        
        # Suche nach typischen Firmenangaben
        company_indicators = [
            r"(?:Firma|Unternehmen|company):\s*([A-Za-zäöüÄÖÜß\s&.,-]+?)(?:\n|$)",
            r"(?:bei|at|für)\s+([A-Za-zäöüÄÖÜß\s&.,-]+?)(?:\s+in|\s+suchen|\s+gesucht|$|\n)",
            r"^([A-Za-zäöüÄÖÜß\s&.,-]+?)(?:\s+sucht|\s+such|\s+bietet|$|\n)"
        ]
        
        for pattern in company_indicators:
            match = re.search(pattern, job_description, re.IGNORECASE)
            if match:
                company = match.group(1).strip()
                # Beschränke auf max. 30 Zeichen und entferne ungültige Dateinamen-Zeichen
                company = re.sub(r'[\\/*?:"<>|]', '', company)
                if len(company) > 30:
                    company = company[:30].strip()
                return company
        
        # Wenn kein klarer Firmenname gefunden wurde, nehme die ersten Wörter der Beschreibung
        words = job_description.strip().split()
        if words and len(words) >= 2:
            company = " ".join(words[:2])
            company = re.sub(r'[\\/*?:"<>|]', '', company)
            if len(company) > 30:
                company = company[:30].strip()
            return company
        
        return "Unbekannt"
    
    def save_letter_with_suggested_name(self):
        """Speichere das generierte Bewerbungsschreiben mit vorgeschlagenem Namen"""
        letter_text = self.result_text.get_content()
        
        if not letter_text:
            messagebox.showerror("Fehler", "Es gibt kein Bewerbungsschreiben zum Speichern.")
            return
        
        # Extrahiere Firmennamen aus der Stellenbeschreibung
        job_description = self.job_description_text.get("1.0", tk.END)
        company_name = self.extract_company_name(job_description)
        
        # Aktuelles Datum im Format TT-MM-JJJJ
        current_date = time.strftime("%d-%m-%Y")
        
        # Schlage einen Dateinamen vor
        suggested_filename = f"Bewerbung - {company_name} - {current_date}.txt"
        
        file_path = filedialog.asksaveasfilename(
            title="Bewerbungsschreiben speichern",
            defaultextension=".txt",
            initialfile=suggested_filename,
            filetypes=[("Text-Dateien", "*.txt"), ("Alle Dateien", "*.*")]
        )
        
        if not file_path:
            return
        
        try:
            # Anschreiben speichern
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(letter_text)
            
            # Ausgewählte Dokumente prüfen
            selected_docs = self.get_selected_documents()
            doc_count = sum(len(docs) for docs in selected_docs.values())
            
            # Wenn Dokumente ausgewählt sind, eine Zusammenfassung anzeigen und fragen, ob sie kopiert werden sollen
            if doc_count > 0:
                doc_summary = "Folgende Dokumente wurden ausgewählt:\n\n"
                for doc_type, paths in selected_docs.items():
                    if paths:
                        doc_summary += f"{doc_type}:\n"
                        for path in paths:
                            doc_summary += f"- {os.path.basename(path)}\n"
                        doc_summary += "\n"
                
                doc_summary += "\nMöchten Sie diese Dokumente in denselben Ordner wie das Anschreiben kopieren?"
                
                if messagebox.askyesno("Dokumente anhängen", doc_summary):
                    # Zielverzeichnis
                    target_dir = os.path.dirname(file_path)
                    success_count = 0
                    
                    # Kopiere jedes ausgewählte Dokument
                    for doc_type, paths in selected_docs.items():
                        for path in paths:
                            if os.path.exists(path):
                                try:
                                    # Generiere einen eindeutigen Dateinamen
                                    filename = os.path.basename(path)
                                    base_name, extension = os.path.splitext(filename)
                                    new_filename = f"{company_name}_{doc_type}_{base_name}{extension}"
                                    new_filename = re.sub(r'[\\/*?:"<>|]', "_", new_filename)
                                    
                                    # Prüfe, ob die Datei bereits existiert
                                    target_path = os.path.join(target_dir, new_filename)
                                    counter = 1
                                    while os.path.exists(target_path):
                                        new_filename = f"{company_name}_{doc_type}_{base_name}_{counter}{extension}"
                                        new_filename = re.sub(r'[\\/*?:"<>|]', "_", new_filename)
                                        target_path = os.path.join(target_dir, new_filename)
                                        counter += 1
                                    
                                    # Kopiere die Datei
                                    shutil.copy2(path, target_path)
                                    success_count += 1
                                except Exception as e:
                                    print(f"Fehler beim Kopieren von {path}: {str(e)}")
                    
                    # Zeige Zusammenfassung
                    if success_count > 0:
                        messagebox.showinfo("Dokumente gespeichert", 
                            f"Das Anschreiben und {success_count} Dokumente wurden erfolgreich gespeichert.")
                    else:
                        messagebox.showinfo("Nur Anschreiben gespeichert", 
                            "Das Anschreiben wurde gespeichert, aber die Dokumente konnten nicht kopiert werden.")
            else:
                messagebox.showinfo("Erfolg", "Bewerbungsschreiben erfolgreich gespeichert.")
        except Exception as e:
            messagebox.showerror("Fehler", f"Fehler beim Speichern der Datei: {str(e)}")

    def upload_resume(self):
        """Lädt einen Lebenslauf in den Dokumentenordner hoch"""
        file_path = filedialog.askopenfilename(
            title="Lebenslauf zum Hochladen auswählen",
            filetypes=[
                ("Unterstützte Dateien", "*.pdf;*.docx;*.doc;*.txt"),
                ("PDF-Dateien", "*.pdf"),
                ("Word-Dateien", "*.docx;*.doc"),
                ("Text-Dateien", "*.txt"),
                ("Alle Dateien", "*.*")
            ]
        )
        if not file_path:
            return
            
        # Stelle sicher, dass der Dokumentenordner existiert
        docs_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dokumente", "lebenslaeufe")
        os.makedirs(docs_dir, exist_ok=True)
        
        # Kopiere die Datei in den Dokumentenordner
        filename = os.path.basename(file_path)
        target_path = os.path.join(docs_dir, filename)
        
        # Prüfe auf Namensduplikate
        counter = 1
        base_name, ext = os.path.splitext(filename)
        while os.path.exists(target_path):
            new_filename = f"{base_name}_{counter}{ext}"
            target_path = os.path.join(docs_dir, new_filename)
            counter += 1
            
        try:
            shutil.copy2(file_path, target_path)
            self.resume_path_var.set(target_path)
            messagebox.showinfo("Erfolg", f"Lebenslauf '{os.path.basename(target_path)}' erfolgreich hochgeladen.")
        except Exception as e:
            messagebox.showerror("Fehler", f"Fehler beim Hochladen der Datei: {str(e)}")

    def upload_sample(self):
        """Lädt ein Beispielbewerbungsschreiben in den Dokumentenordner hoch"""
        file_path = filedialog.askopenfilename(
            title="Beispielbewerbungsschreiben zum Hochladen auswählen",
            filetypes=[
                ("Unterstützte Dateien", "*.pdf;*.docx;*.doc;*.txt"),
                ("PDF-Dateien", "*.pdf"),
                ("Word-Dateien", "*.docx;*.doc"),
                ("Text-Dateien", "*.txt"),
                ("Alle Dateien", "*.*")
            ]
        )
        if not file_path:
            return
            
        # Stelle sicher, dass der Dokumentenordner existiert
        docs_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dokumente", "beispielanschreiben")
        os.makedirs(docs_dir, exist_ok=True)
        
        # Kopiere die Datei in den Dokumentenordner
        filename = os.path.basename(file_path)
        target_path = os.path.join(docs_dir, filename)
        
        # Prüfe auf Namensduplikate
        counter = 1
        base_name, ext = os.path.splitext(filename)
        while os.path.exists(target_path):
            new_filename = f"{base_name}_{counter}{ext}"
            target_path = os.path.join(docs_dir, new_filename)
            counter += 1
            
        try:
            shutil.copy2(file_path, target_path)
            self.sample_path_var.set(target_path)
            messagebox.showinfo("Erfolg", f"Beispielbewerbungsschreiben '{os.path.basename(target_path)}' erfolgreich hochgeladen.")
        except Exception as e:
            messagebox.showerror("Fehler", f"Fehler beim Hochladen der Datei: {str(e)}")

    def select_resume(self):
        """Zeigt einen Dialog zum Auswählen eines gespeicherten Lebenslaufs"""
        # Pfad zum Dokumentenordner für Lebensläufe
        docs_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dokumente", "lebenslaeufe")
        
        # Stelle sicher, dass der Ordner existiert
        os.makedirs(docs_dir, exist_ok=True)
        
        # Prüfe, ob Dokumente vorhanden sind
        if not os.path.exists(docs_dir) or not os.listdir(docs_dir):
            messagebox.showinfo("Keine Dokumente", "Es wurden keine gespeicherten Lebensläufe gefunden. Bitte lade zuerst einen Lebenslauf hoch.")
            return
        
        # Erstelle ein Toplevel-Fenster für die Dokumentauswahl
        select_window = tk.Toplevel(self.root)
        select_window.title("Lebenslauf auswählen")
        select_window.geometry("500x400")
        select_window.transient(self.root)
        select_window.grab_set()  # Modal machen
        
        # Hauptframe
        main_frame = ttk.Frame(select_window, padding=10)
        main_frame.pack(fill=tk.BOTH, expand=True)
        
        # Überschrift
        header_label = ttk.Label(main_frame, text="Gespeicherte Lebensläufe", font=("Helvetica", 12, "bold"))
        header_label.pack(pady=(0, 10))
        
        # Frame für Listbox und Scrollbar
        list_frame = ttk.Frame(main_frame)
        list_frame.pack(fill=tk.BOTH, expand=True, pady=(0, 10))
        
        # Scrollbar
        scrollbar = ttk.Scrollbar(list_frame)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        
        # Listbox für Dokumente
        listbox = tk.Listbox(list_frame, yscrollcommand=scrollbar.set, font=("Helvetica", 10))
        listbox.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.config(command=listbox.yview)
        
        # Dokumente aus dem Verzeichnis laden
        files = [f for f in os.listdir(docs_dir) if os.path.isfile(os.path.join(docs_dir, f))]
        for file in sorted(files):
            listbox.insert(tk.END, file)
        
        # Vorschau-Frame
        preview_frame = ttk.LabelFrame(main_frame, text="Vorschau", padding=5)
        preview_frame.pack(fill=tk.BOTH, expand=True, pady=(0, 10))
        
        # Vorschau-Text
        preview_text = scrolledtext.ScrolledText(preview_frame, wrap=tk.WORD, height=10)
        preview_text.pack(fill=tk.BOTH, expand=True)
        preview_text.config(state=tk.DISABLED)
        
        # Funktion zum Anzeigen einer Vorschau
        def show_preview(event):
            selected_indices = listbox.curselection()
            if not selected_indices:
                return
                
            selected_index = selected_indices[0]
            filename = listbox.get(selected_index)
            file_path = os.path.join(docs_dir, filename)
            
            preview_text.config(state=tk.NORMAL)
            preview_text.delete(1.0, tk.END)
            
            if not os.path.exists(file_path):
                preview_text.insert(tk.END, "Datei nicht gefunden.")
                preview_text.config(state=tk.DISABLED)
                return
            
            file_ext = os.path.splitext(filename)[1].lower()
            
            if file_ext == '.pdf' and PDF_SUPPORT:
                try:
                    with open(file_path, 'rb') as f:
                        pdf_reader = PyPDF2.PdfReader(f)
                        text = ""
                        for page_num in range(min(3, len(pdf_reader.pages))):  # Begrenze auf 3 Seiten
                            text += pdf_reader.pages[page_num].extract_text() + "\n\n"
                        if len(pdf_reader.pages) > 3:
                            text += "[...weitere Seiten...]"
                        preview_text.insert(tk.END, text or "Keine Textinhalte gefunden.")
                except Exception as e:
                    preview_text.insert(tk.END, f"Fehler beim Lesen der PDF: {str(e)}")
            elif file_ext in ['.docx', '.doc'] and DOCX_SUPPORT:
                try:
                    text = docx2txt.process(file_path)
                    preview_text.insert(tk.END, text[:2000])  # Begrenze auf 2000 Zeichen
                    if len(text) > 2000:
                        preview_text.insert(tk.END, "\n[...weitere Inhalte...]")
                except Exception as e:
                    preview_text.insert(tk.END, f"Fehler beim Lesen der Word-Datei: {str(e)}")
            elif file_ext in ['.txt', '.text']:
                try:
                    with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
                        text = f.read(2000)  # Begrenze auf 2000 Zeichen
                        preview_text.insert(tk.END, text)
                        if len(text) == 2000:
                            preview_text.insert(tk.END, "\n[...weitere Inhalte...]")
                except Exception as e:
                    preview_text.insert(tk.END, f"Fehler beim Lesen der Textdatei: {str(e)}")
            else:
                preview_text.insert(tk.END, f"Keine Vorschau verfügbar für {file_ext}-Dateien.")
            
            preview_text.config(state=tk.DISABLED)
        
        # Binde Listbox-Auswahl an Vorschau
        listbox.bind('<<ListboxSelect>>', show_preview)
        
        # Buttons-Frame
        buttons_frame = ttk.Frame(main_frame)
        buttons_frame.pack(fill=tk.X, pady=(0, 5))
        
        # Auswählen-Button
        def select_document():
            selected_indices = listbox.curselection()
            if not selected_indices:
                messagebox.showinfo("Hinweis", "Bitte wähle zuerst ein Dokument aus.")
                return
                
            selected_index = selected_indices[0]
            filename = listbox.get(selected_index)
            file_path = os.path.join(docs_dir, filename)
            
            if os.path.exists(file_path):
                self.resume_path_var.set(file_path)
                select_window.destroy()
            else:
                messagebox.showerror("Fehler", "Die ausgewählte Datei existiert nicht mehr.")
        
        select_button = ttk.Button(buttons_frame, text="Auswählen", command=select_document)
        select_button.pack(side=tk.RIGHT, padx=5)
        
        # Abbrechen-Button
        cancel_button = ttk.Button(buttons_frame, text="Abbrechen", command=select_window.destroy)
        cancel_button.pack(side=tk.RIGHT, padx=5)
        
        # Doppelklick zum Auswählen
        listbox.bind('<Double-Button-1>', lambda e: select_document())

    def select_sample(self):
        """Zeigt einen Dialog zum Auswählen eines gespeicherten Beispielbewerbungsschreibens"""
        # Pfad zum Dokumentenordner für Beispielanschreiben
        docs_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dokumente", "beispielanschreiben")
        
        # Stelle sicher, dass der Ordner existiert
        os.makedirs(docs_dir, exist_ok=True)
        
        # Prüfe, ob Dokumente vorhanden sind
        if not os.path.exists(docs_dir) or not os.listdir(docs_dir):
            messagebox.showinfo("Keine Dokumente", "Es wurden keine gespeicherten Beispielanschreiben gefunden. Bitte lade zuerst ein Beispielanschreiben hoch.")
            return
        
        # Erstelle ein Toplevel-Fenster für die Dokumentauswahl
        select_window = tk.Toplevel(self.root)
        select_window.title("Beispielanschreiben auswählen")
        select_window.geometry("500x400")
        select_window.transient(self.root)
        select_window.grab_set()  # Modal machen
        
        # Hauptframe
        main_frame = ttk.Frame(select_window, padding=10)
        main_frame.pack(fill=tk.BOTH, expand=True)
        
        # Überschrift
        header_label = ttk.Label(main_frame, text="Gespeicherte Beispielanschreiben", font=("Helvetica", 12, "bold"))
        header_label.pack(pady=(0, 10))
        
        # Frame für Listbox und Scrollbar
        list_frame = ttk.Frame(main_frame)
        list_frame.pack(fill=tk.BOTH, expand=True, pady=(0, 10))
        
        # Scrollbar
        scrollbar = ttk.Scrollbar(list_frame)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        
        # Listbox für Dokumente
        listbox = tk.Listbox(list_frame, yscrollcommand=scrollbar.set, font=("Helvetica", 10))
        listbox.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.config(command=listbox.yview)
        
        # Dokumente aus dem Verzeichnis laden
        files = [f for f in os.listdir(docs_dir) if os.path.isfile(os.path.join(docs_dir, f))]
        for file in sorted(files):
            listbox.insert(tk.END, file)
        
        # Vorschau-Frame
        preview_frame = ttk.LabelFrame(main_frame, text="Vorschau", padding=5)
        preview_frame.pack(fill=tk.BOTH, expand=True, pady=(0, 10))
        
        # Vorschau-Text
        preview_text = scrolledtext.ScrolledText(preview_frame, wrap=tk.WORD, height=10)
        preview_text.pack(fill=tk.BOTH, expand=True)
        preview_text.config(state=tk.DISABLED)
        
        # Funktion zum Anzeigen einer Vorschau
        def show_preview(event):
            selected_indices = listbox.curselection()
            if not selected_indices:
                return
                
            selected_index = selected_indices[0]
            filename = listbox.get(selected_index)
            file_path = os.path.join(docs_dir, filename)
            
            preview_text.config(state=tk.NORMAL)
            preview_text.delete(1.0, tk.END)
            
            if not os.path.exists(file_path):
                preview_text.insert(tk.END, "Datei nicht gefunden.")
                preview_text.config(state=tk.DISABLED)
                return
            
            file_ext = os.path.splitext(filename)[1].lower()
            
            if file_ext == '.pdf' and PDF_SUPPORT:
                try:
                    with open(file_path, 'rb') as f:
                        pdf_reader = PyPDF2.PdfReader(f)
                        text = ""
                        for page_num in range(min(3, len(pdf_reader.pages))):  # Begrenze auf 3 Seiten
                            text += pdf_reader.pages[page_num].extract_text() + "\n\n"
                        if len(pdf_reader.pages) > 3:
                            text += "[...weitere Seiten...]"
                        preview_text.insert(tk.END, text or "Keine Textinhalte gefunden.")
                except Exception as e:
                    preview_text.insert(tk.END, f"Fehler beim Lesen der PDF: {str(e)}")
            elif file_ext in ['.docx', '.doc'] and DOCX_SUPPORT:
                try:
                    text = docx2txt.process(file_path)
                    preview_text.insert(tk.END, text[:2000])  # Begrenze auf 2000 Zeichen
                    if len(text) > 2000:
                        preview_text.insert(tk.END, "\n[...weitere Inhalte...]")
                except Exception as e:
                    preview_text.insert(tk.END, f"Fehler beim Lesen der Word-Datei: {str(e)}")
            elif file_ext in ['.txt', '.text']:
                try:
                    with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
                        text = f.read(2000)  # Begrenze auf 2000 Zeichen
                        preview_text.insert(tk.END, text)
                        if len(text) == 2000:
                            preview_text.insert(tk.END, "\n[...weitere Inhalte...]")
                except Exception as e:
                    preview_text.insert(tk.END, f"Fehler beim Lesen der Textdatei: {str(e)}")
            else:
                preview_text.insert(tk.END, f"Keine Vorschau verfügbar für {file_ext}-Dateien.")
            
            preview_text.config(state=tk.DISABLED)
        
        # Binde Listbox-Auswahl an Vorschau
        listbox.bind('<<ListboxSelect>>', show_preview)
        
        # Buttons-Frame
        buttons_frame = ttk.Frame(main_frame)
        buttons_frame.pack(fill=tk.X, pady=(0, 5))
        
        # Auswählen-Button
        def select_document():
            selected_indices = listbox.curselection()
            if not selected_indices:
                messagebox.showinfo("Hinweis", "Bitte wähle zuerst ein Dokument aus.")
                return
                
            selected_index = selected_indices[0]
            filename = listbox.get(selected_index)
            file_path = os.path.join(docs_dir, filename)
            
            if os.path.exists(file_path):
                self.sample_path_var.set(file_path)
                select_window.destroy()
            else:
                messagebox.showerror("Fehler", "Die ausgewählte Datei existiert nicht mehr.")
        
        select_button = ttk.Button(buttons_frame, text="Auswählen", command=select_document)
        select_button.pack(side=tk.RIGHT, padx=5)
        
        # Abbrechen-Button
        cancel_button = ttk.Button(buttons_frame, text="Abbrechen", command=select_window.destroy)
        cancel_button.pack(side=tk.RIGHT, padx=5)
        
        # Doppelklick zum Auswählen
        listbox.bind('<Double-Button-1>', lambda e: select_document())

    def generate_resume(self):
        """Generates a professional resume tailored to the job description using the Google Gemini API"""
        try:
            # Check for API key
            api_key = os.getenv("GEMINI_API_KEY")
            if not api_key:
                messagebox.showerror("Fehler", "API-Schlüssel nicht konfiguriert. Bitte konfigurieren Sie zuerst den API-Schlüssel unter Datei > API-Schlüssel konfigurieren.")
                return
            
            # Load or create profile data
            if not hasattr(self, 'applicant_profile') or not self.applicant_profile:
                self.applicant_profile = self.load_applicant_profile() or {}
            
            profile = self.applicant_profile
            
            # Get job description from the text field
            job_description = self.job_description_text.get("1.0", tk.END).strip()
            
            # If no job description is provided, generate a sample one
            if not job_description:
                self.status_var.set("Keine Stellenbeschreibung gefunden. Generiere eine Beispiel-Stellenbeschreibung...")
                job_description = self.generate_example_job_description()
                # Update the text field with the generated description
                self.job_description_text.delete("1.0", tk.END)
                self.job_description_text.insert("1.0", job_description)
            
            # Get paths from the input fields and remove whitespace
            resume_path = self.resume_path_var.get().strip() if hasattr(self, 'resume_path_var') and self.resume_path_var.get() else ""
            sample_path = self.sample_path_var.get().strip() if hasattr(self, 'sample_path_var') and self.sample_path_var.get() else ""
            
            # Initialize text variables
            resume_text = ""
            sample_letter_text = ""
            
            # Read resume file if available
            if resume_path:
                try:
                    resume_text = extract_text_from_file(resume_path)
                except Exception as e:
                    if DEBUG:
                        print(f"Fehler beim Lesen des Lebenslaufs: {str(e)}")
                    resume_text = self._generate_fallback_resume()
            else:
                # Fallback: Generate a simple example resume
                resume_text = self._generate_fallback_resume()
            
            # Get the region
            region = self.region_var.get()
            
            # Create a more comprehensive prompt for the API that takes into account the job description
            prompt = f"""
            Erstelle einen auf die Stellenausschreibung zugeschnittenen professionellen deutschen Lebenslauf basierend auf den folgenden Informationen:
            
            STELLENBESCHREIBUNG:
            {job_description}
            
            VORHANDENER LEBENSLAUF (falls vorhanden):
            {resume_text}
            
            PERSÖNLICHE DATEN:
            Name: {profile.get('name', 'Max Mustermann')}
            Straße, Hausnummer: {profile.get('street_number', 'Musterstraße 123')}
            PLZ, Ort: {profile.get('postal_city', '12345 Musterstadt')}
            {f"c/o: {profile.get('co')}" if profile.get('co') else ''}
            Telefon: {profile.get('phone', '0123 / 456789')}
            E-Mail: {profile.get('email', 'max.mustermann@example.com')}
            Geburtsdatum: {profile.get('birthdate', '01.01.1990')}
            Geburtsort: {profile.get('birthplace', '')}
            Staatsangehörigkeit: {profile.get('nationality', 'Deutsch')}
            Familienstand: {profile.get('marital_status', '')}
            
            BERUFSERFAHRUNG:
            Aktuelle Position: {profile.get('current_position', '')}
            Aktueller Arbeitgeber: {profile.get('current_employer', '')}
            
            AUSBILDUNG:
            Höchster Bildungsabschluss: {profile.get('education', '')}
            
            KENNTNISSE UND FÄHIGKEITEN:
            Fachkenntnisse: {profile.get('skills', '')}
            
            SPRACHKENNTNISSE:
            {profile.get('languages', 'Deutsch (Muttersprache)')}
            
            INTERESSEN/HOBBYS:
            {profile.get('interests', '')}
            
            WEITERE INFORMATIONEN:
            Frühester Eintrittstermin: {profile.get('earliest_start_date', '')}
            Gehaltsvorstellung: {profile.get('salary_expectation', '')}
            Kündigungsfrist: {profile.get('notice_period', '')}
            Umzugsbereitschaft: {profile.get('willingness_to_relocate', '')}
            
            ANWEISUNGEN:
            1. Erstelle einen vollständigen deutschen Lebenslauf nach modernen Standards.
            2. WICHTIG: Passe den Lebenslauf an die oben stehende Stellenausschreibung an. Hebe relevante Fähigkeiten und Erfahrungen hervor, die für die Stelle wichtig sind.
            3. Strukturiere den Lebenslauf mit folgenden Abschnitten:
               - Persönliche Daten (Name, Adresse, Kontakt, Geburtsdatum, Staatsangehörigkeit, etc.)
               - Beruflicher Werdegang (chronologisch, neueste Erfahrung zuerst)
               - Ausbildung (chronologisch, neueste zuerst)
               - Kenntnisse und Fähigkeiten (strukturiert nach Kategorien und nach Relevanz für die Stellenausschreibung)
               - Sprachkenntnisse (mit Kompetenzniveau)
               - Interessen/Hobbys (falls angegeben und relevant)
               - Ort, Datum und Unterschrift am Ende
            4. Optimiere den Inhalt, um ihn für die ausgeschriebene Position attraktiv zu machen.
            5. Füge keine falschen oder erfundenen Informationen hinzu. Wenn Daten fehlen, lasse den entsprechenden Abschnitt knapp oder weg.
            6. Achte auf professionelle Formulierungen, die in {region} üblich sind.
            7. Fokussiere dich auf die Aspekte aus dem Profil und dem vorhandenen Lebenslauf, die am besten zur Stellenbeschreibung passen.
            """
            
            # Update status
            self.status_var.set("Generiere Lebenslauf angepasst an die Stellenbeschreibung... Dies kann einige Minuten dauern.")
            self.root.update_idletasks()  # Force UI update
            
            # Call the Gemini API
            generated_resume = call_gemini_api(prompt, temperature=0.3, max_tokens=2500)
            
            if not generated_resume:
                raise Exception("Keine Antwort vom API-Dienst erhalten.")
            
            # Display the generated resume
            self.result_text.set_region(region)
            self.result_text.set_content(generated_resume)
            self.status_var.set("Stellenspezifischer Lebenslauf erfolgreich generiert.")
            
            # Update the result frame title
            for child in self.main_frame.winfo_children():
                if isinstance(child, ttk.LabelFrame) and child.cget('text') == "Generiertes Bewerbungsschreiben":
                    child.config(text="Generierter Lebenslauf")
                    break
            
        except Exception as e:
            self.status_var.set(f"Fehler: {str(e)}")
            messagebox.showerror("Fehler", f"Ein Fehler ist aufgetreten: {str(e)}")
            if DEBUG:
                import traceback
                traceback.print_exc()

    def save_resume(self):
        """Speichert den generierten Lebenslauf"""
        resume_text = self.result_text.get_content()
        
        if not resume_text:
            messagebox.showerror("Fehler", "Es gibt keinen Lebenslauf zum Speichern.")
            return
        
        # Standard-Dateipfad mit aktuellem Datum
        default_filename = f"Lebenslauf_{time.strftime('%Y-%m-%d')}.txt"
        
        # Dialog zum Speichern
        file_path = filedialog.asksaveasfilename(
            defaultextension=".txt",
            filetypes=[
                ("Textdateien", "*.txt"),
                ("Alle Dateien", "*.*")
            ],
            initialfile=default_filename
        )
        
        if file_path:
            try:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(resume_text)
                messagebox.showinfo("Erfolg", f"Lebenslauf wurde gespeichert unter:\n{file_path}")
            except Exception as e:
                messagebox.showerror("Fehler", f"Fehler beim Speichern: {str(e)}")

    def _extract_job_keywords(self, job_description, api_key):
        """Extrahiert wichtige Schlüsselwörter und Qualifikationen aus der Stellenbeschreibung"""
        try:
            # Wenn keine Stellenbeschreibung vorhanden ist
            if not job_description or len(job_description.strip()) < 50:
                return []
            
            # Prompt für die Keyword-Extraktion
            keyword_prompt = f"""
            Extrahiere die 15 wichtigsten Schlüsselwörter (Skills, Technologien, Fachbegriffe, 
            Qualifikationen, Soft Skills) aus dieser Stellenbeschreibung, sortiert nach Relevanz:

            {job_description}

            Antworte nur mit einer durch Komma getrennten Liste ohne zusätzlichen Text.
            Format: Schlüsselwort1, Schlüsselwort2, Schlüsselwort3, ...
            """
            
            # API-Anfrage für Keyword-Extraktion mit niedriger Temperatur für Präzision
            result = call_gemini_api(keyword_prompt, temperature=0.1, max_tokens=150)
            
            if result:
                # Bereinige das Ergebnis und teile es in eine Liste auf
                keywords = [kw.strip() for kw in result.split(',') if kw.strip()]
                if DEBUG:
                    print(f"Extrahierte Keywords: {keywords}")
                return keywords
            
            return []
        except Exception as e:
            if DEBUG:
                print(f"Fehler bei der Keyword-Extraktion: {str(e)}")
            return []

    def _analyze_resume_with_ai(self, documents_text, api_key):
        """Analysiert Bewerbungsdokumente mit KI und extrahiert strukturierte Informationen im JSON-Format"""
        try:
            if DEBUG:
                print("====== DOKUMENT-ANALYSE GESTARTET ======")
                print(f"Zu analysierende Dokumente: {len(documents_text.split('---'))}")
            
            # Prompt für die strukturierte Datenextraktion mit detaillierteren Anweisungen
            extraction_prompt = f"""
            Analysiere die folgenden Dokumente gründlich und extrahiere alle relevanten Informationen im strukturierten JSON-Format.
            Dies ist äußerst wichtig für die Lebenslauferstellung.
            
            DOKUMENTE:
            {documents_text}
            
            WICHTIGE ANWEISUNGEN:
            1. Extrahiere detaillierte und konkrete Informationen
            2. Verwende exakt die Berufsbezeichnungen, Firmennamen, usw. wie im Dokument angegeben
            3. Bei Daten, achte auf das Format MM/YYYY für Zeiträume
            4. Fülle so viele Felder wie möglich aus, auch wenn du nur Teilinformationen findest
            5. Vermeide Platzhalter wie "Firma", "Position" etc. - verwende echte Daten oder leere Strings
            6. Bei widersprüchlichen Infos bevorzuge die aktuellsten
            7. Erfinde KEINE Daten - nutze nur Informationen aus den Dokumenten
            
            Extrahiere exakt folgende Informationen im spezifizierten Format:
            {{
              "personalData": {{
                "name": "Vollständiger Name (Vorname Nachname)",
                "address": "Vollständige Adresse mit Straße, PLZ und Ort",
                "phone": "Telefonnummer",
                "email": "E-Mail-Adresse",
                "birthDate": "Geburtsdatum im Format TT.MM.YYYY",
                "birthPlace": "Geburtsort",
                "nationality": "Nationalität"
              }},
              "workExperience": [
                {{
                  "period": "MM/YYYY - MM/YYYY oder MM/YYYY - heute",
                  "position": "Genaue Berufsbezeichnung/Position",
                  "company": "Name des Unternehmens",
                  "location": "Ort des Unternehmens",
                  "responsibilities": ["Konkrete Verantwortung/Tätigkeit 1", "Konkrete Verantwortung/Tätigkeit 2"],
                  "achievements": ["Konkreter Erfolg/Leistung 1", "Konkreter Erfolg/Leistung 2"]
                }}
              ],
              "education": [
                {{
                  "period": "MM/YYYY - MM/YYYY",
                  "degree": "Art des Abschlusses",
                  "institution": "Name der Bildungseinrichtung",
                  "location": "Ort der Bildungseinrichtung",
                  "focus": "Fachrichtung/Schwerpunkte",
                  "grade": "Note oder Bewertung (falls angegeben)"
                }}
              ],
              "skills": {{
                "technical": ["Technische Fähigkeit 1", "Technische Fähigkeit 2"],
                "methodical": ["Methodische Kompetenz 1", "Methodische Kompetenz 2"],
                "social": ["Soziale Kompetenz 1", "Soziale Kompetenz 2"]
              }},
              "languages": [
                {{
                  "language": "Sprache",
                  "level": "Niveau (z.B. Muttersprache, fließend, gut, Grundkenntnisse oder CEFR-Niveau A1-C2)",
                  "certificates": "Zertifikate, falls vorhanden"
                }}
              ],
              "certifications": [
                {{
                  "date": "MM/YYYY oder YYYY",
                  "title": "Titel des Zertifikats",
                  "issuer": "Ausstellende Organisation"
                }}
              ],
              "interests": ["Konkretes Interesse/Hobby 1", "Konkretes Interesse/Hobby 2"]
            }}
            
            WICHTIG: Gib NUR das JSON-Objekt zurück, ohne weitere Erklärungen oder Text. Deine Antwort muss mit '{{' beginnen und mit '}}' enden.
            """
            
            if DEBUG:
                print("Sende Extraktionsprompt an die API...")
            
            # API-Anfrage für Extraktion mit niedriger Temperatur für Präzision
            result = call_gemini_api(extraction_prompt, temperature=0.1, max_tokens=2000)
            
            if DEBUG:
                print("API-Antwort erhalten.")
                if result:
                    print(f"Antwortlänge: {len(result)} Zeichen")
                    print(f"Antwort beginnt mit: {result[:100]}...")
                else:
                    print("Keine Antwort erhalten!")
            
            # Versuche, JSON aus dem Text zu extrahieren und zu parsen
            if result:
                try:
                    # Entferne zunächst mögliche Codeblock-Marker (```json, ```)
                    result = re.sub(r'```json\s*', '', result)
                    result = re.sub(r'```\s*', '', result)
                    
                    # Suche nach dem JSON-Teil im Text
                    json_match = re.search(r'(\{[\s\S]*\})', result, re.DOTALL)
                    if json_match:
                        json_text = json_match.group(1)
                        if DEBUG:
                            print(f"JSON-Text gefunden. Länge: {len(json_text)} Zeichen")
                            print(f"JSON beginnt mit: {json_text[:100]}...")
                        
                        # Entferne eventuelle führende und nachfolgende Anführungszeichen
                        json_text = json_text.strip().strip('"\'')
                        
                        # Parse das JSON
                        try:
                            extracted_data = json.loads(json_text)
                            if DEBUG:
                                print("JSON erfolgreich geparst.")
                                print(f"Extrahierte Daten: {len(extracted_data)} Hauptkategorien")
                                for key in extracted_data:
                                    print(f"- {key}: {type(extracted_data[key])}")
                            return extracted_data
                        except json.JSONDecodeError as e:
                            if DEBUG:
                                print(f"Fehler beim ersten JSON-Parsing-Versuch: {str(e)}")
                            
                            # Versuche JSON mit Ersetzung zu bereinigen
                            json_text = json_text.replace("\\'", "'").replace('\\"', '"')
                            try:
                                extracted_data = json.loads(json_text)
                                if DEBUG:
                                    print("JSON nach Bereinigung erfolgreich geparst.")
                                return extracted_data
                            except json.JSONDecodeError as e2:
                                if DEBUG:
                                    print(f"Fehler beim zweiten JSON-Parsing-Versuch: {str(e2)}")
                    else:
                        if DEBUG:
                            print("Kein JSON-Block mit {} gefunden.")
                    
                    # Letzter Versuch: Entferne alles außer dem Teil, der wie JSON aussieht
                    try:
                        # Entferne alles vor dem ersten { und nach dem letzten }
                        clean_result = re.sub(r'^[^{]*', '', result)
                        clean_result = re.sub(r'}[^}]*$', '}', clean_result)
                        
                        if DEBUG:
                            print("Versuche bereinigtes JSON zu parsen...")
                            print(f"Bereinigtes JSON beginnt mit: {clean_result[:100]}...")
                        
                        extracted_data = json.loads(clean_result)
                        if DEBUG:
                            print("Bereinigtes JSON erfolgreich geparst.")
                        return extracted_data
                    except (json.JSONDecodeError, Exception) as e:
                        if DEBUG:
                            print(f"Alle JSON-Parsing-Versuche fehlgeschlagen: {str(e)}")
                            print("Versuche als letzten Ausweg, die API direkt nach dem JSON zu fragen...")
                        
                        # Als letzten Ausweg, frage explizit nach dem JSON in einem simplen Format
                        retry_prompt = f"""
                        Basierend auf meiner vorherigen Anfrage, gib bitte nur das JSON-Objekt aus, ohne weitere Erklärungen.
                        Beginne deine Antwort mit "{{" und ende mit "}}". 
                        Stelle sicher, dass es valides JSON ist, das geparst werden kann.
                        """
                        
                        retry_result = call_gemini_api(retry_prompt, temperature=0.1, max_tokens=2000)
                        
                        if retry_result:
                            try:
                                # Suche nochmal nach dem JSON und parse es
                                retry_match = re.search(r'(\{[\s\S]*\})', retry_result, re.DOTALL)
                                if retry_match:
                                    retry_json = retry_match.group(1)
                                    extracted_data = json.loads(retry_json)
                                    if DEBUG:
                                        print("JSON aus dem zweiten Versuch erfolgreich geparst.")
                                    return extracted_data
                            except Exception as e:
                                if DEBUG:
                                    print(f"Auch der letzte Versuch fehlgeschlagen: {str(e)}")
                
                except Exception as e:
                    if DEBUG:
                        print(f"Allgemeiner Fehler bei der JSON-Verarbeitung: {str(e)}")
            
            if DEBUG:
                print("Konnte keine strukturierten Daten extrahieren. Verwende leeres Objekt.")
            return {}
        except Exception as e:
            if DEBUG:
                print(f"Kritischer Fehler bei der KI-Analyse der Dokumente: {str(e)}")
                import traceback
                traceback.print_exc()
            return {}

    def generate_resume(self):
        """Generiert einen tabellarischen Lebenslauf basierend auf allen verfügbaren Dokumenten"""
        try:
            # API-Schlüssel prüfen
            api_key = os.getenv("GEMINI_API_KEY")
            if not api_key:
                messagebox.showerror("Fehler", "API-Schlüssel nicht konfiguriert. Bitte konfigurieren Sie zuerst den API-Schlüssel unter Datei > API-Schlüssel konfigurieren.")
                return
            
            # Stellenbeschreibung aus dem Textfeld holen
            job_description = self.job_description_text.get("1.0", tk.END).strip()
            
            # Wenn keine Stellenbeschreibung vorhanden ist, erstelle eine Beispielbeschreibung
            if not job_description:
                self.status_var.set("Keine Stellenbeschreibung gefunden. Generiere eine Beispiel-Stellenbeschreibung...")
                job_description = self.generate_example_job_description()
                self.job_description_text.delete("1.0", tk.END)
                self.job_description_text.insert("1.0", job_description)
            
            # Bewerberprofil laden
            if not hasattr(self, 'applicant_profile') or not self.applicant_profile:
                self.applicant_profile = self.load_applicant_profile() or {}
            profile = self.applicant_profile
            
            # Status aktualisieren
            self.status_var.set("Sammle alle Dokumente zur Analyse...")
            self.root.update_idletasks()
            
            # Sammle Texte aus allen verfügbaren Dokumenten
            document_texts = {}
            
            # 1. Hochgeladene Dokumente prüfen
            if hasattr(self, 'resume_path_var') and self.resume_path_var.get().strip():
                try:
                    resume_path = self.resume_path_var.get().strip()
                    document_texts["Hochgeladener Lebenslauf"] = extract_text_from_file(resume_path)
                    self.status_var.set("Hochgeladener Lebenslauf gefunden und wird analysiert...")
                except Exception as e:
                    if DEBUG:
                        print(f"Fehler beim Lesen des hochgeladenen Lebenslaufs: {str(e)}")
            
            if hasattr(self, 'sample_path_var') and self.sample_path_var.get().strip():
                try:
                    sample_path = self.sample_path_var.get().strip()
                    document_texts["Hochgeladenes Anschreiben"] = extract_text_from_file(sample_path)
                    self.status_var.set("Hochgeladenes Anschreiben gefunden und wird analysiert...")
                except Exception as e:
                    if DEBUG:
                        print(f"Fehler beim Lesen des hochgeladenen Anschreibens: {str(e)}")
            
            # 2. Gespeicherte Dokumente in allen Kategorien prüfen
            doc_categories = {
                "lebenslaeufe": "Gespeicherter Lebenslauf",
                "zeugnisse": "Zeugnis", 
                "arbeitszeugnisse": "Arbeitszeugnis",
                "sonstiges": "Sonstiges Dokument"
            }
            
            base_doc_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dokumente")
            
            for category, label in doc_categories.items():
                category_dir = os.path.join(base_doc_dir, category)
                if os.path.exists(category_dir):
                    try:
                        files = [f for f in os.listdir(category_dir) if os.path.isfile(os.path.join(category_dir, f))]
                        
                        # Sortiere nach Änderungsdatum (neueste zuerst)
                        files.sort(key=lambda x: os.path.getmtime(os.path.join(category_dir, x)), reverse=True)
                        
                        # Extrahiere Text aus den ersten 3 Dateien jeder Kategorie (um Überlastung zu vermeiden)
                        for i, file in enumerate(files[:3]):
                            try:
                                file_path = os.path.join(category_dir, file)
                                document_texts[f"{label} {i+1} ({file})"] = extract_text_from_file(file_path)
                                self.status_var.set(f"Analysiere {file}...")
                            except Exception as e:
                                if DEBUG:
                                    print(f"Fehler beim Lesen von {file}: {str(e)}")
                    except Exception as e:
                        if DEBUG:
                            print(f"Fehler beim Durchsuchen des Verzeichnisses {category}: {str(e)}")
            
            # Wenn keine Dokumente gefunden wurden, auf Profildaten zurückgreifen
            if not document_texts:
                self.status_var.set("Keine Dokumente gefunden. Verwende nur Profildaten...")
                # Erstelle minimalen Text aus Profildaten
                profile_text = ""
                for key, value in profile.items():
                    if value:
                        profile_text += f"{key}: {value}\n"
                if profile_text:
                    document_texts["Profildaten"] = profile_text
            
            # Region holen
            region = self.region_var.get()
            
            # Kombiniere alle Texte für die Analyse
            combined_analysis_text = ""
            for source, text in document_texts.items():
                combined_analysis_text += f"\n--- DOKUMENT: {source} ---\n{text}\n\n"
            
            # Status aktualisieren
            self.status_var.set("Extrahiere wichtige Schlüsselwörter aus der Stellenbeschreibung...")
            self.root.update_idletasks()
            
            # Schlüsselwörter aus der Stellenbeschreibung extrahieren
            job_keywords = self._extract_job_keywords(job_description, api_key)
            
            # Status aktualisieren
            self.status_var.set("Analysiere alle Dokumente mit KI... Dies kann einige Minuten dauern.")
            self.root.update_idletasks()
            
            # Strukturierte Datenextraktion durchführen
            try:
                extracted_data = self._analyze_resume_with_ai(combined_analysis_text, api_key)
            except AttributeError:
                # Fallback falls _analyze_resume_with_ai nicht implementiert ist
                extracted_data = {}
                if DEBUG:
                    print("Methode _analyze_resume_with_ai nicht gefunden. Verwende Rohdaten.")
            
            # Formuliere Keywords als Anweisung
            keywords_instruction = ""
            if job_keywords:
                keywords_instruction = f"""
                SCHLÜSSELQUALIFIKATIONEN FÜR DIE STELLE:
                Die folgenden Schlüsselwörter wurden aus der Stellenbeschreibung extrahiert und sollten
                gezielt im Lebenslauf hervorgehoben werden (sortiert nach Relevanz):
                {', '.join(job_keywords)}
                
                WICHTIG: 
                - Hebe diese Schlüsselwörter deutlich im Lebenslauf hervor, wenn entsprechende Qualifikationen vorhanden sind.
                - Verwende exakt die gleichen Begriffe wie in der Stellenbeschreibung, um ATS-Kompatibilität zu gewährleisten.
                - Integriere die Schlüsselwörter besonders in der Aufzählung von Verantwortlichkeiten und Fähigkeiten.
                """
            
            # Prompt für die Erstellung des tabellarischen Lebenslaufs
            resume_prompt = f"""
            Erstelle einen professionellen tabellarischen Lebenslauf basierend auf den folgenden extrahierten Daten.
            Der Lebenslauf soll gezielt auf die unten angegebene Stellenbeschreibung zugeschnitten sein.
            
            EXTRAHIERTE DATEN:
            {json.dumps(extracted_data, ensure_ascii=False, indent=2) if extracted_data else "Keine strukturierten Daten verfügbar. Verwende die Quelldokumente direkt."}
            
            QUELLDOKUMENTE:
            {combined_analysis_text}
            
            STELLENBESCHREIBUNG:
            {job_description}
            
            {keywords_instruction}
            
            DEUTSCHE STANDARDS FÜR EINEN TABELLARISCHEN LEBENSLAUF:
            - Titel "Lebenslauf" zentriert oben
            - Klare Struktur mit deutlichen Abschnitten
            - Persönliche Daten oben (ohne "Familienstand" und "Religionszugehörigkeit", da nicht mehr zeitgemäß)
            - Beruflicher Werdegang in umgekehrt chronologischer Reihenfolge (neueste zuerst)
            - Tabellarische Darstellung mit klaren Zeiträumen links (Monat/Jahr bis Monat/Jahr)
            - Bei Berufserfahrung: Position, Unternehmen, Ort und Stichpunkte zu Hauptaufgaben/Erfolgen
            - Ausbildung ebenfalls in umgekehrt chronologischer Reihenfolge
            - Kenntnisse und Fähigkeiten kategorisiert und mit Bewertung (z.B. sehr gut, gut, Grundkenntnisse)
            - Sprachen mit Niveaustufen nach CEFR (A1-C2)
            - IT-Kenntnisse separat aufgeführt
            - Rechtsverbindlicher Abschluss mit Ort, aktuellem Datum und Unterschriftvermerk
            - Maximal 2 Seiten Umfang
            
            ANWEISUNGEN:
            1. Erstelle einen detaillierten, tabellarischen Lebenslauf basierend auf allen extrahierten Informationen.
            2. Hebe besonders die Qualifikationen und Erfahrungen hervor, die für die Stellenbeschreibung relevant sind.
            3. Achte auf eine klare, übersichtliche Struktur mit den oben genannten deutschen Standards.
            4. Vermeide Lücken im Lebenslauf, soweit die Daten es erlauben.
            5. Füge KEINE erfundenen Informationen hinzu.
            6. Bei Unklarheiten oder fehlenden Angaben, belasse es bei den gesicherten Informationen.
            7. Achte auf lokale Best Practices für {region}.
            8. Verwende ein modernes, professionelles Format, das in Deutschland üblich ist.
            
            OPTIMIERE DEN LEBENSLAUF FÜR APPLICANT TRACKING SYSTEMS (ATS):
            - Verwende exakt die Schlüsselwörter aus der Stellenbeschreibung
            - Vermeide komplexe Tabellen oder ungewöhnliche Formatierungen
            - Nutze standardisierte Abschnittsüberschriften (Berufserfahrung, Ausbildung, etc.)
            - Verwende sowohl ausgeschriebene Begriffe als auch Akronyme (z.B. "Projektmanagement" und "PM")
            """
            
            # Status aktualisieren
            self.status_var.set("Generiere optimierten Lebenslauf... Dies kann einige Minuten dauern.")
            self.root.update_idletasks()
            
            # API für die Lebenslauferstellung aufrufen
            generated_resume = call_gemini_api(resume_prompt, temperature=0.2, max_tokens=2500)
            
            if not generated_resume:
                raise Exception("Keine Antwort vom API-Dienst erhalten.")
            
            # Ergebnis anzeigen
            self.result_text.set_region(region)
            self.result_text.set_content(generated_resume)
            
            # Status aktualisieren
            keyword_message = f" basierend auf {len(job_keywords)} extrahierten Schlüsselwörtern" if job_keywords else ""
            self.status_var.set(f"Stellenoptimierter Lebenslauf{keyword_message} erfolgreich erstellt.")
            
            # Ergebnisrahmentitel aktualisieren
            for child in self.main_frame.winfo_children():
                if isinstance(child, ttk.LabelFrame) and child.cget('text') == "Generiertes Bewerbungsschreiben":
                    child.config(text="Generierter tabellarischer Lebenslauf")
                    break
        
        except Exception as e:
            self.status_var.set(f"Fehler: {str(e)}")
            messagebox.showerror("Fehler", f"Ein Fehler ist aufgetreten: {str(e)}")
            if DEBUG:
                import traceback
                traceback.print_exc()

# Hilfsfunktion zur Aufteilung des Textes in Sätze
def split_text_into_sentences(text):
    """Teilt den Text in Sätze auf, berücksichtigt gängige Abkürzungen."""
    # Liste von gängigen Abkürzungen, die nicht als Satzende behandelt werden sollen
    common_abbreviations = [
        r'z\.B\.', r'bzw\.', r'etc\.', r'd\.h\.', r'u\.a\.', r'Dr\.', r'Prof\.', 
        r'Inc\.', r'Ltd\.', r'Co\.', r'GmbH\.', r'AG\.', r'Nr\.', r'ca\.', r'vs\.'
    ]
    
    # Ersetze Abkürzungen temporär durch Platzhalter
    placeholder_map = {}
    for idx, abbr in enumerate(common_abbreviations):
        placeholder = f"__ABBR{idx}__"
        placeholder_map[placeholder] = abbr
        text = re.sub(abbr, placeholder, text)
    
    # Teile den Text in Sätze auf
    sentences = re.split(r'(?<=[.!?])\s+', text)
    
    # Ersetze Platzhalter wieder durch Abkürzungen
    result = []
    for sentence in sentences:
        for placeholder, abbr in placeholder_map.items():
            sentence = sentence.replace(placeholder, abbr)
        if sentence.strip():
            result.append(sentence.strip())
    
    return result

# Hilfsfunktion zur Generierung von alternativen Formulierungen für einen Satz
def generate_alternatives_for_sentence(sentence, api_key, num_alternatives=3):
    """Generiert alternative Formulierungen für einen Satz mit der Gemini API."""
    if not api_key:
        return generate_fallback_alternatives(sentence, num_alternatives)
    
    # Die bevorzugten Modelle für Alternativen (kleinere Modelle sind hier ausreichend)
    models_to_try = [
        "gemini-1.5-flash",
        "gemini-1.0-pro", 
        "gemini-pro"
    ]
    
    # API-Versionen, die probiert werden sollen
    api_versions = ["v1beta", "v1"]
    
    # Prompt für alternative Formulierungen
    prompt = f"""
    Bitte formuliere den folgenden Satz auf {num_alternatives} verschiedene Arten um, 
    wobei der Inhalt und die Bedeutung beibehalten werden, aber der Stil und die Wortwahl variieren können.
    Gib nur die Alternativen zurück, ohne Nummerierung oder zusätzlichen Text.
    
    Satz: "{sentence}"
    """
    
    # Versuche jedes Modell mit jeder API-Version
    for model in models_to_try:
        for api_version in api_versions:
            api_url = f"https://generativelanguage.googleapis.com/{api_version}/models/{model}:generateContent?key={api_key}"
            
            # Die Anfrage-Daten vorbereiten
            data = {
                "contents": [
                    {
                        "parts": [
                            {
                                "text": prompt
                            }
                        ]
                    }
                ],
                "generationConfig": {
                    "temperature": 0.7,
                    "maxOutputTokens": 500,
                    "topP": 0.8,
                    "topK": 40
                }
            }
            
            try:
                # API-Anfrage durchführen
                headers = {"Content-Type": "application/json"}
                response = requests.post(
                    api_url,
                    headers=headers,
                    json=data,
                    timeout=30  # Kürzeres Timeout für diese kleine Anfrage
                )
                
                # Erfolgreiche Antwort verarbeiten
                if response.status_code == 200:
                    response_data = response.json()
                    
                    # Extraktion der Alternativen aus der Antwort
                    if "candidates" in response_data and len(response_data["candidates"]) > 0:
                        candidate = response_data["candidates"][0]
                        if "content" in candidate and "parts" in candidate["content"]:
                            parts = candidate["content"]["parts"]
                            if parts and len(parts) > 0 and "text" in parts[0]:
                                alternatives_text = parts[0]["text"].strip()
                                
                                # Teile die Antwort in separate Alternativen auf
                                alternatives = [alt.strip() for alt in alternatives_text.split('\n') if alt.strip()]
                                
                                # Stelle sicher, dass wir genug Alternativen haben
                                if len(alternatives) >= num_alternatives:
                                    return alternatives[:num_alternatives]
                                # Wenn weniger als gewünscht, aber mindestens eine:
                                elif len(alternatives) > 0:
                                    # Fülle mit Fallback-Alternativen auf
                                    fallbacks = generate_fallback_alternatives(sentence, num_alternatives - len(alternatives))
                                    return alternatives + fallbacks
            except Exception as e:
                print(f"Fehler bei der Generierung von Alternativen mit {model}: {str(e)}")
                continue
    
    # Fallback, wenn alle API-Versuche fehlschlagen
    return generate_fallback_alternatives(sentence, num_alternatives)

def generate_fallback_alternatives(sentence, num_alternatives=3):
    """Generiert einfache alternative Formulierungen ohne API."""
    # Einige Umformulierungsmuster
    patterns = [
        "In anderen Worten, {}",
        "Anders ausgedrückt: {}",
        "Das bedeutet, {}",
        "Mit anderen Worten: {}",
        "Um es anders zu sagen: {}",
        "Konkret heißt das: {}"
    ]
    
    # Wähle zufällige Muster aus oder wiederhole bei Bedarf
    alternatives = []
    for i in range(num_alternatives):
        pattern = patterns[i % len(patterns)]
        alternatives.append(pattern.format(sentence))
    
    return alternatives

# Hilfsfunktion zum Neugenerieren eines Textabschnitts
def regenerate_section(section_text, context_before="", context_after="", region="Deutschland"):
    """Generiert einen Textabschnitt neu mit der Gemini API."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return "Fehler: Google Gemini API-Schlüssel nicht gefunden."
    
    # Die bevorzugten Modelle
    models_to_try = [
        "gemini-2.0-flash",
        "gemini-1.5-pro",
        "gemini-1.0-pro",
        "gemini-pro"
    ]
    
    # API-Versionen
    api_versions = ["v1beta", "v1"]
    
    # Prompt für Neugenerierung
    prompt = f"""
    Bitte formuliere den folgenden Abschnitt eines Bewerbungsschreibens neu.
    Der Abschnitt sollte den gleichen Inhalt vermitteln, aber mit frischer, überzeugender Sprache.
    Berücksichtige dabei die Best Practices für Bewerbungen in {region}.
    Gib nur den neu formulierten Abschnitt zurück, ohne zusätzliche Kommentare.
    
    Kontext vor dem Abschnitt:
    {context_before}
    
    Zu überarbeitender Abschnitt:
    {section_text}
    
    Kontext nach dem Abschnitt:
    {context_after}
    """
    
    # Versuche jedes Modell und API-Version
    for model in models_to_try:
        for api_version in api_versions:
            api_url = f"https://generativelanguage.googleapis.com/{api_version}/models/{model}:generateContent?key={api_key}"
            
            # Die Anfrage-Daten vorbereiten
            data = {
                "contents": [
                    {
                        "parts": [
                            {
                                "text": prompt
                            }
                        ]
                    }
                ],
                "generationConfig": {
                    "temperature": 0.7,
                    "maxOutputTokens": 1000,
                    "topP": 0.8,
                    "topK": 40
                }
            }
            
            try:
                # API-Anfrage durchführen
                headers = {"Content-Type": "application/json"}
                response = requests.post(
                    api_url,
                    headers=headers,
                    json=data,
                    timeout=45
                )
                
                # Erfolgreiche Antwort verarbeiten
                if response.status_code == 200:
                    response_data = response.json()
                    
                    # Extraktion des neuen Abschnitts
                    if "candidates" in response_data and len(response_data["candidates"]) > 0:
                        candidate = response_data["candidates"][0]
                        if "content" in candidate and "parts" in candidate["content"]:
                            parts = candidate["content"]["parts"]
                            if parts and len(parts) > 0 and "text" in parts[0]:
                                return parts[0]["text"].strip()
            except Exception as e:
                print(f"Fehler bei der Neugenerierung des Abschnitts mit {model}: {str(e)}")
                continue
    
    # Fallback, wenn alle API-Versuche fehlschlagen
    return section_text

if __name__ == "__main__":
    root = tk.Tk()
    app = BewerbungsApp(root)
    root.mainloop() 