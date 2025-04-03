/**
 * Bewerberprofil-Manager
 * Basierend auf dem Profil-Management aus Core_Code.md
 */

class ProfileManager {
    constructor() {
        this.profile = this.loadProfile();
        this.autosaveEnabled = true;
    }
    
    /**
     * Lädt das Bewerberprofil aus dem localStorage
     * @returns {Object} Das geladene Profil
     */
    loadProfile() {
        try {
            const savedProfile = localStorage.getItem('bewerberprofil');
            if (savedProfile) {
                return JSON.parse(savedProfile);
            }
        } catch (error) {
            console.error('Fehler beim Laden des Profils:', error);
        }
        
        // Standard-Profil, wenn nichts gespeichert ist
        return {
            personalData: {
                name: '',
                address: '',
                phone: '',
                email: '',
                birthdate: '',
                birthplace: '',
                nationality: '',
                photo: null // Base64-Daten für das Foto
            },
            education: [], // Ausbildung
            experience: [], // Berufserfahrung
            skills: {
                technical: [], // Technische Fähigkeiten
                soft: [], // Soft Skills
                languages: [] // Sprachkenntnisse
            },
            documents: {
                resumes: [], // Gespeicherte Lebenslauf-Versionen
                coverLetters: [] // Gespeicherte Anschreiben
            },
            preferences: {
                darkMode: false,
                fontSize: 'medium',
                language: 'de',
                defaultResumeStyle: 'classic'
            },
            lastUpdated: new Date().toISOString()
        };
    }
    
    /**
     * Speichert das Bewerberprofil im localStorage
     */
    saveProfile() {
        try {
            // Aktualisiere den Zeitstempel
            this.profile.lastUpdated = new Date().toISOString();
            
            // Speichere das Profil
            localStorage.setItem('bewerberprofil', JSON.stringify(this.profile));
            console.log('Profil gespeichert:', new Date().toLocaleTimeString());
            return true;
        } catch (error) {
            console.error('Fehler beim Speichern des Profils:', error);
            return false;
        }
    }
    
    /**
     * Persönliche Daten aktualisieren
     * @param {Object} personalData - Die neuen persönlichen Daten
     */
    updatePersonalData(personalData) {
        this.profile.personalData = {
            ...this.profile.personalData,
            ...personalData
        };
        
        if (this.autosaveEnabled) {
            this.saveProfile();
        }
    }
    
    /**
     * Bildungsweg-Eintrag hinzufügen
     * @param {Object} educationEntry - Der neue Bildungsweg-Eintrag
     */
    addEducation(educationEntry) {
        if (!educationEntry.id) {
            educationEntry.id = Date.now().toString();
        }
        
        this.profile.education.push(educationEntry);
        
        if (this.autosaveEnabled) {
            this.saveProfile();
        }
    }
    
    /**
     * Bildungsweg-Eintrag aktualisieren
     * @param {string} id - Die ID des zu aktualisierenden Eintrags
     * @param {Object} updatedEntry - Die aktualisierten Daten
     */
    updateEducation(id, updatedEntry) {
        const index = this.profile.education.findIndex(entry => entry.id === id);
        if (index !== -1) {
            this.profile.education[index] = {
                ...this.profile.education[index],
                ...updatedEntry,
                id
            };
            
            if (this.autosaveEnabled) {
                this.saveProfile();
            }
            
            return true;
        }
        
        return false;
    }
    
    /**
     * Bildungsweg-Eintrag löschen
     * @param {string} id - Die ID des zu löschenden Eintrags
     */
    removeEducation(id) {
        const initialLength = this.profile.education.length;
        this.profile.education = this.profile.education.filter(entry => entry.id !== id);
        
        if (initialLength !== this.profile.education.length && this.autosaveEnabled) {
            this.saveProfile();
            return true;
        }
        
        return false;
    }
    
    /**
     * Berufserfahrungs-Eintrag hinzufügen
     * @param {Object} experienceEntry - Der neue Berufserfahrungs-Eintrag
     */
    addExperience(experienceEntry) {
        if (!experienceEntry.id) {
            experienceEntry.id = Date.now().toString();
        }
        
        this.profile.experience.push(experienceEntry);
        
        if (this.autosaveEnabled) {
            this.saveProfile();
        }
    }
    
