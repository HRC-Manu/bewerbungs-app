#!/usr/bin/env python3
"""
PDF text extraction utility for the Job Application Assistant.
Extracts text content from PDF resumes while preserving structure.
"""

import os
import sys
from typing import Dict, Any
import json
import pypdf
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class PDFExtractor:
    """Handles the extraction of text from PDF files."""
    
    def __init__(self, input_file: str):
        """Initialize the PDF extractor with input file path."""
        self.input_file = input_file
        self.text_content = ""
        self.metadata = {}
        
    def extract(self) -> Dict[str, Any]:
        """
        Extract text and metadata from the PDF file.
        Returns a dictionary containing the extracted content.
        """
        try:
            with open(self.input_file, 'rb') as file:
                # Create PDF reader object
                reader = pypdf.PdfReader(file)
                
                # Extract metadata
                self.metadata = {
                    'title': reader.metadata.get('/Title', ''),
                    'author': reader.metadata.get('/Author', ''),
                    'creator': reader.metadata.get('/Creator', ''),
                    'pages': len(reader.pages)
                }
                
                # Extract text from all pages
                text_content = []
                for page in reader.pages:
                    text = page.extract_text()
                    if text:
                        text_content.append(text)
                
                self.text_content = '\n'.join(text_content)
                
                return {
                    'text': self.text_content,
                    'metadata': self.metadata,
                    'success': True
                }
                
        except Exception as e:
            logger.error(f"Error extracting PDF content: {str(e)}")
            return {
                'text': '',
                'metadata': {},
                'success': False,
                'error': str(e)
            }
    
    def save_extracted_content(self, output_file: str):
        """Save the extracted content to a JSON file."""
        try:
            content = {
                'text': self.text_content,
                'metadata': self.metadata
            }
            
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(content, f, ensure_ascii=False, indent=2)
                
            logger.info(f"Extracted content saved to {output_file}")
            return True
            
        except Exception as e:
            logger.error(f"Error saving extracted content: {str(e)}")
            return False

def main():
    """Main function to run the PDF extractor."""
    if len(sys.argv) < 2:
        print("Usage: python pdf_extract.py <input_pdf> [output_json]")
        sys.exit(1)
        
    input_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else 'extracted_content.json'
    
    if not os.path.exists(input_file):
        print(f"Error: Input file '{input_file}' not found.")
        sys.exit(1)
        
    extractor = PDFExtractor(input_file)
    result = extractor.extract()
    
    if result['success']:
        if extractor.save_extracted_content(output_file):
            print(f"Successfully extracted content to {output_file}")
        else:
            print("Error saving extracted content")
    else:
        print(f"Error extracting PDF content: {result.get('error', 'Unknown error')}")

if __name__ == '__main__':
    main() 
