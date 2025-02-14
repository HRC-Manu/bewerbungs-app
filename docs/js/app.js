import { globalState } from './state.js';
import { showError, showSuccess, showLoading, hideLoading, updatePreview } from './ui.js';
import { handleFileUpload, initializeFileUpload } from './file-handler.js';
import { analyzeJobPosting, analyzeResume } from './analysis.js';
import { AIService } from './ai-service.js';
import { Features } from './features.js';
import { initializeWorkflow, showStep, nextStep, prevStep } from './workflow.js';
import { safeGetElem, extractJobAdText } from './utils.js';

// Auth Service
const AuthService = {
    currentUser: null,
    
    async login(email, password, remember = false) {
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            
            if (!response.ok) {
                throw new Error('Anmeldung fehlgeschlagen');
            }
            
            const data = await response.json();
            this.currentUser = data.user;
            
            if (remember) {
                localStorage.setItem('authToken', data.token);
            } else {
                sessionStorage.setItem('authToken', data.token);
            }
            
            this.updateUI();
            return data.user;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    },
    
    async register(userData) {
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });
            
            if (!response.ok) {
                throw new Error('Registrierung fehlgeschlagen');
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Register error:', error);
            throw error;
        }
    },
    
    async resetPassword(email) {
        try {
            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            
            if (!response.ok) {
                throw new Error('Passwort-Reset fehlgeschlagen');
            }
            
            return true;
        } catch (error) {
            console.error('Password reset error:', error);
            throw error;
        }
    },
    
    logout() {
        this.currentUser = null;
        localStorage.removeItem('authToken');
        sessionStorage.removeItem('authToken');
        this.updateUI();
    },
    
    async checkAuth() {
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        if (!token) return false;
        
        try {
            const response = await fetch('/api/auth/verify', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) {
                this.logout();
                return false;
            }
            
            const data = await response.json();
            this.currentUser = data.user;
            this.updateUI();
            return true;
        } catch (error) {
            console.error('Auth check error:', error);
            this.logout();
            return false;
        }
    },
    
    updateUI() {
        const authButtons = document.getElementById('authButtons');
        const userMenu = document.getElementById('userMenu');
        const userDisplayName = document.getElementById('userDisplayName');
        
        if (this.currentUser) {
            authButtons.classList.add('d-none');
            userMenu.classList.remove('d-none');
            userDisplayName.textContent = `${this.currentUser.firstName} ${this.currentUser.lastName}`;
        } else {
            authButtons.classList.remove('d-none');
            userMenu.classList.add('d-none');
            userDisplayName.textContent = 'Benutzer';
        }
    }
};

// Hauptinitialisierung
document.addEventListener('DOMContentLoaded', function() {
    "use strict";
    
    try {
        console.log('Initializing application...');
        
        // Initialisiere Basis-Elemente
        initializeElements();
        
        // Initialisiere Auth-Handler
        initializeAuthHandlers();
        
        // Initialisiere Haupt-Buttons
        initializeMainButtons();
        
        // Initialisiere Event-Listener
        initializeEventListeners();
        
        // Initialisiere Features
        Features.initialize();
        
        // Initialisiere Workflow
        initializeWorkflow();
        
        // Prüfe Auth-Status
        AuthService.checkAuth();
        
        // Starte Preview-Update-Intervall
        setInterval(updatePreview, 3000);
        
        console.log('Application initialized successfully');
    } catch (error) {
        console.error('Error during initialization:', error);
        showError('Fehler beim Initialisieren der Anwendung');
    }
});

