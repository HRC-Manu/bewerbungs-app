/**
 * Lebenslaufanalyse und -verarbeitung
 */

class ResumeAnalyzer {
  constructor() {
    this.documentProcessor = documentProcessor;
    this.lastAnalyzedFile = null;
    this.lastAnalysisResult = null;
    
    // Initialisiere Benutzeroberfläche
    this.initUI();
    
    console.log('ResumeAnalyzer initialisiert');
  }
  
  /**
   * Initialisiert die Benutzeroberfläche
   */
  initUI() {
    // Nur wenn wir auf der Lebenslaufanalyse-Seite sind
    if (!document.getElementById('analyzeButton')) return;
    
    // Referenzen auf DOM-Elemente
    this.fileInput = document.getElementById('fileInput');
    this.browseButton = document.getElementById('browseButton');
    this.dropZone = document.getElementById('dropZone');
    this.fileInfo = document.getElementById('fileInfo');
    this.fileName = document.getElementById('fileName');
    this.removeFileButton = document.getElementById('removeFile');
    this.analyzeButton = document.getElementById('analyzeButton');
    this.loadingIndicator = document.getElementById('loadingIndicator');
    this.resultsSection = document.getElementById('resultsSection');
    
    // Event-Listener
    this.setupEventListeners();
  }
  
  /**
   * Richtet Event-Listener ein
   */
  setupEventListeners() {
    if (!this.browseButton) return;
    
    // Datei-Upload-Button
    this.browseButton.addEventListener('click', () => {
      this.fileInput.click();
    });
    
    // Datei-Input-Änderung
    this.fileInput.addEventListener('change', (event) => {
      if (event.target.files.length > 0) {
        this.handleFileUpload(event.target.files[0]);
      }
    });
    
    // Drag & Drop
    this.dropZone.addEventListener('dragover', (event) => {
      event.preventDefault();
      this.dropZone.classList.add('dragover');
    });
    
    this.dropZone.addEventListener('dragleave', () => {
      this.dropZone.classList.remove('dragover');
    });
    
    this.dropZone.addEventListener('drop', (event) => {
      event.preventDefault();
      this.dropZone.classList.remove('dragover');
      
      if (event.dataTransfer.files.length > 0) {
        this.handleFileUpload(event.dataTransfer.files[0]);
      }
    });
    
    // Datei entfernen
    this.removeFileButton.addEventListener('click', () => {
      this.resetFileUpload();
    });
    
    // Analyse-Button
    this.analyzeButton.addEventListener('click', () => {
      this.analyzeResume();
    });
  }
  
  /**
   * Verarbeitet den Datei-Upload
   * @param {File} file - Die hochgeladene Datei
   */
  handleFileUpload(file) {
    // Prüfe, ob die Datei unterstützt wird
    if (!this.documentProcessor.isSupported(file)) {
      return;
    }
    
    // Aktualisiere UI
    this.lastAnalyzedFile = file;
    this.fileName.textContent = file.name;
    this.fileInfo.classList.remove('d-none');
    this.analyzeButton.disabled = false;
    
    app.showToast('Datei erfolgreich hochgeladen', 'Erfolg', 'success');
  }
  
  /**
   * Setzt den Datei-Upload zurück
   */
  resetFileUpload() {
    this.lastAnalyzedFile = null;
    this.fileInput.value = '';
    this.fileInfo.classList.add('d-none');
    this.analyzeButton.disabled = true;
    this.resultsSection.classList.add('d-none');
    this.resultsSection.innerHTML = '';
  }
  
