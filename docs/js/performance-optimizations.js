/**
 * Performance-Optimierungen für die Bewerbungsapp
 */

// Lazy Loading für Komponenten
export const lazyLoadComponents = () => {
    // Intersection Observer für verzögertes Laden
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const lazyElement = entry.target;
                
                // Verschiedene Lazy-Loading-Strategien je nach Typ
                if (lazyElement.dataset.lazySrc) {
                    // Bilder nachladen
                    lazyElement.src = lazyElement.dataset.lazySrc;
                    lazyElement.removeAttribute('data-lazy-src');
                } else if (lazyElement.dataset.lazyComponent) {
                    // Komponenten nachladen
                    const componentName = lazyElement.dataset.lazyComponent;
                    import(`./components/${componentName}.js`)
                        .then(module => {
                            const component = module.default;
                            component.initialize(lazyElement);
                            console.log(`Komponente ${componentName} geladen`);
                        })
                        .catch(err => console.error(`Fehler beim Laden von ${componentName}:`, err));
                }
                
                // Element nicht mehr beobachten
                observer.unobserve(lazyElement);
            }
        });
    }, {
        rootMargin: '100px', // Etwas früher laden für bessere UX
        threshold: 0.1
    });
    
    // Lazyload für Bilder
    document.querySelectorAll('[data-lazy-src]').forEach(img => observer.observe(img));
    
    // Lazyload für Komponenten
    document.querySelectorAll('[data-lazy-component]').forEach(elem => observer.observe(elem));
};

// Optimiertes Speichern von Zuständen
export const optimizedStateManager = {
    debounceTimers: {},
    
    // Zustand mit Debounce speichern
    saveState(key, data, debounceMs = 300) {
        // Bestehenden Timer löschen
        if (this.debounceTimers[key]) {
            clearTimeout(this.debounceTimers[key]);
        }
        
        // Neuen Timer setzen
        this.debounceTimers[key] = setTimeout(() => {
            try {
                // Optimal: IndexedDB für größere Daten
                if (data && typeof data === 'object' && Object.keys(data).length > 20) {
                    this.saveToIndexedDB(key, data);
                } else {
                    // LocalStorage für kleinere Daten
                    localStorage.setItem(key, JSON.stringify(data));
                }
                console.log(`Zustand "${key}" gespeichert`);
            } catch (e) {
                console.warn(`Fehler beim Speichern von "${key}":`, e);
            }
        }, debounceMs);
    },
    
    // In IndexedDB speichern
    async saveToIndexedDB(key, data) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('appStateDB', 1);
            
            request.onupgradeneeded = function(event) {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('states')) {
                    db.createObjectStore('states', { keyPath: 'id' });
                }
            };
            
            request.onsuccess = function(event) {
                const db = event.target.result;
                const transaction = db.transaction(['states'], 'readwrite');
                const store = transaction.objectStore('states');
                
                const storeRequest = store.put({ id: key, data: data });
                storeRequest.onsuccess = () => resolve();
                storeRequest.onerror = () => reject(storeRequest.error);
            };
            
            request.onerror = function(event) {
                reject(event.target.error);
            };
        });
    }
};

// Zugänglichkeitsverbesserungen
export const enhanceAccessibility = () => {
    // Tabindex für bessere Tastaturnavigation
    document.querySelectorAll('.card:not([tabindex])').forEach((card, index) => {
        card.setAttribute('tabindex', '0');
    });
    
    // ARIA-Labels für bessere Screenreader-Unterstützung
    document.querySelectorAll('button:not([aria-label])').forEach(button => {
        const text = button.textContent.trim();
        if (text) {
            button.setAttribute('aria-label', text);
        } else if (button.querySelector('i.bi')) {
            // Icon-Button
            const iconClass = Array.from(button.querySelector('i.bi').classList)
                .find(cls => cls.startsWith('bi-'));
            
            if (iconClass) {
                const iconName = iconClass.replace('bi-', '').replace(/-/g, ' ');
                button.setAttribute('aria-label', iconName);
            }
        }
    });
    
    // Verbesserter Farbkontrast
    document.documentElement.style.setProperty('--bs-primary', '#0056b3'); // Dunkleres Blau für besseren Kontrast
};

// Sofort ausführen nach dem Laden
document.addEventListener('DOMContentLoaded', () => {
    lazyLoadComponents();
    enhanceAccessibility();
    
    // Service Worker für Offline-Unterstützung
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/service-worker.js')
            .then(reg => console.log('Service Worker registriert', reg))
            .catch(err => console.error('Service Worker Fehler:', err));
    }
}); 