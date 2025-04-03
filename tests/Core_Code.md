Kannst du mir die vollständig angepassten code dateien erstellen, in mehreren schleifen optimieren und ausgeben?


ChatGPT:
Klar, ich werde dir die optimierten Code-Dateien in mehreren sinnvollen Schritten erstellen und nach und nach ausgeben. Folgende Schritte werde ich verfolgen:

Vorbereitung:

Verzeichnisse vorbereiten

API Integration (OpenAI statt Gemini)

API-Integration:

openai_client.py – API-Wrapper-Funktionalität

resume_analysis.py – Lebenslaufanalyse mit OpenAI API

Datenverarbeitung:

file_extraction.py – Textextraktion aus Dateien (PDF, DOCX, TXT)

text_processing.py – Satzverarbeitung (Optimiert)

GUI und Dunkelmodus (modernisiert):

main_ui.py – GUI mit modernem Layout, Dunkelmodus und abgerundeten Ecken

dark_mode.py – Aktivierung Dunkelmodus

interactive_editor.py – Interaktiver Texteditor für Satzalternativen

Hauptmodul:

main.py – Einstiegspunkt und Initialisierung der Anwendung

Ich beginne jetzt mit Schritt 1 und 2: API Integration (OpenAI).
Danach gehe ich in den nächsten Schleifen weiter vor.

📌 1. Vorbereitende Schritte und API-Integration:
🔹 .env-Datei vorbereiten
(bleibt unverändert)

ini
Kopieren
Bearbeiten
OPENAI_API_KEY=dein_openai_api_schlüssel_hier
🔹 Verzeichnisstruktur vorbereiten:
bash
Kopieren
Bearbeiten
bewerbungs-app/
│
├── api/
│   ├── openai_client.py
│   └── resume_analysis.py
│
├── data/
│   └── profile.json
│
├── gui/
│
├── processing/
│
├── main.py
├── requirements.txt
├── .env
└── README.md
✅ Datei: api/openai_client.py
python
Kopieren
Bearbeiten
import openai
import os
from dotenv import load_dotenv

load_dotenv()

openai.api_key = os.getenv("OPENAI_API_KEY")

def analyze_resume(prompt, model="gpt-4-turbo"):
    try:
        response = openai.ChatCompletion.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=1500
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"Fehler bei der OpenAI API Anfrage: {e}")
        return None

def generate_application_letter(prompt, model="gpt-4o"):
    try:
        response = openai.ChatCompletion.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=2000
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"Fehler bei der OpenAI API Anfrage: {e}")
        return None

def generate_sentence_alternatives(prompt, model="gpt-4-turbo"):
    try:
        response = openai.ChatCompletion.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.8,
            max_tokens=500
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"Fehler bei der OpenAI API Anfrage: {e}")
        return None
✅ Datei: api/resume_analysis.py
python
Kopieren
Bearbeiten
from api.openai_client import analyze_resume
import json
import re

def extract_resume_information(documents_text):
    prompt = f"""
    Analysiere die folgenden Bewerbungsdokumente und gib die Ergebnisse im JSON-Format zurück:

    Dokumente:
    {documents_text}

    Extrahiere:
    - Persönliche Daten (Name, Adresse, Kontakt)
    - Berufserfahrung (Position, Zeitraum, Aufgaben)
    - Bildung (Institution, Abschluss, Zeitraum)
    - Fähigkeiten (Technisch, Methodisch, Sozial)
    - Zertifikate, Sprachen und Interessen

    Gib ausschließlich valides JSON zurück, ohne zusätzliche Erklärung.
    """
    result = analyze_resume(prompt)

    if result:
        try:
            json_match = re.search(r'(\{.*\})', result, re.DOTALL)
            if json_match:
                json_text = json_match.group(1)
                return json.loads(json_text)
            else:
                return {}
        except json.JSONDecodeError as e:
            print(f"JSON Parsing Fehler: {e}")
            return {}
    else:
        return {}
