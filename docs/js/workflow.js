import { globalState } from './state.js';
import { updateProgress } from './ui.js';

/**
 * Zeigt einen bestimmten Schritt im Workflow an
 * @param {number} stepNum - Die Nummer des anzuzeigenden Schritts
 */
export function showStep(stepNum) {
    document.querySelectorAll('.workflow-step').forEach(s => s.classList.add('d-none'));
    const activeStep = document.getElementById(`step${stepNum}`);
    if (activeStep) {
        activeStep.classList.remove('d-none');
        globalState.currentStep = stepNum;
        updateProgress();
    }
}

/**
 * Geht zum nächsten Schritt im Workflow
 */
export function nextStep() {
    if (globalState.currentStep < 4) {
        showStep(globalState.currentStep + 1);
    }
}

/**
 * Geht zum vorherigen Schritt im Workflow
 */
export function prevStep() {
    if (globalState.currentStep > 1) {
        showStep(globalState.currentStep - 1);
    }
}

/**
 * Initialisiert den Workflow
 */
export function initializeWorkflow() {
    // Zeige den ersten Schritt
    showStep(globalState.currentStep);

    // Event Listener für Workflow-Navigation
    document.querySelectorAll('.workflow-nav-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const direction = this.dataset.direction;
            if (direction === 'next') {
                nextStep();
            } else if (direction === 'prev') {
                prevStep();
            }
        });
    });
}

/**
 * Validiert den aktuellen Schritt
 * @returns {boolean} True wenn der Schritt valid ist
 */
export function validateCurrentStep() {
    switch (globalState.currentStep) {
        case 1:
            return validateStep1();
        case 2:
            return validateStep2();
        case 3:
            return validateStep3();
        case 4:
            return validateStep4();
        default:
            return true;
    }
}

function validateStep1() {
    const jobPosting = globalState.elements.jobPosting.value.trim();
    const resumeUploaded = window.resumeText !== undefined && window.resumeText !== null;
    return jobPosting.length > 0 && resumeUploaded;
}

function validateStep2() {
    // Validierung für den Analyse-Schritt
    return true; // Kann erweitert werden
}

function validateStep3() {
    // Validierung für den Anschreiben-Schritt
    const sections = globalState.elements.coverLetterSections;
    return Object.values(sections).every(section => section.value.trim().length > 0);
}

function validateStep4() {
    // Validierung für den Export-Schritt
    return true; // Kann erweitert werden
}

/**
 * Aktualisiert die Workflow-Navigation basierend auf dem aktuellen Schritt
 */
export function updateWorkflowNavigation() {
    const prevBtn = document.querySelector('.workflow-nav-btn[data-direction="prev"]');
    const nextBtn = document.querySelector('.workflow-nav-btn[data-direction="next"]');
    
    if (prevBtn) {
        prevBtn.disabled = globalState.currentStep === 1;
    }
    
    if (nextBtn) {
        nextBtn.disabled = globalState.currentStep === 4 || !validateCurrentStep();
    }
} 
