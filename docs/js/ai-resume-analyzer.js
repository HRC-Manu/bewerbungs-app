/**
 * KI-basierte Lebenslaufanalyse mit fortgeschrittenen Funktionen
 */

import { db, storage } from './firebase-config.js';
import { collection, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getDownloadURL, ref } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

class AIResumeAnalyzer {
    constructor() {
        this.apiEndpoint = '/api/analyze-resume';
        this.cachedAnalyses = new Map();
        this.currentlyProcessing = new Set();
        
        // Event-Listener für hochgeladene Lebensläufe
        document.addEventListener('resumeUploaded', event => {
            const { fileId, fileUrl } = event.detail;
            this.scheduleAnalysis(fileId, fileUrl);
        });
    }
    
    /**
     * Lebenslaufanalyse planen mit intelligenter Warteschlange
     */
    async scheduleAnalysis(fileId, fileUrl) {
        if (this.currentlyProcessing.has(fileId)) return;
        
        // Bereits analysierte Dokumente nicht erneut verarbeiten
        try {
            const cachedResult = await this.getCachedAnalysis(fileId);
            if (cachedResult) {
                this.displayAnalysisResults(cachedResult, fileId);
                return;
            }
        } catch (error) {
            console.warn('Cache check failed:', error);
        }
        
        this.currentlyProcessing.add(fileId);
        
        // UI-Feedback
        const analysisCard = document.getElementById('aiAnalysisCard');
        const preview = document.getElementById('resumeAiPreview');
        
        if (analysisCard) analysisCard.classList.remove('d-none');
        if (preview) {
            preview.innerHTML = `
                <div class="text-center py-4">
                    <div class="spinner-border text-primary mb-3" role="status"></div>
                    <h5 class="mb-2">KI analysiert Ihren Lebenslauf</h5>
                    <p class="text-muted">Dies dauert etwa 15-30 Sekunden</p>
                    <div class="progress mt-3">
                        <div class="progress-bar progress-bar-striped progress-bar-animated" 
                             role="progressbar" style="width: 0%" id="aiProgressBar"></div>
                    </div>
                </div>
            `;
            
            // Fortschritt-Simulation
            const progressBar = document.getElementById('aiProgressBar');
            let progress = 0;
            const progressInterval = setInterval(() => {
                progress += Math.random() * 3;
                if (progressBar) progressBar.style.width = `${Math.min(progress, 95)}%`;
                if (progress >= 95) clearInterval(progressInterval);
            }, 300);
            
            try {
                // Durchführung der KI-Analyse
                const analysisResult = await this.performAnalysis(fileUrl);
                clearInterval(progressInterval);
                if (progressBar) progressBar.style.width = '100%';
                
                // Ergebnisse speichern und anzeigen
                await this.saveAnalysisResult(fileId, analysisResult);
                this.displayAnalysisResults(analysisResult, fileId);
                
                // Optimierte Lebenslaufvorschau generieren
                this.generateImprovedPreview(fileId, analysisResult);
                
                // Zustand für Workflow-Manager aktualisieren
                this.updateWorkflowState(fileId, analysisResult);
                
                // Erfolgreiches Ereignis auslösen
                document.dispatchEvent(new CustomEvent('resumeAnalysisComplete', {
                    detail: { fileId, results: analysisResult },
                    bubbles: true
                }));
            } catch (error) {
                clearInterval(progressInterval);
                console.error('Analysis failed:', error);
                
                if (preview) {
                    preview.innerHTML = `
                        <div class="alert alert-danger">
                            <i class="bi bi-exclamation-triangle-fill me-2"></i>
                            Fehler bei der Analyse: ${error.message}
                            <button class="btn btn-outline-danger btn-sm ms-3" id="retryAnalysisBtn">
                                Erneut versuchen
                            </button>
                        </div>
                    `;
                    
                    const retryBtn = document.getElementById('retryAnalysisBtn');
                    if (retryBtn) {
                        retryBtn.addEventListener('click', () => {
                            this.currentlyProcessing.delete(fileId);
                            this.scheduleAnalysis(fileId, fileUrl);
                        });
                    }
                }
            } finally {
                this.currentlyProcessing.delete(fileId);
            }
        }
    }
    
    /**
     * Aus dem Cache laden
     */
    async getCachedAnalysis(fileId) {
        // Aus lokalem Cache prüfen
        if (this.cachedAnalyses.has(fileId)) {
            return this.cachedAnalyses.get(fileId);
        }
        
        // Aus Firestore prüfen
        try {
            const docRef = doc(collection(db, "resume_analyses"), fileId);
            const docSnapshot = await getDoc(docRef);
            
            if (docSnapshot.exists()) {
                const data = docSnapshot.data();
                if (data.analysis) {
                    this.cachedAnalyses.set(fileId, data.analysis);
                    return data.analysis;
                }
            }
        } catch (e) {
            console.error("Error retrieving cached analysis:", e);
        }
        
        return null;
    }
    
