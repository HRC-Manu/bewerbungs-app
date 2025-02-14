// Bewerbungsvideo Generator mit erweiterten Funktionen
class ApplicationVideoCreator {
    constructor(canvas, storage, db, auth) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.recorder = null;
        this.stream = null;
        this.filters = {
            blur: 0,
            brightness: 100,
            contrast: 100,
            grayscale: 0,
            sepia: 0,
            saturate: 100,
            hueRotate: 0
        };
        this.effects = {
            vignette: false,
            grain: false,
            scanlines: false,
            chromaticAberration: false
        };
        this.textOverlays = [];
        this.backgrounds = [];
        this.currentTemplate = null;
        this.recordingTime = 30000; // 30 Sekunden Standard
        this.countdownTime = 3; // 3 Sekunden Countdown
        this.isRecording = false;
        this.isPaused = false;

        // Firebase Services
        this.storage = storage;
        this.db = db;
        this.auth = auth;
        this.currentUser = null;
        this.userQuota = null;
    }

    // Vorlagen für verschiedene Bewerbungsvideos
    static TEMPLATES = {
        PROFESSIONAL: {
            name: 'Professional',
            filters: {
                brightness: 105,
                contrast: 110,
                saturate: 95,
                blur: 0
            },
            textLayout: [
                {
                    text: 'Name',
                    position: 'top',
                    size: '32px',
                    font: 'Arial',
                    color: '#ffffff',
                    shadow: true
                },
                {
                    text: 'Position',
                    position: 'bottom',
                    size: '24px',
                    font: 'Arial',
                    color: '#ffffff',
                    shadow: true
                }
            ],
            background: {
                type: 'gradient',
                colors: ['#2c3e50', '#3498db']
            }
        },
        CREATIVE: {
            name: 'Kreativ',
            filters: {
                brightness: 110,
                contrast: 120,
                saturate: 120,
                hueRotate: 10
            },
            textLayout: [
                {
                    text: 'Portfolio',
                    position: 'center',
                    size: '48px',
                    font: 'Georgia',
                    color: '#ff6b6b',
                    animation: 'fade'
                }
            ],
            effects: {
                grain: true,
                vignette: true
            }
        },
        MODERN: {
            name: 'Modern',
            filters: {
                brightness: 105,
                contrast: 105,
                saturate: 100,
                blur: 1
            },
            textLayout: [
                {
                    text: 'Skills',
                    position: 'left',
                    size: '28px',
                    font: 'Helvetica',
                    color: '#2ecc71',
                    animation: 'slide'
                }
            ],
            background: {
                type: 'pattern',
                style: 'geometric'
            }
        }
    };

    async init() {
        try {
            // Webcam-Stream mit besseren Einstellungen anfordern
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    facingMode: "user",
                    frameRate: { ideal: 60 }
                },
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 48000
                }
            });

            // Canvas-Größe setzen
            this.canvas.width = 1920;
            this.canvas.height = 1080;

            // Video-Element erstellen
            this.videoElement = document.createElement('video');
            this.videoElement.srcObject = this.stream;
            await this.videoElement.play();

            // MediaRecorder mit besserer Qualität
            this.recorder = new MediaRecorder(this.canvas.captureStream(60), {
                mimeType: 'video/webm;codecs=vp9',
                videoBitsPerSecond: 8000000 // 8 Mbps
            });

            this.chunks = [];
            this.recorder.ondataavailable = (e) => this.chunks.push(e.data);
            this.recorder.onstop = () => this.finalizeVideo();

            // Animation-Loop starten
            this.animate();

            return true;
        } catch (error) {
            console.error('Fehler beim Initialisieren der Kamera:', error);
            return false;
        }
    }

    // Hauptanimations-Loop
    animate() {
        // Hintergrund zeichnen
        this.drawBackground();

        // Video mit Filtern zeichnen
        this.ctx.save();
        this.applyFilters();
        this.ctx.drawImage(this.videoElement, 0, 0, this.canvas.width, this.canvas.height);
        this.ctx.restore();

        // Effekte anwenden
        this.applyEffects();

        // Text-Overlays zeichnen
        this.drawTextOverlays();

        // Animation fortsetzen
        requestAnimationFrame(() => this.animate());
    }

    // Hintergrund zeichnen
    drawBackground() {
        if (this.currentTemplate?.background) {
            const { type, colors, style } = this.currentTemplate.background;
            
            if (type === 'gradient') {
                const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
                colors.forEach((color, index) => {
                    gradient.addColorStop(index / (colors.length - 1), color);
                });
                this.ctx.fillStyle = gradient;
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            } else if (type === 'pattern') {
                this.drawPattern(style);
            }
        }
    }

    // Muster zeichnen
    drawPattern(style) {
        if (style === 'geometric') {
            // Geometrisches Muster
            const size = 50;
            this.ctx.strokeStyle = 'rgba(255,255,255,0.1)';
            this.ctx.lineWidth = 1;

            for (let x = 0; x < this.canvas.width; x += size) {
                for (let y = 0; y < this.canvas.height; y += size) {
                    const random = Math.random();
                    if (random < 0.3) {
                        this.ctx.beginPath();
                        this.ctx.moveTo(x, y);
                        this.ctx.lineTo(x + size, y + size);
                        this.ctx.stroke();
                    } else if (random < 0.6) {
                        this.ctx.beginPath();
                        this.ctx.arc(x + size/2, y + size/2, size/4, 0, Math.PI * 2);
                        this.ctx.stroke();
                    }
                }
            }
        }
    }

    // Filter anwenden
    applyFilters() {
        const filterString = `
            blur(${this.filters.blur}px)
            brightness(${this.filters.brightness}%)
            contrast(${this.filters.contrast}%)
            grayscale(${this.filters.grayscale}%)
            sepia(${this.filters.sepia}%)
            saturate(${this.filters.saturate}%)
            hue-rotate(${this.filters.hueRotate}deg)
        `;
        this.ctx.filter = filterString;
    }

    // Effekte anwenden
    applyEffects() {
        if (this.effects.vignette) {
            this.applyVignette();
        }
        if (this.effects.grain) {
            this.applyGrain();
        }
        if (this.effects.scanlines) {
            this.applyScanlines();
        }
        if (this.effects.chromaticAberration) {
            this.applyChromaticAberration();
        }
    }

    // Vignette-Effekt
    applyVignette() {
        const gradient = this.ctx.createRadialGradient(
            this.canvas.width/2, this.canvas.height/2, 0,
            this.canvas.width/2, this.canvas.height/2, this.canvas.width/1.5
        );
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(1, 'rgba(0,0,0,0.5)');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // Körnung-Effekt
    applyGrain() {
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            const noise = Math.random() * 20 - 10;
            data[i] += noise;
            data[i+1] += noise;
            data[i+2] += noise;
        }
        this.ctx.putImageData(imageData, 0, 0);
    }

    // Scanlines-Effekt
    applyScanlines() {
        this.ctx.fillStyle = 'rgba(0,0,0,0.1)';
        for (let y = 0; y < this.canvas.height; y += 2) {
            this.ctx.fillRect(0, y, this.canvas.width, 1);
        }
    }

    // Chromatische Aberration
    applyChromaticAberration() {
        const offset = 2;
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = imageData.data;
        const newData = new Uint8ClampedArray(data);

        for (let y = 0; y < this.canvas.height; y++) {
            for (let x = 0; x < this.canvas.width; x++) {
                const i = (y * this.canvas.width + x) * 4;
                if (x + offset < this.canvas.width) {
                    newData[i] = data[i + offset * 4]; // Rot-Kanal verschieben
                }
                if (x - offset >= 0) {
                    newData[i + 2] = data[i - offset * 4 + 2]; // Blau-Kanal verschieben
                }
            }
        }

        const newImageData = new ImageData(newData, this.canvas.width, this.canvas.height);
        this.ctx.putImageData(newImageData, 0, 0);
    }

    // Text-Overlays zeichnen
    drawTextOverlays() {
        this.textOverlays.forEach(overlay => {
            const { text, position, size, font, color, animation, shadow } = overlay;
            
            this.ctx.save();
            this.ctx.font = `${size} ${font}`;
            this.ctx.fillStyle = color;
            this.ctx.textAlign = 'center';
            
            let x = this.canvas.width / 2;
            let y;
            
            switch (position) {
                case 'top':
                    y = parseInt(size) + 20;
                    break;
                case 'bottom':
                    y = this.canvas.height - 20;
                    break;
                case 'center':
                    y = this.canvas.height / 2;
                    break;
                case 'left':
                    x = parseInt(size);
                    y = this.canvas.height / 2;
                    this.ctx.textAlign = 'left';
                    break;
                case 'right':
                    x = this.canvas.width - parseInt(size);
                    y = this.canvas.height / 2;
                    this.ctx.textAlign = 'right';
                    break;
                default:
                    y = this.canvas.height / 2;
            }

            if (animation === 'fade') {
                this.ctx.globalAlpha = (Math.sin(Date.now() / 1000) + 1) / 2;
            } else if (animation === 'slide') {
                x += Math.sin(Date.now() / 1000) * 20;
            }

            if (shadow) {
                this.ctx.shadowColor = 'rgba(0,0,0,0.5)';
                this.ctx.shadowBlur = 4;
                this.ctx.shadowOffsetX = 2;
                this.ctx.shadowOffsetY = 2;
            }

            this.ctx.fillText(text, x, y);
            this.ctx.restore();
        });
    }

    // Vorlage anwenden
    applyTemplate(templateName) {
        const template = ApplicationVideoCreator.TEMPLATES[templateName];
        if (template) {
            this.currentTemplate = template;
            this.filters = { ...this.filters, ...template.filters };
            this.effects = { ...this.effects, ...template.effects };
            this.textOverlays = [...template.textLayout];
        }
    }

    // Aufnahme starten
    async startRecording(duration = 30000) {
        if (!this.recorder) {
            const initialized = await this.init();
            if (!initialized) return false;
        }

        // Countdown starten
        await this.showCountdown();

        this.isRecording = true;
        this.recorder.start();

        // Timer für Aufnahmeende
        return new Promise((resolve) => {
            setTimeout(() => {
                this.stopRecording();
                resolve();
            }, duration);
        });
    }

    // Countdown anzeigen
    async showCountdown() {
        for (let i = this.countdownTime; i > 0; i--) {
            this.ctx.save();
            this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.ctx.font = '120px Arial';
            this.ctx.fillStyle = 'white';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(i.toString(), this.canvas.width/2, this.canvas.height/2);
            
            this.ctx.restore();
            
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    // Aufnahme pausieren
    pauseRecording() {
        if (this.isRecording && !this.isPaused) {
            this.recorder.pause();
            this.isPaused = true;
        }
    }

    // Aufnahme fortsetzen
    resumeRecording() {
        if (this.isRecording && this.isPaused) {
            this.recorder.resume();
            this.isPaused = false;
        }
    }

    // Aufnahme stoppen
    stopRecording() {
        if (this.recorder && this.recorder.state === 'recording') {
            this.isRecording = false;
            this.isPaused = false;
            this.recorder.stop();
            this.stream.getTracks().forEach(track => track.stop());
        }
    }

    // Konstanten für Speicherlimits
    static STORAGE_LIMITS = {
        FREE_TIER: {
            maxDuration: 180, // 3 Minuten in Sekunden
            maxSize: 100 * 1024 * 1024, // 100 MB
            maxVideos: 1
        },
        PREMIUM_TIER: {
            maxDuration: 600, // 10 Minuten in Sekunden
            maxSize: 500 * 1024 * 1024, // 500 MB
            maxVideos: 5
        }
    };

    // Initialisiere Benutzer-Quota
    async initUserQuota() {
        this.currentUser = this.auth.currentUser;
        if (!this.currentUser) {
            throw new Error('Nicht eingeloggt');
        }

        // Hole oder erstelle Benutzer-Quota in Firestore
        const quotaRef = doc(this.db, 'users', this.currentUser.uid, 'storage', 'quota');
        const quotaDoc = await getDoc(quotaRef);

        if (!quotaDoc.exists()) {
            // Erstelle neue Quota für kostenlosen Tier
            this.userQuota = {
                tier: 'FREE_TIER',
                usedStorage: 0,
                videoCount: 0,
                lastUpdate: new Date().toISOString()
            };
            await setDoc(quotaRef, this.userQuota);
        } else {
            this.userQuota = quotaDoc.data();
        }
    }

    // Prüfe ob Speicherung möglich
    async canStoreVideo(videoSize) {
        if (!this.userQuota) {
            await this.initUserQuota();
        }

        const limits = ApplicationVideoCreator.STORAGE_LIMITS[this.userQuota.tier];
        
        // Prüfe Anzahl der Videos
        if (this.userQuota.videoCount >= limits.maxVideos) {
            throw new Error(`Speicherlimit erreicht. Upgrade auf Premium für mehr Speicherplatz.`);
        }

        // Prüfe Speicherplatz
        if (this.userQuota.usedStorage + videoSize > limits.maxSize) {
            throw new Error(`Nicht genügend Speicherplatz. Upgrade auf Premium für mehr Speicherplatz.`);
        }

        // Prüfe Videolänge
        if (this.recordingTime / 1000 > limits.maxDuration) {
            throw new Error(`Video zu lang. Maximum: ${limits.maxDuration} Sekunden.`);
        }

        return true;
    }

    // Video in Firebase speichern
    async saveVideo(videoBlob) {
        try {
            if (!this.currentUser) {
                throw new Error('Nicht eingeloggt');
            }

            // Prüfe Quota
            await this.canStoreVideo(videoBlob.size);

            // Generiere eindeutigen Dateinamen
            const fileName = `videos/${this.currentUser.uid}/${Date.now()}.webm`;
            const storageRef = ref(this.storage, fileName);

            // Upload Video
            const uploadTask = uploadBytesResumable(storageRef, videoBlob);

            // Upload-Progress überwachen
            return new Promise((resolve, reject) => {
                uploadTask.on('state_changed',
                    (snapshot) => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        this.canvas.dispatchEvent(new CustomEvent('uploadProgress', {
                            detail: { progress }
                        }));
                    },
                    (error) => {
                        reject(error);
                    },
                    async () => {
                        // Upload erfolgreich
                        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                        
                        // Metadaten in Firestore speichern
                        const videoDoc = {
                            userId: this.currentUser.uid,
                            fileName,
                            url: downloadURL,
                            size: videoBlob.size,
                            duration: this.recordingTime,
                            template: this.currentTemplate?.name || 'Custom',
                            filters: this.filters,
                            effects: this.effects,
                            createdAt: new Date().toISOString()
                        };

                        await setDoc(doc(this.db, 'videos', fileName), videoDoc);

                        // Quota aktualisieren
                        const quotaRef = doc(this.db, 'users', this.currentUser.uid, 'storage', 'quota');
                        await updateDoc(quotaRef, {
                            usedStorage: increment(videoBlob.size),
                            videoCount: increment(1),
                            lastUpdate: new Date().toISOString()
                        });

                        resolve(videoDoc);
                    }
                );
            });
        } catch (error) {
            console.error('Fehler beim Speichern des Videos:', error);
            throw error;
        }
    }

    // Video löschen
    async deleteVideo(fileName) {
        try {
            if (!this.currentUser) {
                throw new Error('Nicht eingeloggt');
            }

            // Hole Video-Metadaten
            const videoRef = doc(this.db, 'videos', fileName);
            const videoDoc = await getDoc(videoRef);

            if (!videoDoc.exists()) {
                throw new Error('Video nicht gefunden');
            }

            const videoData = videoDoc.data();

            // Prüfe Berechtigung
            if (videoData.userId !== this.currentUser.uid) {
                throw new Error('Keine Berechtigung');
            }

            // Lösche aus Storage
            const storageRef = ref(this.storage, fileName);
            await deleteObject(storageRef);

            // Lösche Metadaten
            await deleteDoc(videoRef);

            // Quota aktualisieren
            const quotaRef = doc(this.db, 'users', this.currentUser.uid, 'storage', 'quota');
            await updateDoc(quotaRef, {
                usedStorage: increment(-videoData.size),
                videoCount: increment(-1),
                lastUpdate: new Date().toISOString()
            });

            return true;
        } catch (error) {
            console.error('Fehler beim Löschen des Videos:', error);
            throw error;
        }
    }

    // Hole alle Videos des Benutzers
    async getUserVideos() {
        try {
            if (!this.currentUser) {
                throw new Error('Nicht eingeloggt');
            }

            const videosRef = collection(this.db, 'videos');
            const q = query(videosRef, 
                where('userId', '==', this.currentUser.uid),
                orderBy('createdAt', 'desc')
            );

            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Fehler beim Laden der Videos:', error);
            throw error;
        }
    }

    // Upgrade auf Premium
    async upgradeToPremium() {
        try {
            if (!this.currentUser) {
                throw new Error('Nicht eingeloggt');
            }

            const quotaRef = doc(this.db, 'users', this.currentUser.uid, 'storage', 'quota');
            await updateDoc(quotaRef, {
                tier: 'PREMIUM_TIER',
                lastUpdate: new Date().toISOString()
            });

            this.userQuota.tier = 'PREMIUM_TIER';
            return true;
        } catch (error) {
            console.error('Fehler beim Upgrade:', error);
            throw error;
        }
    }

    // Hole Speicherstatistik
    async getStorageStats() {
        if (!this.userQuota) {
            await this.initUserQuota();
        }

        const limits = ApplicationVideoCreator.STORAGE_LIMITS[this.userQuota.tier];
        
        return {
            tier: this.userQuota.tier,
            usedStorage: this.userQuota.usedStorage,
            maxStorage: limits.maxSize,
            usedVideos: this.userQuota.videoCount,
            maxVideos: limits.maxVideos,
            maxDuration: limits.maxDuration,
            storagePercentage: (this.userQuota.usedStorage / limits.maxSize) * 100
        };
    }

    // Video finalisieren (erweitert)
    async finalizeVideo() {
        const blob = new Blob(this.chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        
        try {
            // Speichere Video in Firebase
            const videoDoc = await this.saveVideo(blob);
            
            const event = new CustomEvent('videoCreated', { 
                detail: { 
                    videoUrl: url, 
                    videoBlob: blob,
                    videoDoc,
                    duration: this.recordingTime,
                    template: this.currentTemplate?.name || 'Custom',
                    filters: this.filters,
                    effects: this.effects
                } 
            });
            this.canvas.dispatchEvent(event);
        } catch (error) {
            console.error('Fehler beim Finalisieren:', error);
            // Event mit Fehler auslösen
            const errorEvent = new CustomEvent('videoError', {
                detail: { error: error.message }
            });
            this.canvas.dispatchEvent(errorEvent);
        }
        
        this.chunks = [];
    }

    // Aufräumen
    dispose() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }
        if (this.videoElement) {
            this.videoElement.srcObject = null;
        }
        this.recorder = null;
        this.stream = null;
        this.videoElement = null;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
}

export default ApplicationVideoCreator; 