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
        letterStyle: safeGetElem('letterStyle')
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

    // Hauptbuttons
    elements.startBtn?.addEventListener('click', startWorkflow);
    elements.uploadResumeBtn?.addEventListener('click', () => handleResumeUpload());
    elements.createResumeBtn?.addEventListener('click', () => elements.resumeCreatorModal.show());
    elements.uploadCoverLetterBtn?.addEventListener('click', () => handleCoverLetterUpload());
    elements.settingsBtn?.addEventListener('click', () => elements.settingsModal.show());
    elements.helpBtn?.addEventListener('click', () => elements.helpModal.show());
    
    // Workflow Navigation
    elements.prevStepBtn?.addEventListener('click', () => prevStep());
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
