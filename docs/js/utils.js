/**
 * Sicheres Abrufen eines DOM-Elements
 * @param {string} id - Die ID des Elements
 * @returns {HTMLElement|null} Das gefundene Element oder null
 */
export function safeGetElem(id) {
    const el = document.getElementById(id);
    if (!el) console.warn(`Element #${id} nicht gefunden`);
    return el;
}

/**
 * Formatiert eine Dateigröße in lesbare Form
 * @param {number} bytes - Die Größe in Bytes
 * @returns {string} Formatierte Größe (z.B. "1.5 MB")
 */
export function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Extrahiert den relevanten Text aus einem HTML-String
 * @param {string} html - Der HTML-String
 * @returns {string} Der extrahierte Text
 */
export function extractJobAdText(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    return doc.body.innerText.slice(0, 3000);
}

/**
 * Extrahiert den Namen einer Person aus einem Text
 * @param {string} text - Der zu durchsuchende Text
 * @returns {string} Der gefundene Name oder 'Bewerber'
 */
export function extractPersonName(text) {
    const namePatterns = [
        /(?:name|vorname|nachname):\s*([A-ZÄÖÜa-zäöüß\s-]+)/i,
        /^([A-ZÄÖÜa-zäöüß\s-]+)\n/
    ];
    for (const pattern of namePatterns) {
        const match = text.match(pattern);
        if (match) {
            let name = match[1].trim();
            name = name.split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
            return name;
        }
    }
    return 'Bewerber';
}

/**
 * Extrahiert eine Referenznummer aus einer Stellenanzeige
 * @param {string} text - Der Text der Stellenanzeige
 * @returns {string|null} Die gefundene Referenznummer oder null
 */
export function extractReferenceNumber(text) {
    const patterns = [
        /referenz(?:nummer)?[:\s]+([A-Z0-9-]+)/i,
        /stellen(?:nummer)?[:\s]+([A-Z0-9-]+)/i
    ];
    
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) return match[1].trim();
    }
    return null;
}

/**
 * Verbessert einen Text basierend auf einem Stil
 * @param {string} text - Der zu verbessernde Text
 * @param {string} style - Der gewünschte Stil ('formal' oder 'casual')
 * @returns {Object} Verbesserter Text und Verbesserungsvorschläge
 */
export function improveText(text, style = 'formal') {
    let improvements = [];
    let improvedText = text;

    if (style === 'formal') {
        improvedText = improvedText
            .replace(/hallo/gi, 'Sehr geehrte Damen und Herren')
            .replace(/hi/gi, 'Sehr geehrte Damen und Herren');
    }

    // Weitere Verbesserungen können hier hinzugefügt werden

    return {
        text: improvedText,
        improvements: improvements
    };
}

/**
 * Generiert alternative Formulierungen für einen Text
 * @param {string} text - Der Originaltext
 * @param {number} count - Anzahl der gewünschten Alternativen
 * @returns {string[]} Array mit alternativen Formulierungen
 */
export function generateAlternatives(text, count = 3) {
    const alternatives = [];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim());

    for (let i = 0; i < count; i++) {
        let alternative = sentences.map(sentence => {
            // Hier könnte eine komplexere Logik zur Umformulierung implementiert werden
            return sentence;
        }).join('. ');

        if (alternative.trim()) {
            alternatives.push(alternative.trim() + '.');
        }
    }

    return alternatives;
} 
