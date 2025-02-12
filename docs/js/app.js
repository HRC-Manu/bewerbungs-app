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

    // GitHub repository information
    const owner = process.env.APP_GITHUB_OWNER || '';  // GitHub username from environment variable
    const repo = 'bewerbungs-app';                     // Repository name
    const token = process.env.APP_GITHUB_TOKEN || '';  // Token from repository secrets

    // Event Listeners
    generateBtn.addEventListener('click', generateDocuments);
    exportWordBtn.addEventListener('click', () => exportDocuments('word'));
    exportPdfBtn.addEventListener('click', () => exportDocuments('pdf'));
    resumeUpload.addEventListener('change', handleResumeUpload);

    // Generate documents using GitHub Actions
    async function generateDocuments() {
        if (!validateInputs()) {
            return;
        }

        showLoading(generateBtn, 'Generiere Dokumente...');

        try {
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
                throw new Error('Generation failed');
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
        } finally {
            hideLoading(generateBtn, 'Generieren');
        }
    }

    // Export documents using GitHub Actions
    async function exportDocuments(format) {
        const exportBtn = format === 'word' ? exportWordBtn : exportPdfBtn;
        showLoading(exportBtn, 'Exportiere...');

        try {
            // Trigger GitHub Action
            const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/actions/workflows/export.yml/dispatches`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ref: 'main',
                    inputs: {
                        format: format,
                        cover_letter: coverLetterPreview.innerHTML,
                        resume: resumePreview.innerHTML
                    }
                })
            });

            if (!response.ok) {
                throw new Error('Export failed');
            }

            // Wait for workflow to complete and get results
            const workflowResult = await waitForWorkflowCompletion(response.headers.get('X-GitHub-Request-Id'));
            
            // Download the exported file
            const artifactUrl = workflowResult.outputs.path;
            await downloadFile(artifactUrl, `bewerbung.${format === 'word' ? 'docx' : 'pdf'}`);

            showSuccess('Dokument erfolgreich exportiert!');

        } catch (error) {
            showError('Fehler beim Export: ' + error.message);
        } finally {
            hideLoading(exportBtn, format === 'word' ? 'Als Word exportieren' : 'Als PDF exportieren');
        }
    }

    // Helper function to wait for workflow completion
    async function waitForWorkflowCompletion(requestId, maxAttempts = 30) {
        for (let i = 0; i < maxAttempts; i++) {
            const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/actions/runs`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            const runs = await response.json();
            const run = runs.workflow_runs.find(r => r.head_sha === requestId);

            if (run && run.status === 'completed') {
                if (run.conclusion === 'success') {
                    return run;
                }
                throw new Error('Workflow failed');
            }

            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        throw new Error('Timeout waiting for workflow completion');
    }

    // Handle resume file upload
    function handleResumeUpload(event) {
        const file = event.target.files[0];
        if (file && file.type !== 'application/pdf') {
            showError('Bitte lade eine PDF-Datei hoch');
            event.target.value = '';
        }
    }

    // Validate user inputs
    function validateInputs() {
        if (!jobPostingTextarea.value.trim()) {
            showError('Bitte füge eine Stellenanzeige ein');
            return false;
        }

        if (!resumeUpload.files[0]) {
            showError('Bitte lade deinen Lebenslauf hoch');
            return false;
        }

        return true;
    }

    // Update preview sections with generated content
    function updatePreviews(data) {
        coverLetterPreview.innerHTML = data.coverLetter;
        resumePreview.innerHTML = data.resume;
    }

    // Convert file to base64
    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = error => reject(error);
        });
    }

    // Helper function to download files
    async function downloadFile(url, filename) {
        const response = await fetch(url);
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(downloadUrl);
        document.body.removeChild(a);
    }

    // Show loading state
    function showLoading(button, text) {
        button.disabled = true;
        button.innerHTML = `<span class="spinner-border spinner-border-sm"></span> ${text}`;
    }

    // Hide loading state
    function hideLoading(button, text) {
        button.disabled = false;
        button.innerHTML = text;
    }

    // Show success message
    function showSuccess(message) {
        // TODO: Implement a better success message display
        alert(message);
    }

    // Show error message
    function showError(message) {
        // TODO: Implement a better error message display
        alert(message);
    }
}); 
