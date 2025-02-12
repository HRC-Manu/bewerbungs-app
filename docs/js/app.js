<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bewerbungsassistent</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css" rel="stylesheet">
    <link href="css/style.css" rel="stylesheet">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
    <script>
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    </script>
</head>
<body class="bg-light">
    <!-- Navigation -->
    <nav class="navbar navbar-expand-lg">
        <div class="container">
            <a class="navbar-brand" href="#">
                <i class="bi bi-file-text me-2"></i>
                Bewerbungsassistent
            </a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                <span class="navbar-toggler-icon"></span>
            </button>
            <div class="collapse navbar-collapse justify-content-end" id="navbarNav">
                <div class="navbar-nav">
                    <button id="helpBtn" class="btn btn-outline-light">
                        <i class="bi bi-question-circle"></i>
                        <span class="ms-2">Hilfe</span>
                    </button>
                </div>
            </div>
        </div>
    </nav>

    <!-- Hauptinhalt -->
    <main class="container-fluid py-4">
        <div class="row g-4">
            <!-- Linke Spalte: Eingabe -->
            <div class="col-lg-6">
                <!-- Fortschrittsanzeige -->
                <div class="progress-stepper mb-4">
                    <div class="step active" id="step1">
                        <div class="step-icon">
                            <i class="bi bi-1-circle"></i>
                        </div>
                        <div class="step-label">Dokumente</div>
                    </div>
                    <div class="step" id="step2">
                        <div class="step-icon">
                            <i class="bi bi-2-circle"></i>
                        </div>
                        <div class="step-label">Stellenanzeige</div>
                    </div>
                    <div class="step" id="step3">
                        <div class="step-icon">
                            <i class="bi bi-3-circle"></i>
                        </div>
                        <div class="step-label">Anschreiben</div>
                    </div>
                </div>

                <!-- Dokumente Upload -->
                <div class="card shadow-sm mb-4" id="uploadSection">
                    <div class="card-header bg-white py-3">
                        <h5 class="card-title mb-0">
                            <i class="bi bi-file-earmark-pdf me-2"></i>
                            Dokumente hochladen
                        </h5>
                    </div>
                    <div class="card-body">
                        <div class="upload-container mb-4">
                            <div class="upload-area" id="resumeUploadArea">
                                <label for="resumeUpload" class="upload-label">
                                    <i class="bi bi-cloud-arrow-up display-4"></i>
                                    <h6>Lebenslauf hochladen</h6>
                                    <p class="text-muted small">PDF-Datei hier ablegen oder klicken</p>
                                </label>
                                <input type="file" id="resumeUpload" accept=".pdf" class="d-none">
                            </div>
                            <div class="file-preview d-none" id="resumePreview">
                                <div class="alert alert-info d-flex align-items-center justify-content-between">
                                    <div class="d-flex align-items-center">
                                        <i class="bi bi-file-pdf me-2"></i>
                                        <span class="file-name"></span>
                                    </div>
                                    <button type="button" class="btn-close" aria-label="Entfernen"></button>
                                </div>
                            </div>
                        </div>
                        
                        <div class="upload-container">
                            <div class="upload-area" id="coverLetterUploadArea">
                                <label for="coverLetterUpload" class="upload-label">
                                    <i class="bi bi-cloud-arrow-up display-4"></i>
                                    <h6>Bestehendes Anschreiben hochladen (optional)</h6>
                                    <p class="text-muted small">PDF-Datei hier ablegen oder klicken</p>
                                </label>
                                <input type="file" id="coverLetterUpload" accept=".pdf" class="d-none">
                            </div>
                            <div class="file-preview d-none" id="coverLetterPreview">
                                <div class="alert alert-info d-flex align-items-center justify-content-between">
                                    <div class="d-flex align-items-center">
                                        <i class="bi bi-file-pdf me-2"></i>
                                        <span class="file-name"></span>
                                    </div>
                                    <button type="button" class="btn-close" aria-label="Entfernen"></button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Stellenanzeige -->
                <div class="card shadow-sm mb-4" id="jobPostingSection">
                    <div class="card-header bg-white py-3">
                        <div class="d-flex justify-content-between align-items-center">
                            <h5 class="card-title mb-0">
                                <i class="bi bi-briefcase me-2"></i>
                                Stellenanzeige
                            </h5>
                            <div class="btn-group">
                                <button class="btn btn-sm btn-outline-primary" id="pasteBtn">
                                    <i class="bi bi-clipboard"></i> Einfügen
                                </button>
                                <button class="btn btn-sm btn-outline-primary" id="loadExampleBtn">
                                    <i class="bi bi-file-text"></i> Beispiel
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="card-body">
                        <textarea class="form-control" id="jobPosting" rows="12" 
                            placeholder="Füge hier die Stellenanzeige ein..."></textarea>
                        
                        <div id="jobAnalysis" class="analysis-section mt-4 d-none">
                            <h6 class="analysis-title">
                                <i class="bi bi-graph-up me-2"></i>
                                Analyse der Stellenanzeige
                            </h6>
                            <div class="analysis-content">
                                <div class="row g-3">
                                    <div class="col-md-6">
                                        <div class="info-card">
                                            <div class="info-card-header">Position</div>
                                            <div class="info-card-body" id="jobTitleAnalysis"></div>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="info-card">
                                            <div class="info-card-header">Unternehmen</div>
                                            <div class="info-card-body" id="companyAnalysis"></div>
                                        </div>
                                    </div>
                                    <div class="col-12">
                                        <div class="info-card">
                                            <div class="info-card-header">Anforderungen</div>
                                            <div class="info-card-body">
                                                <div class="row">
                                                    <div class="col-md-6">
                                                        <h7>Muss</h7>
                                                        <ul class="requirement-list" id="mustHaveList"></ul>
                                                    </div>
                                                    <div class="col-md-6">
                                                        <h7>Optional</h7>
                                                        <ul class="requirement-list" id="niceToHaveList"></ul>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="card-footer bg-white">
                        <button class="btn btn-primary w-100" id="analyzeBtn">
                            <i class="bi bi-magic me-2"></i>
                            Analysieren und Anschreiben erstellen
                        </button>
                    </div>
                </div>

                <!-- Anschreiben Generator -->
                <div class="card shadow-sm" id="coverLetterSection">
                    <div class="card-header bg-white py-3">
                        <div class="d-flex justify-content-between align-items-center">
                            <h5 class="card-title mb-0">
                                <i class="bi bi-pencil me-2"></i>
                                Anschreiben Generator
                            </h5>
                            <button class="btn btn-sm btn-success" id="generateSuggestionsBtn">
                                <i class="bi bi-stars me-2"></i>
                                KI-Vorschläge
                            </button>
                        </div>
                    </div>
                    <div class="card-body">
                        <div id="coverLetterBuilder">
                            <div class="section-group">
                                <div class="section-header">
                                    <span>Empfänger</span>
                                    <button class="btn btn-sm btn-outline-primary suggest-btn" data-section="recipient">
                                        <i class="bi bi-magic"></i>
                                    </button>
                                </div>
                                <textarea class="form-control" id="coverLetterRecipient" rows="2"></textarea>
                            </div>

                            <div class="section-group">
                                <div class="section-header">
                                    <span>Betreff</span>
                                    <button class="btn btn-sm btn-outline-primary suggest-btn" data-section="subject">
                                        <i class="bi bi-magic"></i>
                                    </button>
                                </div>
                                <textarea class="form-control" id="coverLetterSubject" rows="1"></textarea>
                            </div>

                            <div class="section-group">
                                <div class="section-header">
                                    <span>Einleitung</span>
                                    <button class="btn btn-sm btn-outline-primary suggest-btn" data-section="introduction">
                                        <i class="bi bi-magic"></i>
                                    </button>
                                </div>
                                <textarea class="form-control" id="coverLetterIntro" rows="3"></textarea>
                            </div>

                            <div class="section-group">
                                <div class="section-header">
                                    <span>Hauptteil</span>
                                    <button class="btn btn-sm btn-outline-primary suggest-btn" data-section="main">
                                        <i class="bi bi-magic"></i>
                                    </button>
                                </div>
                                <textarea class="form-control" id="coverLetterMain" rows="6"></textarea>
                            </div>

                            <div class="section-group">
                                <div class="section-header">
                                    <span>Abschluss</span>
                                    <button class="btn btn-sm btn-outline-primary suggest-btn" data-section="closing">
                                        <i class="bi bi-magic"></i>
                                    </button>
                                </div>
                                <textarea class="form-control" id="coverLetterClosing" rows="2"></textarea>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Rechte Spalte: Vorschau -->
            <div class="col-lg-6">
                <div class="card shadow-sm sticky-top" style="top: 1rem;">
                    <div class="card-header bg-white py-3">
                        <div class="d-flex justify-content-between align-items-center">
                            <h5 class="card-title mb-0">
                                <i class="bi bi-eye me-2"></i>
                                Vorschau
                            </h5>
                            <div class="btn-group">
                                <button class="btn btn-primary" id="copyBtn">
                                    <i class="bi bi-clipboard me-2"></i>
                                    Kopieren
                                </button>
                                <button class="btn btn-success dropdown-toggle" type="button" id="exportDropdown" data-bs-toggle="dropdown">
                                    <i class="bi bi-download me-2"></i>
                                    Exportieren
                                </button>
                                <ul class="dropdown-menu">
                                    <li>
                                        <a class="dropdown-item" href="#" id="exportWordBtn">
                                            <i class="bi bi-file-word me-2"></i>
                                            Als Word exportieren
                                        </a>
                                    </li>
                                    <li>
                                        <a class="dropdown-item" href="#" id="exportPdfBtn">
                                            <i class="bi bi-file-pdf me-2"></i>
                                            Als PDF exportieren
                                        </a>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="preview-paper">
                            <div id="coverLetterPreview" class="preview-content">
                                <div class="preview-placeholder">
                                    <i class="bi bi-file-text display-1"></i>
                                    <p>Hier erscheint die Vorschau des Anschreibens...</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <!-- Modals -->
    <!-- Vorschläge Modal -->
    <div class="modal fade" id="suggestionsModal" tabindex="-1">
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">
                        <i class="bi bi-lightbulb me-2"></i>
                        KI-Vorschläge
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <div id="suggestionsList" class="suggestions-grid">
                        <!-- Vorschläge werden hier eingefügt -->
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Schließen</button>
                    <button type="button" class="btn btn-primary" id="generateMoreBtn">
                        <i class="bi bi-plus-circle me-2"></i>
                        Weitere Vorschläge
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- Hilfe Modal -->
    <div class="modal fade" id="helpModal" tabindex="-1">
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">
                        <i class="bi bi-question-circle me-2"></i>
                        Hilfe & Tipps
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <div class="accordion" id="helpAccordion">
                        <div class="accordion-item">
                            <h2 class="accordion-header">
                                <button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#collapseOne">
                                    Erste Schritte
                                </button>
                            </h2>
                            <div id="collapseOne" class="accordion-collapse collapse show" data-bs-parent="#helpAccordion">
                                <div class="accordion-body">
                                    <ol class="mb-0">
                                        <li>Laden Sie Ihren Lebenslauf hoch (PDF-Format)</li>
                                        <li>Fügen Sie die Stellenanzeige ein</li>
                                        <li>Klicken Sie auf "Analysieren"</li>
                                        <li>Passen Sie die generierten Vorschläge an</li>
                                        <li>Exportieren Sie das fertige Anschreiben</li>
                                    </ol>
                                </div>
                            </div>
                        </div>
                        <div class="accordion-item">
                            <h2 class="accordion-header">
                                <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseTwo">
                                    Tipps für bessere Ergebnisse
                                </button>
                            </h2>
                            <div id="collapseTwo" class="accordion-collapse collapse" data-bs-parent="#helpAccordion">
                                <div class="accordion-body">
                                    <ul class="mb-0">
                                        <li>Verwenden Sie einen aktuellen, gut formatierten Lebenslauf</li>
                                        <li>Fügen Sie die komplette Stellenanzeige ein</li>
                                        <li>Prüfen und personalisieren Sie die Vorschläge</li>
                                        <li>Nutzen Sie die Analyse-Funktion für Verbesserungen</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Toast Nachrichten -->
    <div class="toast-container position-fixed bottom-0 end-0 p-3">
        <div id="messageToast" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="toast-header">
                <i class="bi bi-info-circle me-2"></i>
                <strong class="me-auto" id="toastTitle">Nachricht</strong>
                <button type="button" class="btn-close" data-bs-dismiss="toast"></button>
            </div>
            <div class="toast-body" id="toastMessage"></div>
        </div>
    </div>

    <!-- Scripts -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/crypto-js@4.2.0/crypto-js.min.js"></script>
    <script>
        // OpenAI API Key wird vom Server injiziert
        window.OPENAI_API_KEY = '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';
    </script>
    <script>
        // Aktiviere Bootstrap Tooltips und Popovers
        document.addEventListener('DOMContentLoaded', function() {
            var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
            var tooltipList = tooltipTriggerList.map(function(tooltipTriggerEl) {
                return new bootstrap.Tooltip(tooltipTriggerEl);
            });

            var popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
            var popoverList = popoverTriggerList.map(function(popoverTriggerEl) {
                return new bootstrap.Popover(popoverTriggerEl);
            });
        });
    </script>
    <script src="js/app.js"></script>
</body>
</html> 