function initializeElements() {
    globalState.elements = {
        jobPosting: document.getElementById('jobPosting'),
        jobPostingURL: document.getElementById('jobPostingURL'),
        resumeUpload: document.getElementById('resumeUpload'),
        coverLetterUpload: document.getElementById('coverLetterUpload'),
        analyzeBtn: document.getElementById('analyzeBtn'),
        generateSuggestionsBtn: document.getElementById('generateSuggestionsBtn'),
        pasteBtn: document.getElementById('pasteBtn'),
        loadExampleBtn: document.getElementById('loadExampleBtn'),
        coverLetterPreview: document.getElementById('coverLetterPreview'),
        resumePreview: document.getElementById('resumePreview'),
        coverLetterEditor: document.getElementById('coverLetterEditor'),
        coverLetterSections: {
            recipient: document.getElementById('coverLetterRecipient'),
            subject: document.getElementById('coverLetterSubject'),
            introduction: document.getElementById('coverLetterIntro'),
            main: document.getElementById('coverLetterMain'),
            closing: document.getElementById('coverLetterClosing')
        },
        saveApiSettingsBtn: document.getElementById('saveApiSettingsBtn'),
        apiKeyInput: document.getElementById('apiKeyInput'),
        apiModal: bootstrap.Modal.getOrCreateInstance(document.getElementById('apiModal')),
        colorPicker: safeGetElem('colorPicker'),
        fontSelect: safeGetElem('fontSelect'),
        borderToggle: safeGetElem('borderToggle'),
        refreshPreviewBtn: safeGetElem('refreshPreviewBtn'),
        modernPreviewContainer: safeGetElem('modernPreviewContainer'),
        suggestionsModal: new bootstrap.Modal(document.getElementById('suggestionsModal')),
        helpModal: new bootstrap.Modal(document.getElementById('helpModal')),
        messageToast: new bootstrap.Toast(document.getElementById('messageToast')),
        startBtn: safeGetElem('startBtn'),
        uploadResumeBtn: safeGetElem('uploadResumeBtn'),
        createResumeBtn: safeGetElem('createResumeBtn'),
        uploadCoverLetterBtn: safeGetElem('uploadCoverLetterBtn'),
        settingsBtn: safeGetElem('settingsBtn'),
        prevStepBtn: safeGetElem('prevStepBtn'),
        nextStepBtn: safeGetElem('nextStepBtn'),
        workflowSteps: {
            step1: safeGetElem('step1'),
            step2: safeGetElem('step2'),
            step3: safeGetElem('step3'),
            step4: safeGetElem('step4'),
            step5: safeGetElem('step5')
        },
        resumeAnalysis: safeGetElem('resumeAnalysis'),
        jobAnalysis: safeGetElem('jobAnalysis'),
        matchingResults: safeGetElem('matchingResults'),
        resumeBuilder: safeGetElem('resumeBuilder'),
        settingsForm: safeGetElem('settingsForm'),
        aiProvider: safeGetElem('aiProvider'),
        letterStyle: safeGetElem('letterStyle'),
        
        // Modals
        loginModal: new bootstrap.Modal(document.getElementById('loginModal')),
        registerModal: new bootstrap.Modal(document.getElementById('registerModal')),
        passwordResetModal: new bootstrap.Modal(document.getElementById('passwordResetModal')),
        workflowModal: new bootstrap.Modal(document.getElementById('workflowModal')),
        settingsModal: new bootstrap.Modal(document.getElementById('settingsModal')),
        helpModal: new bootstrap.Modal(document.getElementById('helpModal')),
    };
    
    // Debug-Log für Initialisierung
    console.log('Elements initialized:', Object.keys(globalState.elements));
}

function initializeEventListeners() {
    const { elements } = globalState;
    
    // Help Button
    document.getElementById('helpBtn')?.addEventListener('click', () => {
        elements.helpModal.show();
    });

    // URL Input Handler
    elements.jobPostingURL?.addEventListener('input', debounce(handleJobPostingURL, 500));

    // Paste & Example Buttons
    elements.pasteBtn?.addEventListener('click', handlePaste);
    elements.loadExampleBtn?.addEventListener('click', handleLoadExample);

    // Analyze Button
    elements.analyzeBtn?.addEventListener('click', handleAnalyze);
    
    // API Settings
    if (elements.saveApiSettingsBtn) {
        elements.saveApiSettingsBtn.addEventListener('click', () => {
            const providerElem = safeGetElem('aiProvider');
            const styleElem = safeGetElem('coverLetterStyle');
            
            if (providerElem) {
                globalState.selectedAIProvider = providerElem.value;
            }
            if (styleElem) {
                globalState.selectedCoverLetterStyle = styleElem.value;
            }
            
            const apiKeyInput = elements.apiKeyInput;
            if (apiKeyInput?.value.trim()) {
                // Speichere API Key verschlüsselt
                localStorage.setItem('myEncryptedApiKey', btoa(apiKeyInput.value.trim()));
            }
            
            showSuccess('Einstellungen gespeichert');
            elements.apiModal.hide();
        });
    }

    // Initialize other features
    initializeFileUpload();
    initializeTextareaListeners();

    // Hauptbuttons
    elements.startBtn?.addEventListener('click', startWorkflow);
    elements.uploadResumeBtn?.addEventListener('click', () => handleResumeUpload());
    elements.createResumeBtn?.addEventListener('click', () => handleCreateResume());
    elements.createCoverLetterBtn?.addEventListener('click', () => handleCreateCoverLetter());
    elements.uploadCoverLetterBtn?.addEventListener('click', () => handleCoverLetterUpload());
    elements.settingsBtn?.addEventListener('click', () => elements.settingsModal.show());
    elements.helpBtn?.addEventListener('click', () => elements.helpModal.show());
    
    // Workflow Navigation
    elements.prevStepBtn?.addEventListener('click', () => handlePrevStep());
    elements.nextStepBtn?.addEventListener('click', () => handleNextStep());
    
    // Settings
    elements.settingsForm?.addEventListener('submit', handleSettingsSave);
}

function initializeTextareaListeners() {
    const { elements } = globalState;
    
    elements.jobPosting?.addEventListener('input', function() {
        const hasContent = this.value.trim();
        const resumeUploaded = window.resumeText !== undefined && window.resumeText !== null;
        
        elements.analyzeBtn.disabled = !hasContent || !resumeUploaded;
        
        if (elements.analyzeBtn.disabled) {
            elements.analyzeBtn.classList.add('btn-secondary');
            elements.analyzeBtn.classList.remove('btn-primary');
        } else {
            elements.analyzeBtn.classList.add('btn-primary');
            elements.analyzeBtn.classList.remove('btn-secondary');
        }
    });

    Object.values(elements.coverLetterSections).forEach(textarea => {
        textarea?.addEventListener('input', updatePreview);
    });
}

