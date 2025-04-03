/**
 * Dashboard-Funktionalität für den KI-Bewerbungsmanager
 */

class Dashboard {
  constructor() {
    // Firebase-Referenzen
    this.auth = firebase.auth();
    this.db = firebase.firestore();
    
    // DOM-Elemente: Übergeordnete Bereiche
    this.loginRequestSection = document.getElementById('loginRequestSection');
    this.dashboardContent = document.getElementById('dashboardContent');
    
    // DOM-Elemente: Zähler
    this.totalApplications = document.getElementById('totalApplications');
    this.interviewsCount = document.getElementById('interviewsCount');
    this.pendingCount = document.getElementById('pendingCount');
    this.rejectedCount = document.getElementById('rejectedCount');
    
    // DOM-Elemente: Filter und Suche
    this.statusFilter = document.getElementById('statusFilter');
    this.sortOrder = document.getElementById('sortOrder');
    this.searchInput = document.getElementById('searchInput');
    
    // DOM-Elemente: Tabellen und Container
    this.applicationsTableBody = document.getElementById('applicationsTableBody');
    this.analysesContainer = document.getElementById('analysesContainer');
    this.lettersContainer = document.getElementById('lettersContainer');
    
    // DOM-Elemente: Leer-Zustände
    this.noApplicationsMessage = document.getElementById('noApplicationsMessage');
    this.noAnalysesMessage = document.getElementById('noAnalysesMessage');
    this.noLettersMessage = document.getElementById('noLettersMessage');
    
    // DOM-Elemente: Buttons
    this.addApplicationBtn = document.getElementById('addApplicationBtn');
    this.addFirstApplicationBtn = document.getElementById('addFirstApplicationBtn');
    this.saveApplicationBtn = document.getElementById('saveApplicationBtn');
    this.confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    this.loginRequestBtn = document.getElementById('loginRequestBtn');
    
    // DOM-Elemente: Modals
    this.applicationModal = new bootstrap.Modal(document.getElementById('applicationModal'));
    this.deleteApplicationModal = new bootstrap.Modal(document.getElementById('deleteApplicationModal'));
    
    // Formular für Bewerbungen
    this.applicationForm = document.getElementById('applicationForm');
    this.applicationId = document.getElementById('applicationId');
    this.deleteApplicationId = document.getElementById('deleteApplicationId');
    
    // Daten
    this.applications = [];
    this.analyses = [];
    this.letters = [];
    this.filteredApplications = [];
    
    // Charts
    this.statusChart = null;
    this.timelineChart = null;
    this.positionChart = null;
    
    // Event-Listener einrichten
    this.setupEventListeners();
    
    // Authentifizierungsstatus prüfen
    this.auth.onAuthStateChanged(this.handleAuthStateChanged.bind(this));
    
    console.log('Dashboard initialisiert');
  }
  
  /**
   * Event-Listener einrichten
   */
  setupEventListeners() {
    // Filter und Suche
    this.statusFilter?.addEventListener('change', () => this.applyFilters());
    this.sortOrder?.addEventListener('change', () => this.applyFilters());
    this.searchInput?.addEventListener('input', utils.debounce(() => this.applyFilters(), 300));
    
    // Buttons für neue Bewerbung
    this.addApplicationBtn?.addEventListener('click', () => this.showAddApplicationModal());
    this.addFirstApplicationBtn?.addEventListener('click', () => this.showAddApplicationModal());
    
    // Speichern-Button im Modal
    this.saveApplicationBtn?.addEventListener('click', () => this.saveApplication());
    
    // Löschen-Button im Modal
    this.confirmDeleteBtn?.addEventListener('click', () => this.deleteApplication());
    
    // Anmelde-Button
    this.loginRequestBtn?.addEventListener('click', () => {
      const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
      loginModal.show();
    });
    
    // Tab-Wechsel-Event für Chart-Rendering
    document.querySelectorAll('button[data-bs-toggle="tab"]').forEach(tab => {
      tab.addEventListener('shown.bs.tab', (e) => {
        if (e.target.id === 'stats-tab') {
          this.renderCharts();
        }
      });
    });
  }
  
