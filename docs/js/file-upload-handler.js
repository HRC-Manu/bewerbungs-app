/**
 * Robuster File-Upload-Handler für die Bewerbungs-App
 * Funktioniert unabhängig von anderen Framework-Komponenten
 */

(function() {
    // Sofort ausführbare Funktion für Isolation
    const FileUploadHandler = {
        fileData: null,
        
        init: function() {
            console.log('FileUploadHandler wurde initialisiert');
            this.attachEventListeners();
        },
        
        attachEventListeners: function() {
            // Alle Upload-Elemente finden
            this.findAndAttachUploadElements();
            
            // Bei Änderungen im DOM (für dynamisch geladene Komponenten)
            const observer = new MutationObserver((mutations) => {
                mutations.forEach(mutation => {
                    if (mutation.addedNodes.length) {
                        this.findAndAttachUploadElements();
                    }
                });
            });
            
            observer.observe(document.body, { childList: true, subtree: true });
        },
        
        findAndAttachUploadElements: function() {
            // Finde alle File-Input-Elemente
            const fileInputs = document.querySelectorAll('input[type="file"]');
            fileInputs.forEach(input => {
                if (!input.dataset.handlerAttached) {
                    input.addEventListener('change', this.handleFileSelection.bind(this));
                    input.dataset.handlerAttached = 'true';
                    console.log('Event-Listener an File-Input angehängt:', input.id);
                }
            });
            
            // Finde alle Browse-Buttons
            const browseButtons = document.querySelectorAll('[id*="browse"], [class*="browse"], [id*="file-btn"], [id*="upload-btn"]');
            browseButtons.forEach(button => {
                if (!button.dataset.handlerAttached) {
                    button.addEventListener('click', this.triggerFileDialog.bind(this));
                    button.dataset.handlerAttached = 'true';
                    console.log('Event-Listener an Browse-Button angehängt:', button.id || button.className);
                }
            });
            
            // Finde alle Drop-Zonen
            const dropZones = document.querySelectorAll('.upload-area, .upload-zone, .drop-zone, [id*="dropzone"], [id*="upload-area"]');
            dropZones.forEach(zone => {
                if (!zone.dataset.handlerAttached) {
                    this.attachDropZoneListeners(zone);
                    zone.dataset.handlerAttached = 'true';
                    console.log('Drag & Drop-Listener angehängt:', zone.id || zone.className);
                }
            });
        },
        
        triggerFileDialog: function(e) {
            e.preventDefault();
            // Finde den nächsten Input[type=file]
            let fileInput;
            
            // 1. Suche nach data-target Attribut
            if (e.currentTarget.dataset.target) {
                fileInput = document.getElementById(e.currentTarget.dataset.target);
            }
            
            // 2. Suche nach ID-Muster
            if (!fileInput) {
                const buttonId = e.currentTarget.id;
                // browse-button → file-input
                const possibleId = buttonId.replace('browse', 'file').replace('btn', 'input');
                fileInput = document.getElementById(possibleId);
            }
            
            // 3. Suche in der Nähe
            if (!fileInput) {
                const parent = e.currentTarget.closest('.upload-area, .card, .container, .form-group');
                if (parent) {
                    fileInput = parent.querySelector('input[type="file"]');
                }
            }
            
            // 4. Fallback: Suche nach allen input[type=file]
            if (!fileInput) {
                fileInput = document.querySelector('input[type="file"]');
            }
            
            if (fileInput) {
                fileInput.click();
            } else {
                console.error('Kein File-Input-Element gefunden');
            }
        },
        
        attachDropZoneListeners: function(zone) {
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                zone.addEventListener(eventName, this.preventDefaults, false);
            });
            
            zone.addEventListener('dragenter', () => zone.classList.add('border-primary', 'active'));
            zone.addEventListener('dragover', () => zone.classList.add('border-primary', 'active'));
            zone.addEventListener('dragleave', () => zone.classList.remove('border-primary', 'active'));
            zone.addEventListener('drop', (e) => {
                zone.classList.remove('border-primary', 'active');
                
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    this.handleDirectFileUpload(files[0], zone);
                }
            });
        },
        
        preventDefaults: function(e) {
            e.preventDefault();
            e.stopPropagation();
        },
        
        handleFileSelection: function(e) {
            const file = e.target.files[0];
            if (file) {
                const parent = e.target.closest('.upload-area, .card, .form-group, .container');
                this.processFile(file, parent, e.target);
            }
        },
        
        handleDirectFileUpload: function(file, dropZone) {
            // Finde den zugehörigen file input
            let fileInput = dropZone.querySelector('input[type="file"]');
            
            // Wenn kein direktes Input, suche im Dokument
            if (!fileInput) {
                fileInput = document.querySelector('input[type="file"]');
            }
            
            if (fileInput) {
                // Erstelle ein neues FileList-ähnliches Objekt
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                fileInput.files = dataTransfer.files;
                
                // Löse das change-Event aus
                fileInput.dispatchEvent(new Event('change', { bubbles: true }));
            } else {
                // Wenn kein Input gefunden, verarbeite direkt
                this.processFile(file, dropZone);
            }
        },
        
        processFile: function(file, container, fileInput) {
            // Validiere die Datei
            if (!this.validateFile(file)) return;
            
            // Speichere Datei in der Komponente
            this.fileData = file;
            
            // UI aktualisieren
            this.updateUIWithFileData(file, container);
            
            // Event auslösen für andere Komponenten
            this.dispatchFileEvent(file);
            
            // Analyse automatisch starten wenn "auto-analyze" gesetzt
            if (fileInput && fileInput.dataset.autoAnalyze === 'true') {
                this.startAnalysis(file);
            }
        },
        
        validateFile: function(file) {
            const validTypes = [
                'application/pdf', 
                'application/msword', 
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'text/plain'
            ];
            
            if (!validTypes.includes(file.type)) {
                this.showNotification('Bitte nur PDF, Word oder Textdateien hochladen', 'error');
                return false;
            }
            
            if (file.size > 10 * 1024 * 1024) {
                this.showNotification('Die Datei ist zu groß (max. 10 MB)', 'error');
                return false;
            }
            
            return true;
        },
        
        updateUIWithFileData: function(file, container) {
            // Finde UI-Elemente, die aktualisiert werden müssen
            
            // 1. Upload-Bereich ausblenden, falls vorhanden
            const uploadArea = container ? 
                container.querySelector('.upload-area, .upload-zone, .drop-zone') : 
                document.querySelector('.upload-area, .upload-zone, .drop-zone');
                
            if (uploadArea) {
                uploadArea.classList.add('d-none');
            }
            
            // 2. File-Info-Bereich einblenden und aktualisieren
            const fileInfoSection = container ? 
                container.querySelector('#file-info-section, .file-info, [id*="file-info"]') : 
                document.querySelector('#file-info-section, .file-info, [id*="file-info"]');
                
            if (fileInfoSection) {
                fileInfoSection.classList.remove('d-none');
                
                // Dateiname aktualisieren
                const filenameDisplay = fileInfoSection.querySelector('[id*="filename"], .file-name');
                if (filenameDisplay) filenameDisplay.textContent = file.name;
                
                // Dateigröße aktualisieren
                const filesizeDisplay = fileInfoSection.querySelector('[id*="filesize"], .file-size');
                if (filesizeDisplay) filesizeDisplay.textContent = this.formatFileSize(file.size);
                
                // Dateityp aktualisieren
                const filetypeDisplay = fileInfoSection.querySelector('[id*="filetype"]');
                if (filetypeDisplay) {
                    let typeText = 'Unbekanntes Format';
                    if (file.type === 'application/pdf') typeText = 'PDF Dokument';
                    else if (file.type.includes('word')) typeText = 'Word Dokument';
                    else if (file.type === 'text/plain') typeText = 'Textdatei';
                    filetypeDisplay.textContent = typeText;
                }
            } else {
                // Wenn kein dedizierter File-Info-Bereich existiert, einfache Anzeige
                this.showNotification(`Datei "${file.name}" (${this.formatFileSize(file.size)}) erfolgreich hochgeladen`, 'success');
            }
            
            // 3. Analyse-Button aktivieren, falls vorhanden
            const analyzeBtn = document.querySelector('#analyze-btn, [id*="analyze"], .analyze-btn');
            if (analyzeBtn) {
                analyzeBtn.disabled = false;
                
                // Event-Listener für Analyse-Button, falls noch nicht angehängt
                if (!analyzeBtn.dataset.handlerAttached) {
                    analyzeBtn.addEventListener('click', () => this.startAnalysis(file));
                    analyzeBtn.dataset.handlerAttached = 'true';
                }
            }
            
            // 4. Entfernen-Button einrichten, falls vorhanden
            const removeBtn = document.querySelector('#remove-file-btn, [id*="remove"], .remove-btn');
            if (removeBtn && !removeBtn.dataset.handlerAttached) {
                removeBtn.addEventListener('click', this.resetFileSelection.bind(this));
                removeBtn.dataset.handlerAttached = 'true';
            }
        },
        
        dispatchFileEvent: function(file) {
            // Erstelle ein Event für andere Komponenten
            const fileEvent = new CustomEvent('fileSelected', {
                detail: {
                    file: file,
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    url: URL.createObjectURL(file),
                    timestamp: new Date().toISOString()
                },
                bubbles: true
            });
            
            document.dispatchEvent(fileEvent);
            console.log('FileSelected-Event ausgelöst für:', file.name);
        },
        
        startAnalysis: function(file) {
            // Event für Analyse auslösen
            const analysisEvent = new CustomEvent('startAnalysis', {
                detail: {
                    file: file,
                    url: URL.createObjectURL(file)
                },
                bubbles: true
            });
            
            document.dispatchEvent(analysisEvent);
            console.log('StartAnalysis-Event ausgelöst für:', file.name);
            
            // UI-Feedback
            this.showNotification('Analyse gestartet...', 'info');
            
            // Analyse-Fortschritt anzeigen, falls vorhanden
            const progressSection = document.querySelector('#analysis-progress-section, .analysis-progress');
            if (progressSection) {
                progressSection.classList.remove('d-none');
            }
            
            // Analyse-Button deaktivieren
            const analyzeBtn = document.querySelector('#analyze-btn, .analyze-btn');
            if (analyzeBtn) {
                analyzeBtn.disabled = true;
                analyzeBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Analysiere...';
            }
        },
        
        resetFileSelection: function() {
            // Dateibezogene Daten zurücksetzen
            this.fileData = null;
            
            // File-Input(s) zurücksetzen
            const fileInputs = document.querySelectorAll('input[type="file"]');
            fileInputs.forEach(input => input.value = '');
            
            // UI zurücksetzen
            
            // 1. Upload-Bereich wieder einblenden
            const uploadAreas = document.querySelectorAll('.upload-area, .upload-zone, .drop-zone');
            uploadAreas.forEach(area => area.classList.remove('d-none'));
            
            // 2. File-Info ausblenden
            const fileInfoSections = document.querySelectorAll('#file-info-section, .file-info');
            fileInfoSections.forEach(section => section.classList.add('d-none'));
            
            // 3. Analyse-Bereiche ausblenden
            const progressSections = document.querySelectorAll('#analysis-progress-section, .analysis-progress');
            progressSections.forEach(section => section.classList.add('d-none'));
            
            const resultsSections = document.querySelectorAll('#analysis-results-section, .analysis-results');
            resultsSections.forEach(section => section.classList.add('d-none'));
            
            // 4. Analyze-Button zurücksetzen
            const analyzeBtn = document.querySelector('#analyze-btn, .analyze-btn');
            if (analyzeBtn) {
                analyzeBtn.disabled = false;
                analyzeBtn.innerHTML = '<i class="bi bi-lightning-charge me-2"></i>Jetzt analysieren';
            }
            
            // Event auslösen
            document.dispatchEvent(new CustomEvent('fileSelectionReset', { bubbles: true }));
            
            this.showNotification('Dateiauswahl zurückgesetzt', 'info');
        },
        
        formatFileSize: function(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / k ** i).toFixed(2)) + ' ' + sizes[i];
        },
        
        showNotification: function(message, type = 'info') {
            console.log(`Notification (${type}):`, message);
            
            try {
                // Toast über ein bestehendes Toast-System anzeigen
                const bootstrapToast = document.getElementById('messageToast');
                if (bootstrapToast) {
                    const toastBody = bootstrapToast.querySelector('.toast-body');
                    if (toastBody) {
                        bootstrapToast.className = `toast border-0 bg-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'primary'} text-white`;
                        
                        const icon = type === 'error' ? 'exclamation-triangle' :
                                    type === 'success' ? 'check-circle' : 'info-circle';
                        
                        toastBody.innerHTML = `
                            <div class="d-flex align-items-center">
                                <i class="bi bi-${icon} me-2"></i> ${message}
                            </div>
                        `;
                        
                        const toast = new bootstrap.Toast(bootstrapToast);
                        toast.show();
                        return;
                    }
                }
                
                // Wenn kein Toast-System vorhanden, eigenes erstellen
                const notificationElement = document.createElement('div');
                notificationElement.className = `notification-toast bg-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'primary'}`;
                notificationElement.style.cssText = `
                    position: fixed; top: 20px; right: 20px; z-index: 9999;
                    padding: 15px 20px; border-radius: 8px; color: white;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15); min-width: 300px;
                    transform: translateY(-20px); opacity: 0;
                    transition: all 0.3s ease;
                `;
                
                const icon = type === 'error' ? 'exclamation-triangle' :
                            type === 'success' ? 'check-circle' : 'info-circle';
                
                notificationElement.innerHTML = `
                    <div class="d-flex align-items-center">
                        <i class="bi bi-${icon} me-2 fs-4"></i>
                        <div class="flex-grow-1">${message}</div>
                        <button class="btn btn-sm text-white ms-3" style="font-size: 1.2rem; line-height: 1;">&times;</button>
                    </div>
                `;
                
                document.body.appendChild(notificationElement);
                
                // Animation
                setTimeout(() => {
                    notificationElement.style.transform = 'translateY(0)';
                    notificationElement.style.opacity = '1';
                }, 10);
                
                // Close-Button
                const closeBtn = notificationElement.querySelector('button');
                if (closeBtn) {
                    closeBtn.addEventListener('click', () => {
                        notificationElement.style.transform = 'translateY(-20px)';
                        notificationElement.style.opacity = '0';
                        setTimeout(() => notificationElement.remove(), 300);
                    });
                }
                
                // Auto-close
                setTimeout(() => {
                    if (document.body.contains(notificationElement)) {
                        notificationElement.style.transform = 'translateY(-20px)';
                        notificationElement.style.opacity = '0';
                        setTimeout(() => notificationElement.remove(), 300);
                    }
                }, 5000);
            } catch (error) {
                console.error('Fehler beim Anzeigen der Benachrichtigung:', error);
                alert(message); // Fallback
            }
        }
    };
    
    // Initialisieren nach dem DOM-Laden
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => FileUploadHandler.init());
    } else {
        FileUploadHandler.init();
    }
    
    // Global verfügbar machen
    window.FileUploadHandler = FileUploadHandler;
})(); 