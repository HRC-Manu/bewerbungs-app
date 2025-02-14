import { 
    collection, 
    addDoc, 
    updateDoc,
    getDoc,
    getDocs,
    query,
    where,
    doc
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase-config";

class DocumentService {
    async saveApplication(userId, applicationData) {
        try {
            // Speichere Hauptdaten in Firestore
            const docRef = await addDoc(collection(db, "applications"), {
                userId,
                jobTitle: applicationData.jobTitle,
                company: applicationData.company,
                status: "draft",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });

            // Speichere Dokumente im Storage
            const coverLetterRef = ref(storage, `applications/${docRef.id}/cover-letter.pdf`);
            const resumeRef = ref(storage, `applications/${docRef.id}/resume.pdf`);

            await Promise.all([
                uploadBytes(coverLetterRef, applicationData.coverLetterPdf),
                uploadBytes(resumeRef, applicationData.resumePdf)
            ]);

            return docRef.id;
        } catch (error) {
            console.error("Save application error:", error);
            throw error;
        }
    }

    async getUserApplications(userId) {
        try {
            const q = query(
                collection(db, "applications"), 
                where("userId", "==", userId)
            );
            
            const querySnapshot = await getDocs(q);
            const applications = [];
            
            for (const doc of querySnapshot.docs) {
                const data = doc.data();
                // Hole Download-URLs für die PDFs
                const [coverLetterUrl, resumeUrl] = await Promise.all([
                    getDownloadURL(ref(storage, `applications/${doc.id}/cover-letter.pdf`)),
                    getDownloadURL(ref(storage, `applications/${doc.id}/resume.pdf`))
                ]);
                
                applications.push({
                    id: doc.id,
                    ...data,
                    coverLetterUrl,
                    resumeUrl
                });
            }
            
            return applications;
        } catch (error) {
            console.error("Get applications error:", error);
            throw error;
        }
    }
}

export default new DocumentService(); 
