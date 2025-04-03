/**
 * Dokument-Extraktor für verschiedene Dateiformate
 * Basierend auf der FileExtractor-Klasse aus Core_Code.md
 */

class DocumentExtractor {
    constructor() {
        this.supportedFormats = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/msword',
            'text/plain'
        ];
        
        this.formatLabels = {
            'application/pdf': 'PDF',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
            'application/msword': 'DOC',
            'text/plain': 'TXT'
        };
    }
    
    /**
     * Prüft, ob ein Dateityp unterstützt wird
     * @param {string} mimeType - MIME-Typ der Datei
     * @returns {boolean} - Wird der Dateityp unterstützt
     */
    isFormatSupported(mimeType) {
        return this.supportedFormats.includes(mimeType);
    }
    
    /**
     * Extrahiert Text aus einer Datei
     * @param {File} file - Die hochgeladene Datei
     * @returns {Promise<Object>} - Extraktionsergebnis
     */
    async extractText(file) {
        if (!file) {
            return { success: false, error: 'Keine Datei angegeben', text: '' };
        }
        
        if (!this.isFormatSupported(file.type)) {
            return { success: false, error: `Nicht unterstütztes Dateiformat: ${file.type}`, text: '' };
        }
        
        try {
            let text = '';
            
            if (file.type === 'application/pdf') {
                text = await this.extractFromPDF(file);
            } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                       file.type === 'application/msword') {
                text = await this.extractFromDOCX(file);
            } else if (file.type === 'text/plain') {
                text = await this.extractFromTXT(file);
            }
            
            // Text bereinigen
            text = this.cleanText(text);
            
            return {
                success: true,
                text: text,
                format: this.formatLabels[file.type] || 'Unbekannt',
                fileName: file.name,
                fileSize: file.size,
                wordCount: text.split(/\s+/).filter(Boolean).length
            };
        } catch (error) {
            console.error('Fehler bei der Textextraktion:', error);
            return { 
                success: false, 
                error: `Fehler beim Verarbeiten der Datei: ${error.message}`, 
                text: '' 
            };
        }
    }
    
    /**
     * Extrahiert Text aus einer PDF-Datei
     * @private
     */
    async extractFromPDF(file) {
        // Browser-Implementierung erfordert externe Bibliotheken wie pdf.js
        try {
            // Fallback: Verwende pdfjs-dist wenn verfügbar
            if (typeof pdfjsLib !== 'undefined') {
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                
                let fullText = '';
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items.map(item => item.str).join(' ');
                    fullText += pageText + '\n\n';
                }
                
                return fullText;
            } else {
                // Stelle sicher, dass der Benutzer weiß, dass keine PDF-Unterstützung vorhanden ist
                throw new Error('PDF-Unterstützung nicht verfügbar. PDF.js ist erforderlich.');
            }
        } catch (error) {
            console.error('PDF-Extraktionsfehler:', error);
            throw new Error(`PDF konnte nicht verarbeitet werden: ${error.message}`);
        }
    }
    
    /**
     * Extrahiert Text aus einer DOCX-Datei
     * @private
     */
    async extractFromDOCX(file) {
        try {
            // Fallback: Verwende mammoth.js wenn verfügbar
            if (typeof mammoth !== 'undefined') {
                const arrayBuffer = await file.arrayBuffer();
                const result = await mammoth.extractRawText({ arrayBuffer });
                return result.value;
            } else {
                // Alternative: Direktes Parsen von DOCX im Browser ist komplex
                // Hier ein einfacher Fallback, um zumindest einige Textinhalte zu extrahieren
                return this.extractFallbackDocx(await file.arrayBuffer());
            }
        } catch (error) {
            console.error('DOCX-Extraktionsfehler:', error);
            throw new Error(`DOCX konnte nicht verarbeitet werden: ${error.message}`);
        }
    }
    
    /**
     * Extrahiert Text aus einer TXT-Datei
     * @private
     */
    async extractFromTXT(file) {
        try {
            return await file.text();
        } catch (error) {
            console.error('TXT-Extraktionsfehler:', error);
            throw new Error(`TXT konnte nicht verarbeitet werden: ${error.message}`);
        }
    }
    
    /**
     * Bereinigt den extrahierten Text
     * @private
     */
    cleanText(text) {
        if (!text) return '';
        
        // Entferne überschüssige Leerzeichen
        let cleaned = text.replace(/\s+/g, ' ');
        
        // Entferne seltsame Zeichen
        cleaned = cleaned.replace(/[^\x20-\x7E\u00A0-\u00FF\u0100-\u017F\u0180-\u024F]/g, ' ');
        
        // Entferne mehrfache Zeilenumbrüche
        cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
        
        // Trim
        cleaned = cleaned.trim();
        
        return cleaned;
    }
    
    /**
     * Fallback-Methode für DOCX-Extraktion ohne spezielle Bibliotheken
     * @private
     */
    extractFallbackDocx(arrayBuffer) {
        try {
            // Einfache Textextraktion aus DOCX
            // Sucht nach Textblöcken zwischen XML-Tags
            const textEncoder = new TextDecoder('utf-8');
            const data = textEncoder.decode(arrayBuffer);
            
            // Extrahiere Text aus <w:t> Tags (einfache Methode)
            const textMatches = data.match(/<w:t[^>]*>(.*?)<\/w:t>/g);
            
            if (textMatches) {
                // Extrahiere den Inhalt der <w:t> Tags und bereinige ihn
                return textMatches
                    .map(match => {
                        const content = match.replace(/<w:t[^>]*>|<\/w:t>/g, '');
                        return this.decodeXMLEntities(content);
                    })
                    .join(' ');
            }
            
            return "Text konnte nicht extrahiert werden. Versuchen Sie ein anderes Format.";
        } catch (error) {
            console.error('DOCX-Fallback-Extraktionsfehler:', error);
            return "Fehler bei der Textextraktion. Versuchen Sie ein anderes Format.";
        }
    }
    
    /**
     * Dekodiert XML-Entitäten
     * @private
     */
    decodeXMLEntities(text) {
        return text
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'");
    }
}

// Globale Instanz erstellen
const documentExtractor = new DocumentExtractor();
export default documentExtractor; 