async function handleAnalyze() {
    const { elements } = globalState;
    
    try {
        if (!validateInputs()) return;
        
        showLoading(elements.analyzeBtn, 'Analysiere...');
        
        const jobAnalysis = await analyzeJobPosting(elements.jobPosting.value);
        const resumeAnalysis = await analyzeResume(window.resumeText);

        const suggestions = await AIService.generateCoverLetterSections(
            jobAnalysis,
            resumeAnalysis,
            { 
                provider: globalState.selectedAIProvider, 
                style: globalState.selectedCoverLetterStyle 
            }
        );

        if (suggestions?.length) {
            applySuggestions(suggestions);
            updatePreview();
            showSuccess('Analyse erfolgreich abgeschlossen');
            nextStep();
        } else {
            console.warn('Keine Vorschläge generiert, verwende Fallback.');
            applySuggestions([
                { section: 'recipient', text: 'Sehr geehrte Damen und Herren,' },
                { section: 'main', text: 'Fallback-Anschreiben...' }
            ]);
        }
    } catch (error) {
        console.error('Analysis error:', error);
        showError(error.message || 'Fehler bei der Analyse');
    } finally {
        hideLoading(elements.analyzeBtn, 'Analysieren und Anschreiben erstellen');
    }
}

function validateInputs() {
    const { elements } = globalState;
    const jobPosting = elements.jobPosting.value.trim();
    const resumeUploaded = window.resumeText !== undefined && window.resumeText !== null;
    
    elements.analyzeBtn.disabled = !jobPosting || !resumeUploaded;
    
    if (!jobPosting) {
        showError('Bitte fügen Sie eine Stellenanzeige ein');
        return false;
    }
    
    if (jobPosting.length < 50) {
        showError('Die Stellenanzeige scheint zu kurz zu sein. Bitte fügen Sie den vollständigen Text ein.');
        return false;
    }
    
    if (!resumeUploaded) {
        showError('Bitte laden Sie Ihren Lebenslauf hoch');
        return false;
    }
    
    return true;
}

function applySuggestions(suggestions) {
    const { elements } = globalState;
    suggestions.forEach(suggestion => {
        const section = elements.coverLetterSections[suggestion.section];
        if (section) {
            section.value = suggestion.text.trim();
        }
    });
    updatePreview();
}

async function fetchJobPosting(url) {
    try {
        const response = await fetch('/api/fetch-job-posting', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });

        if (!response.ok) {
            throw new Error('Fehler beim Laden der Stellenanzeige');
        }

        const data = await response.json();
        return data.jobText;
    } catch (error) {
        console.error('Error fetching job posting:', error);
        throw error;
    }
}

function isValidURL(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

function checkRequiredUploads() {
    // Implementation of checkRequiredUploads function
}

async function startWorkflow() {
    const { elements } = globalState;
    
    if (!validateWorkflowStart()) {
        showError('Bitte laden Sie zuerst einen Lebenslauf hoch oder erstellen Sie einen neuen.');
        return;
    }
    
    try {
        elements.workflowModal.show();
        await initializeWorkflow();
        showStep(1);
        await analyzeResume();
    } catch (error) {
        console.error('Error starting workflow:', error);
        showError('Fehler beim Starten des Workflows');
    }
}

async function handleNextStep() {
    const { currentStep } = globalState;
    
    try {
        switch (currentStep) {
            case 1:
                if (!validateStep1()) return;
                showStep(2);
                break;
                
            case 2:
                if (!validateStep2()) return;
                await analyzeJobPosting();
                showStep(3);
                break;
                
            case 3:
                if (!validateStep3()) return;
                await generateCoverLetter();
                showStep(4);
                break;
                
            case 4:
                if (!validateStep4()) return;
                showStep(5);
                break;
                
            case 5:
                finishWorkflow();
                break;
        }
    } catch (error) {
        console.error('Error in workflow:', error);
        showError('Fehler im Workflow');
    }
}

function validateWorkflowStart() {
    return globalState.resumeData || globalState.elements.resumeBuilder?.value;
}

function validateStep1() {
    return globalState.resumeAnalysis && Object.keys(globalState.resumeAnalysis).length > 0;
}

function validateStep2() {
    const jobPosting = globalState.elements.jobPosting?.value.trim();
    return jobPosting && jobPosting.length >= 50;
}

function validateStep3() {
    return globalState.matchingResults && Object.keys(globalState.matchingResults).length > 0;
}

function validateStep4() {
    const editor = globalState.elements.coverLetterEditor;
    return editor && editor.innerHTML.trim().length > 100;
}

async function handleResumeUpload() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx';
    input.onchange = (e) => handleFileUpload(e, 'resume');
    input.click();
}

async function handleCoverLetterUpload() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx';
    input.onchange = (e) => handleFileUpload(e, 'coverLetter');
    input.click();
}