  /**
   * Authentifizierungsstatus-Handler
   * @param {Object} user - Der angemeldete Benutzer oder null
   */
  handleAuthStateChanged(user) {
    if (user) {
      // Benutzer ist angemeldet
      this.loginRequestSection.classList.add('d-none');
      this.dashboardContent.classList.remove('d-none');
      
      // Daten laden
      this.loadApplications();
      this.loadAnalyses();
      this.loadLetters();
    } else {
      // Benutzer ist nicht angemeldet
      this.loginRequestSection.classList.remove('d-none');
      this.dashboardContent.classList.add('d-none');
    }
  }
  
  /**
   * Bewerbungen aus Firestore laden
   */
  async loadApplications() {
    const user = this.auth.currentUser;
    if (!user) return;
    
    try {
      const snapshot = await this.db.collection('users').doc(user.uid)
        .collection('applications')
        .orderBy('applicationDate', 'desc')
        .get();
      
      this.applications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      this.filteredApplications = [...this.applications];
      
      // UI aktualisieren
      this.updateCounters();
      this.renderApplications();
      
      console.log('Bewerbungen geladen:', this.applications.length);
    } catch (error) {
      console.error('Fehler beim Laden der Bewerbungen:', error);
      app.showToast('Fehler beim Laden der Bewerbungen', 'Fehler', 'danger');
    }
  }
  
  /**
   * Lebenslaufanalysen aus Firestore laden
   */
  async loadAnalyses() {
    const user = this.auth.currentUser;
    if (!user) return;
    
    try {
      const snapshot = await this.db.collection('users').doc(user.uid)
        .collection('analyses')
        .orderBy('timestamp', 'desc')
        .get();
      
      this.analyses = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // UI aktualisieren
      this.renderAnalyses();
      
      console.log('Analysen geladen:', this.analyses.length);
    } catch (error) {
      console.error('Fehler beim Laden der Analysen:', error);
      app.showToast('Fehler beim Laden der Analysen', 'Fehler', 'danger');
    }
  }
  
  /**
   * Anschreiben aus Firestore laden
   */
  async loadLetters() {
    const user = this.auth.currentUser;
    if (!user) return;
    
    try {
      const snapshot = await this.db.collection('users').doc(user.uid)
        .collection('coverLetters')
        .orderBy('timestamp', 'desc')
        .get();
      
      this.letters = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // UI aktualisieren
      this.renderLetters();
      
      console.log('Anschreiben geladen:', this.letters.length);
    } catch (error) {
      console.error('Fehler beim Laden der Anschreiben:', error);
      app.showToast('Fehler beim Laden der Anschreiben', 'Fehler', 'danger');
    }
  }
  
  /**
   * Bewerbungszähler aktualisieren
   */
  updateCounters() {
    if (!this.applications) return;
    
    const total = this.applications.length;
    let interviews = 0;
    let pending = 0;
    let rejected = 0;
    
    this.applications.forEach(app => {
      if (app.status === 'interview') interviews++;
      if (app.status === 'applied') pending++;
      if (app.status === 'rejected') rejected++;
    });
    
    if (this.totalApplications) this.totalApplications.textContent = total;
    if (this.interviewsCount) this.interviewsCount.textContent = interviews;
    if (this.pendingCount) this.pendingCount.textContent = pending;
    if (this.rejectedCount) this.rejectedCount.textContent = rejected;
  }
  
  /**
   * Filter auf Bewerbungen anwenden
   */
  applyFilters() {
    // Status-Filter
    const status = this.statusFilter.value;
    let filtered = this.applications;
    
    if (status !== 'all') {
      filtered = filtered.filter(app => app.status === status);
    }
    
    // Suchfilter
    const searchTerm = this.searchInput.value.toLowerCase().trim();
    if (searchTerm) {
      filtered = filtered.filter(app => 
        app.company?.toLowerCase().includes(searchTerm) || 
        app.position?.toLowerCase().includes(searchTerm) ||
        app.location?.toLowerCase().includes(searchTerm)
      );
    }
    
    // Sortierung
    const sort = this.sortOrder.value;
    switch (sort) {
      case 'date_desc':
        filtered.sort((a, b) => new Date(b.applicationDate) - new Date(a.applicationDate));
        break;
      case 'date_asc':
        filtered.sort((a, b) => new Date(a.applicationDate) - new Date(b.applicationDate));
        break;
      case 'company_asc':
        filtered.sort((a, b) => a.company?.localeCompare(b.company || '') || 0);
        break;
      case 'company_desc':
        filtered.sort((a, b) => b.company?.localeCompare(a.company || '') || 0);
        break;
    }
    
    this.filteredApplications = filtered;
    this.renderApplications();
  }
  
