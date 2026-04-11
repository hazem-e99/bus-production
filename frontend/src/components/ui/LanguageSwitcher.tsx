"use client";
import React from 'react'
import { useI18n } from '@/contexts/LanguageContext'

export default function LanguageSwitcher({ className }: { className?: string }) {
	const { lang, setLang } = useI18n()
	const toggle = () => setLang(lang === 'en' ? 'ar' : 'en')
	return (
		<button
			aria-label="Toggle language"
			onClick={toggle}
			className={className || 'px-3 py-2 rounded-xl border bg-white hover:bg-gray-50 text-sm'}
		>
			{lang === 'en' ? 'العربية' : 'English'}
		</button>
	)
}