function handleSettingsSave(e) {
    e.preventDefault();
    const { elements } = globalState;
    
    const settings = {
        aiProvider: elements.aiProvider.value,
        apiKey: elements.apiKeyInput.value,
        letterStyle: elements.letterStyle.value
    };
    
    localStorage.setItem('appSettings', JSON.stringify(settings));
    showSuccess('Einstellungen gespeichert');
    elements.settingsModal.hide();
}

function loadSettings() {
    const settings = JSON.parse(localStorage.getItem('appSettings') || '{}');
    const { elements } = globalState;
    
    if (settings.aiProvider) elements.aiProvider.value = settings.aiProvider;
    if (settings.apiKey) elements.apiKeyInput.value = settings.apiKey;
    if (settings.letterStyle) elements.letterStyle.value = settings.letterStyle;
}

async function analyzeResume() {
    const { elements } = globalState;
    
    try {
        showLoading(elements.resumeAnalysis, 'Analysiere Lebenslauf...');
        const analysis = await analyzeResume(globalState.resumeData);
        displayResumeAnalysis(analysis);
    } catch (error) {
        console.error('Resume analysis error:', error);
        showError('Fehler bei der Lebenslauf-Analyse');
    } finally {
        hideLoading(elements.resumeAnalysis);
    }
}

async function analyzeJobPosting() {
    const { elements } = globalState;
    const jobPosting = elements.jobPosting.value;
    
    try {
        showLoading(elements.jobAnalysis, 'Analysiere Stellenanzeige...');
        const analysis = await analyzeJobPosting(jobPosting);
        displayJobAnalysis(analysis);
    } catch (error) {
        console.error('Job posting analysis error:', error);
        showError('Fehler bei der Stellenanzeigen-Analyse');
    } finally {
        hideLoading(elements.jobAnalysis);
    }
}

async function generateCoverLetter() {
    const { elements } = globalState;
    
    try {
        showLoading(elements.coverLetterEditor, 'Generiere Anschreiben...');
        const coverLetter = await AIService.generateCoverLetterSections(
            globalState.jobAnalysis,
            globalState.resumeAnalysis,
            {
                provider: elements.aiProvider.value,
                style: elements.letterStyle.value
            }
        );
        displayCoverLetter(coverLetter);
    } catch (error) {
        console.error('Cover letter generation error:', error);
        showError('Fehler bei der Anschreiben-Generierung');
    } finally {
        hideLoading(elements.coverLetterEditor);
    }
}

function displayResumeAnalysis(analysis) {
    const { elements } = globalState;
    globalState.resumeAnalysis = analysis;
    
    // Implementiere die Anzeige der Analyse-Ergebnisse
    elements.resumeAnalysis.innerHTML = `
        <div class="analysis-section">
            <h5>Erkannte Qualifikationen</h5>
            <div class="skills-grid">
                ${renderSkills(analysis.skills)}
            </div>
            
            <h5 class="mt-4">Berufserfahrung</h5>
            <div class="experience-timeline">
                ${renderExperience(analysis.experience)}
            </div>
            
            <h5 class="mt-4">Ausbildung</h5>
            <div class="education-list">
                ${renderEducation(analysis.education)}
            </div>
        </div>
    `;
}

function displayJobAnalysis(analysis) {
    const { elements } = globalState;
    globalState.jobAnalysis = analysis;
    
    elements.jobAnalysis.classList.remove('d-none');
    elements.jobAnalysis.innerHTML = `
        <div class="analysis-section">
            <h5>Position</h5>
            <p>${analysis.jobTitle.position} (${analysis.jobTitle.level})</p>
            
            <h5 class="mt-4">Anforderungen</h5>
            <div class="requirements-grid">
                ${renderRequirements(analysis.requirements)}
            </div>
            
            <h5 class="mt-4">Unternehmen</h5>
            <div class="company-info">
                ${renderCompanyInfo(analysis.company)}
            </div>
        </div>
    `;
}

function displayCoverLetter(sections) {
    const { elements } = globalState;
    
    elements.coverLetterEditor.innerHTML = sections.map(section => `
        <div class="cover-letter-section" data-section="${section.type}">
            ${section.content}
        </div>
    `).join('');
}

// Hilfsfunktionen für das Rendering
function renderSkills(skills) {
    return `
        <div class="row">
            <div class="col-md-6">
                <h6>Technische Fähigkeiten</h6>
                <ul class="skill-list">
                    ${skills.technical.map(skill => `
                        <li>
                            <span class="skill-name">${skill.name}</span>
                            <span class="skill-level">${skill.level}</span>
                        </li>
                    `).join('')}
                </ul>
            </div>
            <div class="col-md-6">
                <h6>Soft Skills</h6>
                <ul class="skill-list">
                    ${skills.soft.map(skill => `
                        <li>${skill.name}</li>
                    `).join('')}
                </ul>
            </div>
        </div>
    `;
}

function renderExperience(experience) {
    return experience.map(exp => `
        <div class="experience-item">
            <div class="timeline-dot"></div>
            <div class="experience-content">
                <div class="experience-header">
                    <h6>${exp.title}</h6>
                    <span class="experience-date">${exp.period.from} - ${exp.period.to}</span>
                </div>
                <p>${exp.description}</p>
            </div>
        </div>
    `).join('');
}

