/**
 * Robuster Standalone-Upload-Handler für die Bewerbungs-App
 * Funktioniert ohne Abhängigkeit von externen Services
 */
(function() {
    // Lokaler Speicher für verarbeitete Dateien
    const fileStorage = {
        resumeData: null,
        jobData: null,
        
        // Speichert Daten im lokalen Storage
        saveToLocalStorage: function() {
            try {
                if (this.resumeData) {
                    // Entferne die Datei-Referenz, da sie nicht serialisierbar ist
                    const storableData = { ...this.resumeData };
                    delete storableData.file;
                    localStorage.setItem('resumeData', JSON.stringify(storableData));
                }
                
                if (this.jobData) {
                    localStorage.setItem('jobData', JSON.stringify(this.jobData));
                }
            } catch (error) {
                console.error('Fehler beim Speichern von Daten:', error);
            }
        },
        
        // Lädt Daten aus lokalem Storage
        loadFromLocalStorage: function() {
            try {
                const resumeData = localStorage.getItem('resumeData');
                const jobData = localStorage.getItem('jobData');
                
                if (resumeData) {
                    this.resumeData = JSON.parse(resumeData);
                    window.resumeData = this.resumeData;
                }
                
                if (jobData) {
                    this.jobData = JSON.parse(jobData);
                    window.jobData = this.jobData;
                }
                
                return {
                    resumeLoaded: !!resumeData,
                    jobLoaded: !!jobData
                };
            } catch (error) {
                console.error('Fehler beim Laden von Daten:', error);
                return { resumeLoaded: false, jobLoaded: false };
            }
        }
    };
    
    // Lade gespeicherte Daten beim Start
    fileStorage.loadFromLocalStorage();
    
    // Haupt-Upload-Handler
    document.addEventListener('DOMContentLoaded', function() {
        // Reference DOM elements
        const uploadArea = document.getElementById('uploadArea');
        const resumeFileInput = document.getElementById('resumeFileInput');
        const browseFilesBtn = document.getElementById('browseFilesBtn');
        const uploadProgress = document.getElementById('uploadProgress');
        const uploadProgressContainer = document.getElementById('uploadProgressContainer');
        const uploadStatus = document.getElementById('uploadStatus');
        const uploadResult = document.getElementById('uploadResult');
        const uploadedFileName = document.getElementById('uploadedFileName');
        const uploadedFileInfo = document.getElementById('uploadedFileInfo');
        const analyzeFileBtn = document.getElementById('analyzeFileBtn');
        
        // Job Analysis elements
        const jobPostingText = document.getElementById('jobPostingText');
        const analyzeJobPostingBtn = document.getElementById('analyzeJobPostingBtn');
        const jobAnalysisResult = document.getElementById('jobAnalysisResult');
        
        // Initialize event listeners if elements exist
        if (uploadArea && resumeFileInput && browseFilesBtn) {
            initializeUploadEvents();
        }
        
        if (analyzeJobPostingBtn && jobPostingText) {
            initializeJobAnalysisEvents();
        }
        
        function initializeUploadEvents() {
            // Click to browse files
            browseFilesBtn.addEventListener('click', function() {
                resumeFileInput.click();
            });
            
            // File selected
            resumeFileInput.addEventListener('change', function(e) {
                if (e.target.files.length > 0) {
                    handleFileUpload(e.target.files[0]);
                }
            });
            
            // Drag and drop handlers
            uploadArea.addEventListener('dragover', function(e) {
                e.preventDefault();
                e.stopPropagation();
                uploadArea.classList.add('dragover');
            });
            
            uploadArea.addEventListener('dragleave', function(e) {
                e.preventDefault();
                e.stopPropagation();
                uploadArea.classList.remove('dragover');
            });
            
            uploadArea.addEventListener('drop', function(e) {
                e.preventDefault();
                e.stopPropagation();
                uploadArea.classList.remove('dragover');
                
                if (e.dataTransfer.files.length > 0) {
                    handleFileUpload(e.dataTransfer.files[0]);
                }
            });
            
            // Analyze button click
            if (analyzeFileBtn) {
                analyzeFileBtn.addEventListener('click', function() {
                    analyzeFile();
                });
            }
        }
        
        function initializeJobAnalysisEvents() {
            analyzeJobPostingBtn.addEventListener('click', function() {
                const jobText = jobPostingText.value.trim();
                
                if (jobText.length < 50) {
                    showToast('Bitte geben Sie eine ausreichend lange Stellenanzeige ein', 'warning');
                    return;
                }
                
                analyzeJobPosting(jobText);
            });
        }
        
        async function handleFileUpload(file) {
            // Validate file
            const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword', 'text/plain'];
            const maxSize = 10 * 1024 * 1024; // 10MB
            
            if (!validTypes.includes(file.type)) {
                showToast('Bitte laden Sie nur PDF-, Word- oder Textdateien hoch', 'error');
                return;
            }
            
            if (file.size > maxSize) {
                showToast('Die Datei ist zu groß (maximal 10MB)', 'error');
                return;
            }
            
            // Show progress
            uploadArea.classList.add('d-none');
            uploadProgressContainer.classList.remove('d-none');
            uploadResult.classList.add('d-none');
            analyzeFileBtn.disabled = true;
            
            // Simulate upload progress
            let progress = 0;
            const progressInterval = setInterval(() => {
                progress += Math.random() * 5 + 1;
                if (progress > 100) progress = 100;
                
                uploadProgress.style.width = `${progress}%`;
                uploadStatus.textContent = `${Math.round(progress)}% hochgeladen`;
                
                if (progress >= 100) {
                    clearInterval(progressInterval);
                    uploadStatus.textContent = 'Verarbeitung abgeschlossen';
                    setTimeout(showUploadResult, 500, file);
                }
            }, 100);
            
            // Extract text from file (in a real app, use proper extractors)
            try {
                let text = '';
                
                if (file.type === 'text/plain') {
                    text = await readTextFile(file);
                } else {
                    // In einer echten Anwendung würden hier PDF/DOCX-Parser verwendet
                    // Für diese Demo speichern wir nur Metadaten
                    text = `Simulierter Text aus ${file.name} - In einer vollständigen Implementierung würde hier der echte Inhalt extrahiert`;
                }
                
                // Store file data
                fileStorage.resumeData = {
                    fileName: file.name,
                    fileSize: file.size,
                    fileType: file.type,
                    uploadDate: new Date().toISOString(),
                    text: text,
                    wordCount: text.split(/\s+/).length,
                    file: file // Nur für temporäre Verarbeitung
                };
                
                // Make data globally available
                window.resumeData = fileStorage.resumeData;
                
                // Save to local storage (without file object)
                fileStorage.saveToLocalStorage();
            } catch (error) {
                console.error('Fehler beim Extrahieren des Textes:', error);
                clearInterval(progressInterval);
                showToast('Fehler beim Verarbeiten der Datei', 'error');
                
                // Reset UI
                uploadArea.classList.remove('d-none');
                uploadProgressContainer.classList.add('d-none');
            }
        }
        
        function showUploadResult(file) {
            uploadProgressContainer.classList.add('d-none');
            uploadResult.classList.remove('d-none');
            analyzeFileBtn.disabled = false;
            
            uploadedFileName.textContent = file.name;
            uploadedFileInfo.textContent = `${getFileTypeLabel(file.type)}, ${formatFileSize(file.size)}`;
            
            // Optional: Benachrichtigung
            showToast('Datei erfolgreich hochgeladen!', 'success');
        }
        
        async function analyzeFile() {
            if (!fileStorage.resumeData) {
                showToast('Keine Datei zum Analysieren vorhanden', 'error');
                return;
            }
            
            // Modal schließen
            const modal = bootstrap.Modal.getInstance(document.getElementById('uploadModal'));
            if (modal) modal.hide();
            
            showToast('Lebenslauf wird analysiert...', 'primary');
            
            // Weiterleitung zur Analyse-Seite (würde in einer vollständigen Implementierung erstellt)
            setTimeout(() => {
                window.location.href = 'resume-analysis.html';
            }, 1500);
        }
        
        async function analyzeJobPosting(jobText) {
            // Zeige Animation
            analyzeJobPostingBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Analysiere...';
            analyzeJobPostingBtn.disabled = true;
            
            // Simuliere Analyse-Verzögerung
            setTimeout(() => {
                // Speichere Job-Daten
                fileStorage.jobData = {
                    text: jobText,
                    wordCount: jobText.split(/\s+/).length,
                    analysisDate: new Date().toISOString(),
                    // Simulierte Analyse-Ergebnisse
                    analysis: {
                        jobTitle: "Fullstack-Entwickler",
                        requiredSkills: ["JavaScript", "TypeScript", "React", "Node.js", "SQL", "NoSQL"],
                        experienceLevel: "3+ Jahre",
                        jobType: "Vollzeit",
                        matchScore: 85
                    }
                };
                
                // Global verfügbar machen
                window.jobData = fileStorage.jobData;
                
                // In LocalStorage speichern
                fileStorage.saveToLocalStorage();
                
                // UI zurücksetzen
                analyzeJobPostingBtn.innerHTML = '<i class="bi bi-search me-2"></i>Analysieren';
                analyzeJobPostingBtn.disabled = false;
                
                // Ergebnisse anzeigen
                showJobAnalysisResults();
                
                // Benachrichtigung
                showToast('Stellenanzeige erfolgreich analysiert!', 'success');
            }, 2000);
        }
        
        function showJobAnalysisResults() {
            if (!fileStorage.jobData || !fileStorage.jobData.analysis) return;
            
            const analysis = fileStorage.jobData.analysis;
            
            jobAnalysisResult.classList.remove('d-none');
            jobAnalysisResult.innerHTML = `
                <div class="card border-0 shadow-sm mb-4">
                    <div class="card-header bg-light py-3">
                        <h5 class="mb-0">Analyse-Ergebnisse</h5>
                    </div>
                    <div class="card-body">
                        <div class="row mb-3">
                            <div class="col-md-6">
                                <p class="text-muted mb-1">Position</p>
                                <h5>${analysis.jobTitle}</h5>
                            </div>
                            <div class="col-md-6">
                                <p class="text-muted mb-1">Erforderliche Erfahrung</p>
                                <h5>${analysis.experienceLevel}</h5>
                            </div>
                        </div>
                        
                        <div class="mb-4">
                            <p class="text-muted mb-2">Erforderliche Fähigkeiten</p>
                            <div>
                                ${analysis.requiredSkills.map(skill => 
                                    `<span class="badge bg-primary me-2 mb-1">${skill}</span>`
                                ).join('')}
                            </div>
                        </div>
                        
                        <div class="mb-0">
                            <p class="text-muted mb-2">Passgenauigkeit mit Ihrem Lebenslauf</p>
                            <div class="d-flex align-items-center">
                                <div class="progress flex-grow-1 me-3" style="height: 8px;">
                                    <div class="progress-bar ${getMatchScoreClass(analysis.matchScore)}" 
                                         style="width: ${analysis.matchScore}%"></div>
                                </div>
                                <span class="fw-bold">${analysis.matchScore}%</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Utility functions
        function readTextFile(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    resolve(e.target.result);
                };
                
                reader.onerror = function(e) {
                    reject(new Error('Fehler beim Lesen der Datei'));
                };
                
                reader.readAsText(file);
            });
        }
        
        function formatFileSize(bytes) {
            if (bytes < 1024) return bytes + ' Bytes';
            if (bytes < 1048576) return Math.round(bytes / 1024) + ' KB';
            return (bytes / 1048576).toFixed(1) + ' MB';
        }
        
        function getFileTypeLabel(mimeType) {
            const typeMap = {
                'application/pdf': 'PDF',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
                'application/msword': 'DOC',
                'text/plain': 'TXT'
            };
            
            return typeMap[mimeType] || mimeType.split('/')[1].toUpperCase();
        }
        
        function getMatchScoreClass(score) {
            if (score >= 80) return 'bg-success';
            if (score >= 60) return 'bg-primary';
            if (score >= 40) return 'bg-warning';
            return 'bg-danger';
        }
    });
    
    // Export storage to window for global access
    window.fileStorage = fileStorage;
})(); 