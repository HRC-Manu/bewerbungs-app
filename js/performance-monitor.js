/**
 * Performance-Monitor für die Bewerbungs-App
 * Überwacht die Anwendungsleistung und stellt Optimierungsmöglichkeiten bereit
 */

class PerformanceMonitor {
    constructor() {
        this.metrics = {
            pageLoadTime: 0,
            resourceLoadTimes: {},
            interactionTimes: {},
            errorCount: 0
        };
        
        this.startTime = performance.now();
        this.initObservers();
    }
    
    initObservers() {
        // Page load timing
        window.addEventListener('load', () => {
            this.metrics.pageLoadTime = performance.now() - this.startTime;
            console.log(`Seite in ${this.metrics.pageLoadTime.toFixed(2)}ms geladen`);
            
            // Ressourcen-Analyse
            this.analyzeResources();
        });
        
        // Klick-Timing
        document.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON' || e.target.tagName === 'A') {
                const id = e.target.id || e.target.textContent.trim();
                this.startInteractionTimer(id);
            }
        });
        
        // Fehlererfassung
        window.addEventListener('error', () => {
            this.metrics.errorCount++;
        });
    }
    
    analyzeResources() {
        if (window.performance && performance.getEntriesByType) {
            const resources = performance.getEntriesByType('resource');
            
            // Ressourcen nach Typ gruppieren
            const byType = {};
            let totalSize = 0;
            
            resources.forEach(resource => {
                const type = resource.initiatorType || 'other';
                if (!byType[type]) byType[type] = [];
                byType[type].push(resource);
                
                // Größe schätzen, wenn verfügbar
                if (resource.transferSize) {
                    totalSize += resource.transferSize;
                }
                
                // Einzelne Ressourcen-Timing speichern
                this.metrics.resourceLoadTimes[resource.name] = {
                    duration: resource.duration,
                    size: resource.transferSize || 0
                };
            });
            
            // Loggen
            console.log(`Geladene Ressourcen: ${resources.length}, Gesamtgröße: ${(totalSize / 1024).toFixed(2)} KB`);
            
            // Langsame Ressourcen identifizieren
            const slowResources = resources.filter(r => r.duration > 500).sort((a, b) => b.duration - a.duration);
            if (slowResources.length > 0) {
                console.warn('Langsame Ressourcen gefunden:', slowResources.map(r => ({
                    url: r.name,
                    duration: `${r.duration.toFixed(2)}ms`
                })));
            }
        }
    }
    
    startInteractionTimer(id) {
        this.metrics.interactionTimes[id] = {
            start: performance.now()
        };
    }
    
    endInteractionTimer(id, success = true) {
        if (this.metrics.interactionTimes[id]) {
            const duration = performance.now() - this.metrics.interactionTimes[id].start;
            this.metrics.interactionTimes[id].duration = duration;
            this.metrics.interactionTimes[id].success = success;
            
            if (duration > 300) {
                console.warn(`Langsame Interaktion: ${id} (${duration.toFixed(2)}ms)`);
            }
        }
    }
    
    getMetrics() {
        return {
            ...this.metrics,
            totalRuntime: performance.now() - this.startTime
        };
    }
    
    suggestOptimizations() {
        const suggestions = [];
        
        // Seitenlade-Zeit prüfen
        if (this.metrics.pageLoadTime > 2000) {
            suggestions.push({
                type: 'critical',
                message: 'Seitenladezeit ist sehr hoch',
                value: `${this.metrics.pageLoadTime.toFixed(2)}ms`,
                suggestion: 'Skripte und Stylesheets optimieren, Lazy-Loading einsetzen'
            });
        }
        
        // Einzelne langsame Ressourcen
        const slowResources = Object.entries(this.metrics.resourceLoadTimes)
            .filter(([_, data]) => data.duration > 500)
            .map(([url, data]) => ({
                type: 'warning',
                message: `Langsame Ressource: ${url.split('/').pop()}`,
                value: `${data.duration.toFixed(2)}ms`,
                suggestion: 'Komprimieren, Caching oder CDN verwenden'
            }));
        
        suggestions.push(...slowResources);
        
        // Langsame Interaktionen
        const slowInteractions = Object.entries(this.metrics.interactionTimes)
            .filter(([_, data]) => data.duration > 300)
            .map(([id, data]) => ({
                type: 'warning',
                message: `Langsame Interaktion: ${id}`,
                value: `${data.duration.toFixed(2)}ms`,
                suggestion: 'Event-Handler optimieren, UI-Blockierung vermeiden'
            }));
        
        suggestions.push(...slowInteractions);
        
        return suggestions;
    }
}

// Instanz erstellen und exportieren
export const performanceMonitor = new PerformanceMonitor();

// Globalen Zugriff ermöglichen
window.perfMonitor = performanceMonitor;

console.log('Performance-Monitor gestartet'); 