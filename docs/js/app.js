// Main application logic

document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const jobPostingTextarea = document.getElementById('jobPosting');
    const resumeUpload = document.getElementById('resumeUpload');
    const generateBtn = document.getElementById('generateBtn');
    const exportWordBtn = document.getElementById('exportWordBtn');
    const exportPdfBtn = document.getElementById('exportPdfBtn');
    const coverLetterPreview = document.getElementById('coverLetterPreview');
    const resumePreview = document.getElementById('resumePreview');
    const loadExampleJobBtn = document.getElementById('loadExampleJobBtn');
    const loadExampleResumeBtn = document.getElementById('loadExampleResumeBtn');
    const messageToast = new bootstrap.Toast(document.getElementById('messageToast'));

    // Example job posting (Microsoft HR position)
    const exampleJobPosting = `Microsoft is on a mission to empower every person and every organization on the planet to achieve more. Our culture is centered on embracing a growth mindset, a theme of inspiring excellence, and encouraging teams and leaders to bring their best each day. In doing so, we create life-changing innovations that impact billions of lives around the world. You will help us achieve our mission based on our culture and values.

An exciting role has come up within the German HR Consulting team, primarily supporting Germany. This role is an individual contributor position and will report to the German HR Consulting Lead. You will work with many great leaders and managers to enable the success and further growth of Microsoft and actively nurture a Microsoft culture where all managers and employees can thrive. Your drive and focus will be centred on management capability.

Responsibilities:
- HR Solutions Consulting
- Employee Relations
- Capability Building
- HR Projects and Programs
- Queue Management

Qualifications:
- Extensive experience with Human Resources or Business programs/processes
- Bachelor's Degree
- Project and Change Management skills
- Excellent Influencing & Negotiating Skills
- German language skills are a plus`;

    // GitHub repository information
    const owner = process.env.APP_GITHUB_OWNER || '';  // GitHub username from environment variable
    const repo = 'bewerbungs-app';                     // Repository name
    const token = process.env.APP_GITHUB_TOKEN || '';  // Token from repository secrets

    // Event Listeners
    generateBtn.addEventListener('click', generateDocuments);
    exportWordBtn.addEventListener('click', () => exportDocuments('word'));
    exportPdfBtn.addEventListener('click', () => exportDocuments('pdf'));
    resumeUpload.addEventListener('change', handleResumeUpload);
    loadExampleJobBtn.addEventListener('click', loadExampleJob);
    loadExampleResumeBtn.addEventListener('click', loadExampleResume);

    // Load example job posting
    function loadExampleJob() {
        jobPostingTextarea.value = exampleJobPosting;
        showSuccess('Beispiel-Stellenanzeige geladen');
    }

    // Load example resume
    async function loadExampleResume() {
        try {
            const response = await fetch('examples/example_resume.pdf');
            const blob = await response.blob();
            const file = new File([blob], 'example_resume.pdf', { type: 'application/pdf' });
            
            // Create a DataTransfer object to simulate a file upload
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            resumeUpload.files = dataTransfer.files;
            
            showSuccess('Beispiel-Lebenslauf geladen');
        } catch (error) {
            showError('Fehler beim Laden des Beispiel-Lebenslaufs');
            console.error('Error loading example resume:', error);
        }
    }

    // Generate documents using GitHub Actions
    async function generateDocuments() {
        if (!validateInputs()) {
            return;
        }

        showLoading(generateBtn, 'Generiere Dokumente...');

        try {
            if (!owner || !token) {
                throw new Error('GitHub Konfiguration fehlt. Bitte stelle sicher, dass die Repository Secrets korrekt gesetzt sind.');
            }

            // Convert PDF to base64
            const resumeBase64 = await fileToBase64(resumeUpload.files[0]);

            // Trigger GitHub Action
            const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/actions/workflows/generate.yml/dispatches`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ref: 'main',
                    inputs: {
                        job_posting: jobPostingTextarea.value,
                        resume_file: resumeBase64
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`GitHub API Fehler: ${response.status} ${response.statusText}`);
            }

            // Wait for workflow to complete and get results
            const workflowResult = await waitForWorkflowCompletion(response.headers.get('X-GitHub-Request-Id'));
            
            // Update previews with generated content
            updatePreviews({
                coverLetter: workflowResult.outputs.cover_letter,
                resume: workflowResult.outputs.resume
            });

            showSuccess('Dokumente erfolgreich generiert!');

        } catch (error) {
            showError('Fehler bei der Dokumentengenerierung: ' + error.message);
            console.error('Generation error:', error);
        } finally {
            hideLoading(generateBtn, 'Generieren');
        }
    }

    // Rest of the existing code...

    // Show success message
    function showSuccess(message) {
        document.getElementById('toastTitle').textContent = 'Erfolg';
        document.getElementById('toastMessage').textContent = message;
        document.getElementById('messageToast').classList.remove('bg-danger');
        document.getElementById('messageToast').classList.add('bg-success');
        messageToast.show();
    }

    // Show error message
    function showError(message) {
        document.getElementById('toastTitle').textContent = 'Fehler';
        document.getElementById('toastMessage').textContent = message;
        document.getElementById('messageToast').classList.remove('bg-success');
        document.getElementById('messageToast').classList.add('bg-danger');
        messageToast.show();
        console.error(message);
    }
});
