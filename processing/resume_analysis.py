import os
import json
from api.openai_client import analyze_resume

class ResumeAnalyzer:
    def __init__(self):
        self.analysis_cache = {}
        self.load_analysis_templates()
    
    def load_analysis_templates(self):
        template_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'analysis_templates.json')
        try:
            with open(template_path, 'r', encoding='utf-8') as f:
                self.templates = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            self.templates = {
                "default": {
                    "sections": ["contact", "experience", "education", "skills", "languages"],
                    "keywords": ["verantwortlich", "entwickelt", "optimiert", "geleitet", "implementiert"]
                }
            }
    
    def analyze(self, resume_text, job_posting=None, cache_key=None):
        """Analysiert einen Lebenslauf mit KI und gibt strukturierte Analyse zurück"""
        
        # Wenn im Cache, verwende Cache-Ergebnis
        if cache_key and cache_key in self.analysis_cache:
            return self.analysis_cache[cache_key]
            
        # Erstelle den Prompt basierend auf dem Inhalt
        prompt = self.create_analysis_prompt(resume_text, job_posting)
        
        # Rufe OpenAI API auf
        analysis_text = analyze_resume(prompt)
        
        if not analysis_text:
            return {"error": "Analyse konnte nicht durchgeführt werden"}
            
        # Parsen der Analyse zu strukturierten Daten
        try:
            # Versuch, JSON zu parsen oder strukturierte Daten zu extrahieren
            if analysis_text.startswith("{") and analysis_text.endswith("}"):
                analysis = json.loads(analysis_text)
            else:
                analysis = self.parse_analysis_text(analysis_text)
                
            # Im Cache speichern wenn cache_key angegeben
            if cache_key:
                self.analysis_cache[cache_key] = analysis
                
            return analysis
            
        except Exception as e:
            print(f"Fehler beim Parsen der Analyse: {e}")
            return {"error": str(e), "raw_analysis": analysis_text}
    
    def create_analysis_prompt(self, resume_text, job_posting=None):
        """Erstellt einen Prompt für die KI-Analyse"""
        
        base_prompt = f"""
        Analysiere den folgenden Lebenslauf und gib eine detaillierte Struktur zurück:
        
        {resume_text}
        
        Liefere die Analyse im folgenden JSON-Format:
        {{
            "contact_info": {{...}},
            "summary": "...",
            "skills": [...],
            "experience": [...],
            "education": [...],
            "languages": [...],
            "certifications": [...],
            "score": {{
                "overall": 0-100,
                "completeness": 0-100,
                "relevance": 0-100,
                "formatting": 0-100
            }},
            "improvement_suggestions": [...]
        }}
        """
        
        if job_posting:
            job_prompt = f"""
            Berücksichtige bei der Analyse auch diese Stellenanzeige und bewerte die Übereinstimmung:
            
            {job_posting}
            
            Füge auch einen "job_match" Abschnitt zur JSON-Ausgabe hinzu, der die prozentuale Übereinstimmung 
            und spezifische Übereinstimmungen bei Kenntnissen und Erfahrungen enthält.
            """
            base_prompt += job_prompt
            
        return base_prompt
    
    def parse_analysis_text(self, analysis_text):
        """Parst unstrukturierten Analysetext in ein strukturiertes Format"""
        # Einfache Implementierung - in der Praxis würden hier komplexere 
        # Textextraktions- und Strukturierungslogik stehen
        
        sections = analysis_text.split("\n\n")
        result = {
            "summary": sections[0] if sections else "",
            "skills": [],
            "experience": [],
            "education": [],
            "improvement_suggestions": []
        }
        
        for section in sections:
            if "Skills:" in section or "Fähigkeiten:" in section:
                skills_text = section.split(":", 1)[1].strip()
                result["skills"] = [s.strip() for s in skills_text.split(",")]
            elif "Verbesserung" in section or "verbessern" in section:
                suggestions = section.split("\n")[1:]
                result["improvement_suggestions"] = [s.strip() for s in suggestions if s.strip()]
                
        return result 