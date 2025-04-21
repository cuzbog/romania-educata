import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import translationEN from './locales/en/translation.json';
import translationRO from './locales/ro/translation.json';

i18n.use(initReactI18next).init({
    resources: {
        en: { translation: translationEN },
        ro: { translation: translationRO }
    },
    lng: 'ro', // default language
    fallbackLng: 'ro',

    interpolation: {
        escapeValue: false // React already escapes
    }
});

export default i18n;
