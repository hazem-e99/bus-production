"use client";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { DEFAULT_LANG, SUPPORTED_LANGS, type AppLanguage, type I18nDictionary, loadLocale, translate } from '@/lib/i18n'

type LanguageContextValue = {
	lang: AppLanguage
	setLang: (l: AppLanguage) => void
	dict: I18nDictionary
	t: (key: string, fallback?: string) => string
	isRTL: boolean
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined)

const COOKIE_NAME = 'lang'
const STORAGE_KEY = 'lang'

function getInitialLang(): AppLanguage {
	if (typeof document !== 'undefined') {
		// cookie first
		const m = document.cookie.match(/(?:^|; )lang=([^;]+)/)
		if (m) {
			const v = decodeURIComponent(m[1]) as AppLanguage
			if (SUPPORTED_LANGS.includes(v)) return v
		}
		// localStorage
		try {
			const ls = localStorage.getItem(STORAGE_KEY) as AppLanguage | null
			if (ls && SUPPORTED_LANGS.includes(ls)) return ls
		} catch {}
	}
	return DEFAULT_LANG
}

export function LanguageProvider({ children, initialLang }: { children: React.ReactNode; initialLang?: AppLanguage }) {
	const [lang, setLangState] = useState<AppLanguage>(initialLang || getInitialLang())
	const [dict, setDict] = useState<I18nDictionary>({})

	const load = useCallback(async (l: AppLanguage) => {
		const d = await loadLocale(l)
		setDict(d)
	}, [])

	useEffect(() => { load(lang) }, [lang, load])

	// Persist and apply html attributes
	useEffect(() => {
		if (typeof document === 'undefined') return
		try { localStorage.setItem(STORAGE_KEY, lang) } catch {}
		const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString()
		document.cookie = `${COOKIE_NAME}=${encodeURIComponent(lang)}; path=/; expires=${expires}`
		document.documentElement.lang = lang
		document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
	}, [lang])

	const setLang = useCallback((l: AppLanguage) => {
		if (!SUPPORTED_LANGS.includes(l)) return
		setLangState(l)
	}, [])

	const t = useCallback((key: string, fallback?: string) => translate(dict, key, fallback), [dict])
	const isRTL = lang === 'ar'

	const value = useMemo(() => ({ lang, setLang, dict, t, isRTL }), [lang, setLang, dict, t, isRTL])
	return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useI18n() {
	const ctx = useContext(LanguageContext)
	if (!ctx) throw new Error('useI18n must be used within LanguageProvider')
	return ctx
}