    /**
     * Berufserfahrungs-Eintrag aktualisieren
     * @param {string} id - Die ID des zu aktualisierenden Eintrags
     * @param {Object} updatedEntry - Die aktualisierten Daten
     */
    updateExperience(id, updatedEntry) {
        const index = this.profile.experience.findIndex(entry => entry.id === id);
        if (index !== -1) {
            this.profile.experience[index] = {
                ...this.profile.experience[index],
                ...updatedEntry,
                id
            };
            
            if (this.autosaveEnabled) {
                this.saveProfile();
            }
            
            return true;
        }
        
        return false;
    }
    
    /**
     * Berufserfahrungs-Eintrag löschen
     * @param {string} id - Die ID des zu löschenden Eintrags
     */
    removeExperience(id) {
        const initialLength = this.profile.experience.length;
        this.profile.experience = this.profile.experience.filter(entry => entry.id !== id);
        
        if (initialLength !== this.profile.experience.length && this.autosaveEnabled) {
            this.saveProfile();
            return true;
        }
        
        return false;
    }
    
    /**
     * Fähigkeit hinzufügen
     * @param {string} category - Die Kategorie der Fähigkeit (technical, soft, languages)
     * @param {string} skill - Die Fähigkeit
     * @param {Object} additionalData - Zusätzliche Daten zur Fähigkeit (z.B. Level)
     */
    addSkill(category, skill, additionalData = {}) {
        if (!this.profile.skills[category]) {
            return false;
        }
        
        // Prüfe, ob die Fähigkeit bereits existiert
        const existingIndex = this.profile.skills[category].findIndex(
            s => typeof s === 'string' ? s === skill : s.name === skill
        );
        
        if (existingIndex === -1) {
            // Füge die Fähigkeit in einem einheitlichen Format hinzu
            const skillEntry = typeof skill === 'string' && Object.keys(additionalData).length === 0 
                ? skill 
                : { name: skill, ...additionalData };
            
            this.profile.skills[category].push(skillEntry);
            
            if (this.autosaveEnabled) {
                this.saveProfile();
            }
            
            return true;
        }
        
        return false;
    }
    
    /**
     * Fähigkeit entfernen
     * @param {string} category - Die Kategorie der Fähigkeit (technical, soft, languages)
     * @param {string} skill - Die zu entfernende Fähigkeit
     */
    removeSkill(category, skill) {
        if (!this.profile.skills[category]) {
            return false;
        }
        
        const initialLength = this.profile.skills[category].length;
        
        this.profile.skills[category] = this.profile.skills[category].filter(
            s => typeof s === 'string' ? s !== skill : s.name !== skill
        );
        
        if (initialLength !== this.profile.skills[category].length && this.autosaveEnabled) {
            this.saveProfile();
            return true;
        }
        
        return false;
    }
    
    /**
     * Dokument speichern
     * @param {string} type - Der Dokumenttyp (resumes oder coverLetters)
     * @param {Object} document - Das zu speichernde Dokument
     */
    saveDocument(type, document) {
        if (!this.profile.documents[type]) {
            return false;
        }
        
        if (!document.id) {
            document.id = Date.now().toString();
        }
        
        document.lastModified = new Date().toISOString();
        
        // Prüfe, ob das Dokument bereits existiert
        const existingIndex = this.profile.documents[type].findIndex(doc => doc.id === document.id);
        
        if (existingIndex !== -1) {
            // Aktualisiere das Dokument
            this.profile.documents[type][existingIndex] = {
                ...this.profile.documents[type][existingIndex],
                ...document
            };
        } else {
            // Füge ein neues Dokument hinzu
            this.profile.documents[type].push(document);
        }
        
        if (this.autosaveEnabled) {
            this.saveProfile();
        }
        
        return document.id;
    }
    