    /**
     * Tatsächliche Analyse durchführen - hier mit fortschrittlicher KI-Integration
     */
    async performAnalysis(fileUrl) {
        // In einer echten App würden wir die Datei an einen Endpunkt senden
        // Hier simulieren wir eine fortschrittliche Analyse mit verzögerter Antwort
        
        return new Promise((resolve) => {
            setTimeout(() => {
                // Simuliertes Analysergebnis mit komplexen Erkenntnissen
                resolve({
                    score: {
                        overall: 78,
                        relevance: 82,
                        formatting: 75,
                        completeness: 85,
                        clarity: 70
                    },
                    skills: [
                        { name: "JavaScript", level: "Fortgeschritten", confidence: 0.95, relevance: 90 },
                        { name: "React", level: "Fortgeschritten", confidence: 0.9, relevance: 85 },
                        { name: "Node.js", level: "Mittel", confidence: 0.8, relevance: 75 },
                        { name: "Python", level: "Fortgeschritten", confidence: 0.85, relevance: 70 },
                        { name: "SQL", level: "Grundlagen", confidence: 0.7, relevance: 65 },
                        { name: "Git", level: "Fortgeschritten", confidence: 0.9, relevance: 80 }
                    ],
                    experience: {
                        years: 5,
                        positions: [
                            {
                                title: "Senior Developer",
                                company: "TechCorp GmbH",
                                duration: "3 Jahre",
                                responsibilities: [
                                    "Entwicklung von Webanwendungen",
                                    "Teamleitung von 5 Entwicklern"
                                ],
                                keywords: ["leadership", "web development", "architecture"]
                            },
                            {
                                title: "Junior Developer",
                                company: "StartUp AG",
                                duration: "2 Jahre",
                                responsibilities: [
                                    "Frontend-Entwicklung",
                                    "Code Reviews"
                                ],
                                keywords: ["frontend", "react", "javascript"]
                            }
                        ]
                    },
                    education: [
                        {
                            degree: "Bachelor of Science - Informatik",
                            institution: "Technische Universität München",
                            year: "2015"
                        }
                    ],
                    languages: [
                        { name: "Deutsch", level: "Muttersprache", relevance: 95 },
                        { name: "Englisch", level: "Fließend (C1)", relevance: 90 }
                    ],
                    improvements: [
                        {
                            type: "critical",
                            section: "Berufserfahrung",
                            suggestion: "Fügen Sie konkrete Erfolge mit Zahlen und Metriken hinzu",
                            examples: ["Steigerung der Konversionsrate um 25%", "Reduzierung der Serverkosten um 30%"]
                        },
                        {
                            type: "important",
                            section: "Fähigkeiten",
                            suggestion: "Gruppieren Sie Ihre Fähigkeiten in relevante Kategorien",
                            examples: ["Frontend: React, JavaScript, HTML/CSS", "Backend: Node.js, Express, MongoDB"]
                        },
                        {
                            type: "nice-to-have",
                            section: "Formatierung",
                            suggestion: "Verbessern Sie die visuelle Hierarchie durch konsistente Überschriftenformatierung"
                        }
                    ],
                    keywords: {
                        strong: ["JavaScript", "React", "Teamleitung"],
                        missing: ["Docker", "CI/CD", "Cloud"]
                    }
                });
            }, 2500);
        });
    }
    
    /**
     * Analyseergebnis speichern
     */
    async saveAnalysisResult(fileId, analysis) {
        // Im lokalen Cache speichern
        this.cachedAnalyses.set(fileId, analysis);
        
        // In Firestore speichern
        try {
            const docRef = doc(collection(db, "resume_analyses"), fileId);
            await setDoc(docRef, {
                analysis,
                createdAt: new Date(),
                version: '2.0'
            }, { merge: true });
        } catch (e) {
            console.error("Error saving analysis:", e);
            // Trotz Fehler fortfahren - lokaler Cache hat Daten
        }
    }
    