✅ Datei: requirements.txt
Bereits optimiert für API-Integration und zukünftige GUI:

nginx
Kopieren
Bearbeiten
openai
python-dotenv
tkinter
PyPDF2
docx2txt
pillow
customtkinter
🔄 Nächste Schritte:
Bestätige kurz, ob dieser erste Schritt passt.
Danach gehe ich sofort zu Schritt 3 (Dateiverarbeitung und Textverarbeitung).







Du:
ja sollte passen


ChatGPT:
Perfekt! Dann mache ich jetzt mit Schritt 3 weiter:

file_extraction.py – zur effizienten Extraktion von Texten aus Dokumenten (PDF, DOCX, TXT)

text_processing.py – zur Verarbeitung der extrahierten Texte (Optimierung der Satztrennung und alternativen Generierung)

📌 3. Schritt – Dateien zur Textverarbeitung
✅ Datei: processing/file_extraction.py
python
Kopieren
Bearbeiten
import os
import PyPDF2
import docx2txt

def extract_text_from_pdf(file_path):
    try:
        pdf_reader = PyPDF2.PdfReader(file_path)
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text()
        return text
    except Exception as e:
        print(f"PDF-Extraktion Fehler: {e}")
        return ""

def extract_text_from_docx(file_path):
    try:
        return docx2txt.process(file_path)
    except Exception as e:
        print(f"DOCX-Extraktion Fehler: {e}")
        return ""

def extract_text_from_txt(file_path):
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return f.read()
    except Exception as e:
        print(f"TXT-Lese Fehler: {e}")
        return ""

def extract_text(file_path):
    if not os.path.exists(file_path):
        print("Datei existiert nicht.")
        return ""

    ext = file_path.lower().split(".")[-1]

    if ext == "pdf":
        return extract_text_from_pdf(file_path)
    elif ext in ["docx", "doc"]:
        return extract_text_from_docx(file_path)
    elif ext == "txt":
        return extract_text_from_txt(file_path)
    else:
        print("Nicht unterstütztes Dateiformat.")
        return ""
✅ Optimierte Datei: processing/text_processing.py
python
Kopieren
Bearbeiten
import re
from api.openai_client import generate_sentence_alternatives

COMMON_ABBREVIATIONS = [
    r'z\.B\.', r'bzw\.', r'etc\.', r'd\.h\.', r'u\.a\.', r'Dr\.', r'Prof\.',
    r'Inc\.', r'Ltd\.', r'Co\.', r'GmbH\.', r'AG\.', r'Nr\.', r'ca\.', r'vs\.',
    r'S\.', r'Kap\.', r'Art\.', r'St\.', r'Tel\.', r'Hr\.', r'Fr\.'
]

def split_text_into_sentences(text):
    placeholder_map = {}
    for idx, abbr in enumerate(COMMON_ABBREVIATIONS):
        placeholder = f"__ABBR{idx}__"
        placeholder_map[placeholder] = abbr
        text = re.sub(abbr, placeholder, text)

    sentences = re.split(r'(?<=[.!?])\s+', text)

    restored_sentences = []
    for sentence in sentences:
        for placeholder, abbr in placeholder_map.items():
            sentence = sentence.replace(placeholder, abbr)
        if sentence.strip():
            restored_sentences.append(sentence.strip())

    return restored_sentences

def generate_alternatives(sentence, num_alternatives=3):
    prompt = f"""
    Formuliere diesen Satz auf {num_alternatives} verschiedene Arten um. 
    Erhalte Bedeutung und Kontext bei, variiere jedoch Stil und Wortwahl deutlich:

    Satz: "{sentence}"

    Gib jede Alternative in einer neuen Zeile zurück, ohne Nummerierung oder zusätzlichen Text.
    """
    response = generate_sentence_alternatives(prompt)
    if response:
        alternatives = [alt.strip() for alt in response.split('\n') if alt.strip()]
        return alternatives[:num_alternatives]
    else:
        return [sentence]
