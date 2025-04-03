/**
 * Controller für das Bewerbungs-Dashboard
 * Verarbeitet und visualisiert die Bewerbungsdaten
 */

import optimizedServices from './optimized-services.js';

class DashboardController {
    constructor() {
        this.profileManager = optimizedServices.profileManager;
        this.documentAnalyzer = optimizedServices.documentAnalyzer;
        this.textEnhancer = optimizedServices.textEnhancer;
        
        // Visualisierungselemente
        this.charts = {
            activity: null,
            status: null,
            skills: null
        };
        
        // Daten
        this.applications = [];
        this.skillsData = {
            requested: {},
            matched: {}
        };
        
        // Status-Mapping
        this.statusColors = {
            'eingereicht': '#4e73df', // primary
            'gespräch': '#1cc88a', // success
            'zusage': '#36b9cc', // info
            'absage': '#e74a3b', // danger
            'abgebrochen': '#f6c23e', // warning
            'wartend': '#858796' // secondary
        };
    }
    
    /**
     * Initialisiert das Dashboard und lädt die Daten
     */
    async initialize() {
        console.log('Initialisiere Dashboard...');
        
        // Lade Daten
        await this.loadData();
        
        // Initialisiere Charts
        this.initCharts();
        
        // Aktualisiere UI
        this.updateStatistics();
        this.updateApplicationsTable();
        this.updateTopSkills();
        
        // Füge Event-Listener hinzu
        this.setupEventListeners();
        
        console.log('Dashboard initialisiert');
    }
    
    /**
     * Lädt alle Daten aus dem ProfileManager
     */
    async loadData() {
        try {
            // Lade gespeicherte Bewerbungen
            const profile = this.profileManager.profile;
            
            if (profile && profile.applications && Array.isArray(profile.applications)) {
                this.applications = profile.applications;
                console.log(`${this.applications.length} Bewerbungen geladen`);
            } else {
                this.applications = [];
                console.log('Keine gespeicherten Bewerbungen gefunden');
            }
            
            // Analysiere Skills
            this.analyzeSkills();
        } catch (error) {
            console.error('Fehler beim Laden der Daten:', error);
            
            // Zeige Fehler an
            this.showToast('Fehler beim Laden der Daten: ' + error.message, 'danger');
        }
    }
    
    /**
     * Analysiert die Skills aus den Bewerbungen
     */
    analyzeSkills() {
        // Reset
        this.skillsData = {
            requested: {},
            matched: {}
        };
        
        // Analysiere Skills
        for (const app of this.applications) {
            // Sammle angeforderte Skills aus Stellenanzeigen
            if (app.jobPosting && app.jobPosting.requirements) {
                const skills = app.jobPosting.requirements.skills || [];
                for (const skill of skills) {
                    this.skillsData.requested[skill] = (this.skillsData.requested[skill] || 0) + 1;
                }
            }
            
            // Sammle Skills aus Matching-Ergebnissen
            if (app.matching && app.matching.skills) {
                const matchingSkills = app.matching.skills.matching || [];
                for (const skill of matchingSkills) {
                    this.skillsData.matched[skill] = (this.skillsData.matched[skill] || 0) + 1;
                }
            }
        }
    }
    
    /**
     * Aktualisiert die Statistiken im Dashboard
     */
    updateStatistics() {
        // Berechne Statistiken
        const activeCount = this.applications.filter(app => 
            ['eingereicht', 'gespräch', 'wartend'].includes(app.status)).length;
            
        const interviewCount = this.applications.filter(app => 
            ['gespräch', 'zusage'].includes(app.status)).length;
            
        // Berechne durchschnittlichen Matching-Score
        let totalMatchScore = 0;
        let matchScoreCount = 0;
        
        for (const app of this.applications) {
            if (app.matching && typeof app.matching.overallMatch === 'number') {
                totalMatchScore += app.matching.overallMatch;
                matchScoreCount++;
            }
        }
        
        const avgMatchScore = matchScoreCount > 0 ? Math.round(totalMatchScore / matchScoreCount) : 0;
        
        // Berechne Erfolgsquote (Zusagen / Gesamtbewerbungen)
        const successCount = this.applications.filter(app => app.status === 'zusage').length;
        const completedCount = this.applications.filter(app => 
            ['zusage', 'absage'].includes(app.status)).length;
            
        const successRate = completedCount > 0 ? Math.round((successCount / completedCount) * 100) : 0;
        
        // Aktualisiere UI-Elemente
        document.getElementById('activeApplicationsCount').textContent = activeCount;
        document.getElementById('interviewsCount').textContent = interviewCount;
        document.getElementById('averageMatchingScore').textContent = `${avgMatchScore}%`;
        document.getElementById('successRate').textContent = `${successRate}%`;
        
        // Aktualisiere Progress-Bars
        const totalApps = this.applications.length || 1; // Verhindere Division durch 0
        
        document.getElementById('activeApplicationsProgress').style.width = 
            `${Math.round((activeCount / totalApps) * 100)}%`;
            
        document.getElementById('interviewsProgress').style.width = 
            `${Math.round((interviewCount / totalApps) * 100)}%`;
            
        document.getElementById('averageMatchingProgress').style.width = 
            `${avgMatchScore}%`;
            
        document.getElementById('successRateProgress').style.width = 
            `${successRate}%`;
    }
    