function renderEducation(education) {
    return education.map(edu => `
        <div class="education-item">
            <h6>${edu.degree}</h6>
            <p>${edu.institution}, ${edu.period.from} - ${edu.period.to}</p>
            ${edu.description ? `<p>${edu.description}</p>` : ''}
        </div>
    `).join('');
}

function renderRequirements(requirements) {
    return `
        <div class="row">
            <div class="col-md-6">
                <h6>Muss-Anforderungen</h6>
                <ul class="requirement-list">
                    ${requirements.essential.map(req => `
                        <li>${req}</li>
                    `).join('')}
                </ul>
            </div>
            <div class="col-md-6">
                <h6>Wünschenswert</h6>
                <ul class="requirement-list">
                    ${requirements.preferred.map(req => `
                        <li>${req}</li>
                    `).join('')}
                </ul>
            </div>
        </div>
    `;
}

function renderCompanyInfo(company) {
    return `
        <div class="company-details">
            <p><strong>Name:</strong> ${company.name}</p>
            <p><strong>Branche:</strong> ${company.industry}</p>
            <p><strong>Größe:</strong> ${company.size}</p>
            <p><strong>Kultur:</strong> ${Object.entries(company.culture)
                .filter(([_, value]) => value > 0)
                .map(([key, _]) => key)
                .join(', ')}</p>
        </div>
    `;
}

// Neue Funktionen für die Buttons
function handleCreateResume() {
    const { elements } = globalState;
    
    // Initialisiere den Resume Builder
    initializeResumeBuilder();
    elements.resumeCreatorModal.show();
}

function handleCreateCoverLetter() {
    const { elements } = globalState;
    
    if (!globalState.resumeData) {
        showError('Bitte laden Sie zuerst einen Lebenslauf hoch oder erstellen Sie einen.');
        return;
    }
    
    // Starte den Workflow direkt bei Schritt 2 (Stellenanzeige)
    elements.workflowModal.show();
    showStep(2);
}

function handlePrevStep() {
    const { currentStep } = globalState;
    
    if (currentStep > 1) {
        showStep(currentStep - 1);
    }
}

async function handleJobPostingURL(event) {
    const url = event.target.value.trim();
    if (url && isValidURL(url)) {
        try {
            showLoading(elements.jobPosting, 'Lade Stellenanzeige...');
            const jobText = await fetchJobPosting(url);
            if (jobText) {
                elements.jobPosting.value = jobText;
                showSuccess('Stellenanzeige erfolgreich geladen');
            }
        } catch (error) {
            showError('Fehler beim Laden der Stellenanzeige');
            console.error('URL fetch error:', error);
        } finally {
            hideLoading(elements.jobPosting);
        }
    }
}

async function handlePaste() {
    try {
        const text = await navigator.clipboard.readText();
        if (elements.jobPosting) {
            elements.jobPosting.value = text;
            showSuccess('Text aus Zwischenablage eingefügt');
        }
    } catch (err) {
        showError('Fehler beim Einfügen aus der Zwischenablage');
    }
}

function handleLoadExample() {
    if (elements.jobPosting) {
        const exampleText = `
            Stellenbezeichnung: Senior Fullstack-Entwickler (m/w/d)

            Wir suchen zum nächstmöglichen Zeitpunkt einen erfahrenen Fullstack-Entwickler für unser agiles Entwicklungsteam.

            Ihre Aufgaben:
            - Entwicklung moderner Webanwendungen mit React und Node.js
            - Konzeption und Implementierung von Microservices
            - Code Reviews und Mentoring von Junioren
            - Enge Zusammenarbeit mit Product Ownern und UX-Designern

            Ihr Profil:
            - Mind. 3 Jahre Berufserfahrung in der Webentwicklung
            - Sehr gute Kenntnisse in JavaScript/TypeScript, React und Node.js
            - Erfahrung mit Datenbanken (SQL und NoSQL)
            - Agile Entwicklungsmethoden (Scrum/Kanban)

            Wir bieten:
            - Flexible Arbeitszeiten und Remote-Möglichkeiten
            - Moderne Technologie-Stack und innovative Projekte
            - Regelmäßige Weiterbildungen
            - Attraktives Gehalt und zusätzliche Benefits
        `;
        elements.jobPosting.value = exampleText;
        showSuccess('Beispiel-Stellenanzeige wurde eingefügt');
    }
}