  /**
   * Analysiert den hochgeladenen Lebenslauf
   */
  async analyzeResume() {
    if (!this.lastAnalyzedFile) {
      app.showToast('Bitte laden Sie zuerst einen Lebenslauf hoch', 'Hinweis', 'warning');
      return;
    }
    
    try {
      // UI aktualisieren
      this.analyzeButton.disabled = true;
      this.loadingIndicator.classList.remove('d-none');
      this.resultsSection.classList.add('d-none');
      
      // Text aus Datei extrahieren
      const extractionResult = await this.documentProcessor.extractText(this.lastAnalyzedFile);
      
      if (!extractionResult.success) {
        throw new Error(extractionResult.error || 'Fehler bei der Textextraktion');
      }
      
      console.log(`Text aus Datei extrahiert: ${extractionResult.text.length} Zeichen`);
      
      // Text analysieren (Mock für diese Version)
      const analysisResult = await this._analyzeText(extractionResult.text);
      
      // Ergebnis speichern
      this.lastAnalysisResult = analysisResult;
      
      // Ergebnisse anzeigen
      this.displayResults(analysisResult);
      
      // UI aktualisieren
      this.analyzeButton.disabled = false;
      this.loadingIndicator.classList.add('d-none');
      
      app.showToast('Lebenslaufanalyse abgeschlossen', 'Erfolg', 'success');
    } catch (error) {
      console.error('Fehler bei der Lebenslaufanalyse:', error);
      
      app.showToast(`Analyse fehlgeschlagen: ${error.message}`, 'Fehler', 'danger');
      
      // UI zurücksetzen
      this.analyzeButton.disabled = false;
      this.loadingIndicator.classList.add('d-none');
    }
  }
  
