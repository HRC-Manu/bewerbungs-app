"use strict";

import { showError, showSuccess, showLoading, hideLoading } from './ui.js';
import { formatFileSize } from './utils.js';
import { globalState } from './state.js';

/**
 * Verarbeitet den Upload von PDF-Dateien
 * @param {Event} event - Das Upload-Event
 */
export async function handleFileUpload(event, type = 'resume') {
    console.debug(`[FileHandler] Upload type: ${type}`);
    const file = event.target.files[0];
    if (!file) return;

    const input = event.target;
    const container = input.closest('.upload-container');
    const uploadArea = container.querySelector('.upload-area');
    const preview = container.querySelector('.file-preview');
    const fileName = preview.querySelector('.file-name');

    try {
        if (!file.type.includes('pdf') && !file.type.includes('doc')) {
            throw new Error('Bitte nur PDF/DOC-Dokumente hochladen');
        }

        if (file.size > 10 * 1024 * 1024) {
            throw new Error('Die Datei ist zu groß (maximal 10MB)');
        }

        showLoading(preview, 'Verarbeite Datei...');
        
        const text = await extractTextFromPDF(file);
        if (!text.trim()) {
            throw new Error('Keine Textinhalte in der PDF-Datei gefunden');
        }
        
        if (input.id === 'resumeUpload') {
            window.resumeText = text;
            
            uploadArea.style.display = 'none';
            preview.classList.remove('d-none');
            preview.style.display = 'block';
            
            fileName.innerHTML = `
                <div class="d-flex align-items-center">
                    <i class="bi bi-file-pdf me-2"></i>
                    <div>
                        <div class="fw-bold">${file.name}</div>
                        <small class="text-muted">${formatFileSize(file.size)}</small>
                    </div>
                </div>
            `;
            
            showSuccess('Lebenslauf erfolgreich verarbeitet');
            checkRequiredUploads();
        }
    } catch (error) {
        console.error('[FileHandler] Upload error:', error);
        showError(error.message);
    } finally {
        hideLoading(preview);
    }
}

/**
 * Extrahiert Text aus einer PDF-Datei
 * @param {File} file - Die PDF-Datei
 * @returns {Promise<string>} Der extrahierte Text
 */
export async function extractTextFromPDF(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({data: arrayBuffer}).promise;
    let text = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map(item => item.str).join(' ') + '\n';
    }
    
    return text;
}

/**
 * Verarbeitet Drag & Drop Events
 */
export function handleDragEnter(e) {
    e.preventDefault();
    e.stopPropagation();
    this.classList.add('drag-over');
}

export function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    this.classList.add('drag-over');
}

export function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    this.classList.remove('drag-over');
}

export function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    this.classList.remove('drag-over');
    
    const input = this.querySelector('input[type="file"]');
    const files = e.dataTransfer.files;
    
    if (files.length > 0) {
        input.files = files;
        handleFileUpload({ target: input });
    }
}

/**
 * Entfernt eine hochgeladene Datei
 * @param {string} inputId - Die ID des File-Inputs
 */
export function handleFileRemove(inputId) {
    const input = document.getElementById(inputId);
    const container = input.closest('.upload-container');
    const uploadArea = container.querySelector('.upload-area');
    const preview = container.querySelector('.file-preview');
    
    preview.style.opacity = '0';
    setTimeout(() => {
        input.value = '';
        
        if (input.id === 'resumeUpload') {
            window.resumeText = null;
        }
        
        preview.style.opacity = '1';
        preview.classList.add('d-none');
        uploadArea.style.display = 'block';
        
        checkRequiredUploads();
    }, 300);
}

/**
 * Prüft ob alle erforderlichen Uploads vorhanden sind
 */
function checkRequiredUploads() {
    const resumeUploaded = window.resumeText !== null;
    const jobPostingFilled = globalState.elements.jobPosting.value.trim().length > 0;
    
    globalState.elements.analyzeBtn.disabled = !(resumeUploaded && jobPostingFilled);
    
    if (globalState.elements.analyzeBtn.disabled) {
        globalState.elements.analyzeBtn.classList.add('btn-secondary');
        globalState.elements.analyzeBtn.classList.remove('btn-primary');
    } else {
        globalState.elements.analyzeBtn.classList.add('btn-primary');
        globalState.elements.analyzeBtn.classList.remove('btn-secondary');
    }
}

/**
 * Initialisiert die File-Upload Funktionalität
 */
export function initializeFileUpload() {
    const uploadAreas = document.querySelectorAll('.upload-area');
    
    uploadAreas.forEach(area => {
        area.addEventListener('dragenter', handleDragEnter);
        area.addEventListener('dragover', handleDragOver);
        area.addEventListener('dragleave', handleDragLeave);
        area.addEventListener('drop', handleDrop);
        
        const input = area.querySelector('input[type="file"]');
        if (input) {
            input.addEventListener('change', handleFileUpload);
        }
    });
} 