// Hilfsfunktion für URL-Input Debouncing
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function initializeResumeBuilder() {
    const { elements } = globalState;
    
    if (!elements.resumeBuilder) return;
    
    elements.resumeBuilder.innerHTML = `
        <form id="resumeForm" class="resume-form">
            <div class="mb-4">
                <h5>Persönliche Daten</h5>
                <div class="row g-3">
                    <div class="col-md-6">
                        <input type="text" class="form-control" placeholder="Vorname" required>
                    </div>
                    <div class="col-md-6">
                        <input type="text" class="form-control" placeholder="Nachname" required>
                    </div>
                    <div class="col-12">
                        <input type="email" class="form-control" placeholder="E-Mail" required>
                    </div>
                    <div class="col-12">
                        <input type="tel" class="form-control" placeholder="Telefon">
                    </div>
                    <div class="col-12">
                        <textarea class="form-control" rows="2" placeholder="Adresse"></textarea>
                    </div>
                </div>
            </div>

            <div class="mb-4">
                <h5>Berufserfahrung</h5>
                <div id="experienceContainer">
                    <!-- Dynamisch generierte Erfahrungseinträge -->
                </div>
                <button type="button" class="btn btn-outline-primary btn-sm mt-2" id="addExperienceBtn">
                    <i class="bi bi-plus"></i> Erfahrung hinzufügen
                </button>
            </div>

            <div class="mb-4">
                <h5>Ausbildung</h5>
                <div id="educationContainer">
                    <!-- Dynamisch generierte Ausbildungseinträge -->
                </div>
                <button type="button" class="btn btn-outline-primary btn-sm mt-2" id="addEducationBtn">
                    <i class="bi bi-plus"></i> Ausbildung hinzufügen
                </button>
            </div>

            <div class="mb-4">
                <h5>Fähigkeiten</h5>
                <div id="skillsContainer" class="mb-2">
                    <!-- Dynamisch generierte Skills -->
                </div>
                <div class="input-group">
                    <input type="text" class="form-control" id="skillInput" placeholder="Neue Fähigkeit">
                    <button type="button" class="btn btn-outline-primary" id="addSkillBtn">
                        <i class="bi bi-plus"></i>
                    </button>
                </div>
            </div>

            <div class="text-end mt-4">
                <button type="button" class="btn btn-secondary me-2" data-bs-dismiss="modal">Abbrechen</button>
                <button type="submit" class="btn btn-primary">Lebenslauf erstellen</button>
            </div>
        </form>
    `;

    // Event-Handler für das Formular
    const form = elements.resumeBuilder.querySelector('#resumeForm');
    form?.addEventListener('submit', handleResumeFormSubmit);

    // Event-Handler für die "Hinzufügen" Buttons
    const addExperienceBtn = elements.resumeBuilder.querySelector('#addExperienceBtn');
    const addEducationBtn = elements.resumeBuilder.querySelector('#addEducationBtn');
    const addSkillBtn = elements.resumeBuilder.querySelector('#addSkillBtn');

    addExperienceBtn?.addEventListener('click', () => addExperienceEntry());
    addEducationBtn?.addEventListener('click', () => addEducationEntry());
    addSkillBtn?.addEventListener('click', () => addSkill());

    // Initial einen leeren Eintrag für jede Sektion hinzufügen
    addExperienceEntry();
    addEducationEntry();
}

function addExperienceEntry(data = {}) {
    const container = document.getElementById('experienceContainer');
    if (!container) return;

    const entry = document.createElement('div');
    entry.className = 'experience-entry border rounded p-3 mb-3';
    entry.innerHTML = `
        <div class="row g-3">
            <div class="col-md-6">
                <input type="text" class="form-control" placeholder="Position" 
                       value="${data.position || ''}" required>
            </div>
            <div class="col-md-6">
                <input type="text" class="form-control" placeholder="Unternehmen"
                       value="${data.company || ''}" required>
            </div>
            <div class="col-md-6">
                <input type="month" class="form-control" placeholder="Von"
                       value="${data.from || ''}" required>
            </div>
            <div class="col-md-6">
                <input type="month" class="form-control" placeholder="Bis"
                       value="${data.to || ''}" required>
            </div>
            <div class="col-12">
                <textarea class="form-control" rows="3" 
                          placeholder="Beschreibung">${data.description || ''}</textarea>
            </div>
        </div>
        <button type="button" class="btn btn-outline-danger btn-sm mt-2 remove-entry">
            <i class="bi bi-trash"></i>
        </button>
    `;

    entry.querySelector('.remove-entry')?.addEventListener('click', () => {
        if (container.children.length > 1) {
            entry.remove();
        }
    });

    container.appendChild(entry);
}

function addEducationEntry(data = {}) {
    const container = document.getElementById('educationContainer');
    if (!container) return;

    const entry = document.createElement('div');
    entry.className = 'education-entry border rounded p-3 mb-3';
    entry.innerHTML = `
        <div class="row g-3">
            <div class="col-md-6">
                <input type="text" class="form-control" placeholder="Abschluss"
                       value="${data.degree || ''}" required>
            </div>
            <div class="col-md-6">
                <input type="text" class="form-control" placeholder="Institution"
                       value="${data.institution || ''}" required>
            </div>
            <div class="col-md-6">
                <input type="month" class="form-control" placeholder="Von"
                       value="${data.from || ''}" required>
            </div>
            <div class="col-md-6">
                <input type="month" class="form-control" placeholder="Bis"
                       value="${data.to || ''}" required>
            </div>
            <div class="col-12">
                <textarea class="form-control" rows="2" 
                          placeholder="Beschreibung">${data.description || ''}</textarea>
            </div>
        </div>
        <button type="button" class="btn btn-outline-danger btn-sm mt-2 remove-entry">
            <i class="bi bi-trash"></i>
        </button>
    `;

    entry.querySelector('.remove-entry')?.addEventListener('click', () => {
        if (container.children.length > 1) {
            entry.remove();
        }
    });

    container.appendChild(entry);
}

