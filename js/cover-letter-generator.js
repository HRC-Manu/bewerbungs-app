/**
 * Anschreiben-Generator für den KI-Bewerbungsmanager
 */

class CoverLetterGenerator {
  constructor() {
    this.apiClient = apiClient;
    this.documentProcessor = documentProcessor;
    
    // DOM-Elemente
    this.resumeUploadArea = document.getElementById('resumeUploadArea');
    this.resumeFileInput = document.getElementById('resumeFileInput');
    this.resumeInfo = document.getElementById('resumeInfo');
    this.resumeFileName = document.getElementById('resumeFileName');
    this.resumeRemoveBtn = document.getElementById('resumeRemoveBtn');
    
    this.jobUploadArea = document.getElementById('jobUploadArea');
    this.jobFileInput = document.getElementById('jobFileInput');
    this.jobTextarea = document.getElementById('jobPostingText');
    this.jobInfo = document.getElementById('jobInfo');
    this.jobFileName = document.getElementById('jobFileName');
    this.jobRemoveBtn = document.getElementById('jobRemoveBtn');
    
    this.toneSelector = document.getElementById('tonePicker');
    this.lengthSelector = document.getElementById('lengthPicker');
    this.includeElements = document.querySelectorAll('.include-element');
    
    this.nameInput = document.getElementById('yourName');
    this.addressInput = document.getElementById('yourAddress');
    this.phoneInput = document.getElementById('yourPhone');
    this.emailInput = document.getElementById('yourEmail');
    
    this.companyNameInput = document.getElementById('companyName');
    this.companyAddressInput = document.getElementById('companyAddress');
    this.contactPersonInput = document.getElementById('contactPerson');
    
    this.generateBtn = document.getElementById('generateLetterBtn');
    this.loadingIndicator = document.getElementById('loadingIndicator');
    this.previewSection = document.getElementById('previewSection');
    this.letterContent = document.getElementById('letterContent');
    
    // Aktion-Buttons
    this.copyBtn = document.getElementById('copyLetterBtn');
    this.downloadBtn = document.getElementById('downloadLetterBtn');
    this.saveBtn = document.getElementById('saveLetterBtn');
    
    // Status
    this.resumeFile = null;
    this.resumeText = '';
    this.jobFile = null;
    this.jobText = '';
    this.generatedLetter = '';
    
    // Event-Listener einrichten
    this.setupEventListeners();
    
    // Prüfen, ob es gespeicherte Lebenslauf-/Jobdaten gibt
    this.checkSessionStorage();
    
    console.log('CoverLetterGenerator initialisiert');
  }
  
  /**
   * Event-Listener einrichten
   */
  setupEventListeners() {
    // Nur wenn wir auf der Anschreiben-Seite sind
    if (!this.generateBtn) return;
    
    // Lebenslauf-Upload
    if (this.resumeUploadArea) {
      this.resumeUploadArea.addEventListener('click', () => {
        this.resumeFileInput.click();
      });
      
      this.resumeUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        this.resumeUploadArea.classList.add('dragover');
      });
      
      this.resumeUploadArea.addEventListener('dragleave', () => {
        this.resumeUploadArea.classList.remove('dragover');
      });
      
      this.resumeUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        this.resumeUploadArea.classList.remove('dragover');
        
