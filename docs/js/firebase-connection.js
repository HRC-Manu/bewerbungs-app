// Firebase Connection Tester
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
    getAuth, 
    signInAnonymously, 
    connectAuthEmulator 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
    getFirestore, 
    connectFirestoreEmulator,
    collection, 
    getDocs,
    query,
    limit,
    doc,
    setDoc
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { 
    getStorage, 
    connectStorageEmulator,
    ref,
    listAll
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';
import { FIREBASE_CONFIG, APP_CONFIG } from './config.js';

class FirebaseConnectionTester {
    constructor() {
        this.testResults = {
            app: false,
            auth: false,
            firestore: false,
            storage: false,
            emulators: false
        };
        this.connectionTime = 0;
        this.errors = [];
    }

    async testConnection(config = FIREBASE_CONFIG) {
        console.log('[Firebase Test] Starting connection test...');
        const startTime = performance.now();
        let testApp = null;
        
        try {
            // 1. Test basic connectivity
            await this.testInternetConnection();

            // 2. Test Firebase App initialization
            testApp = await this.testAppInitialization(config);
            if (!testApp) throw new Error('Firebase App initialization failed');

            // 3. Test Services
            await Promise.all([
                this.testAuth(testApp),
                this.testFirestore(testApp),
                this.testStorage(testApp)
            ]);

            // 4. Test Emulators if in development
            if (window.location.hostname === 'localhost') {
                await this.testEmulators(testApp);
            }

            this.connectionTime = performance.now() - startTime;
            console.log('[Firebase Test] All tests completed successfully', this.testResults);
            
            return {
                success: true,
                results: this.testResults,
                connectionTime: this.connectionTime,
                errors: this.errors
            };

        } catch (error) {
            console.error('[Firebase Test] Connection test failed:', error);
            this.errors.push({
                timestamp: new Date(),
                error: error.message,
                code: error.code,
                stack: error.stack
            });

            return {
                success: false,
                results: this.testResults,
                connectionTime: performance.now() - startTime,
                errors: this.errors,
                lastError: error
            };
        } finally {
            // Cleanup test app
            if (testApp) {
                try {
                    await testApp.delete();
                } catch (error) {
                    console.warn('[Firebase Test] Failed to cleanup test app:', error);
                }
            }
        }
    }

    async testInternetConnection() {
        try {
            const response = await fetch('https://firebase.google.com/favicon.ico', {
                mode: 'no-cors',
                cache: 'no-cache'
            });
            return response.type === 'opaque';
        } catch (error) {
            throw new Error('No internet connection available');
        }
    }

    async testAppInitialization(config) {
        try {
            const app = initializeApp(config, 'connectionTest');
            this.testResults.app = true;
            return app;
        } catch (error) {
            this.testResults.app = false;
            throw new Error(`Firebase App initialization failed: ${error.message}`);
        }
    }

    async testAuth(app) {
        try {
            const auth = getAuth(app);
            
            // Test Emulator connection in development
            if (window.location.hostname === 'localhost') {
                connectAuthEmulator(auth, `http://localhost:${APP_CONFIG.firebase.emulators.auth.port}`);
            }

            // Test anonymous auth
            await signInAnonymously(auth);
            
            this.testResults.auth = true;
            return true;
        } catch (error) {
            this.testResults.auth = false;
            throw new Error(`Auth test failed: ${error.message}`);
        }
    }

    async testFirestore(app) {
        try {
            const db = getFirestore(app);
            
            // Test Emulator connection in development
            if (window.location.hostname === 'localhost') {
                connectFirestoreEmulator(db, 'localhost', APP_CONFIG.firebase.emulators.firestore.port);
            }

            // Test basic write and read
            const testDoc = doc(db, 'test', 'connection-test');
            await setDoc(testDoc, {
                timestamp: new Date().toISOString(),
                test: 'Connection Test'
            });

            // Test query
            const testCollection = collection(db, 'test');
            const testQuery = query(testCollection, limit(1));
            await getDocs(testQuery);
            
            this.testResults.firestore = true;
            return true;
        } catch (error) {
            this.testResults.firestore = false;
            throw new Error(`Firestore test failed: ${error.message}`);
        }
    }

    async testStorage(app) {
        try {
            const storage = getStorage(app);
            
            // Test Emulator connection in development
            if (window.location.hostname === 'localhost') {
                connectStorageEmulator(storage, 'localhost', APP_CONFIG.firebase.emulators.storage.port);
            }

            // Test storage listing
            const rootRef = ref(storage);
            await listAll(rootRef);
            
            this.testResults.storage = true;
            return true;
        } catch (error) {
            this.testResults.storage = false;
            throw new Error(`Storage test failed: ${error.message}`);
        }
    }

    async testEmulators(app) {
        try {
            const results = await Promise.allSettled([
                this.testEmulatorConnection('auth', APP_CONFIG.firebase.emulators.auth.port),
                this.testEmulatorConnection('firestore', APP_CONFIG.firebase.emulators.firestore.port),
                this.testEmulatorConnection('storage', APP_CONFIG.firebase.emulators.storage.port)
            ]);

            const failedEmulators = results
                .filter(result => result.status === 'rejected')
                .map(result => result.reason);

            if (failedEmulators.length > 0) {
                throw new Error(`Emulator tests failed: ${failedEmulators.join(', ')}`);
            }

            this.testResults.emulators = true;
            return true;
        } catch (error) {
            this.testResults.emulators = false;
            throw new Error(`Emulator tests failed: ${error.message}`);
        }
    }

    async testEmulatorConnection(service, port) {
        try {
            const response = await fetch(`http://localhost:${port}/`, {
                method: 'GET',
                mode: 'no-cors'
            });
            return response.type === 'opaque';
        } catch (error) {
            throw new Error(`${service} emulator not running on port ${port}`);
        }
    }

    getDetailedReport() {
        return {
            timestamp: new Date(),
            results: this.testResults,
            connectionTime: this.connectionTime,
            errors: this.errors,
            environment: {
                hostname: window.location.hostname,
                userAgent: navigator.userAgent,
                isOnline: navigator.onLine,
                protocol: window.location.protocol
            }
        };
    }
}

// Singleton instance
export const firebaseConnectionTester = new FirebaseConnectionTester();

// Convenience function for quick testing
export async function testFirebaseConnection() {
    return await firebaseConnectionTester.testConnection();
} 