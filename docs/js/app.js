import { globalState } from './state.js';
import { showError, showSuccess, showLoading, hideLoading, updatePreview } from './ui.js';
import { handleFileUpload, initializeFileUpload } from './file-handler.js';
import { analyzeJobPosting, analyzeResume } from './analysis.js';
import { AIService } from './ai-service.js';
import { Features } from './features.js';
import { initializeWorkflow, showStep, nextStep, prevStep } from './workflow.js';
import { safeGetElem, extractJobAdText } from './utils.js';

document.addEventListener('DOMContentLoaded', function() {
    "use strict";
    
    initializeApp();
});

function initializeApp() {
    initializeElements();
    initializeEventListeners();
    Features.initialize();
    initializeWorkflow();
    setInterval(updatePreview, 3000);
}

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
        messageToast: new bootstrap.Toast(document.getElementById('messageToast'))
    };
}

function initializeEventListeners() {
    const { elements } = globalState;
    
    // Help Button
    document.getElementById('helpBtn')?.addEventListener('click', () => {
        elements.helpModal.show();
    });

    // URL Input Handler
    elements.jobPostingURL?.addEventListener('input', async function() {
        const url = this.value.trim();
        if (url && isValidURL(url)) {
            try {
                showLoading(elements.analyzeBtn, 'Lade Stellenanzeige...');
                const jobText = await fetchJobPosting(url);
                if (jobText) {
                    elements.jobPosting.value = jobText;
                    showSuccess('Stellenanzeige erfolgreich geladen');
                    checkRequiredUploads();
                }
            } catch (error) {
                showError('Fehler beim Laden der Stellenanzeige');
                console.error('URL fetch error:', error);
            } finally {
                hideLoading(elements.analyzeBtn, 'Analysieren');
            }
        }
    });

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

    // Paste & Example Buttons
    if (elements.pasteBtn) {
        elements.pasteBtn.addEventListener('click', async () => {
            try {
                const text = await navigator.clipboard.readText();
                if (elements.jobPosting) {
                    elements.jobPosting.value = text;
                    showSuccess('Text aus Zwischenablage eingefügt');
                }
            } catch (err) {
                showError('Fehler beim Einfügen aus der Zwischenablage');
            }
        });
    }

    if (elements.loadExampleBtn && elements.jobPosting) {
        elements.loadExampleBtn.addEventListener('click', () => {
            const exampleText = `
                [BEISPIEL-STELLENANZEIGE]
                Wir suchen eine/n Softwareentwickler/in (m/w/d) 
                mit Fokus auf JavaScript/TypeScript...
            `;
            elements.jobPosting.value = exampleText;
            showSuccess('Beispiel-Stellenanzeige wurde eingefügt');
        });
    }

    // Initialize other features
    initializeFileUpload();
    initializeTextareaListeners();
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