  /**
   * Bewerbungen in der Tabelle anzeigen
   */
  renderApplications() {
    if (!this.applicationsTableBody) return;
    
    // Tabelle leeren
    this.applicationsTableBody.innerHTML = '';
    
    if (this.filteredApplications.length === 0) {
      // Keine Bewerbungen vorhanden oder gefiltert
      if (this.applications.length === 0) {
        // Keine Bewerbungen vorhanden
        this.noApplicationsMessage?.classList.remove('d-none');
      } else {
        // Keine Ergebnisse für Filter
        const searchTerm = this.searchInput.value.trim();
        const statusFilter = this.statusFilter.value;
        
        let message = 'Keine Bewerbungen gefunden';
        if (searchTerm && statusFilter !== 'all') {
          message = `Keine Bewerbungen gefunden für "${searchTerm}" mit Status "${this._getStatusLabel(statusFilter)}"`;
        } else if (searchTerm) {
          message = `Keine Bewerbungen gefunden für "${searchTerm}"`;
        } else if (statusFilter !== 'all') {
          message = `Keine Bewerbungen mit Status "${this._getStatusLabel(statusFilter)}"`;
        }
        
        this.applicationsTableBody.innerHTML = `
          <tr>
            <td colspan="6" class="text-center py-4">
              <div class="alert alert-info mb-0">
                ${message}
              </div>
            </td>
          </tr>
        `;
      }
      return;
    }
    
    // Bewerbungen anzeigen
    this.noApplicationsMessage?.classList.add('d-none');
    
    this.filteredApplications.forEach(app => {
      const tr = document.createElement('tr');
      
      // Status-Badge einfärben
      let statusBadgeClass = 'bg-secondary';
      let statusLabel = 'Unbekannt';
      
      switch (app.status) {
        case 'applied':
          statusBadgeClass = 'bg-primary';
          statusLabel = 'Beworben';
          break;
        case 'interview':
          statusBadgeClass = 'bg-info';
          statusLabel = 'Vorstellungsgespräch';
          break;
        case 'offered':
          statusBadgeClass = 'bg-success';
          statusLabel = 'Angebot erhalten';
          break;
        case 'rejected':
          statusBadgeClass = 'bg-danger';
          statusLabel = 'Abgelehnt';
          break;
        case 'accepted':
          statusBadgeClass = 'bg-warning text-dark';
          statusLabel = 'Angenommen';
          break;
      }
      
      const formattedDate = app.applicationDate ? utils.formatDate(app.applicationDate) : '-';
      
      tr.innerHTML = `
        <td>${app.company || '-'}</td>
        <td>${app.position || '-'}</td>
        <td>${formattedDate}</td>
        <td>${app.location || '-'}</td>
        <td>
          <span class="badge ${statusBadgeClass}">${statusLabel}</span>
        </td>
        <td>
          <div class="btn-group">
            <button class="btn btn-sm btn-outline-primary edit-btn" data-id="${app.id}">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger delete-btn" data-id="${app.id}">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </td>
      `;
      
      // Event-Listener für Buttons
      const editBtn = tr.querySelector('.edit-btn');
      const deleteBtn = tr.querySelector('.delete-btn');
      
      editBtn.addEventListener('click', () => this.showEditApplicationModal(app.id));
      deleteBtn.addEventListener('click', () => this.showDeleteApplicationModal(app.id));
      
      this.applicationsTableBody.appendChild(tr);
    });
  }
  
