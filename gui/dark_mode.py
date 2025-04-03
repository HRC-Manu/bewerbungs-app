import streamlit as st
from streamlit.components.v1 import html
import json

class DarkModeManager:
    """Verwaltet den Dark Mode für die Streamlit-Anwendung"""
    
    def __init__(self):
        self.initialize_state()
        
    def initialize_state(self):
        """Initialisiert den Dark Mode Status"""
        if 'dark_mode' not in st.session_state:
            # Standard ist System-Präferenz zu folgen
            st.session_state.dark_mode = 'auto'
    
    def render_toggle(self):
        """Rendert den Dark Mode Toggle Button"""
        options = {
            'auto': 'System-Einstellung',
            'light': 'Light Mode',
            'dark': 'Dark Mode'
        }
        
        selected = st.sidebar.radio(
            "Darstellung",
            options.keys(),
            format_func=lambda x: options[x],
            index=list(options.keys()).index(st.session_state.dark_mode)
        )
        
        if selected != st.session_state.dark_mode:
            st.session_state.dark_mode = selected
            st.experimental_rerun()
    
    def inject_custom_css(self):
        """Injiziert das CSS für den Dark Mode basierend auf der aktuellen Einstellung"""
        
        dark_mode_css = """
        <style>
            @media (prefers-color-scheme: dark) {
                .auto-dark-mode {
                    color-scheme: dark;
                    --background-color: #1e1e1e;
                    --text-color: #f0f0f0;
                    --card-bg: #2d2d2d;
                    --border-color: #444444;
                }
            }
            
            body.dark-mode,
            body.auto-dark-mode {
                background-color: var(--background-color);
                color: var(--text-color);
            }
            
            body.dark-mode .stApp,
            body.auto-dark-mode .stApp {
                background-color: var(--background-color);
            }
            
            body.dark-mode .element-container,
            body.auto-dark-mode .element-container {
                color: var(--text-color);
            }
            
            body.dark-mode .stTextInput input,
            body.dark-mode .stTextArea textarea,
            body.dark-mode .stSelectbox select,
            body.auto-dark-mode .stTextInput input,
            body.auto-dark-mode .stTextArea textarea,
            body.auto-dark-mode .stSelectbox select {
                background-color: var(--card-bg);
                color: var(--text-color);
                border-color: var(--border-color);
            }
            
            body.dark-mode .stDataFrame,
            body.auto-dark-mode .stDataFrame {
                background-color: var(--card-bg);
                color: var(--text-color);
            }
        </style>
        """
        
        # JavaScript-Code zur Änderung des Body-Klassen-Attributs
        dark_mode_js = f"""
        <script>
            const darkMode = {json.dumps(st.session_state.dark_mode)};
            
            function updateDarkMode() {{
                if (darkMode === 'dark') {{
                    document.body.classList.add('dark-mode');
                    document.body.classList.remove('auto-dark-mode');
                }} else if (darkMode === 'auto') {{
                    document.body.classList.add('auto-dark-mode');
                    document.body.classList.remove('dark-mode');
                }} else {{
                    document.body.classList.remove('dark-mode');
                    document.body.classList.remove('auto-dark-mode');
                }}
            }}
            
            // Initial beim Laden
            document.addEventListener('DOMContentLoaded', updateDarkMode);
            
            // Falls das Script nach dem DOMContentLoaded ausgeführt wird
            if (document.readyState === 'complete' || document.readyState === 'interactive') {{
                updateDarkMode();
            }}
        </script>
        """
        
        # Kombiniere CSS und JavaScript
        html_code = dark_mode_css + dark_mode_js
        html(html_code, height=0) 