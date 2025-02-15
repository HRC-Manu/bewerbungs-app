# UI Tests

Dieses Verzeichnis enthält automatisierte UI-Tests für die Bewerbungs-App.

## Struktur

```
tests/
├── data/              # Testdaten und -fixtures
├── reports/           # Generierte Testberichte
├── browser_data/      # Browser-Profildaten
├── ui_tester.py       # Haupttest-Implementierung
├── run_tests.py       # Test-Runner
└── requirements.txt   # Test-Abhängigkeiten
```

## Installation

```bash
pip install -r requirements.txt
```

## Ausführung

```bash
python run_tests.py
```

Der Test-Runner wird:
1. Einen lokalen Server auf Port 3000 starten
2. Die UI-Tests mit Microsoft Edge ausführen
3. Einen detaillierten Testbericht generieren

## Testberichte

Die Testberichte werden im `reports` Verzeichnis gespeichert und enthalten:
- Gefundene Probleme
- Vorgeschlagene Verbesserungen
- Durchgeführte Änderungen

## Konfiguration

Die Tests verwenden Microsoft Edge im Headless-Modus. Stellen Sie sicher, dass Edge Chromium installiert ist. 