// Hauptanwendungslogik
document.addEventListener('DOMContentLoaded', function() {
    // ===== DOM Elemente =====
    const elements = {
        // Eingabefelder
        jobPosting: document.getElementById('jobPosting'),
        resumeUpload: document.getElementById('resumeUpload'),
        coverLetterUpload: document.getElementById('coverLetterUpload'),
        apiKey: document.getElementById('apiKey'),
        
        // Buttons
        analyzeBtn: document.getElementById('analyzeBtn'),
        generateSuggestionsBtn: document.getElementById('generateSuggestionsBtn'),
        saveSettingsBtn: document.getElementById('saveSettingsBtn'),
        
        // Vorschau
        coverLetterPreview: document.getElementById('coverLetterPreview'),
        resumePreview: document.getElementById('resumePreview'),
        
        // Anschreiben-Abschnitte
        coverLetterSections: {
            recipient: document.getElementById('coverLetterRecipient'),
            subject: document.getElementById('coverLetterSubject'),
            introduction: document.getElementById('coverLetterIntro'),
            main: document.getElementById('coverLetterMain'),
            closing: document.getElementById('coverLetterClosing')
        },
        
        // Modals und Toasts
        settingsModal: new bootstrap.Modal(document.getElementById('settingsModal')),
        suggestionsModal: new bootstrap.Modal(document.getElementById('suggestionsModal')),
        messageToast: new bootstrap.Toast(document.getElementById('messageToast'))
    };

    // ===== Event Listener =====
    function initializeEventListeners() {
        // Analyze Button
        elements.analyzeBtn.addEventListener('click', handleAnalyze);
        
        // Settings Button
        elements.saveSettingsBtn.addEventListener('click', saveSettings);
        
        // API Key aus localStorage laden
        const savedApiKey = localStorage.getItem('openai_api_key');
        if (savedApiKey) {
            elements.apiKey.value = savedApiKey;
        }
        
        // Suggestions Button
        elements.generateSuggestionsBtn.addEventListener('click', async () => {
            try {
                const apiKey = getApiKey();
                showLoading(elements.generateSuggestionsBtn, 'Generiere...');
                await generateSuggestionsForSection('all', apiKey);
            } catch (error) {
                showError(error.message);
            } finally {
                hideLoading(elements.generateSuggestionsBtn, 'KI-Vorschläge');
            }
        });

        // Einzelne Abschnitts-Buttons
        document.querySelectorAll('.suggest-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                try {
                    const apiKey = getApiKey();
                    const section = e.target.dataset.section;
                    showLoading(e.target, 'Generiere...');
                    await generateSuggestionsForSection(section, apiKey);
                } catch (error) {
                    showError(error.message);
                } finally {
                    hideLoading(e.target, 'Vorschläge');
                }
            });
        });

        // Datei-Uploads
        elements.resumeUpload.addEventListener('change', handleFileUpload);
        elements.coverLetterUpload.addEventListener('change', handleFileUpload);

        // Entfernen-Buttons für Datei-Vorschau
        document.querySelectorAll('.file-preview .btn-close').forEach(btn => {
            btn.addEventListener('click', handleFileRemove);
        });

        // Zahnrad-Icon (Einstellungen)
        document.getElementById('settingsBtn').addEventListener('click', () => {
            elements.settingsModal.show();
        });

        // API Key Toggle
        document.getElementById('toggleApiKey').addEventListener('click', () => {
            const apiKeyInput = elements.apiKey;
            const type = apiKeyInput.type === 'password' ? 'text' : 'password';
            apiKeyInput.type = type;
        });

        // Initialisiere Einstellungen
        initializeSettings();
    }

    // ===== API Key Management =====
    const API_SETTINGS = {
        defaultPassword: 'admin',
        encryptionKey: 'bewerbungsassistent-2024', // Schlüssel für die Verschlüsselung
        currentService: 'openai'
    };

    function initializeSettings() {
        // Password aus localStorage laden oder Standardpasswort setzen
        if (!localStorage.getItem('settings_password')) {
            localStorage.setItem('settings_password', 
                CryptoJS.AES.encrypt(API_SETTINGS.defaultPassword, API_SETTINGS.encryptionKey).toString()
            );
        }

        // Event Listener für Service-Auswahl
        document.getElementById('aiServiceSelect').addEventListener('change', (e) => {
            const service = e.target.value;
            API_SETTINGS.currentService = service;
            
            // Alle API-Settings ausblenden
            document.querySelectorAll('.api-settings').forEach(el => el.classList.add('d-none'));
            
            // Gewählte API-Settings einblenden
            document.getElementById(`${service}Settings`).classList.remove('d-none');
        });

        // Event Listener für Passwort-Entsperrung
        document.getElementById('unlockSettings').addEventListener('click', unlockSettings);

        // Event Listener für API Key Toggle Buttons
        document.querySelectorAll('.toggle-password').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const input = e.target.closest('.input-group').querySelector('input');
                const type = input.type === 'password' ? 'text' : 'password';
                input.type = type;
                e.target.querySelector('i').classList.toggle('bi-eye');
                e.target.querySelector('i').classList.toggle('bi-eye-slash');
            });
        });
    }

    async function unlockSettings() {
        const input = document.getElementById('settingsPasswordInput');
        const password = input.value;
        
        // Gespeichertes Passwort entschlüsseln und vergleichen
        const storedPassword = CryptoJS.AES.decrypt(
            localStorage.getItem('settings_password'), 
            API_SETTINGS.encryptionKey
        ).toString(CryptoJS.enc.Utf8);
        
        if (password === storedPassword) {
            // Passwort-Bereich ausblenden und API-Settings einblenden
            document.getElementById('settingsPassword').classList.add('d-none');
            document.getElementById('apiSettings').classList.remove('d-none');
            
            // Gespeicherte API Keys laden
            loadApiKeys();
        } else {
            showError('Falsches Passwort');
        }
    }

    function loadApiKeys() {
        // Verschlüsselte API Keys aus localStorage laden und entschlüsseln
        ['openai', 'anthropic', 'google'].forEach(service => {
            const encryptedKey = localStorage.getItem(`${service}_api_key`);
            if (encryptedKey) {
                const decryptedKey = CryptoJS.AES.decrypt(
                    encryptedKey, 
                    API_SETTINGS.encryptionKey
                ).toString(CryptoJS.enc.Utf8);
                document.getElementById(`${service}ApiKey`).value = decryptedKey;
            }
        });
        
        // Gespeicherte Einstellungen laden
        const savedService = localStorage.getItem('current_service') || 'openai';
        document.getElementById('aiServiceSelect').value = savedService;
        document.getElementById(`${savedService}Settings`).classList.remove('d-none');
    }

    function saveSettings() {
        const newPassword = document.getElementById('newPassword').value;
        if (newPassword) {
            // Neues Passwort verschlüsselt speichern
            localStorage.setItem('settings_password', 
                CryptoJS.AES.encrypt(newPassword, API_SETTINGS.encryptionKey).toString()
            );
        }
        
        // API Keys verschlüsselt speichern
        ['openai', 'anthropic', 'google'].forEach(service => {
            const key = document.getElementById(`${service}ApiKey`).value.trim();
            if (key) {
                localStorage.setItem(`${service}_api_key`,
                    CryptoJS.AES.encrypt(key, API_SETTINGS.encryptionKey).toString()
                );
            }
        });
        
        // Aktuelle Service-Auswahl speichern
        const currentService = document.getElementById('aiServiceSelect').value;
        localStorage.setItem('current_service', currentService);
        API_SETTINGS.currentService = currentService;
        
        // Andere Einstellungen speichern
        localStorage.setItem('language', document.getElementById('languageSelect').value);
        localStorage.setItem('style', document.getElementById('styleSelect').value);
        
        elements.settingsModal.hide();
        showSuccess('Einstellungen erfolgreich gespeichert');
        
        // Modal zurücksetzen
        document.getElementById('settingsPassword').classList.remove('d-none');
        document.getElementById('apiSettings').classList.add('d-none');
        document.getElementById('settingsPasswordInput').value = '';
        document.getElementById('newPassword').value = '';
    }

    function getApiKey() {
        const service = API_SETTINGS.currentService;
        const encryptedKey = localStorage.getItem(`${service}_api_key`);
        
        if (!encryptedKey) {
            elements.settingsModal.show();
            throw new Error(`Bitte geben Sie zuerst Ihren ${service.toUpperCase()} API Key ein`);
        }
        
        return CryptoJS.AES.decrypt(
            encryptedKey, 
            API_SETTINGS.encryptionKey
        ).toString(CryptoJS.enc.Utf8);
    }

    // ===== Hauptfunktionen =====
    async function handleAnalyze() {
        try {
            if (!validateInputs()) return;

            showLoading(elements.analyzeBtn, 'Analysiere...');
            
            // API Key prüfen
            const apiKey = getApiKey();
            
            const jobPosting = elements.jobPosting.value.trim();
            const resumeText = elements.resumeUpload.files[0] ? 
                await extractTextFromPDF(elements.resumeUpload.files[0]) : '';

            // Stellenanzeige analysieren
            const analysis = await analyzeJobPosting(jobPosting, apiKey);
            
            // Analyse-Ergebnisse anzeigen
            displayAnalysis(analysis);
            
            // Vorschläge generieren
            const suggestions = await generateSectionSuggestions('all', analysis, apiKey);
            
            // Vorschläge in die Formularfelder einfügen
            applySuggestions(suggestions);
            
            // Vorschau aktualisieren
            updatePreview();
            
            showSuccess('Analyse und Vorschläge erfolgreich erstellt!');
            
        } catch (error) {
            showError(error.message);
        } finally {
            hideLoading(elements.analyzeBtn, 'Analysieren und Anschreiben erstellen');
        }
    }

    function displayAnalysis(analysis) {
        // Job-Titel
        document.getElementById('jobTitleAnalysis').textContent = analysis.jobTitle;
        
        // Unternehmensinfo
        document.getElementById('companyAnalysis').innerHTML = `
            <div><strong>Name:</strong> ${analysis.company.name}</div>
            <div><strong>Branche:</strong> ${analysis.company.industry}</div>
            <div><strong>Größe:</strong> ${analysis.company.size}</div>
            <div><strong>Kultur:</strong> ${analysis.company.culture}</div>
        `;
        
        // Anforderungen
        const mustHaveList = document.getElementById('mustHaveList');
        const niceToHaveList = document.getElementById('niceToHaveList');
        
        mustHaveList.innerHTML = analysis.requirements.mustHave
            .map(req => `<li>${req}</li>`).join('');
        niceToHaveList.innerHTML = analysis.requirements.niceToHave
            .map(req => `<li>${req}</li>`).join('');
        
        // Analyse-Bereich einblenden
        document.getElementById('jobAnalysis').classList.remove('d-none');
    }

    function applySuggestions(suggestions) {
        suggestions.forEach(suggestion => {
            if (suggestion.section && elements.coverLetterSections[suggestion.section]) {
                elements.coverLetterSections[suggestion.section].value = suggestion.text;
            }
        });
    }

    // ===== API Funktionen =====
    async function analyzeJobPosting(jobPosting, apiKey) {
        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: "gpt-4",
                    messages: [{
                        role: "system",
                        content: "Du bist ein Experte für Bewerbungen und Karriereberatung."
                    }, {
                        role: "user",
                        content: `Analysiere diese Stellenanzeige und extrahiere die wichtigsten Informationen:
                        
                        ${jobPosting}
                        
                        Liefere die Analyse in folgendem JSON-Format:
                        {
                            "jobTitle": "Titel der Position",
                            "company": {
                                "name": "Firmenname",
                                "industry": "Branche",
                                "size": "Unternehmensgröße",
                                "culture": "Unternehmenskultur"
                            },
                            "requirements": {
                                "mustHave": ["Pflicht-Anforderung 1", "Pflicht-Anforderung 2"],
                                "niceToHave": ["Optional 1", "Optional 2"]
                            },
                            "responsibilities": ["Aufgabe 1", "Aufgabe 2"],
                            "skills": {
                                "technical": ["Skill 1", "Skill 2"],
                                "soft": ["Soft Skill 1", "Soft Skill 2"]
                            },
                            "benefits": ["Benefit 1", "Benefit 2"],
                            "workingModel": {
                                "type": "remote/hybrid/office",
                                "location": "Arbeitsort",
                                "hours": "Arbeitszeit"
                            },
                            "tone": "formal/casual",
                            "teamInfo": {
                                "size": "Teamgröße",
                                "structure": "Teamstruktur"
                            }
                        }`
                    }],
                    temperature: 0.7
                })
            });

            if (!response.ok) {
                throw new Error('API Anfrage fehlgeschlagen');
            }

            const data = await response.json();
            if (data.error) {
                throw new Error(data.error.message);
            }

            return JSON.parse(data.choices[0].message.content);
        } catch (error) {
            console.error('Fehler bei der Analyse:', error);
            throw new Error('Analyse fehlgeschlagen: ' + error.message);
        }
    }

    async function generateSectionSuggestions(section, analysis, apiKey) {
        try {
            // Wenn 'all' ausgewählt ist, generiere alle Abschnitte
            if (section === 'all') {
                const sections = ['recipient', 'subject', 'introduction', 'main', 'closing'];
                const allSuggestions = [];

                for (const sec of sections) {
                    const suggestion = await generateSingleSection(sec, analysis, apiKey);
                    allSuggestions.push({
                        section: sec,
                        text: suggestion.text,
                        style: suggestion.style
                    });
                }

                return allSuggestions;
            }

            // Für einzelne Abschnitte
            const suggestion = await generateSingleSection(section, analysis, apiKey);
            return [{
                section: section,
                text: suggestion.text,
                style: suggestion.style
            }];
        } catch (error) {
            console.error('Fehler bei der Generierung:', error);
            throw new Error('Generierung fehlgeschlagen: ' + error.message);
        }
    }

    async function generateSingleSection(section, analysis, apiKey) {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "gpt-4",
                messages: [{
                    role: "system",
                    content: "Du bist ein Experte für das Schreiben überzeugender Bewerbungsanschreiben."
                }, {
                    role: "user",
                    content: generatePromptForSection(section, analysis)
                }],
                temperature: 0.8
            })
        });

        if (!response.ok) {
            throw new Error('API Anfrage fehlgeschlagen');
        }

        const data = await response.json();
        if (data.error) {
            throw new Error(data.error.message);
        }

        return JSON.parse(data.choices[0].message.content).suggestion;
    }

    function generatePromptForSection(section, analysis) {
        const basePrompt = `
        Stellendetails:
        Position: ${analysis.jobTitle}
        Firma: ${analysis.company.name}
        Branche: ${analysis.company.industry}
        Größe: ${analysis.company.size}
        Unternehmenskultur: ${analysis.company.culture}
        Anforderungen: ${analysis.requirements.mustHave.join(', ')} und ${analysis.requirements.niceToHave.join(', ')}
        Aufgaben: ${analysis.responsibilities.join(', ')}
        Skills: ${analysis.skills.technical.join(', ')} und ${analysis.skills.soft.join(', ')}
        Ton: ${analysis.tone}
        
        Generiere einen überzeugenden ${section}-Abschnitt für das Anschreiben.
        
        Liefere das Ergebnis im JSON-Format:
        {
            "suggestion": {
                "text": "Der generierte Text",
                "style": "Standard"
            }
        }
        `;

        const sectionPrompts = {
            recipient: `${basePrompt}
            Der Text soll eine formelle Anrede sein.
            - Bei unbekanntem Empfänger: "Sehr geehrte Damen und Herren,"
            - Sonst personalisiert mit [Name]`,

            subject: `${basePrompt}
            Der Text soll ein prägnanter Betreff sein.
            - Erwähne die Position
            - Optional: Referenznummer oder Datum
            - Kurz und professionell`,

            introduction: `${basePrompt}
            Der Text soll eine überzeugende Einleitung sein.
            - Zeige Interesse an der Position
            - Erwähne, wie du auf die Stelle aufmerksam geworden bist
            - Maximal 2-3 Sätze`,

            main: `${basePrompt}
            Der Text soll ein überzeugender Hauptteil sein.
            - Stelle Bezug zwischen deinen Fähigkeiten und den Anforderungen her
            - Erkläre deine Motivation
            - Hebe 2-3 relevante Erfahrungen hervor
            - Zeige, dass du zur Unternehmenskultur passt
            - 2-3 Absätze`,

            closing: `${basePrompt}
            Der Text soll ein professioneller Abschluss sein.
            - Drücke Interesse an einem persönlichen Gespräch aus
            - Erwähne deine Verfügbarkeit
            - Maximal 2 Sätze`
        };

        return sectionPrompts[section] || basePrompt;
    }

    async function handleGenerate() {
        if (!validateInputs()) return;

        showLoading(elements.generateBtn, 'Generiere...');
        try {
            const jobPosting = elements.jobPosting.value.trim();
            const resumeText = elements.resumeUpload.files[0] ? 
                await extractTextFromPDF(elements.resumeUpload.files[0]) : '';

            const analysis = await analyzeJobPosting(jobPosting);
            const suggestions = await generateSectionSuggestions('all', analysis);
            
            // Vorschläge in die Formularfelder einfügen
            suggestions.forEach(suggestion => {
                if (suggestion.section && elements.coverLetterSections[suggestion.section]) {
                    elements.coverLetterSections[suggestion.section].value = suggestion.text;
                }
            });
            
            // Vorschau aktualisieren
            updatePreview();
            showSuccess('Anschreiben erfolgreich generiert!');
        } catch (error) {
            showError('Fehler bei der Generierung: ' + error.message);
        } finally {
            hideLoading(elements.generateBtn, 'Generieren');
        }
    }

    async function generateSuggestionsForSection(section, apiKey) {
        try {
            const jobPosting = elements.jobPosting.value.trim();
            if (!jobPosting) {
                showError('Bitte fügen Sie eine Stellenanzeige ein');
                return;
            }

            const analysis = await analyzeJobPosting(jobPosting, apiKey);
            const suggestions = await generateSectionSuggestions(section, analysis, apiKey);
            displaySuggestions(suggestions);
            
        } catch (error) {
            showError('Fehler bei der Generierung: ' + error.message);
        }
    }

    // ===== Erweiterte Hilfsfunktionen =====
    async function handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (file.type !== 'application/pdf') {
            showError('Bitte laden Sie eine PDF-Datei hoch');
            event.target.value = '';
            return;
        }

        const uploadArea = event.target.closest('.upload-area');
        const container = uploadArea.closest('.upload-container');
        const preview = container.querySelector('.file-preview');
        const fileName = preview.querySelector('.file-name');

        showLoading(uploadArea, 'Verarbeite...');
        try {
            // Dateinamen in der Vorschau anzeigen
            fileName.textContent = file.name;
            
            // Upload-Bereich ausblenden und Vorschau einblenden
            uploadArea.classList.add('d-none');
            preview.classList.remove('d-none');

            const text = await extractTextFromPDF(file);
            if (event.target.id === 'resumeUpload') {
                // Speichere den extrahierten Text für spätere Verwendung
                window.resumeText = text;
                showSuccess('Lebenslauf erfolgreich hochgeladen');
            } else if (event.target.id === 'coverLetterUpload') {
                // Speichere den extrahierten Text für spätere Verwendung
                window.coverLetterText = text;
                showSuccess('Anschreiben erfolgreich hochgeladen');
            }
        } catch (error) {
            showError('Fehler beim Verarbeiten der Datei');
            console.error(error);
            // Bei Fehler Vorschau wieder ausblenden und Upload-Bereich einblenden
            uploadArea.classList.remove('d-none');
            preview.classList.add('d-none');
        } finally {
            hideLoading(uploadArea, '');
        }
    }

    async function extractTextFromPDF(file) {
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

    async function analyzeCoverLetter(text) {
        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: "gpt-4",
                    messages: [{
                        role: "system",
                        content: "Analysiere den Stil und die Struktur von Anschreiben."
                    }, {
                        role: "user",
                        content: `Analysiere dieses Anschreiben und extrahiere die wichtigsten Merkmale:
                        
                        ${text}
                        
                        Liefere die Analyse in folgendem JSON-Format:
                        {
                            "style": {
                                "tone": "formell/informell",
                                "complexity": "einfach/mittel/komplex",
                                "personality": "zurückhaltend/ausgewogen/selbstbewusst"
                            },
                            "structure": {
                                "sections": ["vorhandene Abschnitte"],
                                "length": "kurz/mittel/lang",
                                "formatting": "minimal/standard/aufwendig"
                            },
                            "content": {
                                "keyPhrases": ["wichtige Phrasen"],
                                "uniquePoints": ["Alleinstellungsmerkmale"],
                                "achievements": ["genannte Erfolge"]
                            },
                            "improvement": {
                                "suggestions": ["Verbesserungsvorschläge"],
                                "missingElements": ["fehlende Elemente"]
                            }
                        }`
                    }],
                    temperature: 0.7
                })
            });

            const data = await response.json();
            return JSON.parse(data.choices[0].message.content);
        } catch (error) {
            console.error('Fehler bei der Analyse:', error);
            throw new Error('Analyse fehlgeschlagen');
        }
    }

    function applySectionsToForm(sections) {
        Object.entries(sections).forEach(([section, text]) => {
            if (elements.coverLetterSections[section]) {
                elements.coverLetterSections[section].value = text.trim();
            }
        });
        updatePreview();
    }

    // ===== UI Hilfsfunktionen =====
    function showLoading(element, text) {
        if (element instanceof HTMLButtonElement) {
            element.disabled = true;
            element.innerHTML = `<span class="spinner-border spinner-border-sm"></span> ${text}`;
        } else {
            const loadingEl = document.createElement('div');
            loadingEl.className = 'text-center';
            loadingEl.innerHTML = `
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Lädt...</span>
                </div>
                <div class="mt-2">${text}</div>
            `;
            element.appendChild(loadingEl);
        }
    }

    function hideLoading(element, text) {
        if (element instanceof HTMLButtonElement) {
            element.disabled = false;
            element.innerHTML = text;
        } else {
            const loadingEl = element.querySelector('.text-center');
            if (loadingEl) {
                loadingEl.remove();
            }
        }
    }

    function showSuccess(message) {
        const toast = elements.messageToast;
        document.getElementById('toastTitle').textContent = 'Erfolg';
        document.getElementById('toastMessage').textContent = message;
        toast._element.classList.remove('bg-danger');
        toast._element.classList.add('bg-success');
        toast.show();
    }

    function showError(message) {
        const toast = elements.messageToast;
        document.getElementById('toastTitle').textContent = 'Fehler';
        document.getElementById('toastMessage').textContent = message;
        toast._element.classList.remove('bg-success');
        toast._element.classList.add('bg-danger');
        toast.show();
    }

    // ===== Validierung =====
    function validateInputs() {
        const jobPosting = elements.jobPosting.value.trim();
        
        // Validiere Stellenanzeige
        if (!jobPosting) {
            showError('Bitte fügen Sie eine Stellenanzeige ein');
            return false;
        }
        
        if (jobPosting.length < 100) {
            showError('Die Stellenanzeige scheint zu kurz zu sein. Bitte fügen Sie den vollständigen Text ein.');
            return false;
        }
        
        // Validiere PDF-Dateien
        if (elements.resumeUpload.files[0]) {
            const resumeFile = elements.resumeUpload.files[0];
            if (resumeFile.size === 0) {
                showError('Die hochgeladene Lebenslauf-Datei scheint leer zu sein');
                return false;
            }
            if (resumeFile.size > 10 * 1024 * 1024) {
                showError('Die Lebenslauf-Datei ist zu groß (max. 10 MB)');
                return false;
            }
        }
        
        if (elements.coverLetterUpload.files[0]) {
            const coverLetterFile = elements.coverLetterUpload.files[0];
            if (coverLetterFile.size === 0) {
                showError('Die hochgeladene Anschreiben-Datei scheint leer zu sein');
                return false;
            }
            if (coverLetterFile.size > 10 * 1024 * 1024) {
                showError('Die Anschreiben-Datei ist zu groß (max. 10 MB)');
                return false;
            }
        }
        
        return true;
    }

    // ===== Vorschau-Funktionen =====
    function updatePreview() {
        const sections = elements.coverLetterSections;
        let preview = '';
        
        // Anrede
        if (sections.recipient.value) {
            preview += `<p>${sections.recipient.value}</p>`;
        }
        
        // Betreff
        if (sections.subject.value) {
            preview += `<p><strong>${sections.subject.value}</strong></p>`;
        }
        
        // Einleitung
        if (sections.introduction.value) {
            preview += `<p>${sections.introduction.value}</p>`;
        }
        
        // Hauptteil
        if (sections.main.value) {
            const paragraphs = sections.main.value.split('\n').filter(p => p.trim());
            paragraphs.forEach(paragraph => {
                preview += `<p>${paragraph}</p>`;
            });
        }
        
        // Abschluss
        if (sections.closing.value) {
            preview += `<p>${sections.closing.value}</p>`;
        }
        
        // Grußformel
        preview += `<p class="mt-4">Mit freundlichen Grüßen<br>[Ihr Name]</p>`;
        
        elements.coverLetterPreview.innerHTML = preview || 'Hier erscheint die Vorschau...';
    }

    function displaySuggestions(suggestions) {
        const suggestionsList = document.getElementById('suggestionsList');
        suggestionsList.innerHTML = '';
        
        suggestions.forEach((suggestion, index) => {
            const button = document.createElement('button');
            button.className = 'list-group-item list-group-item-action';
            button.innerHTML = suggestion.text.replace(/\n/g, '<br>');
            button.onclick = () => applySuggestion(suggestion);
            suggestionsList.appendChild(button);
        });
        
        elements.suggestionsModal.show();
    }

    function applySuggestion(suggestion) {
        if (suggestion.section && elements.coverLetterSections[suggestion.section]) {
            elements.coverLetterSections[suggestion.section].value = suggestion.text;
            updatePreview();
        }
        elements.suggestionsModal.hide();
    }

    // ===== Event Listener für Textänderungen =====
    function initializeTextareaListeners() {
        Object.values(elements.coverLetterSections).forEach(textarea => {
            textarea.addEventListener('input', updatePreview);
        });
    }

    // ===== Datei-Upload-Funktionen =====
    function initializeFileUpload() {
        const uploadAreas = document.querySelectorAll('.upload-area');
        const fileInputs = document.querySelectorAll('input[type="file"]');
        
        // Drag & Drop für Upload-Bereiche
        uploadAreas.forEach(area => {
            area.addEventListener('dragover', (e) => {
                e.preventDefault();
                area.classList.add('drag-over');
            });
            
            area.addEventListener('dragleave', (e) => {
                e.preventDefault();
                area.classList.remove('drag-over');
            });
            
            area.addEventListener('drop', (e) => {
                e.preventDefault();
                area.classList.remove('drag-over');
                const input = area.querySelector('input[type="file"]');
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    input.files = files;
                    handleFileUpload({ target: input });
                }
            });
        });
        
        // Datei-Input Event-Handler
        fileInputs.forEach(input => {
            input.addEventListener('change', handleFileUpload);
        });
        
        // Entfernen-Buttons
        document.querySelectorAll('.file-preview .btn-close').forEach(btn => {
            btn.addEventListener('click', handleFileRemove);
        });
    }

    function handleFileRemove(event) {
        const preview = event.target.closest('.file-preview');
        const container = preview.closest('.upload-container');
        const area = container.querySelector('.upload-area');
        const input = area.querySelector('input[type="file"]');
        
        // Datei-Input zurücksetzen
        input.value = '';
        
        // Gespeicherten Text löschen
        if (input.id === 'resumeUpload') {
            window.resumeText = null;
        } else if (input.id === 'coverLetterUpload') {
            window.coverLetterText = null;
        }
        
        // Vorschau ausblenden und Upload-Bereich wieder einblenden
        preview.classList.add('d-none');
        area.classList.remove('d-none');
    }

    async function processResume(file) {
        try {
            const text = await extractTextFromPDF(file);
            // Hier können wir den extrahierten Text weiterverarbeiten
            console.log('Extracted Resume Text:', text);
        } catch (error) {
            console.error('Error processing resume:', error);
            showError('Fehler beim Verarbeiten des Lebenslaufs');
        }
    }

    async function processCoverLetter(file) {
        try {
            const text = await extractTextFromPDF(file);
            // Hier können wir den extrahierten Text weiterverarbeiten
            console.log('Extracted Cover Letter Text:', text);
        } catch (error) {
            console.error('Error processing cover letter:', error);
            showError('Fehler beim Verarbeiten des Anschreibens');
        }
    }

    // ===== Initialisierung =====
    initializeEventListeners();
    initializeTextareaListeners();
    initializeFileUpload();
}); 
