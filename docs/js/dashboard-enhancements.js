/**
 * Erweiterte Funktionalität für das Dashboard
 */

document.addEventListener('DOMContentLoaded', () => {
    // UI-Elemente
    const continueBtn = document.getElementById('continueBtn');
    const beforeBtn = document.getElementById('beforeBtn');
    const afterBtn = document.getElementById('afterBtn');
    const beforeContent = document.getElementById('beforeContent');
    const afterContent = document.getElementById('afterContent');
    const applyImprovementsBtn = document.getElementById('applyImprovementsBtn');
    
    // Verbesserungsvorschau umschalten
    if (beforeBtn && afterBtn && beforeContent && afterContent) {
        beforeBtn.addEventListener('click', () => {
            beforeBtn.classList.add('active');
            afterBtn.classList.remove('active');
            beforeContent.classList.remove('d-none');
            afterContent.classList.add('d-none');
        });
        
        afterBtn.addEventListener('click', () => {
            beforeBtn.classList.remove('active');
            afterBtn.classList.add('active');
            beforeContent.classList.add('d-none');
            afterContent.classList.remove('d-none');
        });
    }
    
    // Verbesserungen anwenden
    if (applyImprovementsBtn) {
        applyImprovementsBtn.addEventListener('click', () => {
            // Hier würde normalerweise die Anwendung der Verbesserungen erfolgen
            
            // Feedback für den Benutzer
            applyImprovementsBtn.innerHTML = `
                <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Verbesserungen werden angewendet...
            `;
            applyImprovementsBtn.disabled = true;
            
            // Simulierte Verzögerung für die Verarbeitung
            setTimeout(() => {
                // UI-Feedback: Modal schließen und Toast anzeigen
                const modal = bootstrap.Modal.getInstance(document.getElementById('improveResumeModal'));
                if (modal) modal.hide();
                
                // Toast anzeigen
                showToast('Verbesserungen erfolgreich angewendet!', 'success');
                
                // Button zurücksetzen (falls Modal nicht geschlossen wird)
                applyImprovementsBtn.innerHTML = `<i class="bi bi-magic me-2"></i>Verbesserungen anwenden`;
                applyImprovementsBtn.disabled = false;
                
                // Eventuelle UI-Updates
                if (continueBtn) {
                    continueBtn.innerHTML = `
                        <i class="bi bi-check-circle me-2"></i>
                        Mit optimiertem Lebenslauf fortfahren
                    `;
                }
            }, 1500);
        });
    }
    
    // Weiter-Button
    if (continueBtn) {
        continueBtn.addEventListener('click', () => {
            const progressBar = document.getElementById('workflowProgress');
            if (progressBar) {
                progressBar.style.width = '40%';
                progressBar.setAttribute('aria-valuenow', '40');
            }
            
            // Hier würde normalerweise der Übergang zum nächsten Schritt erfolgen
            showToast('Weiter zu Schritt 2: Stellenanzeige', 'info');
            
            // Simulierter Wechsel zum nächsten Schritt
            // In einer echten Anwendung würde hier die Navigation zum nächsten Schritt erfolgen
        });
    }
    
    // Verbesserte Drag & Drop-Funktionalität
    const uploadArea = document.getElementById('resumeUploadArea');
    if (uploadArea) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, preventDefaults);
        });
        
        uploadArea.addEventListener('dragenter', () => uploadArea.classList.add('drag-active'));
        uploadArea.addEventListener('dragover', () => uploadArea.classList.add('drag-active'));
        uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-active'));
        uploadArea.addEventListener('drop', (e) => {
            uploadArea.classList.remove('drag-active');
            
            // Dateiverarbeitung
            const files = e.dataTransfer.files;
            if (files.length) {
                const resumeUpload = document.getElementById('resumeUpload');
                if (resumeUpload) {
                    // Dateityp überprüfen
                    const file = files[0];
                    const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
                    
                    if (validTypes.includes(file.type)) {
                        // Datei dem Input zuweisen
                        const dataTransfer = new DataTransfer();
                        dataTransfer.items.add(file);
                        resumeUpload.files = dataTransfer.files;
                        
                        // Change-Event auslösen, um Dateiverarbeitung anzustoßen
                        resumeUpload.dispatchEvent(new Event('change', { bubbles: true }));
                    } else {
                        showToast('Bitte nur PDF oder Word-Dokumente hochladen', 'danger');
                    }
                }
            }
        });
    }
    
    // Hilfsfunktionen
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    function showToast(message, type = 'info') {
        try {
            const toast = document.getElementById('messageToast');
            const toastBody = document.querySelector('#messageToast .toast-body');
            
            if (toast && toastBody) {
                // Toast-Farbe je nach Typ setzen
                toast.className = `toast border-0 bg-${type === 'danger' ? 'danger' : type === 'success' ? 'success' : 'primary'} text-white`;
                
                // Toast-Text setzen
                toastBody.innerHTML = `
                    <div class="d-flex align-items-center">
                        <i class="bi bi-${type === 'danger' ? 'exclamation-triangle' : type === 'success' ? 'check-circle' : 'info-circle'} me-2"></i>
                        ${message}
                    </div>
                `;
                
                // Toast zeigen
                const bsToast = new bootstrap.Toast(toast, { delay: 5000 });
                bsToast.show();
            } else {
                // Fallback
                alert(message);
            }
        } catch (error) {
            console.error('Toast error:', error);
            alert(message);
        }
    }
}); 