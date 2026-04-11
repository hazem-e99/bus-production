// Simple i18n helpers to load JSON dictionaries and translate keys
export type AppLanguage = 'en' | 'ar'

export type I18nDictionary = Record<string, any>

export const DEFAULT_LANG: AppLanguage = 'en'
export const SUPPORTED_LANGS: AppLanguage[] = ['en', 'ar']

// Dynamic import of locale files (namespace: common)
export async function loadLocale(lang: AppLanguage): Promise<I18nDictionary> {
	try {
		if (lang === 'ar') {
			const mod = await import('@/locales/ar/common.json')
			return mod.default || mod
		}
		const mod = await import('@/locales/en/common.json')
		return mod.default || mod
	} catch (_e) {
		// Fallback to English embedded minimal dictionary
		return {}
	}
}

// Get value from nested object by dotted key, e.g., 'nav.users'
export function getByPath(obj: I18nDictionary, path: string): string | undefined {
	return path.split('.').reduce<any>((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), obj)
}

export function translate(dict: I18nDictionary, key: string, fallback?: string): string {
	const v = getByPath(dict, key)
	if (typeof v === 'string') return v
	// Allow using literal English phrases as keys too
	if (dict[key] && typeof dict[key] === 'string') return dict[key]
	return fallback ?? key
}

