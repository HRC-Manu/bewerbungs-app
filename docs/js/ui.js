"use strict"; // Schleife 1: Strict-Mode

import { globalState } from './state.js';
import { safeGetElem } from './utils.js';

// UI-Funktionen und Toast-Manager
export class ToastManager {
    constructor() {
        this.queue = [];
        this.isProcessing = false;
        this.container = this.createContainer();
    }

    createContainer() {
        const container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(container);
        return container;
    }

    async showToast(message, type = 'info', duration = 3000) {
        this.queue.push({ message, type, duration });
        if (!this.isProcessing) {
            this.processQueue();
        }
    }

    async processQueue() {
        if (this.queue.length === 0) {
            this.isProcessing = false;
            return;
        }

        this.isProcessing = true;
        const { message, type, duration } = this.queue.shift();

        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-white bg-${type} border-0`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');

        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        `;

        this.container.appendChild(toast);
        const bsToast = new bootstrap.Toast(toast, { delay: duration });
        bsToast.show();

        await new Promise(resolve => {
            toast.addEventListener('hidden.bs.toast', () => {
                toast.remove();
                resolve();
            });
        });

        this.processQueue();
    }
}

// Singleton-Instanz für globale Verwendung
export const toastManager = new ToastManager();

// Convenience-Funktionen
export function showSuccess(message, duration = 3000) {
    toastManager.showToast(message, 'success', duration);
}

export function showError(message, duration = 5000) {
    toastManager.showToast(message, 'danger', duration);
}

export function showWarning(message, duration = 4000) {
    toastManager.showToast(message, 'warning', duration);
}

export function showInfo(message, duration = 3000) {
    toastManager.showToast(message, 'info', duration);
}

// Loading-Manager
export class LoadingManager {
    constructor() {
        this.loadingStates = new Map();
    }

    showLoading(element, text) {
        if (!element) return;
        
        const state = {
            originalText: element.innerHTML,
            originalDisabled: element.disabled
        };
        this.loadingStates.set(element, state);

        element.disabled = true;
        element.innerHTML = `
            <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
            ${text}
        `;
    }

    hideLoading(element) {
        if (!element) return;
        
        const state = this.loadingStates.get(element);
        if (state) {
            element.disabled = state.originalDisabled;
            element.innerHTML = state.originalText;
            this.loadingStates.delete(element);
        }
    }

    isLoading(element) {
        return this.loadingStates.has(element);
    }
}

// Singleton-Instanz für globale Verwendung
export const loadingManager = new LoadingManager();

// UI-Hilfsfunktionen
export function updatePreview() {
    const coverLetterPreview = document.getElementById('coverLetterPreview');
    if (!coverLetterPreview) return;
    
    const sections = {
        recipient: document.getElementById('coverLetterRecipient')?.value || '',
        subject: document.getElementById('coverLetterSubject')?.value || '',
        introduction: document.getElementById('coverLetterIntro')?.value || '',
        main: document.getElementById('coverLetterMain')?.value || '',
        closing: document.getElementById('coverLetterClosing')?.value || ''
    };
    
    let preview = '';
    
    if (sections.recipient) {
        preview += `<p>${sections.recipient}</p>`;
    }
    
    if (sections.subject) {
        preview += `<p><strong>${sections.subject}</strong></p>`;
    }
    
    if (sections.introduction) {
        preview += `<p>${sections.introduction}</p>`;
    }
    
    if (sections.main) {
        preview += `<p>${sections.main}</p>`;
    }
    
    if (sections.closing) {
        preview += `<p>${sections.closing}</p>`;
    }
    
    coverLetterPreview.innerHTML = preview || '<p class="text-muted">Vorschau wird hier angezeigt...</p>';
}

export function updateProgress(progress) {
    const progressBar = document.getElementById('progressBar');
    if (progressBar) {
        progressBar.style.width = `${progress}%`;
        progressBar.setAttribute('aria-valuenow', progress);
        progressBar.querySelector('.visually-hidden').textContent = `${progress}% abgeschlossen`;
    }
}

export function safeGetElem(id) {
    const el = document.getElementById(id);
    if (!el) console.warn(`Element #${id} nicht gefunden`);
    return el;
}

// Export alle UI-Funktionen
export const UI = {
    ToastManager,
    LoadingManager,
    toastManager,
    loadingManager,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    updatePreview,
    updateProgress,
    safeGetElem
};

export function showLoading(element, text = 'Lädt...') {
    if (!element) return;
    
    if (element instanceof HTMLButtonElement) {
        element.disabled = true;
        const originalText = element.innerHTML;
        element.innerHTML = `
            <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
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
    if (!element) return;
    
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

/**
 * Zeigt eine Erfolgs-Toast-Nachricht
 * @param {string} message 
 * @param {number} duration 
 */
export function showSuccess(message, duration = 3000) {
    try {
        console.info('SUCCESS:', message);
        const toast = globalState?.elements?.messageToast;
        if (!toast) {
            console.log('Success:', message);
            return;
        }

        const toastTitle = document.getElementById('toastTitle');
        const toastMessage = document.getElementById('toastMessage');
        
        if (toastTitle && toastMessage) {
            toastTitle.textContent = 'Erfolg';
            toastTitle.className = 'me-auto text-success';
            toastMessage.textContent = message;
            
            const bsToast = new bootstrap.Toast(toast, {
                delay: duration
            });
            bsToast.show();
        }
    } catch (error) {
        console.error('showSuccess fallback:', error);
        alert(message);
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
        console.error('[UI ERROR]:', message);
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
