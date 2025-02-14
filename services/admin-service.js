"use strict";

import { db } from '../firebase-config.js';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, getDocs, collection } from "firebase/firestore";

/**
 * Vereinfacht: Wir speichern eine Collection "paywall" in Firestore
 *   - Document "vouchers": { codes: [ "CODE1", "CODE2" ] }
 *   - Document "admins": { emails: [ "abc@def.com", ... ] } 
 */

// Haupt-Admin:
const MAIN_ADMIN_EMAIL = "manuelvonweiss@icloud.com";

class AdminService {
    async checkIsAdmin(email) {
        // Basic-Check: Hauptadmin oder in "admins"?
        if (email === MAIN_ADMIN_EMAIL) return true;

        // Dokument "paywall/admins" => Array includes email
        const adminsRef = doc(db, "paywall", "admins");
        const snap = await getDoc(adminsRef);
        if (snap.exists()) {
            const data = snap.data();
            return Array.isArray(data.emails) && data.emails.includes(email);
        }
        return false;
    }

    async checkVoucherCode(code) {
        const vouchersRef = doc(db, "paywall", "vouchers");
        const snap = await getDoc(vouchersRef);
        if (!snap.exists()) {
            return false;
        }
        const data = snap.data();
        if (!Array.isArray(data.codes)) return false;
        return data.codes.includes(code);
    }

    async addVoucherCode(code) {
        // Fügt einen neuen Code in paywall/vouchers hinzu
        const vouchersRef = doc(db, "paywall", "vouchers");
        const snap = await getDoc(vouchersRef);
        if (!snap.exists()) {
            // Erstelle neu
            await setDoc(vouchersRef, {
                codes: [code]
            });
            return;
        }
        // Existiert: Update
        await updateDoc(vouchersRef, {
            codes: arrayUnion(code)
        });
    }

    async getAllVoucherCodes() {
        const vouchersRef = doc(db, "paywall", "vouchers");
        const snap = await getDoc(vouchersRef);
        if (!snap.exists()) return [];
        const data = snap.data();
        if (!Array.isArray(data.codes)) return [];
        return data.codes;
    }
}

export default new AdminService(); 