    /**
     * Aktualisiert die Tabelle mit den Bewerbungen
     */
    updateApplicationsTable() {
        const tableBody = document.getElementById('applicationsTableBody');
        
        if (!tableBody) {
            console.error('Tabellenkörper nicht gefunden');
            return;
        }
        
        // Lösche bestehende Einträge
        tableBody.innerHTML = '';
        
        // Sortiere Bewerbungen nach Datum (neueste zuerst)
        const sortedApplications = [...this.applications].sort((a, b) => {
            const dateA = new Date(a.dateApplied || 0);
            const dateB = new Date(b.dateApplied || 0);
            return dateB - dateA;
        });
        
        // Füge Zeilen hinzu
        for (const app of sortedApplications) {
            const row = document.createElement('tr');
            row.dataset.appId = app.id;
            
            const formatDate = date => {
                if (!date) return '-';
                const d = new Date(date);
                return d.toLocaleDateString('de-DE');
            };
            
            const getStatusBadge = status => {
                const statusMap = {
                    'eingereicht': { class: 'primary', text: 'Eingereicht' },
                    'gespräch': { class: 'success', text: 'Gespräch' },
                    'zusage': { class: 'info', text: 'Zusage' },
                    'absage': { class: 'danger', text: 'Absage' },
                    'abgebrochen': { class: 'warning', text: 'Abgebrochen' },
                    'wartend': { class: 'secondary', text: 'Wartend' }
                };
                
                const statusInfo = statusMap[status] || statusMap.wartend;
                
                return `<span class="badge bg-${statusInfo.class}">${statusInfo.text}</span>`;
            };
            
            // Erstelle Zellen
            row.innerHTML = `
                <td>${app.company || '-'}</td>
                <td>${app.position || '-'}</td>
                <td>${formatDate(app.dateApplied)}</td>
                <td>${getStatusBadge(app.status)}</td>
                <td>${app.matching && app.matching.overallMatch ? `${app.matching.overallMatch}%` : '-'}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary view-details-btn" data-app-id="${app.id}">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger delete-app-btn" data-app-id="${app.id}">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;
            
            tableBody.appendChild(row);
        }
        
        // Wenn keine Bewerbungen vorhanden sind
        if (sortedApplications.length === 0) {
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = `
                <td colspan="6" class="text-center">
                    <p class="my-3 text-muted">Keine Bewerbungen vorhanden</p>
                    <button class="btn btn-sm btn-primary" id="addNewApplicationBtn">
                        <i class="bi bi-plus-circle me-2"></i>Neue Bewerbung hinzufügen
                    </button>
                </td>
            `;
            tableBody.appendChild(emptyRow);
        }
    }
    
    /**
     * Aktualisiert die Top-Skills-Anzeige
     */
    updateTopSkills() {
        const container = document.getElementById('topRequestedSkills');
        if (!container) return;
        
        // Lösche bisherigen Inhalt
        container.innerHTML = '';
        
        // Sortiere Skills nach Häufigkeit
        const sortedSkills = Object.entries(this.skillsData.requested)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8); // Zeige nur Top 8
        
        if (sortedSkills.length === 0) {
            container.innerHTML = '<div class="text-muted">Keine Skills gefunden</div>';
            return;
        }
        
        // Erstelle Badges für die Skills
        for (const [skill, count] of sortedSkills) {
            const isMatched = this.skillsData.matched[skill] > 0;
            
            const badge = document.createElement('div');
            badge.className = `skill-badge ${isMatched ? 'matched' : ''}`;
            badge.innerHTML = `
                ${skill} 
                <span class="skill-count">${count}</span>
                ${isMatched ? '<i class="bi bi-check-circle-fill ms-1"></i>' : ''}
            `;
            
            container.appendChild(badge);
        }
    }
    
    /**
     * Initialisiert die Charts
     */
    initCharts() {
        // Aktivitätschart (Liniendiagramm)
        this.initActivityChart();
        
        // Statuschart (Kreisdiagramm)
        this.initStatusChart();
        
        // Skills-Chart (Balkendiagramm)
        this.initSkillsChart();
    }
    
    /**
     * Initialisiert das Aktivitäts-Chart
     */
    initActivityChart() {
        const ctx = document.getElementById('applicationActivityChart');
        if (!ctx) return;
        
        // Sammle Daten für die letzten 6 Monate
        const months = [];
        const submittedData = [];
        const interviewData = [];
        const acceptedData = [];
        
        // Aktuelle Daten erfassen
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthYear = date.toLocaleDateString('de-DE', { month: 'short', year: '2-digit' });
            
            months.push(monthYear);
            
            const monthStart = new Date(date.getFullYear(), date.getMonth(), 1).getTime();
            const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0).getTime();
            
            // Zähle Bewerbungen im jeweiligen Monat
            const submitted = this.applications.filter(app => {
                const appDate = new Date(app.dateApplied).getTime();
                return appDate >= monthStart && appDate <= monthEnd;
            }).length;
            
            const interviews = this.applications.filter(app => {
                if (app.status !== 'gespräch' && app.status !== 'zusage') return false;
                const interviewDate = new Date(app.interviewDate || app.dateApplied).getTime();
                return interviewDate >= monthStart && interviewDate <= monthEnd;
            }).length;
            
            const accepted = this.applications.filter(app => {
                if (app.status !== 'zusage') return false;
                const acceptDate = new Date(app.acceptDate || app.dateApplied).getTime();
                return acceptDate >= monthStart && acceptDate <= monthEnd;
            }).length;
            
            submittedData.push(submitted);
            interviewData.push(interviews);
            acceptedData.push(accepted);
        }
        
        // Erstelle Chart
        if (this.charts.activity) {
            this.charts.activity.destroy();
        }
        
        this.charts.activity = new Chart(ctx, {
            type: 'line',
            data: {
                labels: months,
                datasets: [
                    {
                        label: 'Eingereichte Bewerbungen',
                        data: submittedData,
                        borderColor: this.statusColors.eingereicht,
                        backgroundColor: this.statusColors.eingereicht + '20',
                        tension: 0.3,
                        fill: true
                    },
                    {
                        label: 'Interviews',
                        data: interviewData,
                        borderColor: this.statusColors.gespräch,
                        backgroundColor: this.statusColors.gespräch + '20',
                        tension: 0.3,
                        fill: true
                    },
                    {
                        label: 'Zusagen',
                        data: acceptedData,
                        borderColor: this.statusColors.zusage,
                        backgroundColor: this.statusColors.zusage + '20',
                        tension: 0.3,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }
                }
            }
        });
    }
    
    /**
     * Initialisiert das Status-Chart
     */
    initStatusChart() {
        const ctx = document.getElementById('applicationStatusChart');
        if (!ctx) return;
        
        // Zähle Bewerbungen nach Status
        const statusCounts = {
            'eingereicht': 0,
            'gespräch': 0,
            'zusage': 0,
            'absage': 0,
            'abgebrochen': 0,
            'wartend': 0
        };
        
        for (const app of this.applications) {
            const status = app.status || 'wartend';
            if (statusCounts.hasOwnProperty(status)) {
                statusCounts[status]++;
            } else {
                statusCounts.wartend++;
            }
        }
        
        const labels = [
            'Eingereicht',
            'Im Gespräch',
            'Zusage',
            'Absage',
            'Abgebrochen',
            'Wartend'
        ];
        
        const data = [
            statusCounts.eingereicht,
            statusCounts.gespräch,
            statusCounts.zusage,
            statusCounts.absage,
            statusCounts.abgebrochen,
            statusCounts.wartend
        ];
        
        const backgroundColors = [
            this.statusColors.eingereicht,
            this.statusColors.gespräch,
            this.statusColors.zusage,
            this.statusColors.absage,
            this.statusColors.abgebrochen,
            this.statusColors.wartend
        ];
        
        // Erstelle Chart
        if (this.charts.status) {
            this.charts.status.destroy();
        }
        
        this.charts.status = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: backgroundColors,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'right',
                    }
                },
                cutout: '60%'
            }
        });
    }
    
    /**
     * Initialisiert das Skills-Chart
     */
    initSkillsChart() {
        const ctx = document.getElementById('skillsAnalysisChart');
        if (!ctx) return;
        
        // Sortiere Skills nach Häufigkeit
        const sortedSkills = Object.entries(this.skillsData.requested)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5); // Top 5
        
        const labels = sortedSkills.map(([skill]) => skill);
        const requestedData = sortedSkills.map(([, count]) => count);
        
        // Ermittle Anzahl der zugeordneten Skills
        const matchedData = labels.map(skill => this.skillsData.matched[skill] || 0);
        
        // Erstelle Chart
        if (this.charts.skills) {
            this.charts.skills.destroy();
        }
        
        this.charts.skills = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Gefordert',
                        data: requestedData,
                        backgroundColor: '#4e73df99',
                        borderColor: '#4e73df',
                        borderWidth: 1
                    },
                    {
                        label: 'Im Lebenslauf',
                        data: matchedData,
                        backgroundColor: '#1cc88a99',
                        borderColor: '#1cc88a',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }
                }
            }
        });
    }
    
    /**
     * Richtet die Event-Listener ein
     */
    setupEventListeners() {
        // Aktualisieren-Button
        const refreshBtn = document.getElementById('refreshDashboardBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refresh());
        }
        
        // Export-Buttons
        const exportPDFBtn = document.getElementById('exportPDFBtn');
        if (exportPDFBtn) {
            exportPDFBtn.addEventListener('click', () => this.exportToPDF());
        }
        
        const exportCSVBtn = document.getElementById('exportCSVBtn');
        if (exportCSVBtn) {
            exportCSVBtn.addEventListener('click', () => this.exportToCSV());
        }
        
        // Neue Bewerbung hinzufügen
        document.addEventListener('click', e => {
            if (e.target.id === 'addNewApplicationBtn' || e.target.closest('#addNewApplicationBtn')) {
                this.showNewApplicationModal();
            }
        });
        
        // Details-Buttons
        document.addEventListener('click', e => {
            if (e.target.classList.contains('view-details-btn') || e.target.closest('.view-details-btn')) {
                const btn = e.target.classList.contains('view-details-btn') ? 
                    e.target : e.target.closest('.view-details-btn');
                const appId = btn.dataset.appId;
                if (appId) {
                    this.showApplicationDetails(appId);
                }
            }
        });
        
        // Löschen-Buttons
        document.addEventListener('click', e => {
            if (e.target.classList.contains('delete-app-btn') || e.target.closest('.delete-app-btn')) {
                const btn = e.target.classList.contains('delete-app-btn') ? 
                    e.target : e.target.closest('.delete-app-btn');
                const appId = btn.dataset.appId;
                if (appId) {
                    this.confirmDeleteApplication(appId);
                }
            }
        });
        
        // Suche
        const searchInput = document.getElementById('applicationSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', e => {
                this.filterApplications(e.target.value);
            });
        }
    }
    
    /**
     * Aktualisiert das Dashboard
     */
    async refresh() {
        try {
            await this.loadData();
            this.initCharts();
            this.updateStatistics();
            this.updateApplicationsTable();
            this.updateTopSkills();
            this.showToast('Dashboard erfolgreich aktualisiert', 'success');
        } catch (error) {
            console.error('Fehler beim Aktualisieren des Dashboards:', error);
            this.showToast('Fehler beim Aktualisieren: ' + error.message, 'danger');
        }
    }
    
    /**
     * Filtert die Bewerbungen nach Suchbegriff
     */
    filterApplications(searchTerm) {
        if (!searchTerm) {
            this.updateApplicationsTable();
            return;
        }
        
        searchTerm = searchTerm.toLowerCase();
        
        const tableBody = document.getElementById('applicationsTableBody');
        if (!tableBody) return;
        
        // Durchsuche die Bewerbungen nach dem Suchbegriff
        const filteredApps = this.applications.filter(app => {
            return (
                (app.company && app.company.toLowerCase().includes(searchTerm)) ||
                (app.position && app.position.toLowerCase().includes(searchTerm)) ||
                (app.status && app.status.toLowerCase().includes(searchTerm))
            );
        });
        
        // Aktualisiere nur die Tabelle, nicht die Charts
        tableBody.innerHTML = '';
        
        // Gleiche Logik wie in updateApplicationsTable, nur mit filteredApps
        const sortedApplications = [...filteredApps].sort((a, b) => {
            const dateA = new Date(a.dateApplied || 0);
            const dateB = new Date(b.dateApplied || 0);
            return dateB - dateA;
        });
        
        // Rest der Logik zum Rendern der Tabelle...
        // (Gleicher Code wie in updateApplicationsTable, hier gekürzt)
    }
    
    /**
     * Zeigt einen Toast an
     */
    showToast(message, type = 'primary') {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toastMessage');
        
        if (!toast || !toastMessage) return;
        
        toast.classList.remove('bg-primary', 'bg-success', 'bg-danger', 'bg-warning');
        toast.classList.add('bg-' + type);
        
        toastMessage.textContent = message;
        
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
    }
}

// Initialisieren beim DOM-Laden
document.addEventListener('DOMContentLoaded', () => {
    const dashboardController = new DashboardController();
    dashboardController.initialize();
    
    // Global verfügbar machen für Debugging
    window.dashboardController = dashboardController;
});

export default DashboardController; 