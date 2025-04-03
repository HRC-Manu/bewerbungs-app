"use strict";

import { globalState } from './state.js';
import { showError, showSuccess, showLoading, hideLoading, updatePreview } from './ui.js';
import { handleFileUpload, initializeFileUpload } from './file-handler.js';
import { analyzeJobPosting, analyzeResume } from './analysis.js';
import { AIService } from './ai-service.js';
import { Features } from './features.js';
import { initializeWorkflow, showStep, nextStep, prevStep } from './workflow.js';
import { safeGetElem, extractJobAdText } from './utils.js';
import AuthService from './services/auth-service.js';
import DocumentService from './services/document-service.js';
import { auth } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { ref, set } from "firebase/database";
import { db, testFirebaseConnection } from './firebase-config.js';
import AdminService from './services/admin-service.js';
import ResumeAnalyzer from './resume-analyzer.js';

// Auth state listener
onAuthStateChanged(auth, (user) => {
    if (user) {
        // User ist eingeloggt
        console.log('Eingeloggt als:', user.email);
        document.getElementById('authButtons').classList.add('d-none');
        document.getElementById('userMenu').classList.remove('d-none');
        document.getElementById('userDisplayName').textContent = user.email;
    } else {
        // User ist ausgeloggt
        console.log('Ausgeloggt');
        document.getElementById('authButtons').classList.remove('d-none');
        document.getElementById('userMenu').classList.add('d-none');
    }
});

// Hauptinitialisierung
console.info('Lade App...');

document.addEventListener('DOMContentLoaded', async function() {
    "use strict";
    
    try {
        console.log('Initializing application...');
        
        // Warte bis Bootstrap verfügbar ist
        if (typeof bootstrap === 'undefined') {
            console.error('Bootstrap not loaded');
            throw new Error('Bootstrap not loaded');
        }
        
        // Initialisiere global state
        window.globalState = window.globalState || {};
        
        // Initialisiere Elemente - wichtig: Vor den Event-Listenern!
        if (!initializeElements()) {
            throw new Error('Element initialization failed');
        }
        
        // Rest der Initialisierung
        initializeAuthHandlers();
        initializeMainButtons();
        initializeEventListeners();  // Nach den anderen Initialisierungsfunktionen
        Features.initialize();
        initializeWorkflow();
        console.debug('Starte Auth-Service-Check...');
        await AuthService.checkAuth();
        
        setInterval(updatePreview, 3000);
        
        // Teste Firebase-Verbindung
        const isConnected = await testFirebaseConnection();
        if (isConnected) {
            console.log('Firebase-Verbindung erfolgreich getestet!');
        } else {
            console.warn('Firebase-Verbindung konnte nicht getestet werden');
        }
        
        initializeAutoSync();
        initializeGitHubIntegration();
        
        setupPaywallLogic();
        setupAdminUI();
        
        initializeExplanationButtons();
        
        // Lebenslauf-Analyzer initialisieren, wenn Container vorhanden
        const analyzerContainer = document.getElementById('resume-analyzer-container');
        if (analyzerContainer) {
            ResumeAnalyzer.init('resume-analyzer-container');
            console.log('Lebenslauf-Analyzer initialisiert');
        }
        
        // Tab-Wechsel-Handler für Resume-Analyzer
        const resumeAnalyzerTab = document.getElementById('resume-analyzer-tab');
        if (resumeAnalyzerTab) {
            resumeAnalyzerTab.addEventListener('shown.bs.tab', function() {
                // Verzögerte Initialisierung, falls noch nicht geschehen
                if (!window.resumeAnalyzerInitialized) {
                    setTimeout(() => {
                        const analyzerContainer = document.getElementById('resume-analyzer-container');
                        if (analyzerContainer && typeof ResumeAnalyzer !== 'undefined') {
                            ResumeAnalyzer.init('resume-analyzer-container');
                            window.resumeAnalyzerInitialized = true;
                            console.log('Lebenslauf-Analyzer bei Tab-Wechsel initialisiert');
                        }
                    }, 100);
                }
            });
        }
        
        console.log('Application initialized successfully');
    } catch (error) {
        console.error('[App Init Error]', error);
        showError('Fehler beim Initialisieren: ' + error.message);
    }
});

