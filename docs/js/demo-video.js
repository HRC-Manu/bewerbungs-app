// Demo-Video Generator
class DemoVideoGenerator {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.recorder = null;
        this.stream = null;
    }

    async init() {
        // Canvas-Größe setzen
        this.canvas.width = 640;
        this.canvas.height = 360;
        
        // Stream vom Canvas erstellen
        this.stream = this.canvas.captureStream(30); // 30 FPS
        
        // MediaRecorder initialisieren
        this.recorder = new MediaRecorder(this.stream, {
            mimeType: 'video/webm;codecs=vp9'
        });
        
        // Array für die Videodaten
        const chunks = [];
        
        this.recorder.ondataavailable = (e) => chunks.push(e.data);
        this.recorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            
            // Video-Element aktualisieren
            const video = document.getElementById('shortDemoVideo');
            video.src = url;
            video.load();
        };
    }

    async startRecording() {
        if (!this.recorder) await this.init();
        this.recorder.start();
        
        // Demo-Animation starten
        await this.animateDemo();
        
        // Aufnahme beenden
        this.recorder.stop();
    }

    async animateDemo() {
        // Hintergrund
        this.ctx.fillStyle = '#f8f9fa';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Schritt 1: Lebenslauf hochladen
        await this.animateStep(
            'Lebenslauf hochladen',
            'Drag & Drop oder Datei auswählen',
            100
        );
        
        // Schritt 2: Stellenanzeige einfügen
        await this.animateStep(
            'Stellenanzeige einfügen',
            'Text einfügen oder URL eingeben',
            200
        );
        
        // Schritt 3: KI-Analyse
        await this.animateStep(
            'KI-Analyse',
            'Automatische Analyse Ihrer Unterlagen',
            300
        );
        
        // Schritt 4: Anschreiben generieren
        await this.animateStep(
            'Anschreiben generieren',
            'Personalisiertes Anschreiben erstellen',
            400
        );
    }

    async animateStep(title, subtitle, yPos) {
        // Text zeichnen
        this.ctx.font = 'bold 24px Arial';
        this.ctx.fillStyle = '#0d6efd';
        this.ctx.fillText(title, 50, yPos);
        
        this.ctx.font = '16px Arial';
        this.ctx.fillStyle = '#6c757d';
        this.ctx.fillText(subtitle, 50, yPos + 30);
        
        // Icon animieren
        await this.animateIcon(20, yPos - 20);
        
        // Pause zwischen den Schritten
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    async animateIcon(x, y) {
        const frames = 30;
        for (let i = 0; i < frames; i++) {
            this.ctx.beginPath();
            this.ctx.arc(x, y, 10, 0, 2 * Math.PI);
            this.ctx.fillStyle = `rgba(13, 110, 253, ${i / frames})`;
            this.ctx.fill();
            await new Promise(resolve => setTimeout(resolve, 33)); // ~30fps
        }
    }
}

// Export für die Verwendung in anderen Dateien
export default DemoVideoGenerator; 