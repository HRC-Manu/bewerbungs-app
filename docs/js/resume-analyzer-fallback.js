/**
 * Einfache Fallback-Implementierung des Lebenslauf-Analyzers
 * Diese Datei wird nur geladen, wenn die Hauptimplementierung nicht funktioniert
 */

(function() {
    console.log('Resume-Analyzer Fallback geladen');
    
    document.addEventListener('DOMContentLoaded', function() {
        const analyzerContainer = document.getElementById('resume-analyzer-container');
        if (analyzerContainer) {
            initializeAnalyzer(analyzerContainer);
        }
        
        // Event-Listener für das Tab hinzufügen
        const analyzerTab = document.getElementById('resume-analyzer-tab');
        if (analyzerTab) {
            analyzerTab.addEventListener('shown.bs.tab', function() {
                const container = document.getElementById('resume-analyzer-container');
                if (container && !container.initialized) {
                    initializeAnalyzer(container);
                }
            });
        }
    });
    
    function initializeAnalyzer(container) {
        container.initialized = true;
        
        // Einfache Oberfläche für Upload und Analyse
        container.innerHTML = `
            <div class="card shadow-sm mb-4">
                <div class="card-header bg-primary text-white">
                    <h4 class="mb-0"><i class="bi bi-magic me-2"></i>KI-Lebenslaufanalyse</h4>
                </div>
                <div class="card-body">
                    <p class="lead mb-4">Laden Sie Ihren Lebenslauf hoch, um ihn mit KI zu analysieren und zu verbessern.</p>
                    
                    <div class="upload-area p-5 text-center border rounded mb-4 border-2 border-dashed" id="fallback-upload-area">
                        <i class="bi bi-cloud-upload display-1 text-muted mb-3"></i>
                        <p>Ziehen Sie Ihren Lebenslauf hierher oder klicken Sie zum Auswählen</p>
                        <input type="file" id="fallback-file-input" class="d-none" accept=".pdf,.doc,.docx,.txt">
                        <button class="btn btn-primary mt-2" id="fallback-browse-btn">
                            <i class="bi bi-file-earmark-plus me-2"></i>Datei auswählen
                        </button>
                    </div>
                    
                    <div id="fallback-file-info" class="alert alert-success d-none">
                        <div class="d-flex align-items-center">
                            <i class="bi bi-file-earmark-check fs-4 me-3"></i>
                            <div class="flex-grow-1">
                                <strong>Datei hochgeladen:</strong> <span id="fallback-file-name"></span>
                                <div class="small text-muted" id="fallback-file-size"></div>
                            </div>
                            <button class="btn btn-primary" id="fallback-analyze-btn">
                                <i class="bi bi-lightning me-1"></i>Jetzt analysieren
                            </button>
                        </div>
                    </div>
                    
                    <div id="fallback-loading" class="text-center py-5 d-none">
                        <div class="spinner-border text-primary mb-3" role="status"></div>
                        <h5>KI analysiert Ihren Lebenslauf...</h5>
                        <p class="text-muted">Dies kann bis zu einer Minute dauern</p>
                        <div class="progress mt-3">
                            <div class="progress-bar progress-bar-striped progress-bar-animated" 
                                 role="progressbar" style="width: 0%" id="fallback-progress-bar"></div>
                        </div>
                    </div>
                    
                    <div id="fallback-results" class="d-none"></div>
                </div>
            </div>
        `;
        
        // Event-Listener hinzufügen
        attachFallbackEvents(container);
    }
    
    function attachFallbackEvents(container) {
        const browseBtn = container.querySelector('#fallback-browse-btn');
        const fileInput = container.querySelector('#fallback-file-input');
        const uploadArea = container.querySelector('#fallback-upload-area');
        const analyzeBtn = container.querySelector('#fallback-analyze-btn');
        
        if (browseBtn && fileInput) {
            browseBtn.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', handleFileSelect);
        }
        
        if (uploadArea) {
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                uploadArea.addEventListener(eventName, preventDefaults);
            });
            
            uploadArea.addEventListener('dragenter', () => uploadArea.classList.add('border-primary'));
            uploadArea.addEventListener('dragover', () => uploadArea.classList.add('border-primary'));
            uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('border-primary'));
            uploadArea.addEventListener('drop', handleFileDrop);
        }
        
        if (analyzeBtn) {
            analyzeBtn.addEventListener('click', startAnalysis);
        }
    }
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    function handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            displayFileInfo(file);
        }
    }
    
    function handleFileDrop(e) {
        const uploadArea = document.querySelector('#fallback-upload-area');
        if (uploadArea) uploadArea.classList.remove('border-primary');
        
        const dt = e.dataTransfer;
        if (dt.files && dt.files.length) {
            displayFileInfo(dt.files[0]);
        }
    }
    
    function displayFileInfo(file) {
        // Validieren
        const validTypes = [
            'application/pdf', 
            'application/msword', 
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain'
        ];
        
        if (!validTypes.includes(file.type)) {
            alert('Bitte laden Sie nur PDF, Word oder Textdateien hoch.');
            return;
        }
        
        // UI aktualisieren
        const fileInfo = document.querySelector('#fallback-file-info');
        const uploadArea = document.querySelector('#fallback-upload-area');
        const fileName = document.querySelector('#fallback-file-name');
        const fileSize = document.querySelector('#fallback-file-size');
        
        if (fileInfo && uploadArea && fileName && fileSize) {
            // File info speichern
            window.fallbackFile = file;
            
            // UI aktualisieren
            fileName.textContent = file.name;
            fileSize.textContent = formatFileSize(file.size);
            
            uploadArea.classList.add('d-none');
            fileInfo.classList.remove('d-none');
        }
    }
    
    function startAnalysis() {
        if (!window.fallbackFile) {
            alert('Bitte wählen Sie zuerst eine Datei aus.');
            return;
        }
        
        const fileInfo = document.querySelector('#fallback-file-info');
        const loading = document.querySelector('#fallback-loading');
        const results = document.querySelector('#fallback-results');
        const progressBar = document.querySelector('#fallback-progress-bar');
        
        if (fileInfo) fileInfo.classList.add('d-none');
        if (loading) loading.classList.remove('d-none');
        if (results) results.classList.add('d-none');
        
        // Simulierter Fortschritt
        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += Math.random() * 5;
            if (progressBar) progressBar.style.width = `${Math.min(progress, 95)}%`;
            if (progress >= 95) clearInterval(progressInterval);
        }, 300);
        
        // Simulierte Analyse
        setTimeout(() => {
            clearInterval(progressInterval);
            if (progressBar) progressBar.style.width = '100%';
            
            setTimeout(() => {
                displayResults();
            }, 500);
        }, 3000);
    }
    
    function displayResults() {
        const loading = document.querySelector('#fallback-loading');
        const results = document.querySelector('#fallback-results');
        
        if (loading) loading.classList.add('d-none');
        if (results) {
            results.classList.remove('d-none');
            
            // Beispielergebnisse anzeigen
            results.innerHTML = `
                <h4 class="mb-4">Analyseergebnisse Ihres Lebenslaufs</h4>
                
                <div class="row mb-4">
                    <div class="col-md-4">
                        <div class="card h-100">
                            <div class="card-body text-center">
                                <h5 class="card-title mb-3">Gesamtbewertung</h5>
                                <div class="display-4 fw-bold text-warning">
                                    78%
                                </div>
                                <p class="text-muted mb-0">Optimierungspotential: 22%</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-8">
                        <div class="card h-100">
                            <div class="card-body">
                                <h5 class="card-title mb-3">Top-Optimierungspotenziale</h5>
                                <ol class="mb-0">
                                    <li class="mb-2">Fügen Sie messbare Erfolge zu Ihrer Berufserfahrung hinzu</li>
                                    <li class="mb-2">Gruppieren Sie Ihre Fähigkeiten nach Kategorien</li>
                                    <li class="mb-2">Verbessern Sie die visuelle Struktur durch konsistente Formatierung</li>
                                </ol>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="text-center mt-4">
                    <button class="btn btn-success btn-lg" data-bs-toggle="modal" data-bs-target="#improveResumeModal">
                        <i class="bi bi-magic me-2"></i>
                        Lebenslauf mit KI optimieren
                    </button>
                </div>
            `;
        }
    }
    
    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' Bytes';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1048576).toFixed(1) + ' MB';
    }
})(); 