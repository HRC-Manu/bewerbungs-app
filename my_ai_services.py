def configure_api(api_key: str = None, model_name: str = "gpt-3.5-turbo") -> dict:
    """
    Grundlegende API-Konfiguration für unseren KI-Dienst.
    
    Args:
        api_key (str, optional): Der API-Schlüssel für OpenAI oder einen anderen KI-Anbieter.
                                Falls None, wird versucht, ihn aus den Umgebungsvariablen auszulesen.
        model_name (str, optional): Name des vorgegebenen Modells (z.B. "gpt-3.5-turbo" oder "gpt-4").
    
    Returns:
        dict: Ein Dictionary mit grundlegenden Konfigurationseinstellungen wie API-Key, Modellname,
              Zeitüberschreitung, etc.
    
    Raises:
        ValueError: Falls kein gültiger API-Key gefunden werden kann.
    """
    import os
    import logging
    import requests  # Proxy-/Session-Konfiguration
    from functools import lru_cache

    key = api_key if api_key else os.getenv("OPENAI_API_KEY")
    if not key:
        raise ValueError("Kein API-Key angegeben oder in den Umgebungsvariablen gefunden.")

    config = {
        "api_key": key,
        "model": model_name,
        "timeout": 30,  # In Sekunden: einfaches Timeout für Requests
        "use_proxy": False,  # Neue Option: Proxy 
        "proxy_url": os.getenv("HTTP_PROXY"),  # Oder "https_proxy"
        "log_level": logging.INFO
    }

    # Optional: Falls wir Proxy wirklich nutzen möchten
    if config["use_proxy"] and config["proxy_url"]:
        session = requests.Session()
        session.proxies = {
            "http": config["proxy_url"],
            "https": config["proxy_url"]
        }
        # Wir könnten session irgendwo ablegen, z.B. config["session"] = session

    # Wir ergänzen optionales Caching (lru_cache) für unkritische Aufrufe
    # (Hier nur als Beispiel, kann man an relevanten Stellen einsetzen.)

    @lru_cache(maxsize=32)
    def cached_model_request(prompt: str) -> str:
        """
        Beispiel-Funktion für einen KI-Aufruf, der dank LRU-Cache 
        identische Prompt-Anfragen nicht erneut bei der API stellt.
        """
        # -> Hier würde richtiger API-Call passieren. 
        # Bsp: openai.Completion.create(...)
        # Simplifiziert: return f"Cached result for {prompt}"
        return f"Cached result for {prompt}"
    
    config["cached_model_request"] = cached_model_request

    return config

# Beispielhaftes Singleton-Muster
_GLOBAL_CONFIG = None

def get_global_api_config() -> dict:
    """
    Liefert einmalig erstellte globale API-Konfiguration zurück.
    """
    global _GLOBAL_CONFIG
    if _GLOBAL_CONFIG is None:
        _GLOBAL_CONFIG = configure_api()  # Hier könnte man Parameter anpassen
    return _GLOBAL_CONFIG 
