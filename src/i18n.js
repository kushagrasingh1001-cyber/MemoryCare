import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './translations/en.json';
import hi from './translations/hi.json';
import as from './translations/as.json';
import mni from './translations/mni.json';

export const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'as', label: 'Assamese', native: 'অসমীয়া' },
  { code: 'mni', label: 'Manipuri', native: 'মৈতৈলোন্' },
];

const STORAGE_KEY = 'memorycare-language';

export function getSavedLanguage() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && LANGUAGES.some(l => l.code === saved)) return saved;
  // Best effort: match the browser language so North East users land in their own language.
  const browser = (navigator.language || 'en').toLowerCase();
  const match = LANGUAGES.find(l => browser === l.code || browser.startsWith(`${l.code}-`));
  if (match) return match.code;
  if (browser.startsWith('bn')) return 'as';
  return 'en';
}

export function changeAppLanguage(code) {
  i18n.changeLanguage(code);
  localStorage.setItem(STORAGE_KEY, code);
  try {
    document.documentElement.lang = code;
  } catch {}
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    hi: { translation: hi },
    as: { translation: as },
    mni: { translation: mni },
  },
  lng: getSavedLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnObjects: true,
});

try {
  document.documentElement.lang = i18n.language;
} catch {}

export default i18n;
