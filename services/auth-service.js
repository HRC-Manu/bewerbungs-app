"use strict";

import { 
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail,
    updatePassword,
    updateProfile,
    reauthenticateWithCredential,
    EmailAuthProvider,
    sendEmailVerification
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, setDoc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { auth, db } from "../firebase-config.js";

class AuthService {
    constructor() {
        this.currentUser = null;
        this.auth = auth;
        
        // Auth state listener
        this.auth.onAuthStateChanged((user) => {
            this.currentUser = user;
            this._triggerAuthStateChange(user);
        });
        
        // Callbacks für Auth-State-Changes
        this.authStateCallbacks = new Set();
    }

    // Auth state management
    onAuthStateChanged(callback) {
        this.authStateCallbacks.add(callback);
        // Initial callback mit aktuellem Status
        if (this.currentUser) {
            callback(this.currentUser);
        }
        return () => this.authStateCallbacks.delete(callback);
    }

    _triggerAuthStateChange(user) {
        this.authStateCallbacks.forEach(callback => callback(user));
    }

    // Registrierung
    async register({ email, password, firstName, lastName }) {
        try {
            // Input validation
            if (!email || !password || !firstName || !lastName) {
                throw new Error('Alle Felder müssen ausgefüllt sein');
            }
            
            if (password.length < 8) {
                throw new Error('Das Passwort muss mindestens 8 Zeichen lang sein');
            }

            // Create auth user
            const userCredential = await createUserWithEmailAndPassword(
                this.auth,
                email,
                password
            );

            // Send verification email
            await sendEmailVerification(userCredential.user);

            // Update profile
            await updateProfile(userCredential.user, {
                displayName: `${firstName} ${lastName}`
            });

            // Create user document in Firestore
            await setDoc(doc(db, "users", userCredential.user.uid), {
                firstName,
                lastName,
                email,
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString(),
                isEmailVerified: false
            });

            return userCredential.user;
        } catch (error) {
            console.error('[AuthService] Register error:', error);
            throw this._handleError(error);
        }
    }

    // Login
    async login(email, password, rememberMe = false) {
        try {
            // Input validation
            if (!email || !password) {
                throw new Error('E-Mail und Passwort müssen angegeben werden');
            }

            // Sign in
            const userCredential = await signInWithEmailAndPassword(
                this.auth,
                email,
                password
            );

            // Update last login
            const userRef = doc(db, "users", userCredential.user.uid);
            await updateDoc(userRef, {
                lastLogin: new Date().toISOString()
            });

            // Set persistence if rememberMe is true
            if (rememberMe) {
                await this.auth.setPersistence('LOCAL');
            } else {
                await this.auth.setPersistence('SESSION');
            }

            return userCredential.user;
        } catch (error) {
            console.error('[AuthService] Login error:', error);
            throw this._handleError(error);
        }
    }

    // Logout
    async logout() {
        try {
            await signOut(this.auth);
        } catch (error) {
            console.error('[AuthService] Logout error:', error);
            throw this._handleError(error);
        }
    }

    // Password reset
    async resetPassword(email) {
        try {
            if (!email) {
                throw new Error('E-Mail-Adresse muss angegeben werden');
            }
            await sendPasswordResetEmail(this.auth, email, {
                url: window.location.origin + '/login',
                handleCodeInApp: true
            });
        } catch (error) {
            console.error('[AuthService] Password reset error:', error);
            throw this._handleError(error);
        }
    }

    // Password change
    async changePassword(currentPassword, newPassword) {
        try {
            if (!this.currentUser) {
                throw new Error('Nicht eingeloggt');
            }

            if (newPassword.length < 8) {
                throw new Error('Das neue Passwort muss mindestens 8 Zeichen lang sein');
            }

            // Reauth before changing password
            const credential = EmailAuthProvider.credential(
                this.currentUser.email,
                currentPassword
            );
            await reauthenticateWithCredential(this.currentUser, credential);

            // Change password
            await updatePassword(this.currentUser, newPassword);
        } catch (error) {
            console.error('[AuthService] Change password error:', error);
            throw this._handleError(error);
        }
    }

    // Profile update
    async updateUserProfile(data) {
        try {
            if (!this.currentUser) {
                throw new Error('Nicht eingeloggt');
            }

            // Update auth profile
            await updateProfile(this.currentUser, {
                displayName: `${data.firstName} ${data.lastName}`
            });

            // Update Firestore document
            const userRef = doc(db, "users", this.currentUser.uid);
            await updateDoc(userRef, {
                firstName: data.firstName,
                lastName: data.lastName,
                updatedAt: new Date().toISOString()
            });
        } catch (error) {
            console.error('[AuthService] Update profile error:', error);
            throw this._handleError(error);
        }
    }

    // Get user profile
    async getUserProfile() {
        try {
            if (!this.currentUser) {
                throw new Error('Nicht eingeloggt');
            }

            const userRef = doc(db, "users", this.currentUser.uid);
            const userDoc = await getDoc(userRef);

            if (!userDoc.exists()) {
                throw new Error('Benutzerprofil nicht gefunden');
            }

            return userDoc.data();
        } catch (error) {
            console.error('[AuthService] Get profile error:', error);
            throw this._handleError(error);
        }
    }

    // Check auth state
    async checkAuth() {
        return new Promise((resolve) => {
            const unsubscribe = this.auth.onAuthStateChanged((user) => {
                unsubscribe();
                resolve(user);
            });
        });
    }

    // Error handling
    _handleError(error) {
        let message = 'Ein Fehler ist aufgetreten';
        
        switch (error.code) {
            // Auth errors
            case 'auth/email-already-in-use':
                message = 'Diese E-Mail-Adresse wird bereits verwendet';
                break;
            case 'auth/invalid-email':
                message = 'Ungültige E-Mail-Adresse';
                break;
            case 'auth/operation-not-allowed':
                message = 'Anmeldung mit E-Mail und Passwort ist nicht aktiviert';
                break;
            case 'auth/weak-password':
                message = 'Das Passwort ist zu schwach';
                break;
            case 'auth/user-disabled':
                message = 'Dieser Account wurde deaktiviert';
                break;
            case 'auth/user-not-found':
                message = 'Kein Account mit dieser E-Mail-Adresse gefunden';
                break;
            case 'auth/wrong-password':
                message = 'Falsches Passwort';
                break;
            case 'auth/too-many-requests':
                message = 'Zu viele Anmeldeversuche. Bitte warten Sie einen Moment.';
                break;
            case 'auth/requires-recent-login':
                message = 'Bitte melden Sie sich erneut an, um diese Aktion durchzuführen';
                break;
            default:
                message = error.message || 'Ein unbekannter Fehler ist aufgetreten';
        }
        
        return new Error(message);
    }
}

// Singleton instance
export default new AuthService(); 
