import streamlit as st
import os
import json
import tempfile
from typing import Dict, Any, Optional, List
from api.openai_client import analyze_resume, generate_application_letter, improve_resume
from processing.file_extraction import FileExtractor
from processing.resume_analysis import ResumeAnalyzer

class BewerbungsManager:
    """Hauptklasse für die KI-gestützte Bewerbungsmanagement-App"""
    
    def __init__(self):
        self.file_extractor = FileExtractor()
        self.resume_analyzer = ResumeAnalyzer()
        self.setup_session_state()
        self.setup_ui()
        
    def setup_session_state(self):
        """Initialisiert den Session State für die Streamlit-App"""
        if 'resume_text' not in st.session_state:
            st.session_state.resume_text = ""
        if 'resume_analysis' not in st.session_state:
            st.session_state.resume_analysis = {}
        if 'job_posting' not in st.session_state:
            st.session_state.job_posting = ""
        if 'job_analysis' not in st.session_state:
            st.session_state.job_analysis = {}
        if 'cover_letter' not in st.session_state:
            st.session_state.cover_letter = ""
        if 'improved_resume' not in st.session_state:
            st.session_state.improved_resume = ""
        if 'active_tab' not in st.session_state:
            st.session_state.active_tab = "resume"
            
    def setup_ui(self):
        """Erstellt die Benutzeroberfläche für die App"""
        st.title("KI-Bewerbungsmanager")
        
        # Tabs für verschiedene Funktionen
        tabs = st.tabs(["Lebenslauf", "Stellenanzeige", "Analyse", "Anschreiben", "Verbesserter Lebenslauf"])
        
        # Lebenslauf-Tab
        with tabs[0]:
            self.render_resume_tab()
            
        # Stellenanzeige-Tab
        with tabs[1]:
            self.render_job_posting_tab()
            
        # Analyse-Tab
        with tabs[2]:
            self.render_analysis_tab()
            
        # Anschreiben-Tab
        with tabs[3]:
            self.render_cover_letter_tab()
            
        # Verbesserter Lebenslauf-Tab
        with tabs[4]:
            self.render_improved_resume_tab()
    
    def render_resume_tab(self):
        """Zeigt den Lebenslauf-Tab an"""
        st.header("Lebenslauf hochladen und analysieren")
        
        uploaded_file = st.file_uploader("Wählen Sie Ihren Lebenslauf (PDF, DOCX, TXT)", type=["pdf", "docx", "txt"])
        
        if uploaded_file is not None:
            # Datei in temporäre Datei speichern
            with tempfile.NamedTemporaryFile(delete=False, suffix="." + uploaded_file.name.split(".")[-1]) as tmp_file:
                tmp_file.write(uploaded_file.getvalue())
                tmp_file_path = tmp_file.name
                
            # Text extrahieren
            extraction_result = self.file_extractor.extract_text(tmp_file_path)
            
            # Temporäre Datei löschen
            os.unlink(tmp_file_path)
            
            if extraction_result["success"]:
                st.session_state.resume_text = extraction_result["text"]
                st.success(f"Lebenslauf erfolgreich hochgeladen! ({extraction_result['word_count']} Wörter)")
                
                # Zeige Vorschau des extrahierten Textes
                with st.expander("Extrahierter Text anzeigen"):
                    st.text_area("Lebenslauf-Text", value=st.session_state.resume_text, height=300)
                    
                # Analyse-Button
                if st.button("Lebenslauf analysieren"):
                    with st.spinner("Analyse läuft..."):
                        analysis = self.resume_analyzer.analyze(st.session_state.resume_text)
                        st.session_state.resume_analysis = analysis
                        
                    st.success("Analyse abgeschlossen!")
                    st.json(analysis)
            else:
                st.error(f"Fehler bei der Extraktion: {extraction_result['error']}")
    
    def render_job_posting_tab(self):
        """Zeigt den Stellenanzeige-Tab an"""
        st.header("Stellenanzeige eingeben")
        
        st.session_state.job_posting = st.text_area(
            "Fügen Sie hier die Stellenanzeige ein", 
            value=st.session_state.job_posting,
            height=300
        )
        
        col1, col2 = st.columns(2)
        
        with col1:
            if st.button("Stellenanzeige analysieren"):
                if st.session_state.job_posting:
                    with st.spinner("Analyse läuft..."):
                        # Hier könnte eine detailliertere Analyse der Stellenanzeige erfolgen
                        prompt = f"""
                        Analysiere diese Stellenanzeige und extrahiere die wichtigsten Informationen:
                        
                        {st.session_state.job_posting}
                        
                        Gib das Ergebnis als JSON mit folgenden Feldern zurück:
                        - position: Die ausgeschriebene Position
                        - company: Der Name des Unternehmens
                        - required_skills: Eine Liste der erforderlichen Fähigkeiten
                        - nice_to_have: Eine Liste der optionalen Fähigkeiten
                        - experience_level: Das geforderte Erfahrungsniveau
                        - education: Die geforderte Ausbildung
                        - key_responsibilities: Die Hauptaufgaben
                        """
                        
                        analysis_text = analyze_resume(prompt)
                        
                        try:
                            if analysis_text.startswith("{") and analysis_text.endswith("}"):
                                analysis = json.loads(analysis_text)
                            else:
                                analysis = {"raw_text": analysis_text}
                                
                            st.session_state.job_analysis = analysis
                            
                        except Exception as e:
                            st.error(f"Fehler beim Parsen der Analyse: {e}")
                            st.session_state.job_analysis = {"error": str(e), "raw_text": analysis_text}
                            
                    st.success("Analyse abgeschlossen!")
                else:
                    st.warning("Bitte geben Sie zuerst eine Stellenanzeige ein.")
        
        with col2:
            if st.button("Beispiel-Stellenanzeige laden"):
                st.session_state.job_posting = """
                Stellenanzeige: Fullstack-Entwickler (m/w/d)
                
                Unser Unternehmen sucht zum nächstmöglichen Zeitpunkt einen erfahrenen Fullstack-Entwickler.
                
                Aufgaben:
                - Weiterentwicklung unserer Cloud-basierten SaaS-Lösung
                - Implementierung neuer Features im Frontend und Backend
                - Zusammenarbeit mit dem Produktmanagement
                - Code-Reviews und Qualitätssicherung
                
                Anforderungen:
                - Mindestens 3 Jahre Berufserfahrung in der Webentwicklung
                - Sehr gute Kenntnisse in Python und JavaScript/TypeScript
                - Erfahrung mit React und RESTful APIs
                - Vertrautheit mit agilen Entwicklungsmethoden
                
                Wünschenswert:
                - Erfahrung mit Cloud-Plattformen (AWS, Azure)
                - Kenntnisse in DevOps-Praktiken
                - Erfahrung mit Docker und Kubernetes
                
                Wir bieten:
                - Flexibles Arbeiten (Homeoffice-Möglichkeit)
                - Moderne Arbeitsumgebung
                - Regelmäßige Team-Events
                - Weiterbildungsmöglichkeiten
                """
                st.experimental_rerun()
                
        # Zeige die Analyse an, wenn vorhanden
        if st.session_state.job_analysis:
            st.subheader("Analyse der Stellenanzeige")
            st.json(st.session_state.job_analysis)
    
    def render_analysis_tab(self):
        """Zeigt den Analyse-Tab an"""
        st.header("Übereinstimmungsanalyse")
        
        if not st.session_state.resume_text or not st.session_state.job_posting:
            st.warning("Bitte laden Sie zuerst Ihren Lebenslauf hoch und geben Sie eine Stellenanzeige ein.")
            return
            
        if st.button("Übereinstimmungsanalyse durchführen"):
            with st.spinner("Analysiere Übereinstimmung..."):
                # Match-Analyse durchführen
                prompt = f"""
                Analysiere die Übereinstimmung zwischen diesem Lebenslauf und dieser Stellenanzeige:
                
                LEBENSLAUF:
                {st.session_state.resume_text}
                
                STELLENANZEIGE:
                {st.session_state.job_posting}
                
                Gib das Ergebnis als JSON mit folgenden Feldern zurück:
                - overall_match_score: Prozentualer Gesamtwert der Übereinstimmung (0-100)
                - matching_skills: Liste der übereinstimmenden Fähigkeiten
                - missing_skills: Liste der fehlenden, aber geforderten Fähigkeiten
                - matching_experience: Wie gut die Erfahrung übereinstimmt (0-100)
                - recommendations: Empfehlungen zur Verbesserung des Lebenslaufs für diese Position
                """
                
                analysis_text = analyze_resume(prompt)
                
                try:
                    if analysis_text.startswith("{") and analysis_text.endswith("}"):
                        analysis = json.loads(analysis_text)
                    else:
                        analysis = {"raw_text": analysis_text}
                        
                    st.session_state.match_analysis = analysis
                    
                except Exception as e:
                    st.error(f"Fehler beim Parsen der Analyse: {e}")
                    st.session_state.match_analysis = {"error": str(e), "raw_text": analysis_text}
                    
            st.success("Übereinstimmungsanalyse abgeschlossen!")
            
        # Zeige Analyse an, wenn vorhanden
        if 'match_analysis' in st.session_state and st.session_state.match_analysis:
            analysis = st.session_state.match_analysis
            
            # UI für die Analyse
            if 'overall_match_score' in analysis:
                score = analysis['overall_match_score']
                st.subheader(f"Gesamtübereinstimmung: {score}%")
                
                # Fortschrittsbalken
                color = "red" if score < 60 else "orange" if score < 80 else "green"
                st.progress(score / 100)
                
                # Zwei Spalten für übereinstimmende und fehlende Fähigkeiten
                col1, col2 = st.columns(2)
                
                with col1:
                    st.subheader("Übereinstimmende Fähigkeiten")
                    if 'matching_skills' in analysis:
                        for skill in analysis['matching_skills']:
                            st.markdown(f"✅ {skill}")
                
                with col2:
                    st.subheader("Fehlende Fähigkeiten")
                    if 'missing_skills' in analysis:
                        for skill in analysis['missing_skills']:
                            st.markdown(f"❌ {skill}")
                
                # Empfehlungen
                st.subheader("Empfehlungen")
                if 'recommendations' in analysis:
                    for i, rec in enumerate(analysis['recommendations']):
                        st.markdown(f"{i+1}. {rec}")
            else:
                # Für den Fall, dass die Analyse nicht im erwarteten Format ist
                st.json(analysis)
    
    def render_cover_letter_tab(self):
        """Zeigt den Anschreiben-Tab an"""
        st.header("Anschreiben generieren")
        
        if not st.session_state.resume_text or not st.session_state.job_posting:
            st.warning("Bitte laden Sie zuerst Ihren Lebenslauf hoch und geben Sie eine Stellenanzeige ein.")
            return
            
        col1, col2 = st.columns(2)
        
        with col1:
            style = st.selectbox(
                "Anschreiben-Stil",
                ["Formell", "Modern", "Kreativ", "Direkt"]
            )
        
        with col2:
            emphasis = st.multiselect(
                "Besondere Schwerpunkte",
                ["Technische Fähigkeiten", "Soft Skills", "Projekterfahrung", "Teamarbeit", "Führungsqualitäten"]
            )
            
        if st.button("Anschreiben generieren"):
            with st.spinner("Generiere Anschreiben..."):
                emphasis_str = ", ".join(emphasis) if emphasis else "Ausgewogene Darstellung"
                
                prompt = f"""
                Erstelle ein überzeugendes Anschreiben basierend auf diesem Lebenslauf und dieser Stellenanzeige:
                
                LEBENSLAUF:
                {st.session_state.resume_text}
                
                STELLENANZEIGE:
                {st.session_state.job_posting}
                
                STIL: {style}
                SCHWERPUNKTE: {emphasis_str}
                
                Das Anschreiben sollte professionell sein und die Übereinstimmung zwischen den Qualifikationen 
                des Bewerbers und den Anforderungen der Stelle hervorheben. Verwende keine Platzhalter wie [Name] 
                oder [Unternehmen], sondern extrahiere diese Informationen aus den bereitgestellten Daten.
                """
                
                cover_letter = generate_application_letter(prompt)
                st.session_state.cover_letter = cover_letter
                
            st.success("Anschreiben erfolgreich generiert!")
            
        # Zeige generiertes Anschreiben an, wenn verfügbar
        if st.session_state.cover_letter:
            st.subheader("Generiertes Anschreiben")
            st.text_area("", value=st.session_state.cover_letter, height=400)
            
            # Export-Optionen
            col1, col2 = st.columns(2)
            with col1:
                if st.button("Als PDF exportieren"):
                    st.info("PDF-Export-Funktion würde hier implementiert werden.")
                    
            with col2:
                if st.button("Als DOCX exportieren"):
                    st.info("DOCX-Export-Funktion würde hier implementiert werden.")
    
    def render_improved_resume_tab(self):
        """Zeigt den Tab für den verbesserten Lebenslauf an"""
        st.header("Lebenslauf optimieren")
        
        if not st.session_state.resume_text or not st.session_state.job_posting:
            st.warning("Bitte laden Sie zuerst Ihren Lebenslauf hoch und geben Sie eine Stellenanzeige ein.")
            return
            
        if st.button("Lebenslauf für diese Stelle optimieren"):
            with st.spinner("Optimiere Lebenslauf..."):
                improved_resume = improve_resume(
                    st.session_state.resume_text,
                    st.session_state.job_posting
                )
                
                st.session_state.improved_resume = improved_resume
                
            st.success("Lebenslauf erfolgreich optimiert!")
            
        # Zeige verbesserten Lebenslauf an
        if st.session_state.improved_resume:
            st.subheader("Optimierter Lebenslauf")
            
            col1, col2 = st.columns(2)
            
            with col1:
                st.markdown("### Original")
                st.text_area("", value=st.session_state.resume_text, height=400)
                
            with col2:
                st.markdown("### Optimiert")
                st.text_area("", value=st.session_state.improved_resume, height=400)
                
            # Export-Optionen
            col1, col2 = st.columns(2)
            with col1:
                if st.button("Als PDF exportieren"):
                    st.info("PDF-Export-Funktion würde hier implementiert werden.")
                    
            with col2:
                if st.button("Als DOCX exportieren"):
                    st.info("DOCX-Export-Funktion würde hier implementiert werden.")

def main():
    """Hauptfunktion zum Starten der App"""
    app = BewerbungsManager()

if __name__ == "__main__":
    main() 