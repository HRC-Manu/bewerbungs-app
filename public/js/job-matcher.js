/**
 * Job-Matching-Funktionalität für den Vergleich von Lebenslauf und Stellenanzeige
 */

class JobMatcher {
  constructor() {
    this.documentProcessor = documentProcessor;
    this.apiClient = apiClient;
    
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
    
    this.compareButton = document.getElementById('compareButton');
    this.loadingIndicator = document.getElementById('loadingIndicator');
    this.resultsSection = document.getElementById('resultsSection');
    
    // Status
    this.resumeFile = null;
    this.resumeText = '';
    this.jobFile = null;
    this.jobText = '';
    this.matchingResult = null;
    
    // Event-Listener einrichten
    this.setupEventListeners();
    
    console.log('JobMatcher initialisiert');
  }
  
  /**
   * Event-Listener einrichten
   */
  setupEventListeners() {
    // Nur wenn wir auf der Job-Matching-Seite sind
    if (!this.compareButton) return;
    
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
        this.updateCompareButtonState();
        
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
    
    // Vergleichs-Button
    if (this.compareButton) {
      this.compareButton.addEventListener('click', () => {
        this.compareResumeWithJob();
      });
    }
    
    // Button zum Lebenslauf optimieren
    document.getElementById('optimizeResumeBtn')?.addEventListener('click', () => {
      this.navigateToResumeOptimizer();
    });
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
      
      // Vergleichs-Button-Status aktualisieren
      this.updateCompareButtonState();
      
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
      
      // Vergleichs-Button-Status aktualisieren
      this.updateCompareButtonState();
      
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
    this.updateCompareButtonState();
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
    
    this.updateCompareButtonState();
  }
  
  /**
   * Aktualisiert den Status des Vergleichs-Buttons
   */
  updateCompareButtonState() {
    if (this.compareButton) {
      this.compareButton.disabled = !this.resumeText || !this.jobText;
    }
  }
  
  /**
   * Vergleicht den Lebenslauf mit der Stellenanzeige
   */
  async compareResumeWithJob() {
    if (!this.resumeText || !this.jobText) {
      app.showToast('Bitte laden Sie sowohl einen Lebenslauf als auch eine Stellenanzeige hoch', 'Hinweis', 'warning');
      return;
    }
    
    try {
      // UI aktualisieren
      this.compareButton.disabled = true;
      this.loadingIndicator.classList.remove('d-none');
      this.resultsSection.classList.add('d-none');
      
      // Mock-Daten für den Vergleich (in echter Implementation würde der API-Call hier stehen)
      const resumeData = {
        text: this.resumeText,
        fileName: this.resumeFile?.name || 'Lebenslauf'
      };
      
      const jobData = {
        text: this.jobText,
        fileName: this.jobFile?.name || 'Stellenanzeige'
      };
      
      // API-Call simulieren
      // const result = await this.apiClient.compareResumeWithJob(resumeData, jobData);
      
      // Mock-Ergebnis
      const result = await this._mockCompareResumeWithJob(resumeData, jobData);
      
      // Ergebnis speichern
      this.matchingResult = result;
      
      // UI aktualisieren
      this.displayResults(result);
      this.compareButton.disabled = false;
      this.loadingIndicator.classList.add('d-none');
      
      app.showToast('Vergleich abgeschlossen', 'Erfolg', 'success');
    } catch (error) {
      console.error('Fehler beim Vergleich:', error);
      
      app.showToast(`Vergleich fehlgeschlagen: ${error.message}`, 'Fehler', 'danger');
      
      // UI zurücksetzen
      this.compareButton.disabled = false;
      this.loadingIndicator.classList.add('d-none');
    }
  }
  
