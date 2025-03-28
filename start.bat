<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bewerbungsassistent</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css" rel="stylesheet">
    <link href="css/style.css" rel="stylesheet">
</head>
<body class="bg-light">
    <!-- Navigation -->
    <nav class="navbar navbar-expand-lg">
        <div class="container">
            <a class="navbar-brand" href="#">
                <i class="bi bi-file-text me-2"></i>
                Bewerbungsassistent
            </a>
            <div class="navbar-nav ms-auto">
                <div class="auth-buttons me-3" id="authButtons">
                    <button id="loginBtn" class="btn btn-light">
                        <i class="bi bi-box-arrow-in-right"></i>
                        <span class="ms-2">Anmelden</span>
                    </button>
                </div>
                <div class="user-menu d-none" id="userMenu">
                    <div class="dropdown">
                        <button class="btn btn-outline-light dropdown-toggle" type="button" id="userDropdown" data-bs-toggle="dropdown">
                            <i class="bi bi-person-circle me-2"></i>
                            <span id="userDisplayName">Benutzer</span>
                        </button>
                        <ul class="dropdown-menu dropdown-menu-end">
                            <li>
                                <a class="dropdown-item" href="#" id="profileBtn">
                                    <i class="bi bi-person me-2"></i>
                                    Profil
                                </a>
                            </li>
                            <li>
                                <a class="dropdown-item" href="#" id="settingsBtn">
                                    <i class="bi bi-gear me-2"></i>
                                    Einstellungen
                                </a>
                            </li>
                            <li><hr class="dropdown-divider"></li>
                            <li>
                                <a class="dropdown-item" href="#" id="logoutBtn">
                                    <i class="bi bi-box-arrow-right me-2"></i>
                                    Abmelden
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>
                <button id="helpBtn" class="btn btn-outline-light ms-2">
                    <i class="bi bi-question-circle"></i>
                    <span class="ms-2">Hilfe</span>
                </button>
            </div>
        </div>
    </nav>

    <!-- Hauptinhalt -->
    <main class="container py-5">
        <div class="row justify-content-center">
            <div class="col-lg-8">
                <!-- Willkommenskarte -->
                <div class="card shadow-sm mb-4 welcome-card">
                    <div class="card-body text-center py-5">
                        <h1 class="display-4 mb-4">
                            <span class="text-primary">AI</span>-Bewerbungsass<i class="bi bi-magic text-primary"></i>stent
                        </h1>
                        <p class="lead mb-4">Erstellen Sie professionelle Bewerbungen mit KI-Unterstützung</p>
                        <button id="startBtn" class="btn btn-primary btn-lg">
                            <i class="bi bi-play-circle me-2"></i>
                            Bewerbungsprozess starten
                        </button>
                    </div>
                </div>

                <!-- Optionskarten -->
                <div class="row g-4">
                    <!-- Lebenslauf Option -->
                    <div class="col-md-6">
                        <div class="card shadow-sm h-100">
                            <div class="card-body text-center p-4">
                                <i class="bi bi-file-person display-4 mb-3 text-primary"></i>
                                <h3>Lebenslauf</h3>
                                <p class="text-muted mb-4">Laden Sie Ihren Lebenslauf hoch oder erstellen Sie einen neuen</p>
                                <div class="d-grid gap-2">
                                    <button id="uploadResumeBtn" class="btn btn-outline-primary">
                                        <i class="bi bi-upload me-2"></i>
                                        Lebenslauf hochladen
                                    </button>
                                    <button id="createResumeBtn" class="btn btn-outline-primary">
                                        <i class="bi bi-pencil me-2"></i>
                                        Neuen Lebenslauf erstellen
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Anschreiben Option -->
                    <div class="col-md-6">
                        <div class="card shadow-sm h-100">
                            <div class="card-body text-center p-4">
                                <i class="bi bi-file-text display-4 mb-3 text-primary"></i>
                                <h3>Anschreiben</h3>
                                <p class="text-muted mb-4">Erstellen Sie ein neues Anschreiben oder laden Sie ein bestehendes als Vorlage hoch</p>
                                <div class="d-grid gap-2">
                                    <button id="createCoverLetterBtn" class="btn btn-outline-primary">
                                        <i class="bi bi-pencil me-2"></i>
                                        Neues Anschreiben erstellen
                                    </button>
                                    <button id="uploadCoverLetterBtn" class="btn btn-outline-primary">
                                        <i class="bi bi-upload me-2"></i>
                                        Anschreiben hochladen
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <!-- Modals -->
    <!-- Workflow Modal -->
    <div class="modal fade" id="workflowModal" tabindex="-1" data-bs-backdrop="static">
        <div class="modal-dialog modal-xl modal-dialog-scrollable">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Bewerbungsprozess</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Schließen"></button>
                </div>
                <div class="modal-body p-0">
                    <!-- Workflow Steps -->
                    <div class="workflow-container">
                        <!-- Step 1: Lebenslauf-Analyse -->
                        <div class="workflow-step" id="step1">
                            <div class="step-header">
                                <h4>1. Lebenslauf-Analyse</h4>
                                <p class="text-muted">Analyse Ihrer Qualifikationen und Erfahrungen</p>
                            </div>
                            <div class="step-content">
                                <div id="resumeAnalysis" class="analysis-results"></div>
                            </div>
                        </div>

                        <!-- Step 2: Stellenanzeige -->
                        <div class="workflow-step d-none" id="step2">
                            <div class="step-header">
                                <h4>2. Stellenanzeige</h4>
                                <p class="text-muted">Fügen Sie die Stellenanzeige ein oder geben Sie eine URL an</p>
                            </div>
                            <div class="step-content">
                                <div class="mb-3">
                                    <input type="text" id="jobPostingURL" class="form-control" 
                                           placeholder="https://www.example.com/job/12345">
                                    <small class="text-muted">URL zur Stellenanzeige (optional)</small>
                                </div>
                                <div class="mb-3">
                                    <textarea id="jobPosting" class="form-control" rows="8"
                                            placeholder="Fügen Sie hier die Stellenanzeige ein..."></textarea>
                                </div>
                                <div id="jobAnalysis" class="analysis-results d-none"></div>
                            </div>
                        </div>

                        <!-- Step 3: Matching & Vorschläge -->
                        <div class="workflow-step d-none" id="step3">
                            <div class="step-header">
                                <h4>3. Matching & Vorschläge</h4>
                                <p class="text-muted">KI-basierte Analyse und Anpassungsvorschläge</p>
                            </div>
                            <div class="step-content">
                                <div id="matchingResults" class="matching-results"></div>
                                <div id="suggestions" class="suggestions-grid"></div>
                            </div>
                        </div>

                        <!-- Step 4: Anschreiben-Generator -->
                        <div class="workflow-step d-none" id="step4">
                            <div class="step-header">
                                <h4>4. Anschreiben-Generator</h4>
                                <p class="text-muted">Personalisiertes Anschreiben erstellen</p>
                            </div>
                            <div class="step-content">
                                <div id="coverLetterEditor"></div>
                            </div>
                        </div>

                        <!-- Step 5: Finalisierung -->
                        <div class="workflow-step d-none" id="step5">
                            <div class="step-header">
                                <h4>5. Finalisierung</h4>
                                <p class="text-muted">Überprüfen und exportieren</p>
                            </div>
                            <div class="step-content">
                                <div class="preview-container"></div>
                                <div class="export-options"></div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer justify-content-between">
                    <button type="button" class="btn btn-secondary" id="prevStepBtn">
                        <i class="bi bi-arrow-left me-2"></i>
                        Zurück
                    </button>
                    <button type="button" class="btn btn-primary" id="nextStepBtn">
                        Weiter
                        <i class="bi bi-arrow-right ms-2"></i>
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- Resume Creator Modal -->
    <div class="modal fade" id="resumeCreatorModal" tabindex="-1">
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Lebenslauf erstellen</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Schließen"></button>
                </div>
                <div class="modal-body">
                    <div id="resumeBuilder" class="resume-builder-container"></div>
                </div>
            </div>
        </div>
    </div>

    <!-- Settings Modal -->
    <div class="modal fade" id="settingsModal" tabindex="-1">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Einstellungen</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Schließen"></button>
                </div>
                <div class="modal-body">
                    <form id="settingsForm">
                        <div class="mb-3">
                            <label for="aiProvider" class="form-label">KI-Provider</label>
                            <select class="form-select" id="aiProvider" aria-label="KI-Provider auswählen">
                                <option value="openai">OpenAI (GPT-4)</option>
                                <option value="anthropic">Anthropic (Claude)</option>
                                <option value="local">Lokales Modell</option>
                            </select>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">API-Schlüssel</label>
                            <input type="password" class="form-control" id="apiKey">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Anschreiben-Stil</label>
                            <select class="form-select" id="letterStyle">
                                <option value="formal">Formell</option>
                                <option value="modern">Modern</option>
                                <option value="creative">Kreativ</option>
                            </select>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-primary" id="saveSettingsBtn">Speichern</button>
                </div>
            </div>
        </div>
    </div>

    <!-- Preview Modal -->
    <div class="modal fade" id="previewModal" tabindex="-1">
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Vorschau</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Schließen"></button>
                </div>
                <div class="modal-body">
                    <!-- Design Controls -->
                    <div class="mb-3 d-flex gap-2 align-items-center">
                        <input type="color" id="colorPicker" class="form-control form-control-color" 
                               title="Wählen Sie eine Farbe">
                        <select id="fontSelect" class="form-select w-auto">
                            <option value="Arial">Arial</option>
                            <option value="Times New Roman">Times New Roman</option>
                            <option value="Calibri">Calibri</option>
                        </select>
                        <div class="form-check">
                            <input type="checkbox" id="borderToggle" class="form-check-input">
                            <label class="form-check-label" for="borderToggle">Rahmen anzeigen</label>
                        </div>
                        <button id="refreshPreviewBtn" class="btn btn-outline-primary">
                            <i class="bi bi-arrow-clockwise"></i>
                        </button>
                    </div>
                    
                    <!-- Preview Container -->
                    <div id="modernPreviewContainer" class="preview-container p-4 border rounded">
                        <!-- Content will be inserted here -->
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Help Modal -->
    <div class="modal fade" id="helpModal" tabindex="-1">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Hilfe</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Schließen"></button>
                </div>
                <div class="modal-body">
                    <div class="accordion" id="helpAccordion">
                        <div class="accordion-item">
                            <h2 class="accordion-header">
                                <button class="accordion-button" type="button" data-bs-toggle="collapse" 
                                        data-bs-target="#collapseOne">
                                    Erste Schritte
                                </button>
                            </h2>
                            <div id="collapseOne" class="accordion-collapse collapse show" 
                                 data-bs-parent="#helpAccordion">
                                <div class="accordion-body">
                                    <ol>
                                        <li>Wählen Sie eine Option für Ihren Lebenslauf</li>
                                        <li>Optional: Laden Sie ein bestehendes Anschreiben hoch</li>
                                        <li>Klicken Sie auf "Bewerbungsprozess starten"</li>
                                        <li>Folgen Sie dem geführten Prozess</li>
                                    </ol>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Progress Bar Container -->
    <div class="progress-container position-fixed bottom-0 start-0 end-0">
        <div class="progress">
            <div id="progressBar" class="progress-bar" role="progressbar" style="width: 0%"></div>
        </div>
    </div>

    <!-- Feature Buttons -->
    <div class="feature-buttons d-none">
        <button id="interviewerName" class="btn btn-outline-secondary">
            <i class="bi bi-person"></i> Interviewer
        </button>
        
        <div class="input-group">
            <input type="url" id="remotePdfURL" class="form-control" 
                   placeholder="PDF URL eingeben">
            <button id="loadRemotePdfBtn" class="btn btn-outline-primary">
                <i class="bi bi-cloud-download"></i> Laden
            </button>
        </div>
        
        <button id="ttsBtn" class="btn btn-outline-secondary">
            <i class="bi bi-volume-up"></i> Vorlesen
        </button>
        
        <button id="similarityBtn" class="btn btn-outline-info">
            <i class="bi bi-search"></i> Ähnlichkeit prüfen
        </button>
        
        <div class="form-check form-switch">
            <input type="checkbox" id="multiPageToggle" class="form-check-input">
            <label class="form-check-label" for="multiPageToggle">Mehrseitige Ansicht</label>
        </div>
        
        <button id="pdfExportBtn" class="btn btn-outline-primary">
            <i class="bi bi-file-pdf"></i> Als PDF exportieren
        </button>
        
        <button id="collabConnectBtn" class="btn btn-outline-success">
            <i class="bi bi-people"></i> Live-Kollaboration
        </button>
        
        <button id="archiveBtn" class="btn btn-outline-secondary">
            <i class="bi bi-archive"></i> Archivieren
        </button>
    </div>

    <!-- Toast Container -->
    <div class="toast-container position-fixed bottom-0 end-0 p-3">
        <div id="messageToast" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="toast-header">
                <i class="bi bi-info-circle me-2"></i>
                <strong class="me-auto" id="toastTitle">Nachricht</strong>
                <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
            <div class="toast-body" id="toastMessage"></div>
        </div>
    </div>

    <!-- Login Modal -->
    <div class="modal fade" id="loginModal" tabindex="-1">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Anmelden</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Schließen"></button>
                </div>
                <div class="modal-body">
                    <form id="loginForm">
                        <div class="mb-3">
                            <label class="form-label">E-Mail</label>
                            <input type="email" class="form-control" id="loginEmail" required>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Passwort</label>
                            <div class="input-group">
                                <input type="password" class="form-control" id="loginPassword" required>
                                <button class="btn btn-outline-secondary toggle-password" type="button" aria-label="Passwort anzeigen/verbergen">
                                    <i class="bi bi-eye" aria-hidden="true"></i>
                                </button>
                            </div>
                        </div>
                        <div class="mb-3 form-check">
                            <input type="checkbox" class="form-check-input" id="rememberMe">
                            <label class="form-check-label" for="rememberMe">Angemeldet bleiben</label>
                        </div>
                        <div class="d-flex justify-content-between align-items-center">
                            <button type="button" class="btn btn-link p-0" id="forgotPasswordBtn">
                                Passwort vergessen?
                            </button>
                            <button type="submit" class="btn btn-primary">Anmelden</button>
                        </div>
                    </form>
                    <hr class="my-4">
                    <p class="text-center mb-0">
                        Noch kein Konto? 
                        <a href="#" id="showRegisterBtn" data-bs-toggle="modal" data-bs-target="#registerModal">
                            Jetzt registrieren
                        </a>
                    </p>
                </div>
            </div>
        </div>
    </div>

    <!-- Register Modal -->
    <div class="modal fade" id="registerModal" tabindex="-1">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Registrieren</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Schließen"></button>
                </div>
                <div class="modal-body">
                    <form id="registerForm">
                        <div class="mb-3">
                            <label class="form-label">Vorname</label>
                            <input type="text" class="form-control" id="registerFirstName" required>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Nachname</label>
                            <input type="text" class="form-control" id="registerLastName" required>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">E-Mail</label>
                            <input type="email" class="form-control" id="registerEmail" required>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Passwort</label>
                            <div class="input-group">
                                <input type="password" class="form-control" id="registerPassword" required>
                                <button class="btn btn-outline-secondary toggle-password" type="button" aria-label="Passwort anzeigen/verbergen">
                                    <i class="bi bi-eye" aria-hidden="true"></i>
                                </button>
                            </div>
                            <div class="password-strength mt-2"></div>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Passwort bestätigen</label>
                            <div class="input-group">
                                <input type="password" class="form-control" id="registerPasswordConfirm" required>
                                <button class="btn btn-outline-secondary toggle-password" type="button" aria-label="Passwort anzeigen/verbergen">
                                    <i class="bi bi-eye" aria-hidden="true"></i>
                                </button>
                            </div>
                        </div>
                        <div class="mb-3 form-check">
                            <input type="checkbox" class="form-check-input" id="termsAccepted" required>
                            <label class="form-check-label" for="termsAccepted">
                                Ich akzeptiere die <a href="#" data-bs-toggle="modal" data-bs-target="#termsModal">Nutzungsbedingungen</a>
                            </label>
                        </div>
                        <div class="text-end">
                            <button type="submit" class="btn btn-primary">Registrieren</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>

    <!-- Password Reset Modal -->
    <div class="modal fade" id="passwordResetModal" tabindex="-1">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Passwort zurücksetzen</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Schließen"></button>
                </div>
                <div class="modal-body">
                    <form id="passwordResetForm">
                        <div class="mb-3">
                            <label class="form-label">E-Mail</label>
                            <input type="email" class="form-control" id="resetEmail" required>
                        </div>
                        <div class="text-end">
                            <button type="submit" class="btn btn-primary">Link senden</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>

    <!-- Terms Modal -->
    <div class="modal fade" id="termsModal" tabindex="-1">
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Nutzungsbedingungen</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Schließen"></button>
                </div>
                <div class="modal-body">
                    <h6>1. Nutzung des Dienstes</h6>
                    <p>Der Bewerbungsassistent ist ein Online-Dienst zur Erstellung von Bewerbungsunterlagen...</p>
                    
                    <h6>2. Datenschutz</h6>
                    <p>Ihre persönlichen Daten werden gemäß unserer Datenschutzerklärung verarbeitet...</p>
                    
                    <h6>3. Verantwortlichkeiten</h6>
                    <p>Sie sind für die Richtigkeit Ihrer Angaben verantwortlich...</p>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-primary" data-bs-dismiss="modal">Verstanden</button>
                </div>
            </div>
        </div>
    </div>

    <!-- Bootstrap Bundle with Popper (important: place before your app.js) -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    
    <!-- Your scripts -->
    <script type="module" src="js/global-functions.js"></script>
    <script type="module" src="js/app.js"></script>
    <script type="module" src="js/button-initializer.js"></script>

    <!-- Am Ende der Datei, vor deinen anderen Scripts -->
    <script type="module">
        import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
        import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
        import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
        import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
        
        // Firebase wird automatisch aus firebase-config.js initialisiert
    </script>

    <!-- Fix für checkAuth und Button-Probleme -->
    <script>
        // Die "Nuclear Option" - Alle Buttons neu erstellen
        document.addEventListener('DOMContentLoaded', function() {
            // Alle bestehenden Buttons finden und ihre Eigenschaften speichern
            const allButtons = Array.from(document.querySelectorAll('button'));
            
            allButtons.forEach(button => {
                // Button-Eigenschaften speichern
                const id = button.id;
                const classes = button.className;
                const text = button.textContent.trim();
                const parent = button.parentNode;
                const onclick = button.getAttribute('onclick');
                
                console.log(`Ersetze Button: ${id || 'keine ID'}, Text: ${text}, onclick: ${onclick || 'keiner'}`);
                
                // Neuen Button erstellen
                const newButton = document.createElement('button');
                newButton.id = id;
                newButton.className = classes;
                newButton.textContent = text;
                
                // Wenn es ein CoverLetter-Button ist, Text ändern
                if (id === 'createCoverLetterBtn') {
                    newButton.textContent = "KI Anschreiben erstellen lassen";
                    newButton.title = "Lassen Sie die KI ein passendes Anschreiben auf Basis des hochgeladenen Lebenslaufs und der Stellenanzeige erstellen";
                }
                
                // Event-Listener basierend auf ID oder onclick hinzufügen
                newButton.addEventListener('click', function() {
                    console.log(`Button ${id || text} geklickt`);
                    
                    if (id === 'loginBtn' || onclick?.includes('login')) {
                        // Login-Logik
                        alert("Login-Button geklickt");
                        const modal = document.getElementById('loginModal');
                        if (modal && typeof bootstrap !== 'undefined') {
                            new bootstrap.Modal(modal).show();
                        }
                    }
                    else if (id === 'registerBtn' || onclick?.includes('register')) {
                        alert("Register-Button geklickt");
                        const modal = document.getElementById('registerModal');
                        if (modal && typeof bootstrap !== 'undefined') {
                            new bootstrap.Modal(modal).show();
                        }
                    }
                    else if (id === 'uploadResumeBtn' || onclick?.includes('upload')) {
                        alert("Upload-Button geklickt");
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = '.pdf,.doc,.docx';
                        input.click();
                    }
                    else if (id === 'createCoverLetterBtn') {
                        alert("KI Anschreiben erstellen");
                    }
                    else {
                        alert(`Button "${text}" geklickt`);
                    }
                });
                
                // Alten Button ersetzen
                parent.replaceChild(newButton, button);
            });
            
            console.log("Alle Buttons wurden ersetzt");
        });
    </script>

    <!-- Als allererster Eintrag im body-Tag -->
    <script>
        // Globale checkAuth-Funktion sofort definieren
        window.checkAuth = function() {
            console.log("Global checkAuth aufgerufen");
            setTimeout(function() {
                try {
                    const modal = document.getElementById('loginModal');
                    if (modal && window.bootstrap) {
                        const bsModal = new window.bootstrap.Modal(modal);
                        bsModal.show();
                    } else {
                        alert("Bitte anmelden");
                    }
                } catch (e) {
                    console.error("Modal error:", e);
                    alert("Bitte anmelden");
                }
            }, 100);
            return false;
        };
    </script>
</body>
</html> 
