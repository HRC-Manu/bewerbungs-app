/**
 * Direkter Lebenslauf-Upload für die Analyse
 */

import { auth, storage } from './firebase-config.js';
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from './firebase-config.js';

// Optimierte Uploadfunktion mit Fortschrittsanzeige und Fehlerbehandlung
export async function uploadAndAnalyzeResume(file) {
    if (!file) throw new Error('Keine Datei ausgewählt');
    if (!auth.currentUser) throw new Error('Bitte melden Sie sich an');
    
    // Fortschrittsanzeige starten
    const progressBar = document.querySelector('.progress-bar');
    if (progressBar) {
        progressBar.style.width = '0%';
        progressBar.closest('.progress')?.classList.remove('d-none');
    }
    
    try {
        // Verbesserte Dateityp-Prüfung
        const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (!validTypes.includes(file.type)) {
            throw new Error('Bitte laden Sie ein PDF oder Word-Dokument hoch');
        }
        
        // Dateigröße prüfen (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            throw new Error('Die Datei ist zu groß (max. 10MB)');
        }
        
        // Upload mit besserer Fehlerbehandlung
        const userId = auth.currentUser.uid;
        const timestamp = new Date().getTime();
        const safeFileName = file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase(); // Sicherere Dateinamen
        const filePath = `resumes/${userId}/${timestamp}_${safeFileName}`;
        const fileRef = ref(storage, filePath);
        
        // Simulierter Fortschritt (in Produktion würde ein Upload-Task mit onProgress verwendet)
        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += 5;
            if (progressBar) progressBar.style.width = `${Math.min(progress, 90)}%`;
            if (progress >= 90) clearInterval(progressInterval);
        }, 100);
        
        // Upload durchführen
        await uploadBytes(fileRef, file);
        clearInterval(progressInterval);
        if (progressBar) progressBar.style.width = '100%';
        
        const downloadUrl = await getDownloadURL(fileRef);
        
        // Optimierte Metadaten mit Indizierung für schnellere Suche
        const docRef = await addDoc(collection(db, "resumes"), {
            userId,
            fileName: safeFileName,
            filePath,
            fileUrl: downloadUrl,
            contentType: file.type,
            size: file.size,
            uploadedAt: serverTimestamp(),
            searchable: true,
            analyzed: false
        });
        
        // Event für die Analyse mit mehr Daten
        document.dispatchEvent(new CustomEvent('resumeUploaded', {
            detail: {
                fileId: docRef.id,
                fileName: safeFileName,
                fileUrl: downloadUrl,
                mimeType: file.type,
                timestamp: Date.now()
            },
            bubbles: true
        }));
        
        return { id: docRef.id, url: downloadUrl, path: filePath };
    } catch (error) {
        console.error('Upload Error:', error);
        // Fortschrittsanzeige bei Fehler ausblenden
        const progressElement = document.querySelector('.progress');
        if (progressElement) progressElement.classList.add('d-none');
        throw error;
    }
}

// Ereignis-Listener direkt hinzufügen
document.addEventListener('DOMContentLoaded', function() {
    // Lebenslauf-Upload-Button finden
    const resumeUpload = document.getElementById('resumeUpload');
    if (resumeUpload) {
        resumeUpload.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                try {
                    const filePreview = document.querySelector('.file-preview');
                    const uploadArea = document.getElementById('resumeUploadArea');
                    
                    // UI-Feedback
                    if (filePreview && uploadArea) {
                        const fileName = filePreview.querySelector('.file-name');
                        const fileSize = filePreview.querySelector('.file-size');
                        
                        if (fileName && fileSize) {
                            fileName.textContent = file.name;
                            fileSize.textContent = formatFileSize(file.size);
                            
                            uploadArea.classList.add('d-none');
                            filePreview.classList.remove('d-none');
                        }
                    }
                    
                    // Datei hochladen und analysieren
                    await uploadAndAnalyzeResume(file);
                    
                    // Erfolgs-Feedback
                    showToast('Lebenslauf erfolgreich hochgeladen und zur Analyse bereit', 'success');
                    
                    // Status aktualisieren
                    const resumeStatus = document.getElementById('resumeStatus');
                    if (resumeStatus) {
                        resumeStatus.className = 'badge bg-success';
                        resumeStatus.textContent = 'Bereit';
                    }
                    
                    // Analyse-Button prüfen
                    checkAnalyzeButton();
                } catch (error) {
                    console.error('Upload Error:', error);
                    showToast('Fehler beim Hochladen: ' + error.message, 'error');
                }
            }
        });
        
        console.log('Lebenslauf-Upload-Listener hinzugefügt');
    }
    
    // Hilfsfunktionen
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    function showToast(message, type = 'info') {
        try {
            const toast = document.getElementById('messageToast');
            const toastTitle = document.getElementById('toastTitle');
            const toastMessage = document.getElementById('toastMessage');
            
            if (toast && toastTitle && toastMessage) {
                toastTitle.textContent = type === 'error' ? 'Fehler' : 'Erfolg';
                toastMessage.textContent = message;
                
                const bsToast = new bootstrap.Toast(toast);
                bsToast.show();
            } else {
                // Fallback, wenn kein Toast-Element vorhanden ist
                alert(message);
            }
        } catch (error) {
            console.error('Toast error:', error);
            alert(message);
        }
    }
    
    function checkAnalyzeButton() {
        const resumeReady = document.getElementById('resumeStatus')?.classList.contains('bg-success') || false;
        const jobReady = document.getElementById('jobStatus')?.classList.contains('bg-success') || false;
        
        const analyzeBtn = document.getElementById('analyzeBtn');
        const previewBtn = document.getElementById('previewBtn');
        
        if (analyzeBtn) analyzeBtn.disabled = !(resumeReady && jobReady);
        if (previewBtn) previewBtn.disabled = !(resumeReady && jobReady);
    }
}); 