import os
import json
import time
from datetime import datetime
import firebase_admin
from firebase_admin import credentials, firestore, storage
from github import Github
from ui_tester import UITester

class AutoTestService:
    def __init__(self):
        self.setup_firebase()
        self.setup_github()
        self.db = firestore.client()
        self.test_collection = self.db.collection('test_runs')
        self.improvements_collection = self.db.collection('improvements')
        
    def setup_firebase(self):
        """Initialisiert Firebase"""
        cred = credentials.Certificate('firebase-credentials.json')
        firebase_admin.initialize_app(cred, {
            'storageBucket': 'bewerbungs-app.appspot.com'
        })
        
    def setup_github(self):
        """Initialisiert GitHub"""
        github_token = os.getenv('GITHUB_TOKEN')
        self.github = Github(github_token)
        self.repo = self.github.get_repo('username/bewerbungs-app')
        
    async def start_test_run(self):
        """Startet einen Testlauf"""
        try:
            # 1. Erstelle neuen Testlauf in Firebase
            test_run = {
                'status': 'running',
                'start_time': datetime.now().isoformat(),
                'triggered_by': 'auto_service'
            }
            test_run_ref = self.test_collection.document()
            test_run_ref.set(test_run)
            
            # 2. Führe Tests aus
            tester = UITester(max_iterations=5)
            issues = await self.run_tests_async(tester)
            
            # 3. Analysiere Ergebnisse
            analysis = self.analyze_results(issues)
            
            # 4. Erstelle Verbesserungen
            improvements = self.create_improvements(analysis)
            
            # 5. Implementiere Verbesserungen
            if improvements:
                await self.implement_improvements(improvements)
            
            # 6. Aktualisiere Testlauf
            test_run_ref.update({
                'status': 'completed',
                'end_time': datetime.now().isoformat(),
                'issues_found': issues,
                'improvements_made': improvements
            })
            
            # 7. Erstelle GitHub Issue wenn nötig
            if issues:
                self.create_github_issue(issues, improvements)
                
        except Exception as e:
            # Fehler dokumentieren
            test_run_ref.update({
                'status': 'failed',
                'error': str(e),
                'end_time': datetime.now().isoformat()
            })
            raise
            
    async def run_tests_async(self, tester):
        """Führt Tests asynchron aus"""
        return await tester.run_test_improve_loop()
        
    def analyze_results(self, issues):
        """Analysiert Testergebnisse"""
        analysis = {
            'critical': [],
            'major': [],
            'minor': [],
            'patterns': {},
            'frequent_issues': []
        }
        
        # Analysiere aktuelle Probleme
        for issue in issues:
            severity = self.determine_severity(issue)
            analysis[severity].append(issue)
            
            # Erfasse Muster
            component = issue['component']
            if component not in analysis['patterns']:
                analysis['patterns'][component] = 0
            analysis['patterns'][component] += 1
            
        # Hole historische Daten
        historical_issues = self.get_historical_issues()
        analysis['frequent_issues'] = self.find_frequent_issues(historical_issues)
        
        return analysis
        
    def create_improvements(self, analysis):
        """Erstellt Verbesserungsvorschläge"""
        improvements = []
        
        # Kritische Probleme zuerst
        for issue in analysis['critical']:
            improvement = self.create_improvement_for_issue(issue)
            if improvement:
                improvements.append(improvement)
                
        # Häufige Probleme
        for issue in analysis['frequent_issues']:
            improvement = self.create_improvement_for_pattern(issue)
            if improvement:
                improvements.append(improvement)
                
        return improvements
        
    async def implement_improvements(self, improvements):
        """Implementiert Verbesserungen"""
        for improvement in improvements:
            try:
                # 1. Erstelle Branch
                branch_name = f"auto-improve-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
                self.repo.create_git_ref(f"refs/heads/{branch_name}", self.repo.get_branch("main").commit.sha)
                
                # 2. Implementiere Änderungen
                self.apply_improvement(improvement, branch_name)
                
                # 3. Erstelle Pull Request
                pr = self.repo.create_pull(
                    title=f"Automatische Verbesserung: {improvement['description']}",
                    body=self.create_pr_description(improvement),
                    head=branch_name,
                    base="main"
                )
                
                # 4. Dokumentiere in Firebase
                self.improvements_collection.add({
                    'improvement': improvement,
                    'pr_number': pr.number,
                    'status': 'pending_review',
                    'created_at': datetime.now().isoformat()
                })
                
            except Exception as e:
                print(f"Fehler bei Verbesserung: {str(e)}")
                continue
                
    def create_github_issue(self, issues, improvements):
        """Erstellt GitHub Issue für Testprobleme"""
        title = f"Testprobleme gefunden: {len(issues)} Issues"
        
        body = "# Test-Ergebnisse\n\n"
        body += "## Gefundene Probleme\n"
        for issue in issues:
            body += f"- [{issue['type']}] {issue['component']}: {issue['description']}\n"
            
        if improvements:
            body += "\n## Vorgeschlagene Verbesserungen\n"
            for improvement in improvements:
                body += f"- {improvement['description']}\n"
                
        self.repo.create_issue(
            title=title,
            body=body,
            labels=['test-results', 'automated']
        )
        
    def get_historical_issues(self):
        """Holt historische Testprobleme aus Firebase"""
        historical = []
        docs = self.test_collection.where('status', '==', 'completed').get()
        for doc in docs:
            data = doc.to_dict()
            if 'issues_found' in data:
                historical.extend(data['issues_found'])
        return historical
        
    def find_frequent_issues(self, issues):
        """Findet häufig auftretende Probleme"""
        patterns = {}
        for issue in issues:
            key = f"{issue['type']}:{issue['component']}"
            if key not in patterns:
                patterns[key] = {
                    'count': 0,
                    'issue': issue
                }
            patterns[key]['count'] += 1
            
        # Finde Probleme die mehr als 3 Mal aufgetreten sind
        frequent = []
        for pattern in patterns.values():
            if pattern['count'] >= 3:
                frequent.append(pattern['issue'])
                
        return frequent
        
    def determine_severity(self, issue):
        """Bestimmt den Schweregrad eines Problems"""
        if issue['type'] in ['error', 'functionality']:
            return 'critical'
        elif issue['type'] in ['accessibility', 'responsive']:
            return 'major'
        return 'minor'
        
    def create_improvement_for_issue(self, issue):
        """Erstellt Verbesserungsvorschlag für ein Problem"""
        if issue['component'] == 'login_modal':
            return {
                'file': 'index.html',
                'type': 'modal_fix',
                'description': 'Modal-Trigger reparieren',
                'changes': [
                    {
                        'type': 'attribute_add',
                        'selector': '#loginNavBtn',
                        'attributes': {
                            'data-bs-toggle': 'modal',
                            'data-bs-target': '#authModal'
                        }
                    }
                ]
            }
        # Weitere Verbesserungsvorschläge hier...
        return None
        
    def create_improvement_for_pattern(self, issue):
        """Erstellt Verbesserungsvorschlag für ein Problemmuster"""
        if issue['component'] == 'mobile_menu':
            return {
                'file': 'style.css',
                'type': 'responsive',
                'description': 'Mobile Navigation verbessern',
                'changes': [
                    {
                        'type': 'style_add',
                        'selector': '.navbar-toggler',
                        'styles': {
                            'display': 'block !important'
                        },
                        'media': '(max-width: 768px)'
                    }
                ]
            }
        # Weitere Muster hier...
        return None
        
    def apply_improvement(self, improvement, branch):
        """Wendet eine Verbesserung an"""
        # Hole aktuelle Datei
        file = self.repo.get_contents(improvement['file'], ref=branch)
        content = file.decoded_content.decode()
        
        # Wende Änderungen an
        for change in improvement['changes']:
            if change['type'] == 'attribute_add':
                content = self.add_attributes(content, change)
            elif change['type'] == 'style_add':
                content = self.add_styles(content, change)
                
        # Committe Änderungen
        self.repo.update_file(
            file.path,
            f"Automatische Verbesserung: {improvement['description']}",
            content,
            file.sha,
            branch=branch
        )
        
    def create_pr_description(self, improvement):
        """Erstellt Beschreibung für Pull Request"""
        description = f"# Automatische Verbesserung\n\n"
        description += f"## Problem\n{improvement['description']}\n\n"
        description += "## Änderungen\n"
        for change in improvement['changes']:
            description += f"- {change['type']}: {json.dumps(change, indent=2)}\n"
        description += "\nDiese Änderungen wurden automatisch erstellt. Bitte überprüfen."
        return description

if __name__ == "__main__":
    service = AutoTestService()
    service.start_test_run() 