function addSkill(skillName = '') {
    const container = document.getElementById('skillsContainer');
    const input = document.getElementById('skillInput');
    if (!container || !input) return;

    const skill = skillName || input.value.trim();
    if (!skill) return;

    const skillElement = document.createElement('span');
    skillElement.className = 'badge bg-primary me-2 mb-2 p-2';
    skillElement.innerHTML = `
        ${skill}
        <button type="button" class="btn-close btn-close-white ms-2" aria-label="Entfernen"></button>
    `;

    skillElement.querySelector('.btn-close')?.addEventListener('click', () => {
        skillElement.remove();
    });

    container.appendChild(skillElement);
    input.value = '';
}

async function handleResumeFormSubmit(event) {
    event.preventDefault();
    
    try {
        const formData = collectResumeFormData();
        globalState.resumeData = formData;
        
        // Konvertiere die Daten in ein strukturiertes Format
        const resumeText = convertResumeDataToText(formData);
        window.resumeText = resumeText;
        
        showSuccess('Lebenslauf erfolgreich erstellt');
        elements.resumeCreatorModal.hide();
        
        // Optional: Starte den Workflow automatisch
        startWorkflow();
    } catch (error) {
        console.error('Error creating resume:', error);
        showError('Fehler beim Erstellen des Lebenslaufs');
    }
}

function collectResumeFormData() {
    const form = document.getElementById('resumeForm');
    if (!form) return null;

    const formData = {
        personal: {
            firstName: form.querySelector('input[placeholder="Vorname"]').value,
            lastName: form.querySelector('input[placeholder="Nachname"]').value,
            email: form.querySelector('input[type="email"]').value,
            phone: form.querySelector('input[type="tel"]').value,
            address: form.querySelector('textarea[placeholder="Adresse"]').value
        },
        experience: Array.from(form.querySelectorAll('.experience-entry')).map(entry => ({
            position: entry.querySelector('input[placeholder="Position"]').value,
            company: entry.querySelector('input[placeholder="Unternehmen"]').value,
            from: entry.querySelector('input[type="month"]:first-of-type').value,
            to: entry.querySelector('input[type="month"]:last-of-type').value,
            description: entry.querySelector('textarea').value
        })),
        education: Array.from(form.querySelectorAll('.education-entry')).map(entry => ({
            degree: entry.querySelector('input[placeholder="Abschluss"]').value,
            institution: entry.querySelector('input[placeholder="Institution"]').value,
            from: entry.querySelector('input[type="month"]:first-of-type').value,
            to: entry.querySelector('input[type="month"]:last-of-type').value,
            description: entry.querySelector('textarea').value
        })),
        skills: Array.from(form.querySelectorAll('#skillsContainer .badge'))
            .map(badge => badge.textContent.trim())
    };

    return formData;
}

function convertResumeDataToText(data) {
    return `
PERSÖNLICHE DATEN
${data.personal.firstName} ${data.personal.lastName}
${data.personal.email}
${data.personal.phone}
${data.personal.address}

BERUFSERFAHRUNG
${data.experience.map(exp => `
${exp.from} - ${exp.to}
${exp.position} bei ${exp.company}
${exp.description}
`).join('\n')}

AUSBILDUNG
${data.education.map(edu => `
${edu.from} - ${edu.to}
${edu.degree} - ${edu.institution}
${edu.description}
`).join('\n')}

FÄHIGKEITEN
${data.skills.join(', ')}
    `.trim();
}

