/**
 * Verbindet den WorkflowManager mit dem ResumeAnalyzer
 */
connectResumeAnalyzer: function() {
    if (typeof ResumeAnalyzer === 'undefined') {
        console.warn('ResumeAnalyzer nicht verfügbar');
        return;
    }
    
    // Event-Handler für Analyseergebnisse
    document.addEventListener('resumeAnalysisComplete', (event) => {
        if (event.detail && event.detail.results) {
            console.log('Lebenslaufanalyse abgeschlossen:', event.detail);
            // Füge Analyseergebnisse zum Workflow-State hinzu
            this.stepStatus[1].data = event.detail.results;
            this.stepStatus[1].completed = true;
            this.saveState();
            this.updateUI();
            
            // Optional: Automatisch zum nächsten Schritt
            if (this.currentStep === 1) {
                this.nextStep();
            }
        }
    });
    
    // Event-Handler für verbesserten Lebenslauf
    document.addEventListener('resumeImproved', (event) => {
        if (event.detail && event.detail.improvedResume) {
            console.log('Lebenslauf verbessert:', event.detail);
            // Speichere verbesserten Lebenslauf
            const resumeData = {
                original: this.uploadedFiles.resume,
                improved: event.detail.improvedResume,
                timestamp: new Date().toISOString()
            };
            
            // Speichere in LocalStorage oder Datenbank
            localStorage.setItem('improvedResume', JSON.stringify(resumeData));
        }
    });
} 