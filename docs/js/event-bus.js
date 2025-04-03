/**
 * Event-Bus für die komponentenübergreifende Kommunikation
 * Zentrale Komponente für die Implementierung eines losen Kopplungsmusters
 */

class EventBus {
    constructor() {
        this.events = {};
    }
    
    /**
     * Registriert einen Listener für ein Event
     * @param {string} eventName - Name des Events
     * @param {Function} callback - Callback-Funktion
     */
    on(eventName, callback) {
        if (!this.events[eventName]) {
            this.events[eventName] = [];
        }
        
        this.events[eventName].push(callback);
        
        return () => this.off(eventName, callback);
    }
    
    /**
     * Entfernt einen Listener für ein Event
     * @param {string} eventName - Name des Events
     * @param {Function} callback - Callback-Funktion
     */
    off(eventName, callback) {
        if (!this.events[eventName]) return;
        
        this.events[eventName] = this.events[eventName].filter(
            cb => cb !== callback
        );
    }
    
    /**
     * Löst ein Event mit Daten aus
     * @param {string} eventName - Name des Events
     * @param {any} data - Daten für das Event
     */
    emit(eventName, data) {
        if (!this.events[eventName]) return;
        
        this.events[eventName].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Fehler im Event-Listener für ${eventName}:`, error);
            }
        });
    }
    
    /**
     * Registriert einen Listener, der nur einmal ausgeführt wird
     * @param {string} eventName - Name des Events
     * @param {Function} callback - Callback-Funktion
     */
    once(eventName, callback) {
        const onceCallback = (data) => {
            callback(data);
            this.off(eventName, onceCallback);
        };
        
        this.on(eventName, onceCallback);
    }
    
    /**
     * Entfernt alle Listener für ein Event
     * @param {string} eventName - Name des Events
     */
    clearEvent(eventName) {
        this.events[eventName] = [];
    }
    
    /**
     * Entfernt alle Listener für alle Events
     */
    clearAll() {
        this.events = {};
    }
}

// Erstelle eine globale Event-Bus-Instanz
const eventBus = new EventBus();

// Mache sie global verfügbar
window.eventBus = eventBus;

export default eventBus; 