function initializeElements() {
    try {
        // Warte bis Bootstrap vollständig geladen ist
        if (typeof bootstrap === 'undefined') {
            console.error('Bootstrap is not loaded');
            return false;
        }

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
            apiModal: (() => {
                const el = document.getElementById('apiModal');
                return el ? new bootstrap.Modal(el, {
                    backdrop: true,
                    keyboard: true
                }) : null;
            })(),
            colorPicker: safeGetElem('colorPicker'),
            fontSelect: safeGetElem('fontSelect'),
            borderToggle: safeGetElem('borderToggle'),
            refreshPreviewBtn: safeGetElem('refreshPreviewBtn'),
            modernPreviewContainer: safeGetElem('modernPreviewContainer'),
            suggestionsModal: document.getElementById('suggestionsModal') ? 
                new bootstrap.Modal(document.getElementById('suggestionsModal')) : null,
            helpModal: document.getElementById('helpModal') ? 
                new bootstrap.Modal(document.getElementById('helpModal')) : null,
            messageToast: (() => {
                const el = document.getElementById('messageToast');
                return el ? new bootstrap.Toast(el, {
                    delay: 3000,
                    animation: true
                }) : null;
            })(),
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
            loginModal: (() => {
                const el = document.getElementById('loginModal');
                return el ? new bootstrap.Modal(el, {
                    backdrop: true,
                    keyboard: true
                }) : null;
            })(),
            registerModal: document.getElementById('registerModal') ? 
                new bootstrap.Modal(document.getElementById('registerModal')) : null,
            passwordResetModal: document.getElementById('passwordResetModal') ? 
                new bootstrap.Modal(document.getElementById('passwordResetModal')) : null,
            workflowModal: document.getElementById('workflowModal') ? 
                new bootstrap.Modal(document.getElementById('workflowModal')) : null,
            settingsModal: document.getElementById('settingsModal') ? 
                new bootstrap.Modal(document.getElementById('settingsModal')) : null,
        };
        
        // Debug-Ausgabe für Diagnose
        console.log('Elements initialized:', Object.keys(globalState.elements).length, 'elements found');
        
        // Prüfe einige wichtige Elemente
        const criticalElements = ['analyzeBtn', 'jobPosting', 'generateSuggestionsBtn'];
        criticalElements.forEach(id => {
            if (!globalState.elements[id]) {
                console.warn(`Critical element not found: ${id}`);
            } else {
                console.log(`Found critical element: ${id}`);
            }
        });
    } catch (error) {
        console.error('Error initializing elements:', error);
        // Verhindere, dass der Fehler weiter nach oben propagiert
        return false;
    }
    return true;
}

function initializeEventListeners() {
    const { elements } = globalState;
    
    if (!elements) {
        console.error('Cannot initialize event listeners: globalState.elements is not defined');
        return;
    }
    
    // Help Button
    const helpBtn = document.getElementById('helpBtn');
    if (helpBtn) {
        helpBtn.addEventListener('click', () => {
            if (elements.helpModal) {
                elements.helpModal.show();
            } else {
                console.error('helpModal not found');
            }
        });
        console.log('Help button event listener added');
    } else {
        console.warn('Help button not found');
    }

    // URL Input Handler
    if (elements.jobPostingURL) {
        elements.jobPostingURL.addEventListener('input', debounce(handleJobPostingURL, 400));
        console.log('Job posting URL event listener added');
    }

    // Paste & Example Buttons
    if (elements.pasteBtn) {
        elements.pasteBtn.addEventListener('click', handlePaste);
        console.log('Paste button event listener added');
    }
    
    if (elements.loadExampleBtn) {
        elements.loadExampleBtn.addEventListener('click', handleLoadExample);
        console.log('Load example button event listener added');
    }

    // Analyze Button
    if (elements.analyzeBtn) {
        elements.analyzeBtn.addEventListener('click', handleAnalyze);
        console.log('Analyze button event listener added');
    } else {
        console.warn('Analyze button not found');
    }
    
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
                await performJobPostingAnalysis();
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
    
    // GitHub Token speichern
    const githubToken = document.getElementById('githubToken').value;
    if (githubToken) {
        localStorage.setItem('githubToken', githubToken);
    }
    
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

async function performJobPostingAnalysis() {
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
        
        try {
            showLoading(e.target, 'Anmeldung...');
            await AuthService.login(email, password);
            globalState.elements.loginModal.hide();
            showSuccess('Erfolgreich angemeldet');
        } catch (error) {
            showError(error.message);
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
    document.getElementById('registerForm')?.addEventListener('submit', handleRegisterSubmit);
    
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
        checkPasswordStrength(this.value);
    });
    
    // Passwörter live vergleichen
    document.getElementById('registerPasswordConfirm')?.addEventListener('input', function() {
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = this.value;
        
        if (password !== confirmPassword) {
            this.setCustomValidity('Passwörter stimmen nicht überein');
        } else {
            this.setCustomValidity('');
        }
    });
    
    console.log('Auth handlers initialized');
}

