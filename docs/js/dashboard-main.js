/**
 * Hauptfunktionalität für das Dashboard und die Lebenslaufanalyse
 */
 
document.addEventListener('DOMContentLoaded', function() {
    console.log('Dashboard initialisiert');
    
    // Globale Referenzen auf wichtige UI-Elemente
    const resumeUpload = document.getElementById('resumeUpload');
    const uploadArea = document.getElementById('resumeUploadArea');
    const filePreview = document.querySelector('.file-preview');
    const progressBar = document.querySelector('.progress-bar');
    const progressContainer = document.querySelector('.progress');
    const continueBtn = document.getElementById('continueBtn');
    const aiAnalysisCard = document.getElementById('aiAnalysisCard');
    
    // Prüfen, ob alle erforderlichen Elemente vorhanden sind
    const requiredElements = { resumeUpload, uploadArea, filePreview, progressBar, progressContainer };
    for (const [name, element] of Object.entries(requiredElements)) {
        if (!element) {
            console.error(`Erforderliches Element nicht gefunden: ${name}`);
        }
    }
    
    // Event-Listener für Datei-Upload
    if (resumeUpload) {
        resumeUpload.addEventListener('change', handleFileUpload);
        console.log('Datei-Upload-Listener hinzugefügt');
    }
    
    // Event-Listener für Drag & Drop
    if (uploadArea) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, preventDefaults);
        });
        
        uploadArea.addEventListener('dragenter', () => uploadArea.classList.add('drag-active'));
        uploadArea.addEventListener('dragover', () => uploadArea.classList.add('drag-active'));
        uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-active'));
        uploadArea.addEventListener('drop', handleDrop);
        
        console.log('Drag & Drop-Listener hinzugefügt');
    }
    
    // Remove File Button
    const removeFileBtn = document.getElementById('removeFile');
    if (removeFileBtn) {
        removeFileBtn.addEventListener('click', resetFileUpload);
        console.log('Remove-File-Listener hinzugefügt');
    }
    
    // Continue Button
    if (continueBtn) {
        continueBtn.addEventListener('click', () => {
            const workflowProgress = document.getElementById('workflowProgress');
            if (workflowProgress) {
                workflowProgress.style.width = '40%';
                workflowProgress.setAttribute('aria-valuenow', '40');
            }
            
            showToast('Weiter zu Schritt 2: Stellenanzeige', 'info');
        });
    }
    
    // Event-Listener direkt testen
    console.log('Test: Suche nach Elementen...');
    document.querySelectorAll('button').forEach(button => {
        console.log('Button gefunden:', button.id || button.textContent.trim());
    });
    
    // Funktionen
    
    function handleFileUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            // Validierung
            validateFile(file);
            
            // UI aktualisieren
            showFileInfo(file);
            
            // Fortschrittsanzeige starten
            showUploadProgress();
            
            // Datei hochladen
            uploadFile(file).then(() => {
                // Analyse starten
                startAnalysis(file);
            }).catch(error => {
                showError(error.message);
            });
            
        } catch (error) {
            showError(error.message);
        }
    }
    
    function handleDrop(e) {
        uploadArea.classList.remove('drag-active');
        
        const files = e.dataTransfer.files;
        if (files.length) {
            try {
                const file = files[0];
                validateFile(file);
                
                // Datei in das Input-Element setzen
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                resumeUpload.files = dataTransfer.files;
                
                // Rest wie bei handleFileUpload
                showFileInfo(file);
                showUploadProgress();
                
                uploadFile(file).then(() => {
                    startAnalysis(file);
                }).catch(error => {
                    showError(error.message);
                });
                
            } catch (error) {
                showError(error.message);
            }
        }
    }
    
    function validateFile(file) {
        const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
        
        if (!validTypes.includes(file.type)) {
            throw new Error('Bitte laden Sie ein PDF, DOCX oder TXT-Dokument hoch');
        }
        
        if (file.size > 10 * 1024 * 1024) {
            throw new Error('Die Datei ist zu groß (max. 10 MB)');
        }
    }
    
    function showFileInfo(file) {
        if (filePreview && uploadArea) {
            const fileName = filePreview.querySelector('.file-name');
            const fileSize = filePreview.querySelector('.file-size');
            
            if (fileName && fileSize) {
                fileName.textContent = file.name;
                fileSize.textContent = formatFileSize(file.size);
                
                uploadArea.classList.add('d-none');
                filePreview.classList.remove('d-none');
            }
        }
    }
    
    function showUploadProgress() {
        if (progressContainer && progressBar) {
            progressContainer.classList.remove('d-none');
            
            // Simulierter Fortschritt
            let progress = 0;
            const interval = setInterval(() => {
                progress += 5;
                progressBar.style.width = `${Math.min(progress, 95)}%`;
                
                if (progress >= 95) {
                    clearInterval(interval);
                }
            }, 100);
            
            // Damit wir später den Interval löschen können
            window.lastProgressInterval = interval;
        }
    }
    
    function startAnalysis(file) {
        if (window.lastProgressInterval) {
            clearInterval(window.lastProgressInterval);
        }
        
        if (progressBar) {
            progressBar.style.width = '100%';
        }
        
        // AI-Analyse-Karte anzeigen
        if (aiAnalysisCard) {
            aiAnalysisCard.classList.remove('d-none');
            
            // Analyse-Event auslösen - dieses Event wird von ai-resume-analyzer.js verarbeitet
            const analysisEvent = new CustomEvent('resumeUploaded', {
                detail: {
                    fileId: 'local-' + Date.now(),
                    fileName: file.name,
                    fileUrl: URL.createObjectURL(file)
                },
                bubbles: true
            });
            
            document.dispatchEvent(analysisEvent);
        }
        
        // Continue-Button aktivieren
        if (continueBtn) {
            continueBtn.disabled = false;
        }
    }
    
    async function uploadFile(file) {
        // In einer echten App würden wir hier Firebase Storage verwenden
        // Für dieses Beispiel simulieren wir den Upload
        return new Promise((resolve) => {
            setTimeout(() => {
                console.log('Datei erfolgreich hochgeladen (simuliert):', file.name);
                resolve({success: true});
            }, 1500);
        });
    }
    
    function resetFileUpload() {
        if (resumeUpload) resumeUpload.value = '';
        
        if (uploadArea) uploadArea.classList.remove('d-none');
        if (filePreview) filePreview.classList.add('d-none');
        
        if (progressContainer) progressContainer.classList.add('d-none');
        if (progressBar) progressBar.style.width = '0%';
        
        if (continueBtn) continueBtn.disabled = true;
        
        if (aiAnalysisCard) aiAnalysisCard.classList.add('d-none');
        
        if (window.lastProgressInterval) {
            clearInterval(window.lastProgressInterval);
        }
    }
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' Bytes';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1048576).toFixed(1) + ' MB';
    }
    
    function showError(message) {
        console.error('Fehler:', message);
        showToast(message, 'danger');
        
        resetFileUpload();
    }
    
    function showToast(message, type = 'info') {
        try {
            const toast = document.getElementById('messageToast');
            const toastBody = document.querySelector('#messageToast .toast-body');
            
            if (toast && toastBody) {
                // Toast-Farbe setzen
                toast.className = `toast border-0 bg-${type === 'danger' ? 'danger' : type === 'success' ? 'success' : 'primary'} text-white`;
                
                // Toast-Text setzen
                toastBody.innerHTML = `
                    <div class="d-flex align-items-center">
                        <i class="bi bi-${type === 'danger' ? 'exclamation-triangle' : type === 'success' ? 'check-circle' : 'info-circle'} me-2"></i>
                        ${message}
                    </div>
                `;
                
                // Toast anzeigen
                const bsToast = new bootstrap.Toast(toast, {delay: 5000});
                bsToast.show();
            } else {
                // Fallback auf Alert
                alert(message);
            }
        } catch (error) {
            console.error('Toast error:', error);
            alert(message);
        }
    }
}); 