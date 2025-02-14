"use strict";

import { 
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase-config";

class AuthService {
    async register(userData) {
        try {
            console.debug('[AuthService] Registriere Benutzer:', userData.email);
            // Erstelle Firebase Auth User
            const userCredential = await createUserWithEmailAndPassword(
                auth,
                userData.email,
                userData.password
            );

            // Speichere zusätzliche Nutzerdaten in Firestore
            await setDoc(doc(db, "users", userCredential.user.uid), {
                firstName: userData.firstName,
                lastName: userData.lastName,
                email: userData.email,
                createdAt: new Date().toISOString()
            });

            return userCredential.user;
        } catch (error) {
            console.error('[AuthService] Register error:', error);
            throw this._handleError(error);
        }
    }

    async login(email, password) {
        try {
            const result = await signInWithEmailAndPassword(auth, email, password);
            return result.user;
        } catch (error) {
            console.error("Login error:", error);
            throw this._handleError(error);
        }
    }

    async logout() {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Logout error:", error);
            throw this._handleError(error);
        }
    }

    async resetPassword(email) {
        try {
            await sendPasswordResetEmail(auth, email);
        } catch (error) {
            console.error("Password reset error:", error);
            throw this._handleError(error);
        }
    }

    _handleError(error) {
        let message = "Ein Fehler ist aufgetreten";
        
        switch (error.code) {
            case 'auth/email-already-in-use':
                message = "Diese E-Mail-Adresse wird bereits verwendet";
                break;
            case 'auth/invalid-email':
                message = "Ungültige E-Mail-Adresse";
                break;
            case 'auth/operation-not-allowed':
                message = "Anmeldung mit E-Mail und Passwort ist nicht aktiviert";
                break;
            case 'auth/weak-password':
                message = "Das Passwort ist zu schwach";
                break;
            case 'auth/user-disabled':
                message = "Dieser Account wurde deaktiviert";
                break;
            case 'auth/user-not-found':
                message = "Kein Account mit dieser E-Mail-Adresse gefunden";
                break;
            case 'auth/wrong-password':
                message = "Falsches Passwort";
                break;
        }
        
        return new Error(message);
    }
}

export default new AuthService(); 
