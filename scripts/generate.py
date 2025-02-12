#!/usr/bin/env python3
"""
Document generation script for the Job Application Assistant.
Uses OpenAI's API to generate customized cover letters and resumes.
"""

import os
import json
import logging
from typing import Dict, Any
import openai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configure OpenAI
openai.api_key = os.getenv('OPENAI_API_KEY')

class DocumentGenerator:
    """Handles the generation of cover letters and resumes using AI."""
    
    def __init__(self, resume_text: str, job_posting: str):
        """Initialize the generator with resume text and job posting."""
        self.resume_text = resume_text
        self.job_posting = job_posting
        
    async def generate_cover_letter(self) -> Dict[str, Any]:
        """Generate a customized cover letter using the OpenAI API."""
        try:
            prompt = f"""
            Erstelle ein professionelles Anschreiben basierend auf der folgenden Stellenanzeige und dem Lebenslauf.
            Das Anschreiben soll persönlich, überzeugend und speziell auf die Anforderungen der Stelle zugeschnitten sein.
            
            Stellenanzeige:
            {self.job_posting}
            
            Lebenslauf:
            {self.resume_text}
            
            Beachte dabei folgende Punkte:
            1. Zeige echtes Interesse an der Position und dem Unternehmen
            2. Hebe die relevanten Erfahrungen und Fähigkeiten aus dem Lebenslauf hervor
            3. Demonstriere ein klares Verständnis der Jobanforderungen
            4. Erkläre überzeugend, warum der Kandidat perfekt für die Stelle geeignet ist
            5. Verwende einen professionellen, aber persönlichen Schreibstil
            6. Strukturiere das Anschreiben klar in Einleitung, Hauptteil und Schluss
            7. Halte dich an die übliche deutsche Bewerbungsform
            8. Füge einen passenden Betreff ein
            9. Verwende eine angemessene Anrede und Grußformel
            10. Achte auf eine optimale Länge von etwa einer Seite
            
            Formatiere das Anschreiben in HTML mit passenden Tags für die Struktur.
            """
            
            response = await openai.ChatCompletion.acreate(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "Du bist ein erfahrener deutscher Bewerbungsexperte, der perfekte Anschreiben erstellt."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=1500
            )
            
            cover_letter = response.choices[0].message.content
            
            return {
                'content': cover_letter,
                'success': True
            }
            
        except Exception as e:
            logger.error(f"Error generating cover letter: {str(e)}")
            return {
                'content': '',
                'success': False,
                'error': str(e)
            }
    
    async def generate_resume(self) -> Dict[str, Any]:
        """Generate a tailored version of the resume using the OpenAI API."""
        try:
            prompt = f"""
            Erstelle eine optimierte Version des Lebenslaufs, die perfekt auf die Stellenanzeige zugeschnitten ist.
            Hebe dabei die relevantesten Erfahrungen und Fähigkeiten für diese Position hervor.
            
            Stellenanzeige:
            {self.job_posting}
            
            Original Lebenslauf:
            {self.resume_text}
            
            Beachte dabei folgende Punkte:
            1. Priorisiere die für die Stelle relevantesten Erfahrungen und Fähigkeiten
            2. Verwende Schlüsselwörter aus der Stellenanzeige
            3. Quantifiziere Erfolge und Leistungen wo möglich
            4. Behalte die professionelle Formatierung bei
            5. Fokussiere auf die wichtigsten Informationen
            6. Strukturiere den Lebenslauf klar und übersichtlich
            7. Halte dich an den üblichen deutschen Lebenslauf-Stil
            8. Füge alle wichtigen Kategorien ein (Persönliche Daten, Berufserfahrung, Ausbildung, etc.)
            9. Stelle aktuelle und relevante Erfahrungen an den Anfang
            10. Achte auf eine angemessene Länge von 1-2 Seiten
            
            Formatiere den Lebenslauf in HTML mit passenden Tags für die Struktur.
            """
            
            response = await openai.ChatCompletion.acreate(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "Du bist ein erfahrener deutscher Bewerbungsexperte, der perfekte Lebensläufe erstellt."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=2000
            )
            
            resume = response.choices[0].message.content
            
            return {
                'content': resume,
                'success': True
            }
            
        except Exception as e:
            logger.error(f"Error generating resume: {str(e)}")
            return {
                'content': '',
                'success': False,
                'error': str(e)
            }
    
    def save_generated_documents(self, output_dir: str = 'output'):
        """Save the generated documents to HTML files."""
        try:
            os.makedirs(output_dir, exist_ok=True)
            
            # Save cover letter
            cover_letter_path = os.path.join(output_dir, 'cover_letter.html')
            with open(cover_letter_path, 'w', encoding='utf-8') as f:
                f.write(self.cover_letter['content'])
            
            # Save resume
            resume_path = os.path.join(output_dir, 'resume.html')
            with open(resume_path, 'w', encoding='utf-8') as f:
                f.write(self.resume['content'])
            
            logger.info(f"Documents saved to {output_dir}")
            return True
            
        except Exception as e:
            logger.error(f"Error saving documents: {str(e)}")
            return False

async def main():
    """Main function to run the document generator."""
    try:
        # Load extracted resume content
        with open('input/extracted_content.json', 'r', encoding='utf-8') as f:
            resume_data = json.load(f)
        
        # Load job posting
        with open('input/job_posting.txt', 'r', encoding='utf-8') as f:
            job_posting = f.read()
        
        generator = DocumentGenerator(resume_data['text'], job_posting)
        
        # Generate documents
        generator.cover_letter = await generator.generate_cover_letter()
        generator.resume = await generator.generate_resume()
        
        if generator.cover_letter['success'] and generator.resume['success']:
            if generator.save_generated_documents():
                print("Successfully generated and saved documents")
            else:
                print("Error saving generated documents")
        else:
            print("Error generating documents")
            
    except Exception as e:
        print(f"Error in main function: {str(e)}")

if __name__ == '__main__':
    import asyncio
    asyncio.run(main()) 
