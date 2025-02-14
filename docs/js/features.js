import { globalState } from './state.js';
import { showSuccess, showError, showWarning } from './ui.js';
import { safeGetElem } from './utils.js';

/**
 * Feature-Klasse für zusätzliche Funktionalitäten
 */
export class Features {
    /**
     * Initialisiert alle Features
     */
    static initialize() {
        this.setupInterviewer();
        this.setupLengthCheck();
        this.setupRemotePdfUpload();
        this.setupTTS();
        this.setupSimilarityCheck();
        this.setupMultiPageView();
        this.setupPdfExport();
        this.setupCollaboration();
        this.setupSyntaxHighlighting();
        this.setupArchiving();
    }

    /**
     * Interviewer-Auswahl Feature
     */
    static setupInterviewer() {
        const interviewerInput = safeGetElem('interviewerName');
        if (interviewerInput) {
            interviewerInput.addEventListener('change', () => {
                showSuccess(`Interviewer gesetzt: ${interviewerInput.value}`);
            });
        }
    }

    /**
     * Automatische Längenprüfung
     */
    static setupLengthCheck() {
        const checkLength = () => {
            const wordCount = (globalState.elements.coverLetterEditor?.innerText || '')
                .trim().split(/\s+/).filter(Boolean).length;
            
            if (wordCount > 600) {
                showWarning(`Achtung: Das Anschreiben hat bereits ${wordCount} Wörter!`);
            }
        };

        setInterval(checkLength, 5000);
    }

    /**
     * Remote PDF Upload
     */
    static setupRemotePdfUpload() {
        const input = safeGetElem('remotePdfURL');
        const button = safeGetElem('loadRemotePdfBtn');
        
        if (!input || !button) return;

        button.addEventListener('click', async () => {
            const url = input.value.trim();
            if (!url) {
                showError('URL erforderlich');
                return;
            }

            try {
                const response = await fetch(`/api/remote-pdf?url=${encodeURIComponent(url)}`);
                if (!response.ok) {
                    throw new Error('PDF-Abruf fehlgeschlagen');
                }
                const { text } = await response.json();
                window.resumeText = text;
                showSuccess('PDF geladen');
            } catch (error) {
                console.error('PDF Load Error:', error);
                showError(error.message);
            }
        });
    }

    /**
     * Text-to-Speech Feature
     */
    static setupTTS() {
        const ttsBtn = safeGetElem('ttsBtn');
        if (ttsBtn && globalState.elements.coverLetterEditor) {
            ttsBtn.addEventListener('click', () => {
                const text = globalState.elements.coverLetterEditor.innerText;
                const utterance = new SpeechSynthesisUtterance(text);
                speechSynthesis.speak(utterance);
                showSuccess('Vorlesung gestartet...');
            });
        }
    }

    /**
     * Ähnlichkeitssuche
     */
    static setupSimilarityCheck() {
        const similarityBtn = safeGetElem('similarityBtn');
        if (similarityBtn && window.resumeText) {
            similarityBtn.addEventListener('click', async () => {
                try {
                    const jobText = globalState.elements.jobPosting.value.trim();
                    const resumeText = window.resumeText;
                    const response = await fetch('/api/similarity-check', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ jobText, resumeText })
                    });
                    if (!response.ok) throw new Error('Fehler bei der Ähnlichkeitsprüfung');
                    const { similarityScore } = await response.json();
                    showSuccess(`Ähnlichkeits-Score: ${Math.round(similarityScore * 100)}%`);
                } catch (e) {
                    showError('Fehler bei der Ähnlichkeitsprüfung');
                }
            });
        }
    }

    /**
     * Mehrseitige Ansicht
     */
    static setupMultiPageView() {
        const multiPageToggle = safeGetElem('multiPageToggle');
        if (multiPageToggle && globalState.elements.modernPreviewContainer) {
            multiPageToggle.addEventListener('change', () => {
                const isChecked = multiPageToggle.checked;
                if (isChecked) {
                    globalState.elements.modernPreviewContainer.classList.add('a4-paged');
                } else {
                    globalState.elements.modernPreviewContainer.classList.remove('a4-paged');
                }
            });
        }
    }

    /**
     * PDF Export
     */
    static setupPdfExport() {
        const pdfExportBtn = safeGetElem('pdfExportBtn');
        if (pdfExportBtn) {
            pdfExportBtn.addEventListener('click', () => {
                showSuccess('Erzeuge Browser-PDF...');
                window.print();
            });
        }
    }

    /**
     * WebSocket Collaboration
     */
    static setupCollaboration() {
        let ws;
        const connectCollab = () => {
            ws = new WebSocket('wss://example.com/collab');
            ws.onmessage = (msg) => {
                const data = JSON.parse(msg.data);
                if (data.type === 'EDITOR_UPDATE' && globalState.elements.coverLetterEditor) {
                    globalState.elements.coverLetterEditor.innerHTML = data.content;
                }
            };
        };
        
        const collabConnectBtn = safeGetElem('collabConnectBtn');
        if (collabConnectBtn) {
            collabConnectBtn.addEventListener('click', () => {
                connectCollab();
                showSuccess('Live-Kollaboration aktiviert');
            });
        }
    }

    /**
     * Syntax Highlighting
     */
    static setupSyntaxHighlighting() {
        const editor = globalState.elements.coverLetterEditor;
        if (editor) {
            // Implementierung des Syntax Highlighting
            // z.B. mit Prism.js oder highlight.js
        }
    }

    /**
     * Archivierung
     */
    static setupArchiving() {
        const archiveBtn = safeGetElem('archiveBtn');
        if (archiveBtn) {
            archiveBtn.addEventListener('click', () => {
                const content = {
                    coverLetter: globalState.elements.coverLetterEditor?.innerHTML,
                    jobPosting: globalState.elements.jobPosting.value,
                    timestamp: new Date().toISOString()
                };
                
                localStorage.setItem(
                    `archived_letter_${Date.now()}`,
                    JSON.stringify(content)
                );
                
                showSuccess('Anschreiben archiviert');
            });
        }
    }
} 