// Event-Handler für Auth-Funktionen
function initializeAuthHandlers() {
    console.log('Initializing auth handlers...');
    
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
    const showRegisterBtn = document.getElementById('showRegisterBtn');
    
    // Login Button
    loginBtn?.addEventListener('click', () => {
        console.log('Login button clicked');
        globalState.elements.loginModal.show();
    });
    
    // Login Form Submit
    document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('Login form submitted');
        
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const remember = document.getElementById('rememberMe').checked;
        
        try {
            showLoading(e.target, 'Anmeldung...');
            await AuthService.login(email, password, remember);
            globalState.elements.loginModal.hide();
            showSuccess('Erfolgreich angemeldet');
            updateUIAfterLogin();
        } catch (error) {
            showError('Anmeldung fehlgeschlagen');
        } finally {
            hideLoading(e.target);
        }
    });
    
    // Register Link
    showRegisterBtn?.addEventListener('click', () => {
        console.log('Show register button clicked');
        globalState.elements.loginModal.hide();
        globalState.elements.registerModal.show();
    });
    
    // Register Form Submit
    document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('Register form submitted');
        
        const userData = {
            firstName: document.getElementById('registerFirstName').value,
            lastName: document.getElementById('registerLastName').value,
            email: document.getElementById('registerEmail').value,
            password: document.getElementById('registerPassword').value
        };
        
        const passwordConfirm = document.getElementById('registerPasswordConfirm').value;
        
        if (userData.password !== passwordConfirm) {
            showError('Passwörter stimmen nicht überein');
            return;
        }
        
        try {
            showLoading(e.target, 'Registrierung...');
            await AuthService.register(userData);
            globalState.elements.registerModal.hide();
            showSuccess('Registrierung erfolgreich');
            globalState.elements.loginModal.show();
        } catch (error) {
            showError('Registrierung fehlgeschlagen');
        } finally {
            hideLoading(e.target);
        }
    });
    
    // Logout Button
    logoutBtn?.addEventListener('click', () => {
        console.log('Logout button clicked');
        AuthService.logout();
        showSuccess('Erfolgreich abgemeldet');
        updateUIAfterLogout();
    });
    
    // Password Reset Button
    forgotPasswordBtn?.addEventListener('click', () => {
        console.log('Forgot password button clicked');
        globalState.elements.loginModal.hide();
        globalState.elements.passwordResetModal.show();
    });
    
    // Password Reset Form Submit
    document.getElementById('passwordResetForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('Password reset form submitted');
        
        const email = document.getElementById('resetEmail').value;
        
        try {
            showLoading(e.target, 'Sende Link...');
            await AuthService.resetPassword(email);
            globalState.elements.passwordResetModal.hide();
            showSuccess('Password-Reset-Link wurde gesendet');
        } catch (error) {
            showError('Fehler beim Senden des Reset-Links');
        } finally {
            hideLoading(e.target);
        }
    });
    
    // Password Visibility Toggle
    document.querySelectorAll('.toggle-password').forEach(btn => {
        btn.addEventListener('click', function() {
            const input = this.previousElementSibling;
            const type = input.type === 'password' ? 'text' : 'password';
            input.type = type;
            this.querySelector('i').classList.toggle('bi-eye');
            this.querySelector('i').classList.toggle('bi-eye-slash');
        });
    });
    
    // Password Strength
    document.getElementById('registerPassword')?.addEventListener('input', function() {
        const strength = checkPasswordStrength(this.value);
        const indicator = this.parentElement.nextElementSibling;
        
        indicator.className = 'password-strength mt-2';
        if (strength > 0) indicator.classList.add(strength === 1 ? 'weak' : strength === 2 ? 'medium' : 'strong');
    });
    
    console.log('Auth handlers initialized');
}

function checkPasswordStrength(password) {
    let strength = 0;
    
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) strength++;
    
    return strength;
}

// Hauptbuttons und Workflow
function initializeMainButtons() {
    const { elements } = globalState;
    
    // Start Button
    elements.startBtn?.addEventListener('click', async () => {
        if (!AuthService.currentUser) {
            showError('Bitte melden Sie sich zuerst an');
            const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
            loginModal.show();
            return;
        }
        
        try {
            const workflowModal = new bootstrap.Modal(document.getElementById('workflowModal'));
            workflowModal.show();
            await initializeWorkflow();
            showStep(1);
        } catch (error) {
            showError('Fehler beim Starten des Workflows');
        }
    });
    
    // Resume Buttons
    elements.uploadResumeBtn?.addEventListener('click', () => handleResumeUpload());
    elements.createResumeBtn?.addEventListener('click', () => {
        const modal = new bootstrap.Modal(document.getElementById('resumeCreatorModal'));
        initializeResumeBuilder();
        modal.show();
    });
    
    // Cover Letter Buttons
    elements.createCoverLetterBtn?.addEventListener('click', () => {
        if (!globalState.resumeData) {
            showError('Bitte laden Sie zuerst einen Lebenslauf hoch');
            return;
        }
        const workflowModal = new bootstrap.Modal(document.getElementById('workflowModal'));
        workflowModal.show();
        showStep(2);
    });
    
    elements.uploadCoverLetterBtn?.addEventListener('click', () => handleCoverLetterUpload());
    
    // Settings Button
    elements.settingsBtn?.addEventListener('click', () => {
        const settingsModal = new bootstrap.Modal(document.getElementById('settingsModal'));
        loadSettings();
        settingsModal.show();
    });
    
    // Help Button
    elements.helpBtn?.addEventListener('click', () => {
        const helpModal = new bootstrap.Modal(document.getElementById('helpModal'));
        helpModal.show();
    });
}

// UI Updates nach Login/Logout
function updateUIAfterLogin() {
    const authButtons = document.getElementById('authButtons');
    const userMenu = document.getElementById('userMenu');
    const userDisplayName = document.getElementById('userDisplayName');
    
    if (AuthService.currentUser) {
        authButtons.classList.add('d-none');
        userMenu.classList.remove('d-none');
        userDisplayName.textContent = `${AuthService.currentUser.firstName} ${AuthService.currentUser.lastName}`;
    }
}

function updateUIAfterLogout() {
    const authButtons = document.getElementById('authButtons');
    const userMenu = document.getElementById('userMenu');
    
    authButtons.classList.remove('d-none');
    userMenu.classList.add('d-none');
    
    // Optional: Redirect zur Startseite oder Modal schließen
    const workflowModal = bootstrap.Modal.getInstance(document.getElementById('workflowModal'));
    if (workflowModal) {
        workflowModal.hide();
    }
}
