import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import zh from './zh.json';

const STORAGE_KEY = 'canvas-collab.lang';

const initial =
  (typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY)) || 'en';

export const i18n = i18next.createInstance();

void i18n.use(initReactI18next).init({
  lng: initial,
  fallbackLng: 'en',
  resources: {
    en: { translation: en },
    zh: { translation: zh },
  },
  interpolation: { escapeValue: false },
});

export function setLanguage(lang: 'en' | 'zh') {
  void i18n.changeLanguage(lang);
  if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, lang);
}

export function currentLanguage(): 'en' | 'zh' {
  return (i18n.language as 'en' | 'zh') ?? 'en';
}
