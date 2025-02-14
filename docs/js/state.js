"use strict";

// Global state management
export const globalState = {
    currentStep: 1,
    resumeAnalysis: null,
    jobAnalysis: null,
    selectedAIProvider: 'openai',
    selectedCoverLetterStyle: 'formal',
    elements: {}
};

// Constants
export const ANALYSIS_SETTINGS = {
    positions: {
        developer: ['entwickler', 'programmierer', 'software engineer', 'full-stack', 'frontend', 'backend', 'web developer', 'app developer'],
        manager: ['manager', 'leiter', 'führungskraft', 'teamleiter', 'projektleiter', 'gruppenleiter', 'abteilungsleiter'],
        consultant: ['berater', 'consultant', 'architekt', 'spezialist', 'experte'],
        analyst: ['analyst', 'data scientist', 'business intelligence', 'datenanalyst', 'market researcher']
    },
    levels: {
        junior: ['junior', 'entry level', 'berufseinsteiger', 'trainee', 'praktikant'],
        senior: ['senior', 'erfahren', 'expert', 'professional', 'spezialist'],
        lead: ['lead', 'principal', 'head of', 'leitung', 'chief', 'direktor']
    },
    departments: {
        it: ['it', 'edv', 'software', 'entwicklung', 'tech', 'digital', 'system', 'application'],
        hr: ['hr', 'personal', 'recruiting', 'talent', 'human resources', 'personalabteilung'],
        finance: ['finance', 'finanzen', 'controlling', 'buchhaltung', 'rechnungswesen'],
        sales: ['sales', 'vertrieb', 'marketing', 'business development', 'account management']
    },
    culture: {
        formal: ['etabliert', 'traditionell', 'strukturiert', 'corporate', 'konzern', 'bank', 'versicherung'],
        casual: ['startup', 'dynamisch', 'agil', 'modern', 'jung', 'kreativ', 'flexibel'],
        innovative: ['innovativ', 'zukunftsorientiert', 'digital', 'technologieführer', 'vorreiter']
    },
    requirements: {
        mustHave: ['muss', 'zwingend', 'notwendig', 'erforderlich', 'vorausgesetzt'],
        niceToHave: ['wünschenswert', 'von vorteil', 'plus', 'ideal', 'gerne']
    }
};

export const LETTER_TEMPLATES = {
    recipient: {
        formal: {
            known: (name) => `Sehr geehrte/r Frau/Herr ${name},`,
            unknown: 'Sehr geehrte Damen und Herren,'
        },
        casual: {
            known: (name) => `Hallo ${name},`,
            unknown: 'Hallo,'
        }
    },
    subject: {
        standard: (position, refNumber = '') => 
            `Bewerbung als ${position}${refNumber ? ` (Referenz: ${refNumber})` : ''}`,
        experienced: (position, years) => 
            `Erfahrene/r ${position} (${years} Jahre Berufserfahrung) sucht neue Herausforderung`
    }
};

export const IMPROVEMENT_PATTERNS = {
    passive: {
        pattern: /wurde|werden|worden/g,
        suggestion: 'Verwenden Sie aktive Formulierungen für mehr Wirkung'
    },
    filler: {
        pattern: /eigentlich|quasi|sozusagen|gewissermaßen/g,
        suggestion: 'Vermeiden Sie Füllwörter für präzisere Aussagen'
    },
    weak: {
        pattern: /vielleicht|eventuell|möglicherweise|könnte|würde/g,
        suggestion: 'Nutzen Sie stärkere Formulierungen für mehr Überzeugungskraft'
    }
}; 