        if (e.dataTransfer.files.length > 0) {
          this.handleResumeUpload(e.dataTransfer.files[0]);
        }
      });
    }
    
    // Lebenslauf-Datei-Input
    if (this.resumeFileInput) {
      this.resumeFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
          this.handleResumeUpload(e.target.files[0]);
        }
      });
    }
    
    // Stellenanzeige-Upload
    if (this.jobUploadArea) {
      this.jobUploadArea.addEventListener('click', () => {
        this.jobFileInput.click();
      });
      
      this.jobUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        this.jobUploadArea.classList.add('dragover');
      });
      
      this.jobUploadArea.addEventListener('dragleave', () => {
        this.jobUploadArea.classList.remove('dragover');
      });
      
      this.jobUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        this.jobUploadArea.classList.remove('dragover');
        
        if (e.dataTransfer.files.length > 0) {
          this.handleJobUpload(e.dataTransfer.files[0]);
        }
      });
    }
    
    // Stellenanzeige-Datei-Input
    if (this.jobFileInput) {
      this.jobFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
          this.handleJobUpload(e.target.files[0]);
        }
      });
    }
    
    // Stellenanzeige-Textarea
    if (this.jobTextarea) {
      this.jobTextarea.addEventListener('input', () => {
        this.jobText = this.jobTextarea.value;
        this.updateGenerateButtonState();
        
        if (this.jobText.trim()) {
          this.jobInfo.classList.remove('d-none');
          this.jobFileName.textContent = 'Eingegebener Text';
        } else {
          this.jobInfo.classList.add('d-none');
        }
      });
    }
    
    // Entfernen-Buttons
    if (this.resumeRemoveBtn) {
      this.resumeRemoveBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.resetResumeUpload();
      });
    }
    
    if (this.jobRemoveBtn) {
      this.jobRemoveBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.resetJobUpload();
      });
    }
    
    // Generierungs-Button
    if (this.generateBtn) {
      this.generateBtn.addEventListener('click', () => {
        this.generateCoverLetter();
      });
    }
    
    // Aktion-Buttons
    if (this.copyBtn) {
      this.copyBtn.addEventListener('click', () => {
        this.copyLetterToClipboard();
      });
    }
    
    if (this.downloadBtn) {
      this.downloadBtn.addEventListener('click', () => {
        this.downloadLetterAsPDF();
      });
    }
    
    if (this.saveBtn) {
      this.saveBtn.addEventListener('click', () => {
        this.saveLetterToProfile();
      });
    }
    
    // Profilformular überwachen
    document.querySelectorAll('#coverLetterForm input').forEach(input => {
      input.addEventListener('input', () => {
        this.saveFormDataToLocalStorage();
      });
    });
    
    // Formularwerte wiederherstellen
    this.loadFormDataFromLocalStorage();
  }
  
  /**
   * Prüft, ob es gespeicherte Lebenslauf-/Jobdaten in der Session-Speicher gibt
   */
  checkSessionStorage() {
    // Prüfen, ob Daten vom Job-Matching verfügbar sind
    const resumeText = sessionStorage.getItem('resumeText');
    const jobText = sessionStorage.getItem('jobText');
    
    if (resumeText) {
      this.resumeText = resumeText;
      this.resumeInfo.classList.remove('d-none');
      this.resumeFileName.textContent = 'Lebenslauf aus Job-Matching';
    }
    
    if (jobText) {
      this.jobText = jobText;
      this.jobTextarea.value = jobText;
      this.jobInfo.classList.remove('d-none');
      this.jobFileName.textContent = 'Stellenanzeige aus Job-Matching';
    }
    
    // Generate-Button-Status aktualisieren
    this.updateGenerateButtonState();
    
    // Session-Storage leeren
    sessionStorage.removeItem('resumeText');
    sessionStorage.removeItem('jobText');
    sessionStorage.removeItem('matchingResult');
  }
  
  /**
   * Verarbeitet den Lebenslauf-Upload
   * @param {File} file - Die hochgeladene Datei
   */
  async handleResumeUpload(file) {
    if (!this.documentProcessor.isSupported(file)) {
      return;
    }
    
    try {
      // Text extrahieren
      const result = await this.documentProcessor.extractText(file);
      
      if (!result.success) {
        throw new Error(result.error || 'Fehler bei der Textextraktion');
      }
      
      // UI aktualisieren
      this.resumeFile = file;
      this.resumeText = result.text;
      this.resumeInfo.classList.remove('d-none');
      this.resumeFileName.textContent = file.name;
      
      // Generate-Button-Status aktualisieren
      this.updateGenerateButtonState();
      
      app.showToast('Lebenslauf erfolgreich hochgeladen', 'Erfolg', 'success');
    } catch (error) {
      console.error('Fehler beim Lebenslauf-Upload:', error);
      app.showToast(`Upload fehlgeschlagen: ${error.message}`, 'Fehler', 'danger');
    }
  }
  
  /**
   * Verarbeitet den Stellenanzeige-Upload
   * @param {File} file - Die hochgeladene Datei
   */
  async handleJobUpload(file) {
    if (!this.documentProcessor.isSupported(file)) {
      return;
    }
    
    try {
      // Text extrahieren
      const result = await this.documentProcessor.extractText(file);
      
      if (!result.success) {
        throw new Error(result.error || 'Fehler bei der Textextraktion');
      }
      
      // UI aktualisieren
      this.jobFile = file;
      this.jobText = result.text;
      this.jobInfo.classList.remove('d-none');
      this.jobFileName.textContent = file.name;
      
      // Textarea aktualisieren
      if (this.jobTextarea) {
        this.jobTextarea.value = result.text;
      }
      
      // Generate-Button-Status aktualisieren
      this.updateGenerateButtonState();
      
      app.showToast('Stellenanzeige erfolgreich hochgeladen', 'Erfolg', 'success');
    } catch (error) {
      console.error('Fehler beim Stellenanzeige-Upload:', error);
      app.showToast(`Upload fehlgeschlagen: ${error.message}`, 'Fehler', 'danger');
    }
  }
  
  /**
   * Setzt den Lebenslauf-Upload zurück
   */
  resetResumeUpload() {
    this.resumeFile = null;
    this.resumeText = '';
    this.resumeFileInput.value = '';
    this.resumeInfo.classList.add('d-none');
    this.updateGenerateButtonState();
  }
  
  /**
   * Setzt den Stellenanzeige-Upload zurück
   */
  resetJobUpload() {
    this.jobFile = null;
    this.jobText = '';
    this.jobFileInput.value = '';
    this.jobInfo.classList.add('d-none');
    
    if (this.jobTextarea) {
      this.jobTextarea.value = '';
    }
    
    this.updateGenerateButtonState();
  }
  
  /**
   * Aktualisiert den Status des Generate-Buttons
   */
  updateGenerateButtonState() {
    if (this.generateBtn) {
      this.generateBtn.disabled = !this.resumeText || !this.jobText;
    }
  }
  
  /**
   * Generiert das Anschreiben
   */
  async generateCoverLetter() {
    if (!this.resumeText || !this.jobText) {
      app.showToast('Bitte laden Sie sowohl einen Lebenslauf als auch eine Stellenanzeige hoch', 'Hinweis', 'warning');
      return;
    }
    
    try {
      // UI aktualisieren
      this.generateBtn.disabled = true;
      this.loadingIndicator.classList.remove('d-none');
      this.previewSection.classList.add('d-none');
      
      // Mock-Daten für die Generierung
      const resumeData = {
        text: this.resumeText,
        fileName: this.resumeFile?.name || 'Lebenslauf'
      };
      
      const jobData = {
        text: this.jobText,
        fileName: this.jobFile?.name || 'Stellenanzeige'
      };
      
      // Einstellungen abrufen
      const preferences = this.getPreferences();
      
      // API-Call simulieren
      // const result = await this.apiClient.generateCoverLetter(resumeData, jobData, preferences);
      
      // Mock-Ergebnis
      const result = await this._mockGenerateCoverLetter(resumeData, jobData, preferences);
      
      // Ergebnis speichern
      this.generatedLetter = result.letter;
      
      // UI aktualisieren
      this.displayCoverLetter(result.letter);
      this.generateBtn.disabled = false;
      this.loadingIndicator.classList.add('d-none');
      
      app.showToast('Anschreiben generiert', 'Erfolg', 'success');
    } catch (error) {
      console.error('Fehler bei der Anschreiben-Generierung:', error);
      
      app.showToast(`Generierung fehlgeschlagen: ${error.message}`, 'Fehler', 'danger');
      
      // UI zurücksetzen
      this.generateBtn.disabled = false;
      this.loadingIndicator.classList.add('d-none');
    }
  }
  
  /**
   * Ruft die Einstellungen aus dem Formular ab
   * @returns {Object} - Die Anschreiben-Einstellungen
   */
  getPreferences() {
    const preferences = {
      tone: this.toneSelector ? this.toneSelector.value : 'professional',
      length: this.lengthSelector ? this.lengthSelector.value : 'medium',
      includeElements: {}
    };
    
    // Elemente-Checkboxen auslesen
    this.includeElements.forEach(checkbox => {
      preferences.includeElements[checkbox.value] = checkbox.checked;
    });
    
    // Persönliche Daten
    preferences.personalInfo = {
      name: this.nameInput ? this.nameInput.value : '',
      address: this.addressInput ? this.addressInput.value : '',
      phone: this.phoneInput ? this.phoneInput.value : '',
      email: this.emailInput ? this.emailInput.value : ''
    };
    
    // Unternehmensdaten
    preferences.companyInfo = {
      name: this.companyNameInput ? this.companyNameInput.value : '',
      address: this.companyAddressInput ? this.companyAddressInput.value : '',
      contactPerson: this.contactPersonInput ? this.contactPersonInput.value : ''
    };
    
    return preferences;
  }
  
  /**
   * Zeigt das generierte Anschreiben an
   * @param {string} letterContent - Der Inhalt des Anschreibens
   */
  displayCoverLetter(letterContent) {
    if (this.letterContent) {
      this.letterContent.innerHTML = letterContent;
    }
    
    this.previewSection.classList.remove('d-none');
    
    // Zu den Ergebnissen scrollen
    this.previewSection.scrollIntoView({ behavior: 'smooth' });
  }
  
  /**
   * Kopiert das Anschreiben in die Zwischenablage
   */
  copyLetterToClipboard() {
    if (!this.generatedLetter) return;
    
    // Text aus HTML-Version extrahieren
    const letterText = this.letterContent.innerText;
    
    try {
      navigator.clipboard.writeText(letterText).then(() => {
        app.showToast('Anschreiben in die Zwischenablage kopiert', 'Erfolg', 'success');
      });
    } catch (error) {
      console.error('Fehler beim Kopieren in die Zwischenablage:', error);
      app.showToast('Fehler beim Kopieren', 'Fehler', 'danger');
    }
  }
  
  /**
   * Lädt das Anschreiben als PDF herunter
   */
  downloadLetterAsPDF() {
    if (!this.generatedLetter) return;
    
    // In einer echten Implementierung würde hier html2pdf.js oder jsPDF verwendet werden
    // Da dies eine Mock-Implementierung ist, simulieren wir den Download
    
    try {
      // Dateinamen erstellen
      const dateStr = new Date().toISOString().slice(0, 10);
      const fileName = `Anschreiben_${dateStr}.pdf`;
      
      // HTML in Blob konvertieren (Mock)
      const blob = new Blob([this.generatedLetter], { type: 'application/pdf' });
      
      // Download-Link erstellen
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      
      // Link klicken
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      app.showToast('Anschreiben erfolgreich als PDF heruntergeladen', 'Erfolg', 'success');
    } catch (error) {
      console.error('Fehler beim Herunterladen als PDF:', error);
      app.showToast('Fehler beim Herunterladen', 'Fehler', 'danger');
    }
  }
  
  /**
   * Speichert das Anschreiben im Benutzerprofil
   */
  saveLetterToProfile() {
    if (!this.generatedLetter) return;
    
    // Prüfe, ob ein Benutzer angemeldet ist
    const user = firebase.auth().currentUser;
    if (!user) {
      app.showToast('Bitte melden Sie sich an, um das Anschreiben zu speichern', 'Hinweis', 'warning');
      
      // Zeige das Login-Modal
      const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
      loginModal.show();
      
      return;
    }
    
    try {
      // Speichere in Firestore
      const timestamp = firebase.firestore.FieldValue.serverTimestamp();
      const preferences = this.getPreferences();
      
      db.collection('users').doc(user.uid)
        .collection('coverLetters').add({
          content: this.generatedLetter,
          resumeInfo: {
            fileName: this.resumeFile?.name || 'Lebenslauf',
            text: this.resumeText.substring(0, 200) + '...' // Nur ein Auszug speichern
          },
          jobInfo: {
            fileName: this.jobFile?.name || 'Stellenanzeige',
            text: this.jobText.substring(0, 200) + '...' // Nur ein Auszug speichern
          },
          preferences: preferences,
          timestamp: timestamp
        })
        .then(() => {
          app.showToast('Anschreiben erfolgreich im Profil gespeichert', 'Erfolg', 'success');
        })
        .catch(error => {
          console.error('Fehler beim Speichern in Firestore:', error);
          app.showToast('Fehler beim Speichern', 'Fehler', 'danger');
        });
    } catch (error) {
      console.error('Fehler beim Speichern des Anschreibens:', error);
      app.showToast('Fehler beim Speichern', 'Fehler', 'danger');
    }
  }
  
  /**
   * Speichert die Formulardaten im Local Storage
   */
  saveFormDataToLocalStorage() {
    const preferences = this.getPreferences();
    localStorage.setItem('coverLetterPreferences', JSON.stringify(preferences));
  }
  
  /**
   * Lädt die Formulardaten aus dem Local Storage
   */
  loadFormDataFromLocalStorage() {
    const savedPreferences = localStorage.getItem('coverLetterPreferences');
    
    if (!savedPreferences) return;
    
    try {
      const preferences = JSON.parse(savedPreferences);
      
      // Tone & Length wiederherstellen
      if (this.toneSelector && preferences.tone) {
        this.toneSelector.value = preferences.tone;
      }
      
      if (this.lengthSelector && preferences.length) {
        this.lengthSelector.value = preferences.length;
      }
      
      // Elemente-Checkboxen wiederherstellen
      if (preferences.includeElements) {
        this.includeElements.forEach(checkbox => {
          if (preferences.includeElements.hasOwnProperty(checkbox.value)) {
            checkbox.checked = preferences.includeElements[checkbox.value];
          }
        });
      }
      
      // Persönliche Daten wiederherstellen
      if (preferences.personalInfo) {
        if (this.nameInput) this.nameInput.value = preferences.personalInfo.name || '';
        if (this.addressInput) this.addressInput.value = preferences.personalInfo.address || '';
        if (this.phoneInput) this.phoneInput.value = preferences.personalInfo.phone || '';
        if (this.emailInput) this.emailInput.value = preferences.personalInfo.email || '';
      }
      
      // Unternehmensdaten wiederherstellen
      if (preferences.companyInfo) {
        if (this.companyNameInput) this.companyNameInput.value = preferences.companyInfo.name || '';
        if (this.companyAddressInput) this.companyAddressInput.value = preferences.companyInfo.address || '';
        if (this.contactPersonInput) this.contactPersonInput.value = preferences.companyInfo.contactPerson || '';
      }
    } catch (error) {
      console.error('Fehler beim Laden der Formulardaten:', error);
    }
  }
  
  /**
   * Mock-Implementierung der Anschreiben-Generierung
   * @param {Object} resumeData - Die Lebenslaufdaten
   * @param {Object} jobData - Die Stellenanzeigendaten
   * @param {Object} preferences - Die Anschreiben-Einstellungen
   * @returns {Promise<Object>} - Das generierte Anschreiben
   * @private
   */
  async _mockGenerateCoverLetter(resumeData, jobData, preferences) {
    // Simulierte Verzögerung
    return new Promise((resolve) => {
      setTimeout(() => {
        const name = preferences.personalInfo.name || "Max Mustermann";
        const address = preferences.personalInfo.address || "Musterstraße 123, 12345 Berlin";
        const phone = preferences.personalInfo.phone || "+49 123 456789";
        const email = preferences.personalInfo.email || "max.mustermann@example.com";
        
        const companyName = preferences.companyInfo.name || "Beispiel GmbH";
        const companyAddress = preferences.companyInfo.address || "Beispielstraße 456, 54321 München";
        const contactPerson = preferences.companyInfo.contactPerson || "Personalleitung";
        
        const date = new Date().toLocaleDateString('de-DE', {
          day: '2-digit',
          month: 'long',
          year: 'numeric'
        });
        
        // Anschreiben-Text basierend auf Einstellungen generieren
        const toneMap = {
          formal: "sehr geehrte",
          professional: "geehrte",
          friendly: "liebe",
          enthusiastic: "liebe"
        };
        
        const greeting = toneMap[preferences.tone] || "geehrte";
        
        // Generiere Mock-Anschreiben als HTML
        let letter = `
          <div class="letter-header">
            <div>
              <p>${name}<br>
              ${address}<br>
              ${phone}<br>
              ${email}</p>
            </div>
            <div class="mt-5">
              <p>${companyName}<br>
              ${contactPerson}<br>
              ${companyAddress}</p>
            </div>
            <div class="mt-5">
              <p>${date}</p>
            </div>
          </div>
          
          <div class="letter-body">
            <p><strong>Bewerbung als Software-Entwickler</strong></p>
            
            <p>Sehr ${greeting} Damen und Herren${contactPerson && contactPerson !== 'Personalleitung' ? ' ' + contactPerson : ''},</p>
            
            <p>mit großem Interesse habe ich Ihre Stellenausschreibung als Software-Entwickler gelesen und bewerbe mich hiermit für diese Position. Die Kombination aus technologischen Herausforderungen und der Möglichkeit, innovative Lösungen zu entwickeln, reizt mich besonders.</p>
            
            ${preferences.includeElements.skills ? `
            <p>Zu meinen Kenntnissen zählen:</p>
            <ul>
              <li>Umfassende Erfahrung mit JavaScript, TypeScript und React</li>
              <li>Fundierte Kenntnisse in der Backend-Entwicklung mit Node.js</li>
              <li>Erfahrung mit relationalen und NoSQL-Datenbanken</li>
              <li>Vertrautheit mit agilen Entwicklungsmethoden und CI/CD-Pipelines</li>
            </ul>
            ` : ''}
            
            ${preferences.includeElements.experience ? `
            <p>In meiner aktuellen Position bei der Technologie AG konnte ich bereits umfangreiche Erfahrung in der Entwicklung von benutzerfreundlichen Webapplikationen sammeln. Dabei lag mein Fokus auf der Implementierung responsiver Benutzeroberflächen und der Integration komplexer API-Anbindungen.</p>
            ` : ''}
            
            ${preferences.includeElements.education ? `
            <p>Nach meinem erfolgreichen Abschluss als Bachelor of Science in Informatik habe ich mein Wissen kontinuierlich durch Fortbildungen und Zertifizierungen erweitert.</p>
            ` : ''}
            
            ${preferences.includeElements.motivation ? `
            <p>Besonders begeistert mich an Ihrem Unternehmen die innovative Ausrichtung und die Möglichkeit, an zukunftsweisenden Projekten mitzuwirken. Ich bin überzeugt, dass meine Fähigkeiten und meine Motivation optimal zu Ihrem Team passen würden.</p>
            ` : ''}
            
            ${preferences.includeElements.availability ? `
            <p>Ich könnte die Stelle zum nächstmöglichen Zeitpunkt antreten und freue mich auf ein persönliches Gespräch.</p>
            ` : ''}
            
            ${preferences.includeElements.salary ? `
            <p>Meine Gehaltsvorstellung liegt bei 65.000 € bis 75.000 € brutto jährlich, je nach Umfang der Aufgaben und Verantwortung.</p>
            ` : ''}
            
            <p>Mit freundlichen Grüßen</p>
            
            <p class="mt-5">${name}</p>
          </div>
          
          <div class="letter-footer">
            <p>Anlagen:<br>
            Lebenslauf<br>
            Zeugnisse</p>
          </div>
        `;
        
        resolve({ success: true, letter: letter });
      }, 2000);
    });
  }
}

// Globale Instanz erstellen, wenn die Seite geladen ist
document.addEventListener('DOMContentLoaded', () => {
  // Nur auf der Anschreiben-Seite initialisieren
  if (document.getElementById('coverLetterPage')) {
    window.coverLetterGenerator = new CoverLetterGenerator();
  }
}); 
