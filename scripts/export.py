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
    """
    Handles the generation of cover letters and resumes using AI.

    Attributes:
        resume_text (str): The extracted text from the user's resume.
        job_posting (str): The full text of the job posting.
        cover_letter (Dict[str, Any]): Stores the generated cover letter data.
        resume (Dict[str, Any]): Stores the generated resume data.
    """
    
    def __init__(self, resume_text: str, job_posting: str):
        """
        Initialize the generator with resume text and job posting.

        Args:
            resume_text (str): Extracted text from the PDF resume.
            job_posting (str): Text content of the job posting.
        """
        self.resume_text = resume_text
        self.job_posting = job_posting
        self.cover_letter = {}
        self.resume = {}
        
    async def generate_cover_letter(self, use_alternative: bool = False) -> Dict[str, Any]:
        """
        Generate a customized cover letter using the OpenAI API.

        If use_alternative is True, an alternative AI method is used that generates 
        the cover letter solely based on the job posting.

        Returns:
            Dict[str, Any]: A dictionary with 'content' and 'success' keys.
        """
        try:
            prompt = self._compose_prompt_for_cover_letter(use_alternative)
            response = await openai.ChatCompletion.acreate(
                model="gpt-3.5-turbo" if use_alternative else "gpt-4",
                messages=[
                    {"role": "system", "content": "Du bist ein erfahrener deutscher Bewerbungsexperte."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=1500
            )
            cover_letter_text = response.choices[0].message.content
            return {
                'content': cover_letter_text,
                'success': True
            }
        except Exception as e:
            logging.error(f"Error generating cover letter: {str(e)}")
            return {
                'content': '',
                'success': False,
                'error': str(e)
            }
    
    async def generate_resume(self) -> Dict[str, Any]:
        """
        Generate an AI-tailored version of the resume using the OpenAI API.

        Returns:
            Dict[str, Any]: A dictionary with 'content' and 'success' keys.
        """
        try:
            prompt = self._compose_prompt_for_resume()
            response = await openai.ChatCompletion.acreate(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "Du bist ein erfahrener deutscher Bewerbungsexperte."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=2000
            )
            resume_text = response.choices[0].message.content
            return {
                'content': resume_text,
                'success': True
            }
        except Exception as e:
            logging.error(f"Error generating resume: {str(e)}")
            return {
                'content': '',
                'success': False,
                'error': str(e)
            }
    
    def save_generated_documents(self, output_dir: str = 'output') -> bool:
        """
        Save the generated cover letter and resume to HTML files on disk.

        Args:
            output_dir (str, optional): Directory to which the files should be saved.
                                        Defaults to 'output'.

        Returns:
            bool: True if both documents saved successfully, otherwise False.
        """
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

    def _compose_prompt_for_cover_letter(self, use_alternative: bool) -> str:
        """
        Internal helper to compose a prompt string used to generate the cover letter.

        Args:
            use_alternative (bool): Whether to generate a purely job-posting-based letter.

        Returns:
            str: The final prompt to send to the AI model.
        """
        if use_alternative:
            return (
                f"Erstelle ein professionelles Anschreiben, basierend ausschließlich "
                f"auf der folgenden Stellenanzeige:\n\n"
                f"{self.job_posting}\n\n"
                f"Verwende einen kreativen, aber seriösen Stil."
            )
        else:
            return (
                f"Erstelle ein professionelles Anschreiben basierend auf dieser Stellenanzeige "
                f"und meinem Lebenslauf. Stelle sicher, dass der Text speziell auf "
                f"die Stellenanforderungen zugeschnitten ist.\n\n"
                f"Stellenanzeige:\n{self.job_posting}\n\n"
                f"Lebenslauf:\n{self.resume_text}\n\n"
                f"Beachte folgende Punkte:\n"
                f"1. Zeige echtes Interesse am Unternehmen.\n"
                f"2. Nenne relevante Fähigkeiten und Erfahrungen.\n"
                f"3. Sei überzeugend, aber nicht übertrieben.\n"
            )

    def _compose_prompt_for_resume(self) -> str:
        """
        Internal helper to compose a prompt string for resume generation.

        Returns:
            str: The final prompt to send to the AI model.
        """
        return (
            f"Optimiere meinen Lebenslauf für die folgende Stellenanzeige:\n\n"
            f"{self.job_posting}\n\n"
            f"Hebe relevante Erfahrungen aus meinem Lebenslauf hervor:\n\n"
            f"{self.resume_text}\n\n"
            f"Stil: klar, übersichtlich, ansprechend. Verwende Schlüsselwörter aus der Stellenanzeige."
        )

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
