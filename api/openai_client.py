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

def improve_resume(resume_text, job_posting, model="gpt-4-turbo"):
    prompt = f"""
    Verbessere den folgenden Lebenslauf für die angegebene Stellenanzeige:

    LEBENSLAUF:
    {resume_text}

    STELLENANZEIGE:
    {job_posting}

    Optimiere den Lebenslauf, indem du:
    1. Die Qualifikationen und Erfahrungen an die Stellenanzeige anpasst
    2. Messbare Erfolge und Ergebnisse hervorhebst
    3. Relevante Schlüsselwörter einbaust
    4. Die Formatierung und Struktur verbesserst
    """
    
    try:
        response = openai.ChatCompletion.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=2500
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"Fehler bei der OpenAI API Anfrage: {e}")
        return None 