  /**
   * Lebenslaufanalysen anzeigen
   */
  renderAnalyses() {
    if (!this.analysesContainer) return;
    
    // Container leeren
    this.analysesContainer.innerHTML = '';
    
    if (this.analyses.length === 0) {
      // Keine Analysen vorhanden
      this.noAnalysesMessage?.classList.remove('d-none');
      return;
    }
    
    // Analysen anzeigen
    this.noAnalysesMessage?.classList.add('d-none');
    
    this.analyses.forEach(analysis => {
      const card = document.createElement('div');
      card.className = 'col-md-6 col-lg-4 mb-4';
      
      const formattedDate = analysis.timestamp ? utils.formatTimestamp(analysis.timestamp) : 'Unbekanntes Datum';
      const fileName = analysis.fileName || 'Lebenslauf-Analyse';
      
      card.innerHTML = `
        <div class="card h-100">
          <div class="card-header d-flex justify-content-between align-items-center">
            <h5 class="mb-0">Lebenslaufanalyse</h5>
            <small class="text-muted">${formattedDate}</small>
          </div>
          <div class="card-body">
            <p><strong>Datei:</strong> ${fileName}</p>
            ${analysis.result && analysis.result.overallScore ? `
              <div class="d-flex align-items-center mb-3">
                <div class="match-score">${analysis.result.overallScore}%</div>
                <div class="match-label">Gesamtbewertung</div>
              </div>
              <div class="progress mb-3">
                <div class="progress-bar bg-${this._getScoreColorClass(analysis.result.overallScore)}" 
                     role="progressbar" style="width: ${analysis.result.overallScore}%" 
                     aria-valuenow="${analysis.result.overallScore}" aria-valuemin="0" aria-valuemax="100"></div>
              </div>
            ` : ''}
            <div class="d-grid">
              <button class="btn btn-outline-primary view-analysis-btn" data-id="${analysis.id}">
                Details anzeigen
              </button>
            </div>
          </div>
        </div>
      `;
      
      const viewBtn = card.querySelector('.view-analysis-btn');
      viewBtn.addEventListener('click', () => {
        // In der Praxis: Navigation zur Detailseite oder Modal öffnen
        sessionStorage.setItem('viewAnalysis', analysis.id);
        window.location.href = 'resume-analysis.html';
      });
      
      this.analysesContainer.appendChild(card);
    });
  }
  
  /**
   * Anschreiben anzeigen
   */
  renderLetters() {
    if (!this.lettersContainer) return;
    
    // Container leeren
    this.lettersContainer.innerHTML = '';
    
    if (this.letters.length === 0) {
      // Keine Anschreiben vorhanden
      this.noLettersMessage?.classList.remove('d-none');
      return;
    }
    
    // Anschreiben anzeigen
    this.noLettersMessage?.classList.add('d-none');
    
    this.letters.forEach(letter => {
      const card = document.createElement('div');
      card.className = 'col-md-6 col-lg-4 mb-4';
      
      const formattedDate = letter.timestamp ? utils.formatTimestamp(letter.timestamp) : 'Unbekanntes Datum';
      
      // Informationen für den Titel zusammenstellen
      let titleInfo = '';
      if (letter.jobInfo && letter.jobInfo.fileName) {
        titleInfo = `für ${letter.jobInfo.fileName}`;
      } else if (letter.preferences && letter.preferences.companyInfo && letter.preferences.companyInfo.name) {
        titleInfo = `für ${letter.preferences.companyInfo.name}`;
      }
      
      card.innerHTML = `
        <div class="card h-100">
          <div class="card-header d-flex justify-content-between align-items-center">
            <h5 class="mb-0">Anschreiben${titleInfo ? ' ' + titleInfo : ''}</h5>
            <small class="text-muted">${formattedDate}</small>
          </div>
          <div class="card-body">
            <div class="letter-preview-small p-3 border rounded mb-3" style="max-height: 150px; overflow: hidden;">
              ${letter.content ? letter.content.substring(0, 200) + '...' : 'Keine Vorschau verfügbar'}
            </div>
            <div class="d-grid">
              <button class="btn btn-outline-primary view-letter-btn" data-id="${letter.id}">
                Vollständig anzeigen
              </button>
            </div>
          </div>
        </div>
      `;
      
      const viewBtn = card.querySelector('.view-letter-btn');
      viewBtn.addEventListener('click', () => {
        // In der Praxis: Navigation zur Detailseite oder Modal öffnen
        sessionStorage.setItem('viewLetter', letter.id);
        window.location.href = 'cover-letter.html';
      });
      
      this.lettersContainer.appendChild(card);
    });
  }
  
