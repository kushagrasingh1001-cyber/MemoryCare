// Locale helpers used for dates, times and speech synthesis.
const LOCALES = {
  en: 'en-IN',
  hi: 'hi-IN',
  as: 'as-IN',
  mni: 'mni-IN',
};

// Speech voices that are close matches when an exact voice is missing.
const SPEECH_FALLBACKS = {
  en: ['en-in', 'en-gb', 'en-us', 'en'],
  hi: ['hi-in', 'hi'],
  as: ['as-in', 'bn-in', 'bn', 'hi-in', 'en-in'],
  mni: ['mni-in', 'bn-in', 'bn', 'hi-in', 'en-in'],
};

export function localeFor(language) {
  const code = (language || 'en').split('-')[0];
  return LOCALES[code] || 'en-IN';
}

export function speechLocalesFor(language) {
  const code = (language || 'en').split('-')[0];
  return SPEECH_FALLBACKS[code] || SPEECH_FALLBACKS.en;
}

export function formatDateTime(value, language) {
  const date = value?.toDate ? value.toDate() : value instanceof Date ? value : value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(localeFor(language), { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function formatTime(value, language) {
  const date = value?.toDate ? value.toDate() : value instanceof Date ? value : value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString(localeFor(language), { hour: '2-digit', minute: '2-digit' });
}
