/**
 * Bereinigt den extrahierten Text
 * @private
 */
_cleanText(text) {
    if (!text) return '';
    
    // Entferne überschüssige Leerzeichen
    let cleaned = text.replace(/\s+/g, ' ');
    
    // Entferne seltsame Zeichen und behalte nur gängige Zeichen für europäische Sprachen
    cleaned = cleaned.replace(/[^\x20-\x7E\u00A0-\u00FF\u0100-\u017F\u0180-\u024F]/g, ' ');
    
    // Stelle sicher, dass Absatzumbrüche beibehalten werden
    cleaned = cleaned.replace(/([.!?])\s+/g, '$1\n\n');
    
    // Entferne mehrfache Zeilenumbrüche
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    
    // Formularformatierung korrigieren
    cleaned = cleaned.replace(/([A-Za-z]+):\s*/g, '\n$1: ');
    
    // Trim
    cleaned = cleaned.trim();
    
    return cleaned;
}

/**
 * Wendet die Dokumentsegmentierung auf das Extraktionsergebnis an
 * @private
 */
async _applySegmentation(extractionResult) {
    if (!extractionResult || !extractionResult.text) {
        return extractionResult;
    }
    
    try {
        const text = extractionResult.text;
        const sections = [];
        
        // 1. Abschnittserkennung mit einfachen Heuristiken
        if (this.segmentationOptions.detectSections) {
            // Teile den Text in Zeilen
            const lines = text.split('\n');
            let currentSection = null;
            let currentContent = [];
            
            for (const line of lines) {
                const trimmedLine = line.trim();
                if (!trimmedLine) continue;
                
                // Erkenne Überschriften
                if (
                    // Wahrscheinliche Überschrift: Kurze Zeile, keine Satzzeichen am Ende, Großbuchstaben
                    (trimmedLine.length < 60 && 
                     !trimmedLine.match(/[.,:;]$/) && 
                     (trimmedLine === trimmedLine.toUpperCase() || 
                      trimmedLine.match(/^[A-Z][a-z]+/))) ||
                    // Zeile endet mit Doppelpunkt
                    trimmedLine.endsWith(':')
                ) {
                    // Speichere den vorherigen Abschnitt, wenn vorhanden
                    if (currentSection && currentContent.length > 0) {
                        sections.push({
                            type: 'section',
                            title: currentSection,
                            content: currentContent.join('\n'),
                            startIndex: text.indexOf(currentSection),
                            endIndex: text.indexOf(currentContent[currentContent.length - 1]) + 
                                      currentContent[currentContent.length - 1].length
                        });
                    }
                    
                    // Starte einen neuen Abschnitt
                    currentSection = trimmedLine;
                    currentContent = [];
                } else {
                    // Füge Zeile zum aktuellen Inhalt hinzu
                    currentContent.push(trimmedLine);
                }
            }
            
            // Füge den letzten Abschnitt hinzu
            if (currentSection && currentContent.length > 0) {
                sections.push({
                    type: 'section',
                    title: currentSection,
                    content: currentContent.join('\n'),
                    startIndex: text.indexOf(currentSection),
                    endIndex: text.indexOf(currentContent[currentContent.length - 1]) + 
                              currentContent[currentContent.length - 1].length
                });
            }
        }
        
        // 2. Tabellenerkennung (einfache Heuristik)
        if (this.segmentationOptions.detectTables) {
            const tableRegex = /([^\n]+\|[^\n]+\n){2,}/g;
            let match;
            
            while ((match = tableRegex.exec(text)) !== null) {
                sections.push({
                    type: 'table',
                    content: match[0],
                    startIndex: match.index,
                    endIndex: match.index + match[0].length
                });
            }
        }
        
        // 3. Listenerkennung
        if (this.segmentationOptions.preserveLists) {
            // Erkenne Aufzählungen (Bulletpoints)
            const bulletListRegex = /((?:^|\n)[\s]*[-•*][\s]+[^\n]+){2,}/g;
            let match;
            
            while ((match = bulletListRegex.exec(text)) !== null) {
                sections.push({
                    type: 'bullet-list',
                    content: match[0],
                    startIndex: match.index,
                    endIndex: match.index + match[0].length
                });
            }
            
            // Erkenne nummerierte Listen
            const numberedListRegex = /((?:^|\n)[\s]*\d+\.[\s]+[^\n]+){2,}/g;
            
            while ((match = numberedListRegex.exec(text)) !== null) {
                sections.push({
                    type: 'numbered-list',
                    content: match[0],
                    startIndex: match.index,
                    endIndex: match.index + match[0].length
                });
            }
        }
        
        // Sortiere Abschnitte nach Position im Text
        sections.sort((a, b) => a.startIndex - b.startIndex);
        
        // Modifiziere den Text, um Abschnittsmarkierungen hinzuzufügen, wenn gewünscht
        if (this.segmentationOptions.preserveStructure) {
            let structuredText = text;
            
            // Füge Marker für die erkannten Abschnitte ein (vom Ende zum Anfang, um Indizes nicht zu verschieben)
            for (let i = sections.length - 1; i >= 0; i--) {
                const section = sections[i];
                
                if (section.type === 'section') {
                    // Markiere Überschriften
                    structuredText = 
                        structuredText.substring(0, section.startIndex) +
                        this.segmentationOptions.sectionMarkers.heading +
                        structuredText.substring(section.startIndex);
                } else if (section.type === 'table') {
                    // Markiere Tabellen
                    structuredText = 
                        structuredText.substring(0, section.endIndex) +
                        this.segmentationOptions.sectionMarkers.tableEnd +
                        structuredText.substring(section.endIndex);
                        
                    structuredText = 
                        structuredText.substring(0, section.startIndex) +
                        this.segmentationOptions.sectionMarkers.tableStart +
                        structuredText.substring(section.startIndex);
                }
            }
            
            extractionResult.text = structuredText;
        }
        
        // Füge die segmentierten Abschnitte zum Ergebnis hinzu
        extractionResult.sections = sections;
        
        return extractionResult;
    } catch (error) {
        console.error('Fehler bei der Dokumentsegmentierung:', error);
        return extractionResult;
    }
}

