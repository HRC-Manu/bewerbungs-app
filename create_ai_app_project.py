import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def main():
    logger.info("Starte Projektstruktur-Erstellung...")
    # Hauptordnername
    project_name = "my-ai-app"

    # ------------------------------------------------------------------------------------
    # Verzeichnisstruktur anlegen
    # ------------------------------------------------------------------------------------
    folders = [
        f"{project_name}",
        f"{project_name}/server",
        f"{project_name}/server/src",
        f"{project_name}/server/src/controllers",
        f"{project_name}/server/src/routes",
        f"{project_name}/server/src/services",
        f"{project_name}/client",
        f"{project_name}/client/src",
        f"{project_name}/client/src/components",
    ]

    for folder in folders:
        os.makedirs(folder, exist_ok=True)

    # ------------------------------------------------------------------------------------
    # 1) docker-compose.yml
    # ------------------------------------------------------------------------------------
    docker_compose_yml = r'''version: '3.8'

services:
  server:
    build: 
      context: ./server
      dockerfile: Dockerfile
    container_name: my-ai-server
    ports:
      - "4000:4000"
    volumes:
      - ./server:/app
    env_file: 
      - .env
    depends_on:
      - client

  client:
    build:
      context: ./client
      dockerfile: Dockerfile
    container_name: my-ai-client
    ports:
      - "3000:3000"
    volumes:
      - ./client:/app
    depends_on:
      - server
'''
    with open(f"{project_name}/docker-compose.yml", "w", encoding="utf-8") as f:
        f.write(docker_compose_yml)

    # ------------------------------------------------------------------------------------
    # 2) server/Dockerfile
    # ------------------------------------------------------------------------------------
    server_dockerfile = r'''# ---- Basis-Image für Node ----
FROM node:18-alpine

# Arbeitsverzeichnis im Container
WORKDIR /app

# Package-Dateien kopieren & Abhängigkeiten installieren
COPY package.json package-lock.json ./
RUN npm install

# Restliche Dateien kopieren (inkl. src, tsconfig usw.)
COPY . .

# TypeScript build
RUN npm run build

# Exponiere Port 4000
EXPOSE 4000

# Start-Befehl
CMD ["npm", "start"]
'''
    with open(f"{project_name}/server/Dockerfile", "w", encoding="utf-8") as f:
        f.write(server_dockerfile)

    # ------------------------------------------------------------------------------------
    # 3) server/package.json
    # ------------------------------------------------------------------------------------
    server_package_json = r'''{
  "name": "my-ai-application-server",
  "version": "1.0.0",
  "description": "Server for AI-driven job application generator",
  "main": "dist/index.js",
  "scripts": {
    "dev": "ts-node-dev --respawn --transpileOnly src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@types/express": "^4.17.0",
    "@types/multer": "^1.4.7",
    "body-parser": "^1.20.2",
    "cors": "^2.8.5",
    "express": "^4.18.2",
    "multer": "^1.4.5-lts.1",
    "pdf-parse": "^1.1.1",
    "openai": "^3.2.1",
    "axios": "^1.3.2",
    "docx": "^8.3.2",
    "html-pdf": "^3.0.1"
  },
  "devDependencies": {
    "ts-node-dev": "^2.0.0",
    "typescript": "^4.9.4"
  }
}
'''
    with open(f"{project_name}/server/package.json", "w", encoding="utf-8") as f:
        f.write(server_package_json)

    # ------------------------------------------------------------------------------------
    # 4) server/tsconfig.json
    # ------------------------------------------------------------------------------------
    server_tsconfig_json = r'''{
  "compilerOptions": {
    "target": "ESNext",
    "module": "commonjs",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "**/*.test.ts"]
}
'''
    with open(f"{project_name}/server/tsconfig.json", "w", encoding="utf-8") as f:
        f.write(server_tsconfig_json)

    # ------------------------------------------------------------------------------------
    # 5) server/src/index.ts
    # ------------------------------------------------------------------------------------
    server_index_ts = r'''import app from "./app";

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
'''
    with open(f"{project_name}/server/src/index.ts", "w", encoding="utf-8") as f:
        f.write(server_index_ts)

    # ------------------------------------------------------------------------------------
    # 6) server/src/app.ts
    # ------------------------------------------------------------------------------------
    server_app_ts = r'''import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import applicationRoutes from "./routes/applicationRoutes";

const app = express();

app.use(cors());
app.use(bodyParser.json());

// Haupt-Routen
app.use("/api", applicationRoutes);

export default app;
'''
    with open(f"{project_name}/server/src/app.ts", "w", encoding="utf-8") as f:
        f.write(server_app_ts)

    # ------------------------------------------------------------------------------------
    # 7) server/src/routes/applicationRoutes.ts
    # ------------------------------------------------------------------------------------
    application_routes_ts = r'''import { Router } from "express";
import multer from "multer";
import { uploadResume, generateApplication } from "../controllers/applicationController";

// Datei-Upload-Konfiguration
const upload = multer({ dest: "uploads/" });
const router = Router();

router.post("/upload-resume", upload.single("resume"), uploadResume);
router.post("/generate-application", generateApplication);

export default router;
'''
    with open(f"{project_name}/server/src/routes/applicationRoutes.ts", "w", encoding="utf-8") as f:
        f.write(application_routes_ts)

    # ------------------------------------------------------------------------------------
    # 8) server/src/controllers/applicationController.ts
    # ------------------------------------------------------------------------------------
    application_controller_ts = r'''import { Request, Response } from "express";
import fs from "fs";
import { parsePdf } from "../services/pdfParser";
import { generateCoverLetter, generateResume } from "../services/aiIntegration";
import { createDocx, createPdf } from "../services/docGenerator";

export const uploadResume = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }

    // PDF parsen
    const pdfPath = req.file.path;
    const resumeText = await parsePdf(pdfPath);

    // Temporäre Datei ggf. löschen
    fs.unlinkSync(pdfPath);

    return res.status(200).json({ resumeContent: resumeText });
  } catch (error: any) {
    console.error("Fehler beim Resume-Upload:", error);
    return res.status(500).json({ error: "Upload fehlgeschlagen." });
  }
};

export const generateApplication = async (req: Request, res: Response) => {
  try {
    const { resumeContent, jobAd, userSettings } = req.body;

    // Anschreiben generieren
    const generatedCoverLetter = await generateCoverLetter(
      resumeContent,
      jobAd,
      userSettings
    );

    // Angepassten Lebenslauf generieren
    const generatedResume = await generateResume(
      resumeContent,
      jobAd,
      userSettings
    );

    // DOCX erstellen
    const coverLetterDocxBuffer = await createDocx(generatedCoverLetter);
    const resumeDocxBuffer = await createDocx(generatedResume);

    // PDF erstellen
    const coverLetterPdfBuffer = await createPdf(generatedCoverLetter);
    const resumePdfBuffer = await createPdf(generatedResume);

    return res.status(200).json({
      coverLetter: generatedCoverLetter,
      resume: generatedResume,
      coverLetterDocx: coverLetterDocxBuffer.toString("base64"),
      resumeDocx: resumeDocxBuffer.toString("base64"),
      coverLetterPdf: coverLetterPdfBuffer.toString("base64"),
      resumePdf: resumePdfBuffer.toString("base64"),
    });
  } catch (error: any) {
    console.error("Fehler bei der Generierung:", error);
    return res.status(500).json({ error: "Generierung fehlgeschlagen." });
  }
};
'''
    with open(f"{project_name}/server/src/controllers/applicationController.ts", "w", encoding="utf-8") as f:
        f.write(application_controller_ts)

    # ------------------------------------------------------------------------------------
    # 9) server/src/services/pdfParser.ts
    # ------------------------------------------------------------------------------------
    pdf_parser_ts = r'''import pdfParse from "pdf-parse";
import fs from "fs";

export async function parsePdf(filePath: string): Promise<string> {
  const pdfBuffer = fs.readFileSync(filePath);
  const pdfData = await pdfParse(pdfBuffer);
  return pdfData.text;
}
'''
    with open(f"{project_name}/server/src/services/pdfParser.ts", "w", encoding="utf-8") as f:
        f.write(pdf_parser_ts)

    # ------------------------------------------------------------------------------------
    # 10) server/src/services/aiIntegration.ts
    # ------------------------------------------------------------------------------------
    ai_integration_ts = r'''import { Configuration, OpenAIApi } from "openai";
import axios from "axios";

const openAiApiKey = process.env.OPENAI_API_KEY || "";
const deepLApiKey = process.env.DEEPL_API_KEY || "";

const openAiConfig = new Configuration({
  apiKey: openAiApiKey,
});

const openAiClient = new OpenAIApi(openAiConfig);

export async function generateCoverLetter(
  resumeContent: string,
  jobAd: string,
  userSettings: any
): Promise<string> {
  const prompt = `
    Erstelle ein professionelles Anschreiben auf Basis meines Lebenslaufs:
    Lebenslauf-Auszug: ${resumeContent}
    Stellenanzeige: ${jobAd}
    Anforderungen: ${JSON.stringify(userSettings)}
  `;

  const response = await openAiClient.createCompletion({
    model: "text-davinci-003",
    prompt,
    max_tokens: 500,
    temperature: 0.7,
  });

  let coverLetter =
    response.data.choices?.[0]?.text?.trim() ||
    "Fehler bei der Anschreiben-Generierung.";

  // Optionale Übersetzung via DeepL
  if (userSettings && userSettings.translateToEnglish) {
    coverLetter = await translateWithDeepL(coverLetter, "EN");
  }

  return coverLetter;
}

export async function generateResume(
  resumeContent: string,
  jobAd: string,
  userSettings: any
): Promise<string> {
  const prompt = `
    Passe meinen Lebenslauf an die Stelle an:
    Lebenslauf-Auszug: ${resumeContent}
    Stellenanzeige: ${jobAd}
    Anforderungen: ${JSON.stringify(userSettings)}
  `;

  const response = await openAiClient.createCompletion({
    model: "text-davinci-003",
    prompt,
    max_tokens: 1000,
    temperature: 0.7,
  });

  let customResume =
    response.data.choices?.[0]?.text?.trim() ||
    "Fehler bei der Lebenslauf-Generierung.";

  if (userSettings && userSettings.translateToEnglish) {
    customResume = await translateWithDeepL(customResume, "EN");
  }

  return customResume;
}

async function translateWithDeepL(text: string, targetLang: string): Promise<string> {
  try {
    const url = "https://api-free.deepl.com/v2/translate";
    const params = new URLSearchParams();
    params.append("auth_key", deepLApiKey);
    params.append("text", text);
    params.append("target_lang", targetLang);

    const response = await axios.post(url, params);
    const translations = response.data.translations;
    if (translations && translations.length > 0) {
      return translations[0].text;
    }
    return text;
  } catch (error) {
    console.error("Fehler bei der DeepL-Übersetzung:", error);
    return text;
  }
}
'''
    with open(f"{project_name}/server/src/services/aiIntegration.ts", "w", encoding="utf-8") as f:
        f.write(ai_integration_ts)

    # ------------------------------------------------------------------------------------
    # 11) server/src/services/docGenerator.ts
    # ------------------------------------------------------------------------------------
    doc_generator_ts = r'''import { Document, Packer, Paragraph, TextRun } from "docx";
import pdf from "html-pdf";

export async function createDocx(content: string): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [new TextRun(content)],
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return buffer;
}

export async function createPdf(content: string): Promise<Buffer> {
  const html = `<html><body><pre>${content}</pre></body></html>`;
  return new Promise((resolve, reject) => {
    pdf.create(html).toBuffer((err: any, buffer: Buffer) => {
      if (err) reject(err);
      else resolve(buffer);
    });
  });
}
'''
    with open(f"{project_name}/server/src/services/docGenerator.ts", "w", encoding="utf-8") as f:
        f.write(doc_generator_ts)

    # ------------------------------------------------------------------------------------
    # 12) client/Dockerfile
    # ------------------------------------------------------------------------------------
    client_dockerfile = r'''# ---- Basis-Image für Node ----
FROM node:18-alpine

# Arbeitsverzeichnis
WORKDIR /app

# Package-Dateien kopieren & Abhängigkeiten installieren
COPY package.json package-lock.json ./
RUN npm install

# Restliche Client-Dateien kopieren
COPY . .

# Build des React-Projekts (Production-Build)
RUN npm run build

# Exponiere Port 3000
EXPOSE 3000

# Start (Development-Server bei CRA: npm start)
CMD ["npm", "start"]
'''
    with open(f"{project_name}/client/Dockerfile", "w", encoding="utf-8") as f:
        f.write(client_dockerfile)

    # ------------------------------------------------------------------------------------
    # 13) client/package.json
    # ------------------------------------------------------------------------------------
    client_package_json = r'''{
  "name": "my-ai-application-client",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "5.0.1",
    "typescript": "^4.9.4",
    "axios": "^1.3.2"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  }
}
'''
    with open(f"{project_name}/client/package.json", "w", encoding="utf-8") as f:
        f.write(client_package_json)

    # ------------------------------------------------------------------------------------
    # 14) client/src/index.tsx
    # ------------------------------------------------------------------------------------
    client_index_tsx = r'''import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
'''
    with open(f"{project_name}/client/src/index.tsx", "w", encoding="utf-8") as f:
        f.write(client_index_tsx)

    # ------------------------------------------------------------------------------------
    # 15) client/src/App.tsx
    # ------------------------------------------------------------------------------------
    client_app_tsx = r'''import React, { useState } from "react";
import UploadResume from "./components/UploadResume";
import JobAdInput from "./components/JobAdInput";
import ApplicationPreview from "./components/ApplicationPreview";
import IntegrationSettings from "./components/IntegrationSettings";
import "./App.css";

function App() {
  const [resumeContent, setResumeContent] = useState("");
  const [jobAd, setJobAd] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [generatedResume, setGeneratedResume] = useState("");
  const [userSettings, setUserSettings] = useState<any>({});

  return (
    <div className="app-container">
      <h1>AI-Bewerbungs-Generator</h1>

      <div className="step">
        <UploadResume
          onResumeParsed={(content: string) => setResumeContent(content)}
        />
      </div>

      <div className="step">
        <JobAdInput onJobAdChange={(ad: string) => setJobAd(ad)} />
      </div>

      <div className="step">
        <IntegrationSettings
          userSettings={userSettings}
          onChangeSettings={(settings: any) => setUserSettings(settings)}
        />
      </div>

      <div className="step">
        <ApplicationPreview
          resumeContent={resumeContent}
          jobAd={jobAd}
          coverLetter={coverLetter}
          generatedResume={generatedResume}
          onUpdateCoverLetter={setCoverLetter}
          onUpdateResume={setGeneratedResume}
          userSettings={userSettings}
        />
      </div>
    </div>
  );
}

export default App;
'''
    with open(f"{project_name}/client/src/App.tsx", "w", encoding="utf-8") as f:
        f.write(client_app_tsx)

    # ------------------------------------------------------------------------------------
    # 16) client/src/components/UploadResume.tsx
    # ------------------------------------------------------------------------------------
    upload_resume_tsx = r'''import React, { useState } from "react";
import axios from "axios";

interface UploadResumeProps {
  onResumeParsed: (content: string) => void;
}

const UploadResume: React.FC<UploadResumeProps> = ({ onResumeParsed }) => {
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    const formData = new FormData();
    formData.append("resume", file);

    try {
      const response = await axios.post(
        "http://localhost:4000/api/upload-resume",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      onResumeParsed(response.data.resumeContent);
    } catch (error) {
      console.error("Fehler beim Hochladen:", error);
    }
  };

  return (
    <div>
      <h2>1) Lebenslauf hochladen</h2>
      <input type="file" accept="application/pdf" onChange={handleFileChange} />
      <button onClick={handleUpload}>Upload</button>
    </div>
  );
};

export default UploadResume;
'''
    with open(f"{project_name}/client/src/components/UploadResume.tsx", "w", encoding="utf-8") as f:
        f.write(upload_resume_tsx)

    # ------------------------------------------------------------------------------------
    # 17) client/src/components/JobAdInput.tsx
    # ------------------------------------------------------------------------------------
    job_ad_input_tsx = r'''import React from "react";

interface JobAdInputProps {
  onJobAdChange: (ad: string) => void;
}

const JobAdInput: React.FC<JobAdInputProps> = ({ onJobAdChange }) => {
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onJobAdChange(e.target.value);
  };

  return (
    <div>
      <h2>2) Stellenanzeige</h2>
      <textarea
        placeholder="Stellenanzeige hier einfügen..."
        onChange={handleChange}
      />
    </div>
  );
};

export default JobAdInput;
'''
    with open(f"{project_name}/client/src/components/JobAdInput.tsx", "w", encoding="utf-8") as f:
        f.write(job_ad_input_tsx)

    # ------------------------------------------------------------------------------------
    # 18) client/src/components/IntegrationSettings.tsx
    # ------------------------------------------------------------------------------------
    integration_settings_tsx = r'''import React from "react";

interface IntegrationSettingsProps {
  userSettings: any;
  onChangeSettings: (settings: any) => void;
}

const IntegrationSettings: React.FC<IntegrationSettingsProps> = ({
  userSettings,
  onChangeSettings
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChangeSettings({
      ...userSettings,
      [e.target.name]: e.target.checked,
    });
  };

  return (
    <div>
      <h2>3) Integrationseinstellungen</h2>
      <label>
        <input
          type="checkbox"
          name="useDeepL"
          checked={userSettings.useDeepL || false}
          onChange={handleChange}
        />
        DeepL Übersetzung
      </label>
      <br />
      <label>
        <input
          type="checkbox"
          name="translateToEnglish"
          checked={userSettings.translateToEnglish || false}
          onChange={handleChange}
        />
        Anschreiben/Lebenslauf auf Englisch übersetzen
      </label>
      {/* Weitere KI-Einstellungen */}
    </div>
  );
};

export default IntegrationSettings;
'''
    with open(f"{project_name}/client/src/components/IntegrationSettings.tsx", "w", encoding="utf-8") as f:
        f.write(integration_settings_tsx)

    # ------------------------------------------------------------------------------------
    # 19) client/src/components/ApplicationPreview.tsx
    # ------------------------------------------------------------------------------------
    application_preview_tsx = r'''import React, { useState } from "react";
import axios from "axios";

interface ApplicationPreviewProps {
  resumeContent: string;
  jobAd: string;
  coverLetter: string;
  generatedResume: string;
  onUpdateCoverLetter: (text: string) => void;
  onUpdateResume: (text: string) => void;
  userSettings: any;
}

const ApplicationPreview: React.FC<ApplicationPreviewProps> = ({
  resumeContent,
  jobAd,
  coverLetter,
  generatedResume,
  onUpdateCoverLetter,
  onUpdateResume,
  userSettings
}) => {
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const response = await axios.post("http://localhost:4000/api/generate-application", {
        resumeContent,
        jobAd,
        userSettings
      });
      onUpdateCoverLetter(response.data.coverLetter);
      onUpdateResume(response.data.resume);
    } catch (error) {
      console.error("Fehler bei der Generierung:", error);
    } finally {
      setLoading(false);
    }
  };

  // Download-Helfer
  const handleDownload = (fileData: string, fileName: string, fileType: string) => {
    const linkSource = `data:${fileType};base64,${fileData}`;
    const downloadLink = document.createElement("a");
    downloadLink.href = linkSource;
    downloadLink.download = fileName;
    downloadLink.click();
  };

  // DOCX-Download
  const handleDownloadDocx = async (type: "cover" | "resume") => {
    try {
      const response = await axios.post(
        "http://localhost:4000/api/generate-application",
        { resumeContent, jobAd, userSettings },
        { responseType: "json" }
      );

      const fileData =
        type === "cover"
          ? response.data.coverLetterDocx
          : response.data.resumeDocx;
      const fileName =
        type === "cover"
          ? "Anschreiben.docx"
          : "Lebenslauf.docx";

      handleDownload(fileData, fileName, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    } catch (error) {
      console.error("Fehler beim DOCX-Download:", error);
    }
  };

  // PDF-Download
  const handleDownloadPdf = async (type: "cover" | "resume") => {
    try {
      const response = await axios.post(
        "http://localhost:4000/api/generate-application",
        { resumeContent, jobAd, userSettings },
        { responseType: "json" }
      );

      const fileData =
        type === "cover"
          ? response.data.coverLetterPdf
          : response.data.resumePdf;
      const fileName =
        type === "cover"
          ? "Anschreiben.pdf"
          : "Lebenslauf.pdf";

      handleDownload(fileData, fileName, "application/pdf");
    } catch (error) {
      console.error("Fehler beim PDF-Download:", error);
    }
  };

  return (
    <div>
      <h2>4) Vorschau & Export</h2>
      <button onClick={handleGenerate} disabled={loading}>
        {loading ? "Generiere..." : "Anschreiben & Lebenslauf generieren"}
      </button>

      <div style={{ marginTop: 20 }}>
        <h3>Anschreiben Vorschau</h3>
        <pre>{coverLetter}</pre>

        <h3>Lebenslauf Vorschau</h3>
        <pre>{generatedResume}</pre>
      </div>

      <div>
        <button onClick={() => handleDownloadDocx("cover")}>
          Anschreiben als DOCX
        </button>
        <button onClick={() => handleDownloadPdf("cover")}>
          Anschreiben als PDF
        </button>
      </div>
      <div>
        <button onClick={() => handleDownloadDocx("resume")}>
          Lebenslauf als DOCX
        </button>
        <button onClick={() => handleDownloadPdf("resume")}>
          Lebenslauf als PDF
        </button>
      </div>
    </div>
  );
};

export default ApplicationPreview;
'''
    with open(f"{project_name}/client/src/components/ApplicationPreview.tsx", "w", encoding="utf-8") as f:
        f.write(application_preview_tsx)

    # ------------------------------------------------------------------------------------
    # 20) client/src/App.css
    # ------------------------------------------------------------------------------------
    app_css = r''' .app-container {
  max-width: 900px;
  margin: 0 auto;
  font-family: sans-serif;
  padding: 20px;
}

.step {
  margin-bottom: 40px;
}

textarea {
  width: 100%;
  height: 120px;
  margin-top: 10px;
  padding: 10px;
  font-size: 1rem;
}

button {
  margin-top: 10px;
  padding: 10px 15px;
  cursor: pointer;
}
'''
    with open(f"{project_name}/client/src/App.css", "w", encoding="utf-8") as f:
        f.write(app_css)

    # ------------------------------------------------------------------------------------
    # OPTIONAL: .env-Datei vorbereiten
    # ------------------------------------------------------------------------------------
    # Du kannst sie hier auskommentieren oder generieren lassen. 
    # Die API-Keys müssen natürlich valid sein, damit OpenAI bzw. DeepL funktionieren.
    # 
    # env_content = """OPENAI_API_KEY=dein-openai-key
    # DEEPL_API_KEY=dein-deepl-key
    # """
    # with open(f"{project_name}/.env", "w", encoding="utf-8") as f:
    #     f.write(env_content)

    print("Projektstruktur erfolgreich erstellt!")
    logger.info("Projekt erfolgreich angelegt.")
    print(f"Gehe nun in das Verzeichnis '{project_name}' und führe z.B. 'docker-compose up --build' aus.")


if __name__ == "__main__":
    main()
