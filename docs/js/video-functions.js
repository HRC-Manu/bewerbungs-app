// Video-Funktionen
import { ToastManager } from './ui.js';

const toastManager = new ToastManager();

export async function generateDemoVideo(canvas) {
    try {
        if (!canvas) {
            throw new Error('Canvas element not found');
        }

        // Setze Canvas-Größe
        canvas.width = 640;
        canvas.height = 360;
        const ctx = canvas.getContext('2d');

        // Erstelle Stream
        const stream = canvas.captureStream(30); // 30 FPS
        const recorder = new MediaRecorder(stream, {
            mimeType: 'video/webm;codecs=vp9'
        });

        // Array für die Videodaten
        const chunks = [];
        recorder.ondataavailable = e => chunks.push(e.data);

        // Wenn Aufnahme beendet
        recorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            
            // Video-Element aktualisieren
            const video = document.getElementById('shortDemoVideo');
            if (video) {
                video.src = url;
                video.load();
            }
            
            toastManager.showToast('Demo-Video wurde erfolgreich generiert!', 'success');
        };

        // Starte Aufnahme
        recorder.start();

        // Demo-Animation
        await animateDemo(ctx);

        // Beende Aufnahme
        recorder.stop();
        return true;
    } catch (error) {
        console.error('Fehler bei der Video-Generierung:', error);
        toastManager.showToast('Video-Generierung fehlgeschlagen: ' + error.message, 'error');
        return false;
    }
}

async function animateDemo(ctx) {
    // Hintergrund
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Demo-Schritte
    await animateStep(ctx, 'Lebenslauf hochladen', 'Drag & Drop oder Datei auswählen', 100);
    await animateStep(ctx, 'Stellenanzeige einfügen', 'Text einfügen oder URL eingeben', 200);
    await animateStep(ctx, 'KI-Analyse', 'Automatische Analyse Ihrer Unterlagen', 300);
    await animateStep(ctx, 'Anschreiben generieren', 'Personalisiertes Anschreiben erstellen', 400);
}

async function animateStep(ctx, title, subtitle, yPos) {
    // Text zeichnen
    ctx.font = 'bold 24px Arial';
    ctx.fillStyle = '#0d6efd';
    ctx.fillText(title, 50, yPos);
    
    ctx.font = '16px Arial';
    ctx.fillStyle = '#6c757d';
    ctx.fillText(subtitle, 50, yPos + 30);
    
    // Icon animieren
    await animateIcon(ctx, 20, yPos - 20);
    
    // Pause zwischen den Schritten
    await new Promise(resolve => setTimeout(resolve, 1000));
}

async function animateIcon(ctx, x, y) {
    const frames = 30;
    for (let i = 0; i < frames; i++) {
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, 2 * Math.PI);
        ctx.fillStyle = `rgba(13, 110, 253, ${i / frames})`;
        ctx.fill();
        await new Promise(resolve => setTimeout(resolve, 33)); // ~30fps
    }
}

// Video-Player-Funktionen
export function initializeVideoPlayer() {
    const video = document.getElementById('shortDemoVideo');
    const playBtn = document.querySelector('.video-control-btn');
    const replayBtn = document.getElementById('replayBtn');
    const muteBtn = document.getElementById('muteBtn');
    const generateBtn = document.getElementById('generateVideoBtn');
    const fallback = document.querySelector('.video-fallback');
    
    if (!video || !playBtn || !replayBtn || !muteBtn || !fallback) {
        console.error('Konnte nicht alle Video-Steuerungselemente finden');
        return;
    }

    let isPlaying = false;
    let playPromise = null;

    // Fehlerbehandlung für Video-Laden
    video.addEventListener('error', function(e) {
        console.error('Videofehler:', e);
        video.style.display = 'none';
        fallback.style.display = 'block';
    });

    // Play/Pause-Button
    playBtn.addEventListener('click', async function() {
        if (!isPlaying) {
            try {
                if (playPromise !== null) {
                    await playPromise;
                }
                playPromise = video.play();
                await playPromise;
                isPlaying = true;
                playBtn.querySelector('i').classList.replace('bi-play-fill', 'bi-pause-fill');
            } catch (error) {
                console.error('Abspielen fehlgeschlagen:', error);
                isPlaying = false;
                playBtn.querySelector('i').classList.replace('bi-pause-fill', 'bi-play-fill');
            } finally {
                playPromise = null;
            }
        } else {
            try {
                if (playPromise !== null) {
                    await playPromise;
                }
                video.pause();
                isPlaying = false;
                playBtn.querySelector('i').classList.replace('bi-pause-fill', 'bi-play-fill');
            } catch (error) {
                console.error('Pause fehlgeschlagen:', error);
            }
        }
    });

    // Neu-Starten-Button
    replayBtn.addEventListener('click', async function() {
        try {
            if (playPromise !== null) {
                await playPromise;
            }
            video.currentTime = 0;
            playPromise = video.play();
            await playPromise;
            isPlaying = true;
            playBtn.querySelector('i').classList.replace('bi-play-fill', 'bi-pause-fill');
        } catch (error) {
            console.error('Neustart fehlgeschlagen:', error);
            isPlaying = false;
        } finally {
            playPromise = null;
        }
    });

    // Ton-Button
    muteBtn.addEventListener('click', function() {
        video.muted = !video.muted;
        const icon = muteBtn.querySelector('i');
        if (video.muted) {
            icon.classList.remove('bi-volume-up');
            icon.classList.add('bi-volume-mute');
        } else {
            icon.classList.remove('bi-volume-mute');
            icon.classList.add('bi-volume-up');
        }
    });

    // Video-Events
    video.addEventListener('play', function() {
        isPlaying = true;
        playBtn.querySelector('i').classList.replace('bi-play-fill', 'bi-pause-fill');
    });

    video.addEventListener('pause', function() {
        isPlaying = false;
        playBtn.querySelector('i').classList.replace('bi-pause-fill', 'bi-play-fill');
    });

    video.addEventListener('ended', function() {
        isPlaying = false;
        playBtn.querySelector('i').classList.replace('bi-pause-fill', 'bi-play-fill');
        playPromise = null;
    });

    // Generate-Button
    generateBtn?.addEventListener('click', async function() {
        try {
            generateBtn.disabled = true;
            generateBtn.innerHTML = '<i class="bi bi-hourglass-split"></i><span class="ms-1">Generiere...</span>';
            
            const canvas = document.getElementById('demoCanvas');
            await generateDemoVideo(canvas);
            
            toastManager.showToast('Demo-Video wurde erfolgreich generiert!', 'success');
        } catch (error) {
            console.error('Fehler bei der Video-Generierung:', error);
            toastManager.showToast('Video-Generierung fehlgeschlagen', 'error');
        } finally {
            generateBtn.disabled = false;
            generateBtn.innerHTML = '<i class="bi bi-camera-video"></i><span class="ms-1">Demo generieren</span>';
        }
    });
} 