    /**
     * Dokument löschen
     * @param {string} type - Der Dokumenttyp (resumes oder coverLetters)
     * @param {string} id - Die ID des zu löschenden Dokuments
     */
    removeDocument(type, id) {
        if (!this.profile.documents[type]) {
            return false;
        }
        
        const initialLength = this.profile.documents[type].length;
        this.profile.documents[type] = this.profile.documents[type].filter(doc => doc.id !== id);
        
        if (initialLength !== this.profile.documents[type].length && this.autosaveEnabled) {
            this.saveProfile();
            return true;
        }
        
        return false;
    }
    
    /**
     * Profil exportieren
     * @param {boolean} includeDocuments - Ob Dokumente mit exportiert werden sollen
     * @returns {string} Das exportierte Profil als JSON-String
     */
    exportProfile(includeDocuments = true) {
        try {
            const exportData = { ...this.profile };
            
            if (!includeDocuments) {
                exportData.documents = {
                    resumes: [],
                    coverLetters: []
                };
            }
            
            return JSON.stringify(exportData, null, 2);
        } catch (error) {
            console.error('Fehler beim Exportieren des Profils:', error);
            return null;
        }
    }
    
    /**
     * Profil importieren
     * @param {string} jsonData - Das zu importierende Profil als JSON-String
     * @param {boolean} merge - Ob die Daten mit dem bestehenden Profil zusammengeführt werden sollen
     * @returns {boolean} Ob der Import erfolgreich war
     */
    importProfile(jsonData, merge = false) {
        try {
            const importedProfile = JSON.parse(jsonData);
            
            if (merge) {
                // Zusammenführen der Daten
                this.profile = this.mergeProfiles(this.profile, importedProfile);
            } else {
                // Vollständiges Ersetzen
                this.profile = importedProfile;
            }
            
            this.saveProfile();
            return true;
        } catch (error) {
            console.error('Fehler beim Importieren des Profils:', error);
            return false;
        }
    }
    
    /**
     * Zwei Profile zusammenführen
     * @private
     */
    mergeProfiles(profile1, profile2) {
        const merged = { ...profile1 };
        
        // Persönliche Daten zusammenführen
        merged.personalData = { ...profile1.personalData, ...profile2.personalData };
        
        // Arrays für Bildung und Erfahrung zusammenführen und Duplikate vermeiden
        if (profile2.education && profile2.education.length > 0) {
            const existingIds = new Set(profile1.education.map(item => item.id));
            profile2.education.forEach(item => {
                if (!existingIds.has(item.id)) {
                    merged.education.push(item);
                }
            });
        }
        
        if (profile2.experience && profile2.experience.length > 0) {
            const existingIds = new Set(profile1.experience.map(item => item.id));
            profile2.experience.forEach(item => {
                if (!existingIds.has(item.id)) {
                    merged.experience.push(item);
                }
            });
        }
        
        // Skills zusammenführen
        for (const category in profile2.skills) {
            if (merged.skills[category]) {
                const existingSkills = new Set(merged.skills[category].map(
                    s => typeof s === 'string' ? s : s.name
                ));
                
                profile2.skills[category].forEach(skill => {
                    const skillName = typeof skill === 'string' ? skill : skill.name;
                    if (!existingSkills.has(skillName)) {
                        merged.skills[category].push(skill);
                    }
                });
            }
        }
        
        // Dokumente zusammenführen
        for (const type in profile2.documents) {
            if (merged.documents[type]) {
                const existingIds = new Set(merged.documents[type].map(doc => doc.id));
                profile2.documents[type].forEach(doc => {
                    if (!existingIds.has(doc.id)) {
                        merged.documents[type].push(doc);
                    }
                });
            }
        }
        
        return merged;
    }
    
    /**
     * Generiert ein PDF-Profil (simuliert)
     * @returns {Promise<boolean>} Ob die Generierung erfolgreich war
     */
    async generatePDFProfile() {
        console.log('PDF-Profil wird generiert...');
        // In einer tatsächlichen Implementierung würde hier eine PDF-Bibliothek verwendet werden
        
        return new Promise(resolve => {
            // Simuliere asynchrone Verarbeitung
            setTimeout(() => {
                console.log('PDF-Profil wurde generiert');
                resolve(true);
            }, 1500);
        });
    }
}

// Globale Instanz erstellen
const profileManager = new ProfileManager();
export default profileManager; 