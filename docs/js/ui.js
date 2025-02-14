import { globalState } from './state.js';
import { safeGetElem } from './utils.js';

export function showLoading(element, text) {
    if (element instanceof HTMLButtonElement) {
        element.disabled = true;
        const originalText = element.innerHTML;
        element.innerHTML = `
            <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            ${text}
        `;
        element.dataset.originalText = originalText;
    } else {
        const loadingEl = document.createElement('div');
        loadingEl.className = 'loading-overlay';
        loadingEl.innerHTML = `
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Lädt...</span>
            </div>
            <div class="mt-2">${text}</div>
        `;
        element.appendChild(loadingEl);
    }
}

export function hideLoading(element, originalText = '') {
    if (element instanceof HTMLButtonElement) {
        element.disabled = false;
        element.innerHTML = originalText || element.dataset.originalText || element.innerHTML;
    } else {
        const loadingEl = element.querySelector('.loading-overlay');
        if (loadingEl) {
            loadingEl.remove();
        }
    }
}

export function showSuccess(message) {
    try {
        const toast = globalState?.elements?.messageToast;
        const toastTitle = document.getElementById('toastTitle');
        const toastMessage = document.getElementById('toastMessage');
        
        if (toast && toastTitle && toastMessage) {
            toastTitle.textContent = 'Erfolg';
            toastTitle.className = 'me-auto text-success';
            toastMessage.textContent = message;
            toast.show();
        } else {
            console.log('Success:', message);
            // Optional: alert(message);
        }
    } catch (error) {
        console.log('Success (fallback):', message);
    }
}

export function showError(message) {
    try {
        // Prüfe erst ob globalState existiert
        if (!window.globalState?.elements) {
            console.error('Global state not initialized');
            alert(message);
            return;
        }

        const toast = globalState.elements.messageToast;
        if (!toast) {
            console.warn('Toast not available, falling back to alert');
            alert(message);
            return;
        }

        const toastTitle = document.getElementById('toastTitle');
        const toastMessage = document.getElementById('toastMessage');
        
        if (!toastTitle || !toastMessage) {
            console.warn('Toast elements not found, falling back to alert');
            alert(message);
            return;
        }

        toastTitle.textContent = 'Fehler';
        toastTitle.className = 'me-auto text-danger';
        toastMessage.textContent = message;
        toast.show();
    } catch (error) {
        console.error('Error in showError:', error);
        alert(message);
    }
}

export function showWarning(message) {
    const toast = globalState.elements.messageToast;
    const toastTitle = document.getElementById('toastTitle');
    const toastMessage = document.getElementById('toastMessage');
    
    if (toast && toastTitle && toastMessage) {
        toastTitle.textContent = 'Warnung';
        toastTitle.className = 'me-auto text-warning';
        toastMessage.textContent = message;
        toast.show();
    } else {
        console.warn('Warning:', message);
    }
}

export function updatePreview() {
    const { elements } = globalState;
    if (!elements.coverLetterPreview) return;
    
    let preview = '';
    const sections = elements.coverLetterSections;
    
    if (sections.recipient?.value) {
        preview += `<p>${sections.recipient.value}</p>`;
    }
    
    if (sections.subject?.value) {
        preview += `<p><strong>${sections.subject.value}</strong></p>`;
    }
    
    if (sections.introduction?.value) {
        preview += `<p>${sections.introduction.value}</p>`;
    }
    
    if (sections.main?.value) {
        preview += `<p>${sections.main.value}</p>`;
    }
    
    if (sections.closing?.value) {
        preview += `<p>${sections.closing.value}</p>`;
    }
    
    elements.coverLetterPreview.innerHTML = preview || '<p class="text-muted">Vorschau wird hier angezeigt...</p>';
}

export function updateProgress() {
    let completed = 0;
    const total = 4;

    if (window.resumeText) {
        completed++;
    }
    if (globalState.elements.jobPosting.value.trim().length > 20) {
        completed++;
    }
    const apiKeyStored = localStorage.getItem('myEncryptedApiKey');
    if (apiKeyStored) {
        completed++;
    }
    if ((globalState.elements.coverLetterEditor?.innerText || '').length > 50) {
        completed++;
    }

    const pct = Math.round((completed / total) * 100);
    const progressBar = safeGetElem('progressBar');
    if (progressBar) {
        progressBar.style.width = pct + '%';
        progressBar.textContent = pct + '%';
    }
}

export function applyDesignToPreview() {
    const container = globalState.elements.modernPreviewContainer;
    if (!container) return;

    const { backgroundColor, fontFamily, showBorder } = globalState.designSettings;
    
    container.style.backgroundColor = backgroundColor;
    container.style.fontFamily = fontFamily;
    container.style.border = showBorder ? '1px solid #dee2e6' : 'none';
}

export function animateCardEntrance(cardId) {
    const card = safeGetElem(cardId);
    if (card) {
        card.classList.remove('fade-in-card');
        void card.offsetWidth; // Reflow
        card.classList.add('fade-in-card');
    }
}

export function checkCoverLetterLength() {
    const wordCount = (globalState.elements.coverLetterEditor?.innerText || '').trim().split(/\s+/).filter(Boolean).length;
    if (wordCount > 600) {
        showWarning(`Achtung: Das Anschreiben hat bereits ${wordCount} Wörter!`);
    }
} 