  /**
   * Zeigt die Vergleichsergebnisse an
   * @param {Object} result - Das Vergleichsergebnis
   */
  displayResults(result) {
    if (!result || !this.resultsSection) return;
    
    // HTML für die Ergebnisse erstellen
    let html = `
      <div class="card">
        <div class="card-header d-flex justify-content-between align-items-center">
          <h3 class="mb-0">Übereinstimmungsanalyse</h3>
          <div class="match-score-big">${result.overallMatch}%</div>
        </div>
        <div class="card-body">
          <div class="row mb-4">
            <div class="col-md-6">
              <h4>Job-Details</h4>
              <ul class="list-group">
                <li class="list-group-item d-flex justify-content-between">
                  <span class="fw-bold">Titel:</span>
                  <span>${result.jobDetails?.title || 'Nicht angegeben'}</span>
                </li>
                <li class="list-group-item d-flex justify-content-between">
                  <span class="fw-bold">Unternehmen:</span>
                  <span>${result.jobDetails?.company || 'Nicht angegeben'}</span>
                </li>
                <li class="list-group-item d-flex justify-content-between">
                  <span class="fw-bold">Standort:</span>
                  <span>${result.jobDetails?.location || 'Nicht angegeben'}</span>
                </li>
              </ul>
            </div>
            
            <div class="col-md-6">
              <h4>Übereinstimmung</h4>
              <div class="match-indicator mb-4">
                <div class="match-meter">
                  <div class="match-fill" style="width: ${result.overallMatch}%"></div>
                </div>
                <div class="d-flex justify-content-between mt-2">
                  <span>Schwach</span>
                  <span>Mittel</span>
                  <span>Stark</span>
                </div>
              </div>
              
              <div class="match-categories">
                ${Object.entries(result.categoryMatches || {}).map(([category, score]) => `
                  <div class="match-category">
                    <div class="match-category-header">
                      <div class="match-category-title">${this._formatCategory(category)}</div>
                      <div class="match-category-score">${score}%</div>
                    </div>
                    <div class="progress">
                      <div class="progress-bar" role="progressbar" style="width: ${score}%" 
                           aria-valuenow="${score}" aria-valuemin="0" aria-valuemax="100"></div>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
          
          <ul class="nav nav-tabs mb-3" id="matchingTabs" role="tablist">
            <li class="nav-item" role="presentation">
              <button class="nav-link active" id="skills-tab" data-bs-toggle="tab" data-bs-target="#skills" 
                      type="button" role="tab" aria-controls="skills" aria-selected="true">Fähigkeiten</button>
            </li>
            <li class="nav-item" role="presentation">
              <button class="nav-link" id="experience-tab" data-bs-toggle="tab" data-bs-target="#experience" 
                      type="button" role="tab" aria-controls="experience" aria-selected="false">Erfahrung</button>
            </li>
            <li class="nav-item" role="presentation">
              <button class="nav-link" id="education-tab" data-bs-toggle="tab" data-bs-target="#education" 
                      type="button" role="tab" aria-controls="education" aria-selected="false">Bildung</button>
            </li>
            <li class="nav-item" role="presentation">
              <button class="nav-link" id="recommendations-tab" data-bs-toggle="tab" data-bs-target="#recommendations" 
                      type="button" role="tab" aria-controls="recommendations" aria-selected="false">Empfehlungen</button>
            </li>
          </ul>
          
          <div class="tab-content">
            <div class="tab-pane fade show active" id="skills" role="tabpanel" aria-labelledby="skills-tab">
              ${this._renderSkillsTab(result)}
            </div>
            <div class="tab-pane fade" id="experience" role="tabpanel" aria-labelledby="experience-tab">
              ${this._renderExperienceTab(result)}
            </div>
            <div class="tab-pane fade" id="education" role="tabpanel" aria-labelledby="education-tab">
              ${this._renderEducationTab(result)}
            </div>
            <div class="tab-pane fade" id="recommendations" role="tabpanel" aria-labelledby="recommendations-tab">
              ${this._renderRecommendationsTab(result)}
            </div>
          </div>
          
          <div class="mt-4 text-center">
            <button id="exportResultsBtn" class="btn btn-outline-primary me-2">
              <i class="bi bi-download me-1"></i>Ergebnisse exportieren
            </button>
            <button id="saveToProfileBtn" class="btn btn-primary me-2">
              <i class="bi bi-save me-1"></i>Im Profil speichern
            </button>
            <button id="optimizeResumeBtn" class="btn btn-success">
              <i class="bi bi-magic me-1"></i>Lebenslauf optimieren
            </button>
          </div>
        </div>
      </div>
    `;
    
    // HTML einfügen
    this.resultsSection.innerHTML = html;
    this.resultsSection.classList.remove('d-none');
    
    // Event-Listener für die Buttons
    document.getElementById('exportResultsBtn')?.addEventListener('click', () => {
      this._exportResults(this.matchingResult);
    });
    
    document.getElementById('saveToProfileBtn')?.addEventListener('click', () => {
      this._saveToProfile(this.matchingResult);
    });
    
    document.getElementById('optimizeResumeBtn')?.addEventListener('click', () => {
      this.navigateToResumeOptimizer();
    });
  }
  
  /**
   * Mock-Implementierung für den Vergleich von Lebenslauf und Stellenanzeige
   * @param {Object} resumeData - Die Lebenslaufdaten
   * @param {Object} jobData - Die Stellenanzeigendaten
   * @returns {Promise<Object>} - Das Vergleichsergebnis
   * @private
   */
  async _mockCompareResumeWithJob(resumeData, jobData) {
    // Simuliere eine Verzögerung für das API-Erlebnis
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          overallMatch: 73,
          jobDetails: {
            title: 'Frontend-Entwickler',
            company: 'TechSolutions GmbH',
            location: 'Berlin (Remote möglich)'
          },
          categoryMatches: {
            skills: 85,
            experience: 70,
            education: 80,
            languages: 90
          },
          matchedSkills: [
            { skill: 'JavaScript', relevance: 'Hoch', match: true },
            { skill: 'React', relevance: 'Hoch', match: true },
            { skill: 'TypeScript', relevance: 'Mittel', match: true },
            { skill: 'CSS/SCSS', relevance: 'Mittel', match: true },
            { skill: 'HTML5', relevance: 'Mittel', match: true },
            { skill: 'RESTful APIs', relevance: 'Mittel', match: true },
            { skill: 'Git', relevance: 'Niedrig', match: true },
            { skill: 'Angular', relevance: 'Mittel', match: false },
            { skill: 'Vue.js', relevance: 'Niedrig', match: false }
          ],
          matchedExperience: {
            years: 3,
            required: 2,
            relevantExperience: [
              {
                position: 'Frontend-Entwickler',
                company: 'Digital Solutions AG',
                relevance: 'Hoch',
                match: true
              }
            ]
          },
          matchedEducation: {
            degree: 'Bachelor/Master in Informatik oder ähnlichem Bereich',
            match: true
          },
          recommendations: [
            {
              category: 'Fähigkeiten',
              title: 'Angular-Kenntnisse hinzufügen',
              description: 'Die Stellenanzeige erwähnt Angular als wichtige Technologie. Sie sollten Grundkenntnisse oder Lernbereitschaft in diesem Bereich in Ihrem Lebenslauf erwähnen.',
              importance: 'Hoch'
            },
            {
              category: 'Erfahrung',
              title: 'Projektbeschreibungen konkretisieren',
              description: 'Beschreiben Sie Ihre Frontend-Projekte detaillierter und heben Sie Aspekte hervor, die für diese Position relevant sind, wie z.B. responsives Design oder Performance-Optimierung.',
              importance: 'Mittel'
            },
            {
              category: 'Format',
              title: 'Lebenslauf kürzen',
              description: 'Ihr Lebenslauf ist länger als zwei Seiten. Kürzen Sie irrelevante Erfahrungen und konzentrieren Sie sich auf die für diese Position relevantesten Aspekte.',
              importance: 'Niedrig'
            }
          ]
        });
      }, 2000);
    });
  }
  
  /**
   * Rendert den Skills-Tab
   * @param {Object} result - Das Vergleichsergebnis
   * @returns {string} - HTML-String
   * @private
   */
  _renderSkillsTab(result) {
    const matchedSkills = result.matchedSkills || [];
    
    if (matchedSkills.length === 0) {
      return '<p>Keine Fähigkeiten gefunden</p>';
    }
    
    return `
      <div class="table-responsive">
        <table class="table">
          <thead>
            <tr>
              <th>Fähigkeit</th>
              <th>Relevanz</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${matchedSkills.map(skill => `
              <tr>
                <td>${skill.skill}</td>
                <td>${skill.relevance}</td>
                <td>
                  ${skill.match 
                    ? '<span class="badge bg-success">Vorhanden</span>' 
                    : '<span class="badge bg-danger">Fehlt</span>'}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }
  
  /**
   * Rendert den Experience-Tab
   * @param {Object} result - Das Vergleichsergebnis
   * @returns {string} - HTML-String
   * @private
   */
  _renderExperienceTab(result) {
    const experience = result.matchedExperience || {};
    
    return `
      <div class="row">
        <div class="col-md-6">
          <div class="card mb-3">
            <div class="card-body">
              <h5 class="card-title">Berufserfahrung</h5>
              <div class="d-flex justify-content-between align-items-center">
                <div>Ihr Profil</div>
                <div class="fw-bold">${experience.years || 0} Jahre</div>
              </div>
              <div class="d-flex justify-content-between align-items-center">
                <div>Gefordert</div>
                <div class="fw-bold">${experience.required || 0} Jahre</div>
              </div>
              
              <div class="progress mt-3">
                <div class="progress-bar bg-${experience.years >= experience.required ? 'success' : 'warning'}" 
                     role="progressbar" style="width: ${Math.min(100, (experience.years / Math.max(1, experience.required)) * 100)}%" 
                     aria-valuenow="${experience.years}" aria-valuemin="0" aria-valuemax="${Math.max(experience.required, experience.years)}"></div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="col-md-6">
          <div class="card">
            <div class="card-body">
              <h5 class="card-title">Relevante Positionen</h5>
              ${experience.relevantExperience && experience.relevantExperience.length > 0 
                ? `<ul class="list-group list-group-flush">
                    ${experience.relevantExperience.map(exp => `
                      <li class="list-group-item d-flex justify-content-between align-items-center">
                        <div>
                          <div class="fw-bold">${exp.position}</div>
                          <div class="small text-muted">${exp.company}</div>
                        </div>
                        <span class="badge bg-${exp.match ? 'success' : 'danger'} rounded-pill">
                          ${exp.match ? 'Match' : 'Kein Match'}
                        </span>
                      </li>
                    `).join('')}
                  </ul>`
                : '<p>Keine relevanten Positionen gefunden</p>'
              }
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  /**
   * Rendert den Education-Tab
   * @param {Object} result - Das Vergleichsergebnis
   * @returns {string} - HTML-String
   * @private
   */
  _renderEducationTab(result) {
    const education = result.matchedEducation || {};
    
    return `
      <div class="card">
        <div class="card-body">
          <h5 class="card-title">Bildungsanforderungen</h5>
          <div class="row">
            <div class="col-md-8">
              <p><strong>Gefordert:</strong> ${education.degree || 'Keine Anforderung angegeben'}</p>
            </div>
            <div class="col-md-4 text-end">
              ${education.match 
                ? '<span class="badge bg-success">Anforderung erfüllt</span>' 
                : '<span class="badge bg-warning">Anforderung nicht erfüllt</span>'}
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  /**
   * Rendert den Recommendations-Tab
   * @param {Object} result - Das Vergleichsergebnis
   * @returns {string} - HTML-String
   * @private
   */
  _renderRecommendationsTab(result) {
    const recommendations = result.recommendations || [];
    
    if (recommendations.length === 0) {
      return '<p>Keine Empfehlungen verfügbar</p>';
    }
    
    return `
      <div class="accordion" id="recommendationsAccordion">
        ${recommendations.map((rec, index) => `
          <div class="accordion-item">
            <h2 class="accordion-header" id="heading${index}">
              <button class="accordion-button ${index > 0 ? 'collapsed' : ''}" type="button" 
                      data-bs-toggle="collapse" data-bs-target="#collapse${index}" 
                      aria-expanded="${index === 0 ? 'true' : 'false'}" aria-controls="collapse${index}">
                <div class="d-flex align-items-center w-100">
                  <span class="me-3">${rec.title}</span>
                  <span class="badge ${this._getImportanceBadgeClass(rec.importance)} ms-auto">${rec.importance}</span>
                </div>
              </button>
            </h2>
            <div id="collapse${index}" class="accordion-collapse collapse ${index === 0 ? 'show' : ''}" 
                 aria-labelledby="heading${index}" data-bs-parent="#recommendationsAccordion">
              <div class="accordion-body">
                <p>${rec.description}</p>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }
  
  /**
   * Formatiert eine Kategorie für die Anzeige
   * @param {string} category - Die zu formatierende Kategorie
   * @returns {string} - Die formatierte Kategorie
   * @private
   */
  _formatCategory(category) {
    const categoryMap = {
      'skills': 'Fähigkeiten',
      'experience': 'Erfahrung',
      'education': 'Bildung',
      'languages': 'Sprachen',
      'certifications': 'Zertifikate',
      'projects': 'Projekte'
    };
    
    return categoryMap[category] || category;
  }
  
  /**
   * Gibt die Badge-Klasse basierend auf der Wichtigkeit zurück
   * @param {string} importance - Die Wichtigkeit
   * @returns {string} - Die Badge-Klasse
   * @private
   */
  _getImportanceBadgeClass(importance) {
    switch (importance.toLowerCase()) {
      case 'hoch':
        return 'bg-danger';
      case 'mittel':
        return 'bg-warning text-dark';
      case 'niedrig':
        return 'bg-info text-dark';
      default:
        return 'bg-secondary';
    }
  }
  
  /**
   * Exportiert die Vergleichsergebnisse als JSON-Datei
   * @param {Object} results - Die zu exportierenden Ergebnisse
   * @private
   */
  _exportResults(results) {
    if (!results) return;
    
    try {
      // Dateinamen erstellen
      const dateStr = new Date().toISOString().slice(0, 10);
      const fileName = `JobMatching_${dateStr}.json`;
      
      // JSON erstellen
      const jsonStr = JSON.stringify(results, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      
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
      
      app.showToast('Vergleichsergebnisse erfolgreich exportiert', 'Erfolg', 'success');
    } catch (error) {
      console.error('Fehler beim Exportieren der Vergleichsergebnisse:', error);
      app.showToast('Fehler beim Exportieren', 'Fehler', 'danger');
    }
  }
  
  /**
   * Speichert die Vergleichsergebnisse im Benutzerprofil
   * @param {Object} results - Die zu speichernden Ergebnisse
   * @private
   */
  _saveToProfile(results) {
    if (!results) return;
    
    // Prüfe, ob ein Benutzer angemeldet ist
    const user = firebase.auth().currentUser;
    if (!user) {
      app.showToast('Bitte melden Sie sich an, um die Ergebnisse zu speichern', 'Hinweis', 'warning');
      
      // Zeige das Login-Modal
      const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
      loginModal.show();
      
      return;
    }
    
    try {
      // Speichere in Firestore
      const timestamp = firebase.firestore.FieldValue.serverTimestamp();
      
      db.collection('users').doc(user.uid)
        .collection('matchings').add({
          resumeInfo: {
            fileName: this.resumeFile?.name || 'Lebenslauf',
            text: this.resumeText.substring(0, 200) + '...' // Nur ein Auszug speichern
          },
          jobInfo: {
            fileName: this.jobFile?.name || 'Stellenanzeige',
            text: this.jobText.substring(0, 200) + '...' // Nur ein Auszug speichern
          },
          result: results,
          timestamp: timestamp
        })
        .then(() => {
          app.showToast('Vergleichsergebnisse erfolgreich im Profil gespeichert', 'Erfolg', 'success');
        })
        .catch(error => {
          console.error('Fehler beim Speichern in Firestore:', error);
          app.showToast('Fehler beim Speichern', 'Fehler', 'danger');
        });
    } catch (error) {
      console.error('Fehler beim Speichern der Vergleichsergebnisse:', error);
      app.showToast('Fehler beim Speichern', 'Fehler', 'danger');
    }
  }
  
  /**
   * Navigiert zum Lebenslauf-Optimizer
   */
  navigateToResumeOptimizer() {
    // Prüfe, ob Daten vorhanden sind
    if (!this.resumeText || !this.jobText || !this.matchingResult) {
      app.showToast('Bitte führen Sie zuerst einen Vergleich durch', 'Hinweis', 'warning');
      return;
    }
    
    // Speichere die Daten in der Session Storage
    sessionStorage.setItem('resumeText', this.resumeText);
    sessionStorage.setItem('jobText', this.jobText);
    sessionStorage.setItem('matchingResult', JSON.stringify(this.matchingResult));
    
    // Navigiere zur Optimizer-Seite
    window.location.href = 'resume-optimizer.html';
  }
}

// Globale Instanz erstellen, wenn die Seite geladen ist
document.addEventListener('DOMContentLoaded', () => {
  // Nur auf der Job-Matching-Seite initialisieren
  if (document.getElementById('jobMatchingPage')) {
    window.jobMatcher = new JobMatcher();
  }
}); 