/**
 * Lädt den Cache aus localStorage
 * @private
 */
_loadExtractedTexts() {
    try {
        const cachedTexts = localStorage.getItem('document_extractor_cache');
        this.extractedTexts = cachedTexts ? JSON.parse(cachedTexts) : {};
        
        // Bereinige alte Cache-Einträge
        const now = Date.now();
        const maxAge = 7 * 24 * 60 * 60 * 1000; // Eine Woche
        
        for (const key in this.extractedTexts) {
            if (now - this.extractedTexts[key].timestamp > maxAge) {
                delete this.extractedTexts[key];
            }
        }
    } catch (error) {
        console.error('Fehler beim Laden des Cache:', error);
        this.extractedTexts = {};
    }
}

/**
 * Speichert einen extrahierten Text im Cache
 * @private
 */
_cacheExtractedText(key, value) {
    try {
        // Füge dem Cache hinzu
        this.extractedTexts[key] = value;
        
        // Beschränke Cache-Größe
        const keys = Object.keys(this.extractedTexts);
        const maxEntries = 20;
        
        if (keys.length > maxEntries) {
            // Entferne älteste Einträge
            const sortedKeys = keys.sort((a, b) => 
                this.extractedTexts[a].timestamp - this.extractedTexts[b].timestamp
            );
            
            for (let i = 0; i < sortedKeys.length - maxEntries; i++) {
                delete this.extractedTexts[sortedKeys[i]];
            }
        }
        
        // Speichere in localStorage
        localStorage.setItem('document_extractor_cache', JSON.stringify(this.extractedTexts));
    } catch (error) {
        console.error('Fehler beim Speichern im Cache:', error);
        
        // Bei Überschreitung der localStorage-Größe, lösche den Cache
        if (error.name === 'QuotaExceededError') {
            this.extractedTexts = {};
            localStorage.removeItem('document_extractor_cache');
        }
    }
}

/**
 * Ruft einen extrahierten Text aus dem Cache ab
 * @private
 */
_getCachedText(key) {
    return this.extractedTexts[key];
}

/**
 * Ermittelt MIME-Typ anhand der Dateiendung
 * @private
 */
_getMimeTypeFromExtension(extension) {
    const extensionToMimeType = {
        'pdf': 'application/pdf',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'doc': 'application/msword',
        'txt': 'text/plain',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'tiff': 'image/tiff',
        'tif': 'image/tiff',
        'rtf': 'application/rtf',
        'html': 'text/html',
        'htm': 'text/html',
        'odt': 'application/vnd.oasis.opendocument.text'
    };
    
    return extensionToMimeType[extension.toLowerCase()];
}

// Globale Instanz erstellen
const documentExtractor = new DocumentExtractor();
export default documentExtractor; 