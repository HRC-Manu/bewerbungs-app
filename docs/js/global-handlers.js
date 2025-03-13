import AuthService from './services/auth-service.js';

// Globale Funktion für HTML onclick-Handler
window.checkAuth = async function() {
    try {
        await AuthService.checkAuth();
        return true;
    } catch (error) {
        console.error('Auth check failed:', error);
        return false;
    }
};

// Weitere globale Handler hier 