🔄 Nächste Schritte:
Bestätige kurz, wenn dieser Schritt passt. Danach gehe ich sofort zu Schritt 4 über:

GUI mit Dunkelmodus und modernisiertem Design (main_ui.py, dark_mode.py, interactive_editor.py).







Du:
bitte einfach weiter machen ohne dass ich jedes mal bestätigen muss


ChatGPT:
Super, dann mache ich direkt weiter mit Schritt 4 – der modernisierten GUI inklusive Dunkelmodus und abgerundeten Ecken.

Ich generiere nun nacheinander die notwendigen Dateien:

dark_mode.py – Dunkelmodus-Funktionalität

interactive_editor.py – Interaktiver Texteditor mit Satzalternativen

main_ui.py – Hauptoberfläche der Anwendung mit modernen UI-Elementen

🌙 Datei: gui/dark_mode.py
python
Kopieren
Bearbeiten
def enable_dark_mode(root):
    colors = {
        "bg": "#2E3440",
        "fg": "#D8DEE9",
        "active_bg": "#4C566A",
        "active_fg": "#ECEFF4",
        "entry_bg": "#3B4252",
        "button_bg": "#434C5E",
        "highlight": "#5E81AC"
    }
    root.tk_setPalette(
        background=colors["bg"],
        foreground=colors["fg"],
        activeBackground=colors["active_bg"],
        activeForeground=colors["active_fg"]
    )
📝 Datei: gui/interactive_editor.py
python
Kopieren
Bearbeiten
import tkinter as tk
from tkinter import scrolledtext
from processing.text_processing import split_text_into_sentences, generate_alternatives

class InteractiveEditor(tk.Frame):
    def __init__(self, master):
        super().__init__(master, bg="#2E3440")
        self.sentences = []
        self.build_ui()

    def build_ui(self):
        self.editor = scrolledtext.ScrolledText(
            self, wrap=tk.WORD, font=("Segoe UI", 11), bg="#3B4252", fg="#D8DEE9",
            insertbackground="#D8DEE9", relief=tk.FLAT, padx=10, pady=10
        )
        self.editor.pack(expand=True, fill=tk.BOTH, padx=10, pady=10)

        self.editor.bind("<Button-1>", self.on_sentence_click)

        self.alt_frame = tk.Frame(self, bg="#2E3440")
        self.alt_frame.pack(fill=tk.X, padx=10, pady=5)

    def load_text(self, text):
        self.editor.delete("1.0", tk.END)
        self.sentences = split_text_into_sentences(text)
        for sentence in self.sentences:
            self.editor.insert(tk.END, sentence + " ")

    def on_sentence_click(self, event):
        cursor_pos = self.editor.index(f"@{event.x},{event.y}")
        sentence_idx = int(cursor_pos.split(".")[0]) - 1
        if sentence_idx < len(self.sentences):
            self.show_alternatives(self.sentences[sentence_idx], sentence_idx)

    def show_alternatives(self, sentence, idx):
        for widget in self.alt_frame.winfo_children():
            widget.destroy()

        alternatives = generate_alternatives(sentence)

        for alt in alternatives:
            btn = tk.Button(
                self.alt_frame, text=alt, anchor="w",
                bg="#434C5E", fg="#D8DEE9", relief=tk.FLAT,
                activebackground="#5E81AC", padx=10, pady=5,
                command=lambda a=alt, i=idx: self.replace_sentence(a, i)
            )
            btn.pack(fill=tk.X, pady=2, padx=5)

    def replace_sentence(self, alternative, idx):
        self.sentences[idx] = alternative
        self.editor.delete("1.0", tk.END)
        for sentence in self.sentences:
            self.editor.insert(tk.END, sentence + " ")
🎨 Datei: gui/main_ui.py
python
Kopieren
Bearbeiten
import tkinter as tk
from tkinter import ttk
from gui.dark_mode import enable_dark_mode
from gui.interactive_editor import InteractiveEditor