  /**
   * Rendert die Statistik-Charts
   */
  renderCharts() {
    // Sicherstellen, dass wir die richtigen Canvas-Elemente haben
    const statusChartCanvas = document.getElementById('statusChart');
    const timelineChartCanvas = document.getElementById('timelineChart');
    const positionChartCanvas = document.getElementById('positionChart');
    
    if (!statusChartCanvas || !timelineChartCanvas || !positionChartCanvas) return;
    
    // Status-Verteilung
    this.renderStatusChart(statusChartCanvas);
    
    // Zeitlicher Verlauf
    this.renderTimelineChart(timelineChartCanvas);
    
    // Erfolgsquote nach Position
    this.renderPositionChart(positionChartCanvas);
  }
  
  /**
   * Rendert das Status-Verteilungs-Chart
   * @param {HTMLCanvasElement} canvas - Das Canvas-Element für das Chart
   */
  renderStatusChart(canvas) {
    // Bestehende Instanz zerstören, falls vorhanden
    if (this.statusChart) {
      this.statusChart.destroy();
    }
    
    // Daten vorbereiten
    const statusCounts = {
      applied: 0,
      interview: 0,
      offered: 0,
      rejected: 0,
      accepted: 0
    };
    
    this.applications.forEach(app => {
      if (statusCounts[app.status] !== undefined) {
        statusCounts[app.status]++;
      }
    });
    
    const statusLabels = {
      applied: 'Beworben',
      interview: 'Vorstellungsgespräch',
      offered: 'Angebot erhalten',
      rejected: 'Abgelehnt',
      accepted: 'Angenommen'
    };
    
    const statusColors = {
      applied: '#2e5bff',
      interview: '#17a2b8',
      offered: '#28a745',
      rejected: '#dc3545',
      accepted: '#ffc107'
    };
    
    // Chart erstellen
    this.statusChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: Object.keys(statusCounts).map(key => statusLabels[key]),
        datasets: [{
          data: Object.values(statusCounts),
          backgroundColor: Object.keys(statusCounts).map(key => statusColors[key])
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom'
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.raw || 0;
                const dataset = context.dataset || {};
                const total = dataset.data.reduce((acc, data) => acc + data, 0);
                const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                return `${label}: ${value} (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  }
  
  /**
   * Rendert das Zeitachsen-Chart
   * @param {HTMLCanvasElement} canvas - Das Canvas-Element für das Chart
   */
  renderTimelineChart(canvas) {
    // Bestehende Instanz zerstören, falls vorhanden
    if (this.timelineChart) {
      this.timelineChart.destroy();
    }
    
    // Daten vorbereiten
    const monthlyData = {};
    
    // Annahme: applicationDate ist ein ISO-Datumsstring "YYYY-MM-DD"
    this.applications.forEach(app => {
      if (!app.applicationDate) return;
      
      const date = new Date(app.applicationDate);
      const monthYear = date.toLocaleString('de-DE', { month: 'long', year: 'numeric' });
      
      if (!monthlyData[monthYear]) {
        monthlyData[monthYear] = { count: 0, date };
      }
      
      monthlyData[monthYear].count++;
    });
    
    // Nach Datum sortieren
    const sortedMonths = Object.keys(monthlyData).sort((a, b) => 
      monthlyData[a].date - monthlyData[b].date
    );
    
    // Chart erstellen
    this.timelineChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: sortedMonths,
        datasets: [{
          label: 'Bewerbungen',
          data: sortedMonths.map(month => monthlyData[month].count),
          backgroundColor: 'rgba(46, 91, 255, 0.2)',
          borderColor: 'rgba(46, 91, 255, 1)',
          borderWidth: 2,
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0
            },
            title: {
              display: true,
              text: 'Anzahl der Bewerbungen'
            }
          }
        }
      }
    });
  }
  
  /**
   * Rendert das Positions-Erfolgsquoten-Chart
   * @param {HTMLCanvasElement} canvas - Das Canvas-Element für das Chart
   */
  renderPositionChart(canvas) {
    // Bestehende Instanz zerstören, falls vorhanden
    if (this.positionChart) {
      this.positionChart.destroy();
    }
    
    // Daten vorbereiten: Gruppierung nach Position
    const positionData = {};
    
    this.applications.forEach(app => {
      if (!app.position) return;
      
      if (!positionData[app.position]) {
        positionData[app.position] = {
          total: 0,
          interviews: 0,
          offers: 0
        };
      }
      
      positionData[app.position].total++;
      
      if (app.status === 'interview' || app.status === 'offered' || app.status === 'accepted') {
        positionData[app.position].interviews++;
      }
      
      if (app.status === 'offered' || app.status === 'accepted') {
        positionData[app.position].offers++;
      }
    });
    
    // Nur Positionen mit mindestens 2 Bewerbungen anzeigen
    const relevantPositions = Object.keys(positionData)
      .filter(position => positionData[position].total >= 2)
      .sort((a, b) => positionData[b].total - positionData[a].total);
    
    // Maximal 8 Positionen anzeigen, um die Lesbarkeit zu gewährleisten
    const topPositions = relevantPositions.slice(0, 8);
    
    // Erfolgsraten berechnen
    const interviewRates = topPositions.map(position => {
      const { total, interviews } = positionData[position];
      return total > 0 ? (interviews / total) * 100 : 0;
    });
    
    const offerRates = topPositions.map(position => {
      const { total, offers } = positionData[position];
      return total > 0 ? (offers / total) * 100 : 0;
    });
    
    // Chart erstellen
    this.positionChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: topPositions,
        datasets: [
          {
            label: 'Interview-Rate (%)',
            data: interviewRates,
            backgroundColor: '#17a2b8'
          },
          {
            label: 'Angebots-Rate (%)',
            data: offerRates,
            backgroundColor: '#28a745'
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom'
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `${context.dataset.label}: ${context.raw.toFixed(1)}%`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            title: {
              display: true,
              text: 'Erfolgsrate (%)'
            }
          }
        }
      }
    });
  }
  
  /**
   * Modal zum Hinzufügen einer neuen Bewerbung anzeigen
   */
  showAddApplicationModal() {
    // Formular zurücksetzen
    this.applicationForm.reset();
    this.applicationId.value = '';
    
    // Heutiges Datum als Standard setzen
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('applicationDate').value = today;
    
    // Modal-Titel setzen
    document.getElementById('applicationModalLabel').textContent = 'Neue Bewerbung hinzufügen';
    
    // Modal anzeigen
    this.applicationModal.show();
  }
  
  /**
   * Modal zum Bearbeiten einer Bewerbung anzeigen
   * @param {string} id - Die ID der zu bearbeitenden Bewerbung
   */
  showEditApplicationModal(id) {
    // Bewerbung finden
    const application = this.applications.find(app => app.id === id);
    if (!application) return;
    
    // Formular mit Daten füllen
    this.applicationId.value = id;
    document.getElementById('companyName').value = application.company || '';
    document.getElementById('positionName').value = application.position || '';
    document.getElementById('applicationDate').value = application.applicationDate || '';
    document.getElementById('applicationStatus').value = application.status || 'applied';
    document.getElementById('jobLocation').value = application.location || '';
    document.getElementById('jobDescription').value = application.description || '';
    document.getElementById('applicationNotes').value = application.notes || '';
    document.getElementById('contactPerson').value = application.contactPerson || '';
    document.getElementById('contactEmail').value = application.contactEmail || '';
    
    // Modal-Titel setzen
    document.getElementById('applicationModalLabel').textContent = 'Bewerbung bearbeiten';
    
    // Modal anzeigen
    this.applicationModal.show();
  }
  
  /**
   * Modal zum Löschen einer Bewerbung anzeigen
   * @param {string} id - Die ID der zu löschenden Bewerbung
   */
  showDeleteApplicationModal(id) {
    this.deleteApplicationId.value = id;
    this.deleteApplicationModal.show();
  }
  
  /**
   * Bewerbung speichern
   */
  async saveApplication() {
    const user = this.auth.currentUser;
    if (!user) {
      app.showToast('Bitte melden Sie sich an, um Bewerbungen zu speichern', 'Hinweis', 'warning');
      return;
    }
    
    // Formulardaten abrufen
    const id = this.applicationId.value;
    const isNewApplication = !id;
    
    const applicationData = {
      company: document.getElementById('companyName').value,
      position: document.getElementById('positionName').value,
      applicationDate: document.getElementById('applicationDate').value,
      status: document.getElementById('applicationStatus').value,
      location: document.getElementById('jobLocation').value,
      description: document.getElementById('jobDescription').value,
      notes: document.getElementById('applicationNotes').value,
      contactPerson: document.getElementById('contactPerson').value,
      contactEmail: document.getElementById('contactEmail').value
    };
    
    try {
      // Bewerbung in Firestore speichern
      let docRef;
      
      if (isNewApplication) {
        // Timestamp für neue Bewerbungen hinzufügen
        applicationData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        
        docRef = await this.db.collection('users').doc(user.uid)
          .collection('applications').add(applicationData);
      } else {
        // Timestamp für aktualisierte Bewerbungen hinzufügen
        applicationData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
        
        docRef = this.db.collection('users').doc(user.uid)
          .collection('applications').doc(id);
          
        await docRef.update(applicationData);
      }
      
      // Modal schließen
      this.applicationModal.hide();
      
      // Toast-Nachricht anzeigen
      const message = isNewApplication ? 'Bewerbung erfolgreich hinzugefügt' : 'Bewerbung erfolgreich aktualisiert';
      app.showToast(message, 'Erfolg', 'success');
      
      // Daten neu laden
      await this.loadApplications();
    } catch (error) {
      console.error('Fehler beim Speichern der Bewerbung:', error);
      app.showToast('Fehler beim Speichern der Bewerbung', 'Fehler', 'danger');
    }
  }
  
  /**
   * Bewerbung löschen
   */
  async deleteApplication() {
    const user = this.auth.currentUser;
    if (!user) {
      app.showToast('Bitte melden Sie sich an, um Bewerbungen zu verwalten', 'Hinweis', 'warning');
      return;
    }
    
    const id = this.deleteApplicationId.value;
    if (!id) return;
    
    try {
      // Bewerbung in Firestore löschen
      await this.db.collection('users').doc(user.uid)
        .collection('applications').doc(id).delete();
      
      // Modal schließen
      this.deleteApplicationModal.hide();
      
      // Toast-Nachricht anzeigen
      app.showToast('Bewerbung erfolgreich gelöscht', 'Erfolg', 'success');
      
      // Daten neu laden
      await this.loadApplications();
    } catch (error) {
      console.error('Fehler beim Löschen der Bewerbung:', error);
      app.showToast('Fehler beim Löschen der Bewerbung', 'Fehler', 'danger');
    }
  }
  
  /**
   * Gibt den lesbaren Status-Label zurück
   * @param {string} status - Der Status-Code
   * @returns {string} - Das lesbare Label
   * @private
   */
  _getStatusLabel(status) {
    const statusMap = {
      applied: 'Beworben',
      interview: 'Vorstellungsgespräch',
      offered: 'Angebot erhalten',
      rejected: 'Abgelehnt',
      accepted: 'Angenommen'
    };
    
    return statusMap[status] || 'Unbekannt';
  }
  
  /**
   * Bestimmt die Farb-Klasse basierend auf dem Score
   * @param {number} score - Der Score (0-100)
   * @returns {string} - Die Bootstrap-Farb-Klasse
   * @private
   */
  _getScoreColorClass(score) {
    if (score >= 80) return 'success';
    if (score >= 60) return 'info';
    if (score >= 40) return 'warning';
    return 'danger';
  }
}

// Globale Instanz erstellen, wenn die Seite geladen ist
document.addEventListener('DOMContentLoaded', () => {
  // Nur auf der Dashboard-Seite initialisieren
  if (document.getElementById('dashboardPage')) {
    window.dashboard = new Dashboard();
  }
}); 