    /**
     * Ergebnisse ansprechend darstellen
     */
    displayAnalysisResults(analysis, fileId) {
        const preview = document.getElementById('resumeAiPreview');
        if (!preview) return;
        
        preview.innerHTML = `
            <div class="analysis-results">
                <div class="row mb-4">
                    <div class="col-md-6">
                        <div class="card h-100">
                            <div class="card-body text-center">
                                <h5 class="card-title mb-3">Gesamtbewertung</h5>
                                <div class="display-4 fw-bold text-${this.getScoreColorClass(analysis.score.overall)}">
                                    ${analysis.score.overall}%
                                </div>
                                <p class="text-muted mb-0">Optimierungspotential: ${100-analysis.score.overall}%</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-6">
                        <div class="card h-100">
                            <div class="card-body">
                                <h5 class="card-title mb-3">Detailwerte</h5>
                                <div class="d-flex align-items-center mb-2">
                                    <div style="width: 130px;">Relevanz:</div>
                                    <div class="progress flex-grow-1" style="height: 8px;">
                                        <div class="progress-bar bg-${this.getScoreColorClass(analysis.score.relevance)}"
                                             role="progressbar" style="width: ${analysis.score.relevance}%"></div>
                                    </div>
                                    <div style="width: 40px;" class="ps-2">${analysis.score.relevance}%</div>
                                </div>
                                
                                <div class="d-flex align-items-center mb-2">
                                    <div style="width: 130px;">Formatierung:</div>
                                    <div class="progress flex-grow-1" style="height: 8px;">
                                        <div class="progress-bar bg-${this.getScoreColorClass(analysis.score.formatting)}"
                                             role="progressbar" style="width: ${analysis.score.formatting}%"></div>
                                    </div>
                                    <div style="width: 40px;" class="ps-2">${analysis.score.formatting}%</div>
                                </div>
                                
                                <div class="d-flex align-items-center mb-2">
                                    <div style="width: 130px;">Vollständigkeit:</div>
                                    <div class="progress flex-grow-1" style="height: 8px;">
                                        <div class="progress-bar bg-${this.getScoreColorClass(analysis.score.completeness)}"
                                             role="progressbar" style="width: ${analysis.score.completeness}%"></div>
                                    </div>
                                    <div style="width: 40px;" class="ps-2">${analysis.score.completeness}%</div>
                                </div>
                                
                                <div class="d-flex align-items-center mb-2">
                                    <div style="width: 130px;">Klarheit:</div>
                                    <div class="progress flex-grow-1" style="height: 8px;">
                                        <div class="progress-bar bg-${this.getScoreColorClass(analysis.score.clarity)}"
                                             role="progressbar" style="width: ${analysis.score.clarity}%"></div>
                                    </div>
                                    <div style="width: 40px;" class="ps-2">${analysis.score.clarity}%</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <h5 class="mt-4 mb-3">Erkannte Fähigkeiten</h5>
                <div class="skills-section mb-4">
                    <div class="row">
                        ${analysis.skills.map(skill => `
                            <div class="col-md-6 mb-2">
                                <div class="d-flex align-items-center">
                                    <div style="width: 120px;">${skill.name}:</div>
                                    <div class="progress flex-grow-1" style="height: 8px;">
                                        <div class="progress-bar bg-${this.getScoreColorClass(skill.relevance)}"
                                             role="progressbar" style="width: ${skill.relevance}%"></div>
                                    </div>
                                    <div style="width: 90px;" class="ps-2 small">${skill.level}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="text-center mt-4">
                    <button class="btn btn-success px-4 py-2" onclick="document.getElementById('continueBtn').click()">
                        <i class="bi bi-magic me-2"></i>
                        Mit dieser Analyse fortfahren
                    </button>
                    <button class="btn btn-outline-primary ms-2" data-bs-toggle="modal" data-bs-target="#improveResumeModal">
                        <i class="bi bi-tools me-2"></i>
                        Lebenslauf verbessern
                    </button>
                </div>
            </div>
        `;
        
        // Weiter-Button aktivieren
        const continueBtn = document.getElementById('continueBtn');
        if (continueBtn) continueBtn.disabled = false;
    }
    
    /**
     * Verbesserte Lebenslaufvorschau generieren
     */
    async generateImprovedPreview(fileId, analysis) {
        // Diese Funktion würde normalerweise einen verbesserten Lebenslauf generieren
        // Für Demozwecke implementieren wir dies nicht vollständig
        console.log('Generating improved preview for file:', fileId);
        
        // Hier würden wir normalerweise mit einem AI-Endpunkt kommunizieren
    }
    
    /**
     * Hilfsfunktion für Farbklassen
     */
    getScoreColorClass(score) {
        if (score >= 80) return 'success';
        if (score >= 60) return 'warning';
        return 'danger';
    }
    
    /**
     * Workflow-Zustand aktualisieren
     */
    updateWorkflowState(fileId, analysis) {
        const progressBar = document.getElementById('workflowProgress');
        if (progressBar) {
            progressBar.style.width = '40%';
            progressBar.setAttribute('aria-valuenow', '40');
        }
        
        // Globalen Zustand aktualisieren, falls vorhanden
        if (window.globalState) {
            window.globalState.resumeAnalysis = {
                fileId,
                analysis,
                timestamp: new Date()
            };
            
            if (typeof window.globalState.updateResumeAnalyzerState === 'function') {
                window.globalState.updateResumeAnalyzerState({
                    analysisResults: analysis,
                    lastAnalysisDate: new Date()
                });
            }
        }
    }
}

// Singleton-Instanz erstellen und exportieren
const aiResumeAnalyzer = new AIResumeAnalyzer();
export default aiResumeAnalyzer; 