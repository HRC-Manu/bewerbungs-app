// Video-Manager für die Bewerbungs-App
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, setDoc, updateDoc, increment, collection, query, where, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import ApplicationVideoCreator from './video-creator.js';

class VideoManager {
    constructor(auth, storage, db) {
        this.auth = auth;
        this.storage = storage;
        this.db = db;
        this.videoCreator = null;
        this.currentUser = null;
        
        this.initializeUI();
        this.initializeEventListeners();
        this.showVideoContainer();
    }

    // UI-Elemente initialisieren
    initializeUI() {
        // Video-Container
        this.videoContainer = document.createElement('div');
        this.videoContainer.className = 'video-manager-container d-none';
        this.videoContainer.innerHTML = `
            <div class="row">
                <!-- Login/Register Bereich -->
                <div class="col-12 mb-4" id="authSection">
                    <div class="card">
                        <div class="card-body">
                            <h5 class="card-title">Anmeldung</h5>
                            <form id="loginForm" class="mb-3">
                                <div class="mb-3">
                                    <input type="email" class="form-control" id="loginEmail" placeholder="E-Mail" required>
                                </div>
                                <div class="mb-3">
                                    <input type="password" class="form-control" id="loginPassword" placeholder="Passwort" required>
                                </div>
                                <button type="submit" class="btn btn-primary">Anmelden</button>
                                <button type="button" class="btn btn-link" id="showRegisterBtn">Registrieren</button>
                            </form>
                        </div>
                    </div>
                </div>

                <!-- Video-Aufnahme Bereich -->
                <div class="col-12 mb-4 d-none" id="recordSection">
                    <div class="card">
                        <div class="card-body">
                            <h5 class="card-title">Video aufnehmen</h5>
                            <div class="video-preview-container">
                                <canvas id="videoCanvas" class="w-100"></canvas>
                            </div>
                            <div class="btn-group mt-3">
                                <button id="startRecordingBtn" class="btn btn-primary">
                                    <i class="bi bi-record-circle"></i> Aufnahme starten
                                </button>
                                <button id="stopRecordingBtn" class="btn btn-danger d-none">
                                    <i class="bi bi-stop-circle"></i> Stoppen
                                </button>
                                <button id="pauseRecordingBtn" class="btn btn-warning d-none">
                                    <i class="bi bi-pause-circle"></i> Pause
                                </button>
                            </div>
                            <div class="template-selector mt-3">
                                <select id="templateSelect" class="form-select">
                                    <option value="">Template auswählen...</option>
                                    <option value="PROFESSIONAL">Professional</option>
                                    <option value="CREATIVE">Kreativ</option>
                                    <option value="MODERN">Modern</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Gespeicherte Videos -->
                <div class="col-12 mb-4 d-none" id="videoListSection">
                    <div class="card">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-center mb-3">
                                <h5 class="card-title mb-0">Meine Videos</h5>
                                <div class="storage-info">
                                    <div class="progress" style="width: 200px;">
                                        <div id="storageProgress" class="progress-bar" role="progressbar"></div>
                                    </div>
                                    <small class="text-muted" id="storageText"></small>
                                </div>
                            </div>
                            <div id="videoList" class="row g-3"></div>
                        </div>
                    </div>
                </div>

                <!-- Premium-Upgrade -->
                <div class="col-12 mb-4 d-none" id="premiumSection">
                    <div class="card">
                        <div class="card-body">
                            <h5 class="card-title">Premium-Features</h5>
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="card mb-3">
                                        <div class="card-body">
                                            <h6>Kostenlos</h6>
                                            <ul class="list-unstyled">
                                                <li><i class="bi bi-check text-success"></i> 1 Video (max. 3 Min.)</li>
                                                <li><i class="bi bi-check text-success"></i> 100 MB Speicher</li>
                                                <li><i class="bi bi-check text-success"></i> Basis-Templates</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="card mb-3 border-primary">
                                        <div class="card-body">
                                            <h6>Premium</h6>
                                            <ul class="list-unstyled">
                                                <li><i class="bi bi-check text-success"></i> 5 Videos (max. 10 Min.)</li>
                                                <li><i class="bi bi-check text-success"></i> 500 MB Speicher</li>
                                                <li><i class="bi bi-check text-success"></i> Alle Templates</li>
                                                <li><i class="bi bi-check text-success"></i> Erweiterte Effekte</li>
                                            </ul>
                                            <button id="upgradePremiumBtn" class="btn btn-primary mt-3">
                                                Upgrade für 9,99€/Monat
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(this.videoContainer);
    }

    // Video-Container anzeigen
    showVideoContainer() {
        this.videoContainer.classList.remove('d-none');
    }

    // Event-Listener initialisieren
    initializeEventListeners() {
        // Login Form
        const loginForm = document.getElementById('loginForm');
        loginForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            
            try {
                await signInWithEmailAndPassword(this.auth, email, password);
                this.handleLogin(this.currentUser);
            } catch (error) {
                this.showError('Anmeldung fehlgeschlagen: ' + error.message);
            }
        });

        // Register Button
        const showRegisterBtn = document.getElementById('showRegisterBtn');
        showRegisterBtn?.addEventListener('click', () => {
            // Toggle zwischen Login und Register Form
            const loginForm = document.getElementById('loginForm');
            loginForm.innerHTML = `
                <div class="mb-3">
                    <input type="text" class="form-control" id="registerName" placeholder="Name" required>
                </div>
                <div class="mb-3">
                    <input type="email" class="form-control" id="registerEmail" placeholder="E-Mail" required>
                </div>
                <div class="mb-3">
                    <input type="password" class="form-control" id="registerPassword" placeholder="Passwort" required>
                </div>
                <button type="submit" class="btn btn-primary">Registrieren</button>
                <button type="button" class="btn btn-link" id="showLoginBtn">Zurück zum Login</button>
            `;
            loginForm.removeEventListener('submit', this.handleLogin);
            loginForm.addEventListener('submit', this.handleRegister.bind(this));
        });

        // Video Aufnahme
        const startRecordingBtn = document.getElementById('startRecordingBtn');
        const stopRecordingBtn = document.getElementById('stopRecordingBtn');
        const pauseRecordingBtn = document.getElementById('pauseRecordingBtn');

        startRecordingBtn?.addEventListener('click', () => this.startRecording());
        stopRecordingBtn?.addEventListener('click', () => this.stopRecording());
        pauseRecordingBtn?.addEventListener('click', () => this.togglePause());

        // Template Auswahl
        const templateSelect = document.getElementById('templateSelect');
        templateSelect?.addEventListener('change', (e) => {
            if (this.videoCreator) {
                this.videoCreator.applyTemplate(e.target.value);
            }
        });

        // Premium Upgrade
        const upgradePremiumBtn = document.getElementById('upgradePremiumBtn');
        upgradePremiumBtn?.addEventListener('click', () => this.handlePremiumUpgrade());
    }

    // Login Handler
    async handleLogin(user) {
        this.currentUser = user;
        document.getElementById('authSection').classList.add('d-none');
        document.getElementById('recordSection').classList.remove('d-none');
        document.getElementById('videoListSection').classList.remove('d-none');
        document.getElementById('premiumSection').classList.remove('d-none');

        // Video Creator initialisieren
        const canvas = document.getElementById('videoCanvas');
        this.videoCreator = new ApplicationVideoCreator(canvas, this.storage, this.db, this.auth);
        
        // Videos und Speicherstatistik laden
        await this.loadUserVideos();
        await this.updateStorageStats();
    }

    // Logout Handler
    handleLogout() {
        this.currentUser = null;
        this.videoCreator?.dispose();
        this.videoCreator = null;

        document.getElementById('authSection').classList.remove('d-none');
        document.getElementById('recordSection').classList.add('d-none');
        document.getElementById('videoListSection').classList.add('d-none');
        document.getElementById('premiumSection').classList.add('d-none');
    }

    // Register Handler
    async handleRegister(e) {
        e.preventDefault();
        const name = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;

        try {
            const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
            await updateProfile(userCredential.user, { displayName: name });
            this.showSuccess('Registrierung erfolgreich');
        } catch (error) {
            this.showError('Registrierung fehlgeschlagen: ' + error.message);
        }
    }

    // Video Aufnahme starten
    async startRecording() {
        try {
            const stats = await this.videoCreator.getStorageStats();
            if (stats.usedVideos >= stats.maxVideos) {
                throw new Error('Videolimit erreicht. Bitte auf Premium upgraden.');
            }

            await this.videoCreator.startRecording();
            document.getElementById('startRecordingBtn').classList.add('d-none');
            document.getElementById('stopRecordingBtn').classList.remove('d-none');
            document.getElementById('pauseRecordingBtn').classList.remove('d-none');
        } catch (error) {
            this.showError(error.message);
        }
    }

    // Video Aufnahme stoppen
    async stopRecording() {
        try {
            await this.videoCreator.stopRecording();
            document.getElementById('startRecordingBtn').classList.remove('d-none');
            document.getElementById('stopRecordingBtn').classList.add('d-none');
            document.getElementById('pauseRecordingBtn').classList.add('d-none');
            await this.loadUserVideos();
            await this.updateStorageStats();
        } catch (error) {
            this.showError(error.message);
        }
    }

    // Aufnahme pausieren/fortsetzen
    togglePause() {
        if (this.videoCreator.isPaused) {
            this.videoCreator.resumeRecording();
            document.getElementById('pauseRecordingBtn').innerHTML = '<i class="bi bi-pause-circle"></i> Pause';
        } else {
            this.videoCreator.pauseRecording();
            document.getElementById('pauseRecordingBtn').innerHTML = '<i class="bi bi-play-circle"></i> Fortsetzen';
        }
    }

    // Videos des Benutzers laden
    async loadUserVideos() {
        try {
            const videos = await this.videoCreator.getUserVideos();
            const videoList = document.getElementById('videoList');
            videoList.innerHTML = '';

            videos.forEach(video => {
                const videoCard = document.createElement('div');
                videoCard.className = 'col-md-4';
                videoCard.innerHTML = `
                    <div class="card h-100">
                        <video class="card-img-top" src="${video.url}" controls></video>
                        <div class="card-body">
                            <h6 class="card-title">Video vom ${new Date(video.createdAt).toLocaleDateString()}</h6>
                            <p class="card-text">
                                <small class="text-muted">
                                    Dauer: ${Math.round(video.duration/1000)}s
                                    <br>
                                    Größe: ${Math.round(video.size/1024/1024)}MB
                                </small>
                            </p>
                            <button class="btn btn-danger btn-sm delete-video" data-filename="${video.fileName}">
                                <i class="bi bi-trash"></i> Löschen
                            </button>
                        </div>
                    </div>
                `;
                videoList.appendChild(videoCard);

                // Lösch-Button Event Listener
                const deleteBtn = videoCard.querySelector('.delete-video');
                deleteBtn.addEventListener('click', () => this.handleDeleteVideo(video.fileName));
            });
        } catch (error) {
            this.showError('Fehler beim Laden der Videos: ' + error.message);
        }
    }

    // Video löschen
    async handleDeleteVideo(fileName) {
        if (confirm('Video wirklich löschen?')) {
            try {
                await this.videoCreator.deleteVideo(fileName);
                await this.loadUserVideos();
                await this.updateStorageStats();
                this.showSuccess('Video gelöscht');
            } catch (error) {
                this.showError('Fehler beim Löschen: ' + error.message);
            }
        }
    }

    // Speicherstatistik aktualisieren
    async updateStorageStats() {
        try {
            const stats = await this.videoCreator.getStorageStats();
            const progress = document.getElementById('storageProgress');
            const text = document.getElementById('storageText');

            progress.style.width = `${stats.storagePercentage}%`;
            text.textContent = `${Math.round(stats.usedStorage/1024/1024)}MB von ${Math.round(stats.maxStorage/1024/1024)}MB verwendet`;
            
            // Warnung bei fast vollem Speicher
            if (stats.storagePercentage > 80) {
                progress.classList.add('bg-warning');
                if (!stats.tier.includes('PREMIUM')) {
                    this.showWarning('Speicherplatz fast voll. Upgrade auf Premium?');
                }
            }
        } catch (error) {
            console.error('Fehler beim Laden der Speicherstatistik:', error);
        }
    }

    // Premium Upgrade
    async handlePremiumUpgrade() {
        try {
            // Hier würde normalerweise die Zahlungsabwicklung erfolgen
            await this.videoCreator.upgradeToPremium();
            await this.updateStorageStats();
            this.showSuccess('Upgrade auf Premium erfolgreich!');
        } catch (error) {
            this.showError('Upgrade fehlgeschlagen: ' + error.message);
        }
    }

    // UI Feedback
    showSuccess(message) {
        // Toast oder andere UI-Benachrichtigung
        console.log('Success:', message);
    }

    showError(message) {
        // Toast oder andere UI-Benachrichtigung
        console.error('Error:', message);
    }

    showWarning(message) {
        // Toast oder andere UI-Benachrichtigung
        console.warn('Warning:', message);
    }
}

// Exportiere die Klasse
export default VideoManager; 