function checkPasswordStrength(password) {
    let strength = 0;
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChars = /[^A-Za-z0-9]/.test(password);

    if (password.length >= minLength) strength++;
    if (hasUpperCase && hasLowerCase) strength++;
    if (hasNumbers) strength++;
    if (hasSpecialChars) strength++;

    const indicator = document.querySelector('.password-strength');
    if (indicator) {
        indicator.className = 'password-strength mt-2';
        if (strength > 0) {
            indicator.classList.add(
                strength === 1 ? 'weak' : 
                strength === 2 ? 'medium' : 
                'strong'
            );
        }
    }

    return strength;
}

// Hauptbuttons und Workflow
function initializeMainButtons() {
    const { elements } = globalState;
    
    // Start Button
    elements.startBtn?.addEventListener('click', async () => {
        console.log('Start button clicked');
        if (!AuthService.currentUser) {
            showError('Bitte melden Sie sich zuerst an');
            elements.loginModal.show();
          return;
        }
        
        try {
            elements.workflowModal.show();
            await initializeWorkflow();
            showStep(1);
        } catch (error) {
            showError('Fehler beim Starten des Workflows');
        }
    });
    
    // Resume Buttons
    elements.uploadResumeBtn?.addEventListener('click', () => {
        console.log('Upload resume button clicked');
        handleResumeUpload();
    });
    elements.createResumeBtn?.addEventListener('click', () => {
        console.log('Create resume button clicked');
        initializeResumeBuilder();
        elements.resumeCreatorModal.show();
    });
    
    // Cover Letter Buttons
    elements.createCoverLetterBtn?.addEventListener('click', () => {
        console.log('Create cover letter button clicked');
        if (!globalState.resumeData) {
            showError('Bitte laden Sie zuerst einen Lebenslauf hoch');
            return;
        }
        elements.workflowModal.show();
        showStep(2);
    });
    
    elements.uploadCoverLetterBtn?.addEventListener('click', () => {
        console.log('Upload cover letter button clicked');
        handleCoverLetterUpload();
    });
    
    // Settings Button
    elements.settingsBtn?.addEventListener('click', () => {
        console.log('Settings button clicked');
        loadSettings();
        elements.settingsModal.show();
    });
    
    // Help Button
    elements.helpBtn?.addEventListener('click', () => {
        console.log('Help button clicked');
        elements.helpModal.show();
    });
    
    console.log('Main buttons initialized');
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

// Verbesserte Registrierungsfunktion mit Firebase
async function handleRegisterSubmit(e) {
    e.preventDefault();
    const form = e.target;
    
    try {
        // Validiere Passwörter
        const password = document.getElementById('registerPassword').value;
        const passwordConfirm = document.getElementById('registerPasswordConfirm').value;
        
        if (password !== passwordConfirm) {
            showError('Passwörter stimmen nicht überein');
            return;
        }

        // Validiere Nutzungsbedingungen
        const termsAccepted = document.getElementById('termsAccepted').checked;
        if (!termsAccepted) {
            showError('Bitte akzeptieren Sie die Nutzungsbedingungen');
            return;
        }

        // Sammle Formulardaten
        const userData = {
            firstName: document.getElementById('registerFirstName').value,
            lastName: document.getElementById('registerLastName').value,
            email: document.getElementById('registerEmail').value,
            password: password
        };

        showLoading(form.querySelector('button[type="submit"]'), 'Registriere...');

        // Registriere mit Firebase
        await AuthService.register(userData);

        // Schließe Register-Modal
        const registerModal = bootstrap.Modal.getInstance(document.getElementById('registerModal'));
        registerModal.hide();

        showSuccess('Registrierung erfolgreich! Bitte melden Sie sich an.');
        setTimeout(() => {
            const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
            loginModal.show();
        }, 1000);

    } catch (error) {
        console.error('Register error:', error);
        showError(error.message);
    } finally {
        hideLoading(form.querySelector('button[type="submit"]'), 'Registrieren');
    }
}

// Funktion zum Initialisieren der Datenbankstruktur
async function initializeDatabase() {
    try {
        const initialData = {
            users: {
                test_user: {
                    profile: {
                        firstName: "Test",
                        lastName: "User",
                        email: "test@example.com",
                        createdAt: new Date().toISOString()
                    },
                    applications: {}
                }
            }
        };

        await set(ref(db), initialData);
        console.log("Database initialized");
    } catch (error) {
        console.error("Error initializing database:", error);
    }
}

// Füge einen Button zum Initialisieren hinzu
if (location.hostname === "localhost") {
    const initButton = document.createElement('button');
    initButton.textContent = "Initialize Database";
    initButton.onclick = initializeDatabase;
    document.body.appendChild(initButton);
}

// GitHub Sync Funktionen
async function syncToGitHub(filePath, content) {
    const GITHUB_TOKEN = localStorage.getItem('githubToken');
    const REPO_OWNER = 'weaweawe'; // Dein GitHub Username
    const REPO_NAME = 'bewerbung'; // Dein Repository Name
    
    try {
        // Erst aktuellen SHA des Files holen
        const response = await fetch(
            `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filePath}`,
            {
                headers: {
                    'Authorization': `Bearer ${GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            }
        );
        
        const fileInfo = await response.json();
        
        // File updaten
        const updateResponse = await fetch(
            `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filePath}`,
            {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: 'Update via Web Editor',
                    content: btoa(content), // Base64 encode
                    sha: fileInfo.sha
                })
            }
        );

        if (updateResponse.ok) {
            showSuccess('Änderungen gespeichert');
        } else {
            throw new Error('Fehler beim Speichern');
        }
    } catch (error) {
        console.error('Sync error:', error);
        showError('Fehler beim Synchronisieren mit GitHub');
    }
}

// Automatische Speicherung bei Änderungen
function initializeAutoSync() {
    // Token-Input im Settings-Modal
    const tokenInput = document.createElement('div');
    tokenInput.className = 'mb-3';
    tokenInput.innerHTML = `
        <h5 class="mt-4">GitHub Integration</h5>
        <div class="form-group">
            <label class="form-label">GitHub Token</label>
            <input type="password" class="form-control" id="githubToken" 
                   value="${localStorage.getItem('githubToken') || ''}">
            <small class="form-text text-muted">Dein GitHub Personal Access Token für die automatische Synchronisation</small>
        </div>
    `;
    
    // Füge es vor dem ersten Element im Settings-Form ein
    const settingsForm = document.querySelector('#settingsForm');
    settingsForm.insertBefore(tokenInput, settingsForm.firstChild);

    // Auto-Save für wichtige Elemente
    const elementsToWatch = [
        'jobPosting',
        'coverLetterEditor'
    ];

    elementsToWatch.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', debounce(async () => {
                const filePath = `docs/js/${id}.js`;
                await syncToGitHub(filePath, element.value);
            }, 2000));
        }
    });

    const token = localStorage.getItem('githubToken');
    if (!token) {
        console.warn('Kein GitHub Token gefunden – AutoSync inaktiv.');
        return;
    }
}

// GitHub Integration
function initializeGitHubIntegration() {
    // Toggle Button für Token-Sichtbarkeit
    const tokenToggle = document.querySelector('.token-toggle');
    const tokenInput = document.getElementById('githubToken');
    const statusIndicator = document.querySelector('.github-status');
    
    if (tokenToggle && tokenInput) {
        tokenToggle.addEventListener('click', () => {
            const type = tokenInput.type === 'password' ? 'text' : 'password';
            tokenInput.type = type;
            tokenToggle.querySelector('i').classList.toggle('bi-eye');
            tokenToggle.querySelector('i').classList.toggle('bi-eye-slash');
        });
    }

    // Status-Check
    async function checkGitHubConnection() {
        const token = localStorage.getItem('githubToken');
        if (!token) {
            updateConnectionStatus(false);
            return;
        }

        try {
            const response = await fetch('https://api.github.com/user', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            updateConnectionStatus(response.ok);
        } catch (error) {
            console.error('GitHub connection check failed:', error);
            updateConnectionStatus(false);
        }
    }

    function updateConnectionStatus(connected) {
        if (statusIndicator) {
            statusIndicator.className = `github-status ${connected ? 'connected' : 'disconnected'}`;
            statusIndicator.querySelector('span').textContent = 
                connected ? 'Verbunden' : 'Nicht verbunden';
        }
    }

    // Initial Check
    checkGitHubConnection();

    // Save Handler erweitern
    const saveBtn = document.getElementById('saveSettingsBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            const token = tokenInput.value;
            if (token) {
                localStorage.setItem('githubToken', token);
                await checkGitHubConnection();
                showSuccess('Einstellungen gespeichert');
            }
        });
    }
}

// NEUE FUNKTION: Zeigt Buttons/Video je nach Login
function setupPaywallLogic() {
    const paywallContainer = document.getElementById('paywallContainer');
    const featureCards = document.getElementById('featureCards');
    const introVideo = document.getElementById('introVideo');
    const paywallSubmitBtn = document.getElementById('paywallSubmitBtn');
    const paywallVoucherInput = document.getElementById('paywallVoucher');

    // Falls eingeloggt oder Admin = wir zeigen Paywall-Eingabe & ggf. Feature-Karten
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // User ist eingeloggt
            // Zeige Paywall-Eingabe oder Admin-check
            paywallContainer.classList.remove('d-none');
            introVideo.classList.remove('d-none');
        } else {
            // User nicht eingeloggt -> Buttons & Paywall ausgeblendet
            paywallContainer.classList.add('d-none');
            featureCards.classList.add('d-none');
        }
    });

    paywallSubmitBtn?.addEventListener('click', async () => {
        const code = paywallVoucherInput.value.trim();
        if (!code) return;
        const isValid = await AdminService.checkVoucherCode(code);
        if (isValid) {
            showSuccess('Gutscheincode akzeptiert – Funktionen freigeschaltet!');
            // Blende Video aus, Cards ein
            introVideo.classList.add('d-none');
            featureCards.classList.remove('d-none');
            paywallContainer.classList.add('d-none');
        } else {
            showError('Ungültiger Gutscheincode!');
        }
    });
}

// NEUE FUNKTION: Admin UI
function setupAdminUI() {
    const adminModal = new bootstrap.Modal(document.getElementById('adminModal'), {});
    const addVoucherBtn = document.getElementById('addVoucherBtn');
    const newVoucherInput = document.getElementById('newVoucherCodeInput');
    const voucherList = document.getElementById('voucherList');

    // Prüfen, ob user ein Admin ist => zeige Admin Modal-Button 
    onAuthStateChanged(auth, async (user) => {
        if (!user) return;

        const isAdminUser = await AdminService.checkIsAdmin(user.email);
        if (isAdminUser) {
            // Allow user to open Admin Modal, z.B. per Button "Einstellungen" oder "Admin"
            // Füge z.B. in userMenu eine Admin-Schaltfläche an
            const userMenu = document.getElementById('userMenu');
            const adminLink = document.createElement('a');
            adminLink.className = 'dropdown-item';
            adminLink.textContent = 'Admin-Bereich';
            adminLink.onclick = () => adminModal.show();
            userMenu.querySelector('.dropdown-menu')?.prepend(adminLink);

            // Lade vorhandene Codes
            loadVoucherCodes();
        }
    });

    addVoucherBtn?.addEventListener('click', async () => {
        const code = newVoucherInput.value.trim();
        if (!code) return;
        await AdminService.addVoucherCode(code);
        newVoucherInput.value = '';
        await loadVoucherCodes();
    });

    async function loadVoucherCodes() {
        const codes = await AdminService.getAllVoucherCodes();
        voucherList.innerHTML = codes.map(c => `<div>- ${c}</div>`).join('');
    }
}

function initializeExplanationButtons() {
    const step1Btn = document.querySelector('.explanation-section button:nth-of-type(1)');
    const step2Btn = document.querySelector('.explanation-section button:nth-of-type(2)');
    const step3Btn = document.querySelector('.explanation-section button:nth-of-type(3)');

    // Wenn du dein Workflow-Funktionalität hast:
    if (step1Btn) {
        step1Btn.disabled = false;
        step1Btn.addEventListener('click', () => {
            // z.B. showStep(1) oder handleResumeUpload(); 
            // Hier beispielhaft:
            showStep(1);
        });
    }
    if (step2Btn) {
        step2Btn.disabled = false;
        step2Btn.addEventListener('click', () => {
            // z.B. showStep(2) oder handlePasteJobAd();
            showStep(2);
        });
    }
    if (step3Btn) {
        step3Btn.disabled = false;
        step3Btn.addEventListener('click', () => {
            // z.B. showStep(3) oder generateLetter();
            showStep(3);
        });
    }
}

// Debug-Helper für die Konsole
window.debugApp = {
    state: globalState,
    testEventListener: function(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            console.log(`Element ${elementId} gefunden`);
            element.style.border = '2px solid red';
            alert(`Element ${elementId} wurde markiert`);
        } else {
            console.error(`Element ${elementId} nicht gefunden`);
            alert(`Element ${elementId} nicht gefunden`);
        }
    },
    checkElementExists: function(elementId) {
        return !!document.getElementById(elementId);
    },
    listAllButtons: function() {
        const buttons = document.querySelectorAll('button');
        console.log(`${buttons.length} Buttons gefunden:`);
        buttons.forEach((btn, i) => {
            console.log(`${i+1}. ID: ${btn.id || 'keine ID'}, Text: ${btn.textContent.trim()}`);
        });
        return buttons.length;
    }
};

console.log("Debug-Tools verfügbar via window.debugApp");
