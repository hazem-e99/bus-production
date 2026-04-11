"use client";
import React from 'react'
import { LanguageProvider } from '@/contexts/LanguageContext'
import type { AppLanguage } from '@/lib/i18n'

export default function I18nProvider({ children, initialLang }: { children: React.ReactNode; initialLang?: AppLanguage }) {
	return (
		<LanguageProvider initialLang={initialLang}>{children}</LanguageProvider>
	)
}