  /**
   * Analysiert den extrahierten Text (Mock-Implementation)
   * @param {string} text - Der zu analysierende Text
   * @returns {Promise<Object>} - Das Analyseergebnis
   * @private
   */
  async _analyzeText(text) {
    // In einer echten Implementierung würden wir hier die API verwenden
    // Für diese Version simulieren wir die Analyse
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(this._generateMockAnalysis());
      }, 2000);
    });
  }
  
  /**
   * Zeigt die Analyseergebnisse an
   * @param {Object} results - Die anzuzeigenden Ergebnisse
   */
  displayResults(results) {
    if (!results || !this.resultsSection) return;
    
    // HTML für die Ergebnisse erstellen
    let html = `
      <div class="card mb-4">
        <div class="card-header d-flex justify-content-between align-items-center">
          <h3 class="mb-0">Analyseergebnisse</h3>
          <div>
            <button id="exportResultsBtn" class="btn btn-outline-primary me-2">
              <i class="bi bi-download me-1"></i>Exportieren
            </button>
            <button id="saveToProfileBtn" class="btn btn-primary">
              <i class="bi bi-save me-1"></i>Im Profil speichern
            </button>
          </div>
        </div>
        <div class="card-body">
          <ul class="nav nav-tabs mb-3" id="resumeTabs" role="tablist">
            <li class="nav-item" role="presentation">
              <button class="nav-link active" id="overview-tab" data-bs-toggle="tab" data-bs-target="#overview" type="button" role="tab" aria-controls="overview" aria-selected="true">Übersicht</button>
            </li>
            <li class="nav-item" role="presentation">
              <button class="nav-link" id="experience-tab" data-bs-toggle="tab" data-bs-target="#experience" type="button" role="tab" aria-controls="experience" aria-selected="false">Berufserfahrung</button>
            </li>
            <li class="nav-item" role="presentation">
              <button class="nav-link" id="education-tab" data-bs-toggle="tab" data-bs-target="#education" type="button" role="tab" aria-controls="education" aria-selected="false">Ausbildung</button>
            </li>
            <li class="nav-item" role="presentation">
              <button class="nav-link" id="skills-tab" data-bs-toggle="tab" data-bs-target="#skills" type="button" role="tab" aria-controls="skills" aria-selected="false">Fähigkeiten</button>
            </li>
            <li class="nav-item" role="presentation">
              <button class="nav-link" id="improvements-tab" data-bs-toggle="tab" data-bs-target="#improvements" type="button" role="tab" aria-controls="improvements" aria-selected="false">Verbesserungen</button>
            </li>
          </ul>
          
          <div class="tab-content" id="resumeTabContent">
            <!-- Übersicht -->
            <div class="tab-pane fade show active" id="overview" role="tabpanel" aria-labelledby="overview-tab">
              <div class="row">
                <div class="col-md-4 mb-3">
                  <div class="card h-100">
                    <div class="card-body">
                      <h5 class="card-title">Persönliche Daten</h5>
                      <ul class="list-group list-group-flush">
                        <li class="list-group-item d-flex justify-content-between">
                          <span class="fw-bold">Name:</span>
                          <span>${results.personalData?.name || 'Nicht angegeben'}</span>
                        </li>
                        <li class="list-group-item d-flex justify-content-between">
                          <span class="fw-bold">E-Mail:</span>
                          <span>${results.personalData?.email || 'Nicht angegeben'}</span>
                        </li>
                        <li class="list-group-item d-flex justify-content-between">
                          <span class="fw-bold">Telefon:</span>
                          <span>${results.personalData?.phone || 'Nicht angegeben'}</span>
                        </li>
                        <li class="list-group-item d-flex justify-content-between">
                          <span class="fw-bold">Adresse:</span>
                          <span>${results.personalData?.address || 'Nicht angegeben'}</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
                <div class="col-md-8 mb-3">
                  <div class="card h-100">
                    <div class="card-body">
                      <h5 class="card-title">Profil-Zusammenfassung</h5>
                      <p>${results.summary || 'Keine Zusammenfassung verfügbar'}</p>
                      
                      <h5 class="card-title mt-4">Sprachen</h5>
                      ${this._renderLanguages(results.languages)}
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="row mt-3">
                <div class="col-md-6 mb-3">
                  <div class="card h-100">
                    <div class="card-body">
                      <h5 class="card-title">Aktuelle Position</h5>
                      ${this._renderLatestExperience(results.workExperience)}
                    </div>
                  </div>
                </div>
                <div class="col-md-6 mb-3">
                  <div class="card h-100">
                    <div class="card-body">
                      <h5 class="card-title">Top-Fähigkeiten</h5>
                      ${this._renderSkillList(results.skills?.technical || [])}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Berufserfahrung -->
            <div class="tab-pane fade" id="experience" role="tabpanel" aria-labelledby="experience-tab">
              <h4>Berufserfahrung</h4>
              ${this._renderExperience(results.workExperience)}
              
              <h4 class="mt-4">Projekte</h4>
              ${this._renderProjects(results.projects)}
            </div>
            
            <!-- Ausbildung -->
            <div class="tab-pane fade" id="education" role="tabpanel" aria-labelledby="education-tab">
              <h4>Ausbildung</h4>
              ${this._renderEducation(results.education)}
              
              <h4 class="mt-4">Zertifizierungen</h4>
              ${this._renderCertifications(results.certifications)}
            </div>
            
            <!-- Fähigkeiten -->
            <div class="tab-pane fade" id="skills" role="tabpanel" aria-labelledby="skills-tab">
              <div class="row">
                <div class="col-md-4 mb-3">
                  <div class="card h-100">
                    <div class="card-header">
                      <h5 class="card-title mb-0">Technische Fähigkeiten</h5>
                    </div>
                    <div class="card-body">
                      ${this._renderSkillList(results.skills?.technical || [])}
                    </div>
                  </div>
                </div>
                <div class="col-md-4 mb-3">
                  <div class="card h-100">
                    <div class="card-header">
                      <h5 class="card-title mb-0">Methodische Fähigkeiten</h5>
                    </div>
                    <div class="card-body">
                      ${this._renderSkillList(results.skills?.methodical || [])}
                    </div>
                  </div>
                </div>
                <div class="col-md-4 mb-3">
                  <div class="card h-100">
                    <div class="card-header">
                      <h5 class="card-title mb-0">Soziale Fähigkeiten</h5>
                    </div>
                    <div class="card-body">
                      ${this._renderSkillList(results.skills?.social || [])}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Verbesserungen -->
            <div class="tab-pane fade" id="improvements" role="tabpanel" aria-labelledby="improvements-tab">
              <h4>Verbesserungsvorschläge</h4>
              <div class="alert alert-primary">
                <i class="bi bi-info-circle-fill me-2"></i>
                Diese Vorschläge helfen Ihnen, Ihren Lebenslauf zu optimieren und Ihre Chancen bei Bewerbungen zu verbessern.
              </div>
              
              ${this._renderImprovements(results.improvements)}
            </div>
          </div>
        </div>
      </div>
    `;
    
    // HTML einfügen und Sektion anzeigen
    this.resultsSection.innerHTML = html;
    this.resultsSection.classList.remove('d-none');
    
    // Event-Listener für die Buttons
    document.getElementById('exportResultsBtn')?.addEventListener('click', () => this._exportResults(results));
    document.getElementById('saveToProfileBtn')?.addEventListener('click', () => this._saveToProfile(results));
    
    // Zum Ergebnisbereich scrollen
    this.resultsSection.scrollIntoView({ behavior: 'smooth' });
  }
  
  /**
   * Rendert die neueste Berufserfahrung als HTML
   * @param {Array} experience - Die Berufserfahrungen
   * @returns {string} - HTML-String
   * @private
   */
  _renderLatestExperience(experience) {
    if (!experience || !Array.isArray(experience) || experience.length === 0) {
      return '<p>Keine Berufserfahrung gefunden</p>';
    }
    
    // Nehme die erste (neueste) Erfahrung
    const latest = experience[0];
    
    return `
      <div class="card">
        <div class="card-body">
          <h5 class="card-title">${latest.position || 'Unbekannte Position'}</h5>
          <h6 class="card-subtitle mb-2 text-muted">
            ${latest.company || 'Unbekanntes Unternehmen'}
            ${latest.location ? ` - ${latest.location}` : ''}
          </h6>
          <div class="mb-2 text-muted">${latest.period || 'Unbekannter Zeitraum'}</div>
          <p class="card-text">${latest.description || 'Keine Beschreibung verfügbar'}</p>
        </div>
      </div>
    `;
  }
  
  /**
   * Rendert eine Liste von Fähigkeiten als HTML
   * @param {Array} skills - Die Fähigkeiten
   * @returns {string} - HTML-String
   * @private
   */
  _renderSkillList(skills) {
    if (!skills || !Array.isArray(skills) || skills.length === 0) {
      return '<p>Keine Fähigkeiten gefunden</p>';
    }
    
    return `
      <div class="d-flex flex-wrap">
        ${skills.map(skill => 
          `<span class="badge bg-light text-dark me-2 mb-2 p-2">${skill}</span>`
        ).join('')}
      </div>
    `;
  }
  
  /**
   * Rendert Sprachen als HTML
   * @param {Array} languages - Die Sprachen
   * @returns {string} - HTML-String
   * @private
   */
  _renderLanguages(languages) {
    if (!languages || !Array.isArray(languages) || languages.length === 0) {
      return '<p>Keine Sprachen gefunden</p>';
    }
    
    return `
      <ul class="list-group">
        ${languages.map(lang => `
          <li class="list-group-item d-flex justify-content-between align-items-center">
            ${lang.language || 'Unbekannte Sprache'}
            <span class="badge bg-primary rounded-pill">${lang.level || ''}</span>
          </li>
        `).join('')}
      </ul>
    `;
  }
  
  /**
   * Rendert Berufserfahrungen als HTML
   * @param {Array} experience - Die Berufserfahrungen
   * @returns {string} - HTML-String
   * @private
   */
  _renderExperience(experience) {
    if (!experience || !Array.isArray(experience) || experience.length === 0) {
      return '<p>Keine Berufserfahrung gefunden</p>';
    }
    
    return `
      <div class="timeline">
        ${experience.map(exp => `
          <div class="timeline-item">
            <div class="timeline-marker"></div>
            <div class="timeline-content">
              <h5 class="timeline-title">${exp.position || 'Unbekannte Position'}</h5>
              <h6 class="timeline-subtitle">
                ${exp.company || 'Unbekanntes Unternehmen'}
                ${exp.location ? ` - ${exp.location}` : ''}
              </h6>
              <div class="timeline-date">${exp.period || 'Unbekannter Zeitraum'}</div>
              <p>${exp.description || 'Keine Beschreibung verfügbar'}</p>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }
  
  /**
   * Rendert Projekte als HTML
   * @param {Array} projects - Die Projekte
   * @returns {string} - HTML-String
   * @private
   */
  _renderProjects(projects) {
    if (!projects || !Array.isArray(projects) || projects.length === 0) {
      return '<p>Keine Projekte gefunden</p>';
    }
    
    return `
      <div class="row row-cols-1 row-cols-md-2 g-4">
        ${projects.map(project => `
          <div class="col">
            <div class="card h-100">
              <div class="card-body">
                <h5 class="card-title">${project.title || 'Unbekanntes Projekt'}</h5>
                <h6 class="card-subtitle mb-2 text-muted">${project.period || ''}</h6>
                <p class="card-text">${project.description || 'Keine Beschreibung verfügbar'}</p>
                ${project.technologies ? `
                  <div class="mt-2">
                    <small class="text-muted">Technologien: ${project.technologies.join(', ')}</small>
                  </div>
                ` : ''}
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }
  
  /**
   * Rendert Ausbildung als HTML
   * @param {Array} education - Die Ausbildungen
   * @returns {string} - HTML-String
   * @private
   */
  _renderEducation(education) {
    if (!education || !Array.isArray(education) || education.length === 0) {
      return '<p>Keine Ausbildung gefunden</p>';
    }
    
    return `
      <div class="timeline">
        ${education.map(edu => `
          <div class="timeline-item">
            <div class="timeline-marker"></div>
            <div class="timeline-content">
              <h5 class="timeline-title">${edu.degree || 'Unbekannter Abschluss'}</h5>
              <h6 class="timeline-subtitle">
                ${edu.institution || 'Unbekannte Institution'}
                ${edu.location ? ` - ${edu.location}` : ''}
              </h6>
              <div class="timeline-date">${edu.period || 'Unbekannter Zeitraum'}</div>
              ${edu.focus ? `<p>Schwerpunkt: ${edu.focus}</p>` : ''}
              ${edu.description ? `<p>${edu.description}</p>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }
  
  /**
   * Rendert Zertifizierungen als HTML
   * @param {Array} certifications - Die Zertifizierungen
   * @returns {string} - HTML-String
   * @private
   */
  _renderCertifications(certifications) {
    if (!certifications || !Array.isArray(certifications) || certifications.length === 0) {
      return '<p>Keine Zertifizierungen gefunden</p>';
    }
    
    return `
      <ul class="list-group">
        ${certifications.map(cert => `
          <li class="list-group-item">
            <div class="d-flex w-100 justify-content-between">
              <h5 class="mb-1">${cert.name || 'Unbekannte Zertifizierung'}</h5>
              <small>${cert.date || ''}</small>
            </div>
            <p class="mb-1">${cert.issuer || ''}</p>
            ${cert.description ? `<small class="text-muted">${cert.description}</small>` : ''}
          </li>
        `).join('')}
      </ul>
    `;
  }
  
  /**
   * Rendert Verbesserungsvorschläge als HTML
   * @param {Array} improvements - Die Verbesserungsvorschläge
   * @returns {string} - HTML-String
   * @private
   */
  _renderImprovements(improvements) {
    if (!improvements || !Array.isArray(improvements) || improvements.length === 0) {
      return '<p>Keine Verbesserungsvorschläge gefunden</p>';
    }
    
    return `
      <div class="accordion" id="improvementsAccordion">
        ${improvements.map((improvement, index) => `
          <div class="accordion-item">
            <h2 class="accordion-header" id="heading${index}">
              <button class="accordion-button ${index > 0 ? 'collapsed' : ''}" type="button" data-bs-toggle="collapse" data-bs-target="#collapse${index}" aria-expanded="true" aria-controls="collapse${index}">
                ${improvement.title || improvement.category || `Verbesserung ${index + 1}`}
              </button>
            </h2>
            <div id="collapse${index}" class="accordion-collapse collapse ${index === 0 ? 'show' : ''}" aria-labelledby="heading${index}" data-bs-parent="#improvementsAccordion">
              <div class="accordion-body">
                <p>${improvement.description || ''}</p>
                ${improvement.suggestion ? `
                  <div class="alert alert-success">
                    <strong>Vorschlag:</strong> ${improvement.suggestion}
                  </div>
                ` : ''}
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }
  
  /**
   * Generiert Mock-Analyseergebnisse für die Demo
   * @returns {Object} - Die Mock-Analyseergebnisse
   * @private
   */
  _generateMockAnalysis() {
    return {
      personalData: {
        name: "Max Mustermann",
        email: "max.mustermann@example.com",
        phone: "+49 123 4567890",
        address: "Musterstraße 123, 12345 Berlin"
      },
      summary: "Erfahrener Webentwickler mit über 5 Jahren Berufserfahrung in der Entwicklung moderner Webanwendungen mit React, Node.js und verwandten Technologien. Spezialisiert auf die Erstellung benutzerfreundlicher, responsiver und leistungsstarker Frontends.",
      skills: {
        technical: [
          "JavaScript", "TypeScript", "React", "Redux", "Node.js", 
          "Express", "HTML5", "CSS3", "SCSS", "MongoDB", 
          "Git", "RESTful APIs", "GraphQL", "Jest", "Webpack"
        ],
        methodical: [
          "Agile/Scrum", "Test-Driven Development", "CI/CD", 
          "UX/UI Design", "Responsive Design", "Performance Optimization"
        ],
        social: [
          "Teamarbeit", "Kommunikation", "Problemlösung", 
          "Zeitmanagement", "Kundenorientierung"
        ]
      },
      workExperience: [
        {
          position: "Senior Frontend-Entwickler",
          company: "WebTech Solutions GmbH",
          location: "Berlin",
          period: "2020 - Heute",
          description: "Leitung der Frontend-Entwicklung für verschiedene E-Commerce-Projekte. Implementierung moderner React-Anwendungen mit Fokus auf Performance und Benutzerfreundlichkeit."
        },
        {
          position: "Frontend-Entwickler",
          company: "Digital Solutions AG",
          location: "Hamburg",
          period: "2018 - 2020",
          description: "Entwicklung und Wartung von Kundenwebsites und -anwendungen. Umsetzung von responsiven Designs und Implementierung von interaktiven Elementen mit JavaScript."
        }
      ],
      education: [
        {
          degree: "Master of Science in Informatik",
          institution: "Technische Universität Berlin",
          location: "Berlin",
          period: "2016 - 2018",
          focus: "Web-Entwicklung und Mensch-Computer-Interaktion"
        },
        {
          degree: "Bachelor of Science in Medieninformatik",
          institution: "Universität Hamburg",
          location: "Hamburg",
          period: "2013 - 2016"
        }
      ],
      languages: [
        { language: "Deutsch", level: "Muttersprache" },
        { language: "Englisch", level: "Fließend (C1)" },
        { language: "Französisch", level: "Grundkenntnisse (A2)" }
      ],
      projects: [
        {
          title: "E-Commerce-Plattform",
          period: "2021",
          description: "Entwicklung einer modernen E-Commerce-Plattform mit React.js und Node.js.",
          technologies: ["React.js", "Redux", "Node.js", "Express", "MongoDB"]
        },
        {
          title: "Intranet-Portal",
          period: "2019",
          description: "Konzeption und Umsetzung eines Unternehmens-Intranets für interne Kommunikation und Ressourcenverwaltung.",
          technologies: ["Angular", "TypeScript", "Firebase", "Material Design"]
        }
      ],
      certifications: [
        {
          name: "React.js Zertifizierung",
          issuer: "Web Development Academy",
          date: "2020"
        },
        {
          name: "Scrum Master Certified",
          issuer: "Scrum Alliance",
          date: "2019"
        }
      ],
      improvements: [
        {
          category: "Format",
          title: "Übersichtlichere Struktur",
          description: "Ihr Lebenslauf könnte von einer klareren Struktur profitieren, die wichtige Informationen hervorhebt.",
          suggestion: "Verwenden Sie Abschnitte mit klaren Überschriften und Aufzählungspunkte für Schlüsselqualifikationen und Erfolge."
        },
        {
          category: "Inhalt",
          title: "Quantifizieren Sie Ihre Erfolge",
          description: "Ihre Beschreibungen könnten von konkreten Zahlen und Ergebnissen profitieren.",
          suggestion: "Fügen Sie messbare Erfolge hinzu, z.B. 'Verbesserte die Ladezeit der Website um 40%' oder 'Reduzierte Fehler um 25%'."
        },
        {
          category: "Fähigkeiten",
          title: "Fähigkeiten priorisieren",
          description: "Die Liste Ihrer technischen Fähigkeiten ist umfangreich, aber es fehlt eine klare Priorisierung.",
          suggestion: "Organisieren Sie Ihre Fähigkeiten nach Kompetenzlevel und Relevanz für die angestrebte Position."
        }
      ]
    };
  }
  
  /**
   * Exportiert die Analyseergebnisse als JSON-Datei
   * @param {Object} results - Die zu exportierenden Ergebnisse
   * @private
   */
  _exportResults(results) {
    if (!results) return;
    
    try {
      // Dateinamen erstellen
      const dateStr = new Date().toISOString().slice(0, 10);
      const fileName = `Lebenslaufanalyse_${dateStr}.json`;
      
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
      
      app.showToast('Analyse erfolgreich exportiert', 'Erfolg', 'success');
    } catch (error) {
      console.error('Fehler beim Exportieren der Analyse:', error);
      app.showToast('Fehler beim Exportieren', 'Fehler', 'danger');
    }
  }
  
  /**
   * Speichert die Analyseergebnisse im Benutzerprofil
   * @param {Object} results - Die zu speichernden Ergebnisse
   * @private
   */
  _saveToProfile(results) {
    if (!results) return;
    
    // Prüfe, ob ein Benutzer angemeldet ist
    const user = firebase.auth().currentUser;
    if (!user) {
      app.showToast('Bitte melden Sie sich an, um die Analyse zu speichern', 'Hinweis', 'warning');
      
      // Zeige das Login-Modal
      const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
      loginModal.show();
      
      return;
    }
    
    try {
      // Speichere in Firestore
      const timestamp = firebase.firestore.FieldValue.serverTimestamp();
      
      db.collection('users').doc(user.uid)
        .collection('analyses').add({
          type: 'resume',
          result: results,
          fileName: this.lastAnalyzedFile?.name || '',
          fileType: this.lastAnalyzedFile?.type || '',
          timestamp: timestamp
        })
        .then(() => {
          app.showToast('Analyse erfolgreich im Profil gespeichert', 'Erfolg', 'success');
        })
        .catch(error => {
          console.error('Fehler beim Speichern in Firestore:', error);
          app.showToast('Fehler beim Speichern', 'Fehler', 'danger');
        });
    } catch (error) {
      console.error('Fehler beim Speichern der Analyse:', error);
      app.showToast('Fehler beim Speichern', 'Fehler', 'danger');
    }
  }
}

// Globale Instanz erstellen, wenn die Seite geladen ist
document.addEventListener('DOMContentLoaded', () => {
  window.resumeAnalyzer = new ResumeAnalyzer();
}); 
