# AI-Powered Job Application Assistant

A web application that helps generate customized cover letters and resumes based on job postings using AI. The app runs entirely on GitHub using GitHub Pages and GitHub Actions.

## Features

- Upload job postings and PDF resumes
- AI-powered generation of tailored cover letters and resumes
- Live preview of generated documents
- Export as Word or PDF
- Integration with various AI services (ChatGPT, DeepL, etc.)

## Technology Stack

- Frontend: HTML/CSS/JavaScript (hosted on GitHub Pages)
- Backend: Python scripts running in GitHub Actions
- Storage: GitHub Repository
- Authentication: GitHub Login
- AI Integration: Direct API calls from GitHub Actions

## Project Structure

```
/
├── docs/               # Frontend files (GitHub Pages)
│   ├── index.html     # Main application page
│   ├── css/           # Stylesheets
│   ├── js/           # JavaScript files
│   └── assets/       # Images and other assets
│
├── actions/           # GitHub Actions workflows
│   ├── generate.yml  # Document generation workflow
│   └── export.yml    # Document export workflow
│
├── scripts/          # Python scripts for document processing
│   ├── pdf_extract.py    # PDF text extraction
│   ├── generate.py       # AI-powered document generation
│   └── export.py         # Document export utilities
│
├── requirements.txt   # Python dependencies
└── README.md         # This file
```

## Setup & Usage

1. Fork this repository
2. Enable GitHub Pages in repository settings
3. Configure required API keys in repository secrets
4. Access the application at your-username.github.io/repository-name

## Development

To contribute to the development:

1. Clone the repository
2. Install Python dependencies: `pip install -r requirements.txt`
3. Make your changes
4. Test locally
5. Create a pull request

## License

This project is open source and available under the MIT License.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Progress Overview

- [x] Basic application structure with Streamlit (20%)
- [ ] Implementation of core functions (40%) 
  - [ ] Text extraction from PDF (10%)
  - [ ] Cover letter and resume generation with ChatGPT API (20%)
  - [ ] Export as PDF and Word (10%)
- [ ] Integration of additional AI APIs like DeepL (20%)
- [ ] Design of user interface with HTML/CSS/JS (30%)
- [ ] Testing and debugging (10%)

Overall progress: 20%

4. Run the application 