class Application(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Bewerbungsmanager")
        self.geometry("1200x800")
        enable_dark_mode(self)
        self.configure(bg="#2E3440")

        style = ttk.Style(self)
        style.theme_use("clam")
        style.configure("TButton", borderwidth=0, relief="flat", padding=6,
                        background="#434C5E", foreground="#D8DEE9",
                        font=("Segoe UI", 10))
        style.map("TButton", background=[("active", "#5E81AC")])

        self.setup_ui()

    def setup_ui(self):
        title_label = ttk.Label(
            self, text="Bewerbungsmanager",
            font=("Segoe UI", 16, "bold"), background="#2E3440", foreground="#D8DEE9"
        )
        title_label.pack(pady=10)

        self.editor = InteractiveEditor(self)
        self.editor.pack(expand=True, fill=tk.BOTH, padx=10, pady=10)

        button_frame = ttk.Frame(self, style="TFrame")
        button_frame.pack(pady=10)

        load_btn = ttk.Button(button_frame, text="Text Laden", command=self.load_sample_text)
        load_btn.pack(side=tk.LEFT, padx=5)

        save_btn = ttk.Button(button_frame, text="Text Speichern", command=self.save_text)
        save_btn.pack(side=tk.LEFT, padx=5)

    def load_sample_text(self):
        sample_text = "Dies ist ein Beispielsatz. Klick auf diesen Satz zeigt Alternativen."
        self.editor.load_text(sample_text)

    def save_text(self):
        content = self.editor.editor.get("1.0", tk.END)
        with open("bewerbung.txt", "w", encoding="utf-8") as f:
            f.write(content)

if __name__ == "__main__":
    app = Application()
    app.mainloop()
✨ Hinweise zur GUI:
Abgerundete Ecken: Standard-Tkinter unterstützt nicht direkt abgerundete Ecken.
Ich empfehle alternativ die Verwendung von customtkinter, falls du wirklich abgerundete Ecken benötigst:

bash
Kopieren
Bearbeiten
pip install customtkinter
Alternativ lässt sich durch den oben gezeigten minimalistischen Stil bereits ein modernes Erscheinungsbild erreichen.

Dunkelmodus: Voll integriert.

Modernes Layout: Klare Linien, Farben aus beliebten Dark Themes.

🚀 Nächster und letzter Schritt:
Ich generiere jetzt abschließend noch das main.py-Hauptmodul zur zentralen Steuerung der Anwendung. Danach ist dein optimierter Bewerbungsmanager vollständig fertiggestellt!







Du:
ok perfekt


ChatGPT:
Hier nun der abschließende Schritt – das zentrale Hauptmodul main.py, welches alle Komponenten sauber zusammenführt und startet.

🚀 Datei: main.py
python
Kopieren
Bearbeiten
#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Hauptmodul der Bewerbungsmanager-Anwendung.
"""

import tkinter as tk
from tkinter import filedialog, messagebox
from processing.file_extraction import extract_text
from api.resume_analysis import extract_resume_information
from gui.main_ui import Application
import os

class BewerbungsManager:
    def __init__(self):
        self.root = Application()
        self.add_menu()
        
    def add_menu(self):
        menubar = tk.Menu(self.root)
        file_menu = tk.Menu(menubar, tearoff=0)
        file_menu.add_command(label="Lebenslauf hochladen", command=self.upload_resume)
        file_menu.add_command(label="Analysierten Lebenslauf speichern", command=self.save_analyzed_resume)
        file_menu.add_separator()
        file_menu.add_command(label="Beenden", command=self.root.quit)
        menubar.add_cascade(label="Datei", menu=file_menu)
        self.root.config(menu=menubar)

    def upload_resume(self):
        file_path = filedialog.askopenfilename(
            filetypes=[("Dokumente", "*.pdf *.docx *.txt")]
        )
        if file_path:
            text = extract_text(file_path)
            if text:
                analyzed_data = extract_resume_information(text)
                if analyzed_data:
                    formatted_resume = self.format_resume(analyzed_data)
                    self.root.editor.load_text(formatted_resume)
                    messagebox.showinfo("Erfolg", "Lebenslauf erfolgreich analysiert und geladen.")
                else:
                    messagebox.showerror("Fehler", "Analyse fehlgeschlagen.")
            else:
                messagebox.showerror("Fehler", "Text konnte nicht extrahiert werden.")

    def format_resume(self, data):
        sections = []

        personal = data.get("personalData", {})
        sections.append(f"{personal.get('name', '')}\n{personal.get('address', '')}\n"
                        f"{personal.get('email', '')} | {personal.get('phone', '')}\n")

        sections.append("Berufserfahrung:")
        for exp in data.get("workExperience", []):
            sections.append(f"- {exp.get('period', '')}: {exp.get('position', '')}, {exp.get('company', '')}, {exp.get('location', '')}")

        sections.append("\nBildung:")
        for edu in data.get("education", []):
            sections.append(f"- {edu.get('period', '')}: {edu.get('degree', '')}, {edu.get('institution', '')}, {edu.get('location', '')}")

        sections.append("\nFähigkeiten:")
        skills = data.get("skills", {})
        sections.append(", ".join(skills.get("technical", []) + skills.get("methodical", []) + skills.get("social", [])))

        sections.append("\nSprachen:")
        for lang in data.get("languages", []):
            sections.append(f"- {lang.get('language', '')}: {lang.get('level', '')}")

        sections.append("\nZertifikate:")
        for cert in data.get("certifications", []):
            sections.append(f"- {cert.get('date', '')}: {cert.get('title', '')} ({cert.get('issuer', '')})")

        sections.append("\nInteressen:")
        sections.append(", ".join(data.get("interests", [])))

        return "\n".join(sections)

    def save_analyzed_resume(self):
        content = self.root.editor.editor.get("1.0", tk.END)
        file_path = filedialog.asksaveasfilename(
            defaultextension=".txt",
            filetypes=[("Textdateien", "*.txt")]
        )
        if file_path:
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(content)
            messagebox.showinfo("Erfolg", "Lebenslauf erfolgreich gespeichert.")

    def run(self):
        self.root.mainloop()

if __name__ == "__main__":
    app = BewerbungsManager()
    app.run()
🚩 Abschließende Hinweise zur Anwendung:
🛠 Installation der Anwendung:
Repository anlegen oder Struktur wie gezeigt übernehmen.

Benötigte Pakete installieren:

bash
Kopieren
Bearbeiten
pip install -r requirements.txt
Deinen OpenAI API-Key in .env speichern:

ini
Kopieren
Bearbeiten
OPENAI_API_KEY=dein_openai_api_schlüssel
📁 Endgültige Verzeichnisstruktur:
bash
Kopieren
Bearbeiten
bewerbungs-app/
│
├── api/
│   ├── openai_client.py
│   └── resume_analysis.py
│
├── data/
│   └── profile.json
│
├── gui/
│   ├── dark_mode.py
│   ├── interactive_editor.py
│   └── main_ui.py
│
├── processing/
│   ├── file_extraction.py
│   └── text_processing.py
│
├── .env
├── main.py
├── requirements.txt
└── README.md
🎉 Fertigstellung und nächste Schritte:
✅ Die Anwendung ist nun vollständig, modernisiert und modular strukturiert.
✅ Die Integration der OpenAI API ist vollzogen.
✅ Das UI wurde mit einem Dunkelmodus und optimiertem Design versehen.

Empfohlene nächste Schritte für dich:

Teste alle Komponenten einzeln und dann im Zusammenspiel.

Passe Design-Details nach deinem Geschmack weiter an.

Erweitere nach Belieben die Funktionalitäten (z.B. weitere Analyseoptionen, PDF-Generierung, etc.).

Ich wünsche dir viel Erfolg mit deinem optimierten Bewerbungsmanager! 🚀😊