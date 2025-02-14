import { ref, set, get, push, update, remove } from "firebase/database";
import { db } from "../firebase-config.js";

class DatabaseService {
    async saveApplication(userId, applicationData) {
        const applicationsRef = ref(db, `users/${userId}/applications`);
        const newApplicationRef = push(applicationsRef);
        
        await set(newApplicationRef, {
            jobTitle: applicationData.jobTitle,
            company: applicationData.company,
            status: "draft",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            documents: {
                coverLetter: applicationData.coverLetterPath,
                resume: applicationData.resumePath
            }
        });
        
        return newApplicationRef.key;
    }

    async getUserApplications(userId) {
        const applicationsRef = ref(db, `users/${userId}/applications`);
        const snapshot = await get(applicationsRef);
        
        if (snapshot.exists()) {
            return Object.entries(snapshot.val()).map(([key, value]) => ({
                id: key,
                ...value
            }));
        }
        
        return [];
    }
}

export default new DatabaseService(); 
