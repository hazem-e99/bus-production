#!/usr/bin/env node
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const localesRoot = path.join(projectRoot, 'src', 'locales')

const supportedLanguages = ['en', 'ar']
const defaultNamespace = 'common'
const defaultProvider = process.env.TRANSLATE_PROVIDER || 'google'
const placeholderPattern = /\{\{[^}]+\}\}|\{[a-zA-Z_][\w.]*\}|%[sdif]/g
const glossary = {
  'ar:en': new Map([
    ['الكل', 'All'],
    ['تصفية', 'Filters'],
    ['الرحلات المنتهية', 'Completed trips'],
  ]),
  'en:ar': new Map([
    ['all', 'الكل'],
    ['filters', 'الفلاتر'],
    ['completed trips', 'الرحلات المكتملة'],
  ]),
}

const args = parseArgs(process.argv.slice(2))
const shouldFix = args.fix === true
const providerName = String(args.provider || defaultProvider).toLowerCase()
const namespaceArg = args.namespace || args.ns || defaultNamespace
const force = args.force === true
const maxExamples = Number(args.examples || 20)

main().catch((error) => {
  console.error(`\n[i18n] ${error.message}`)
  process.exitCode = 1
})

async function main() {
  const namespaces =
    namespaceArg === 'all' ? await discoverNamespaces() : [String(namespaceArg)]

  let totalIssues = 0
  let totalUpdated = 0

  for (const namespace of namespaces) {
    const files = {
      en: path.join(localesRoot, 'en', `${namespace}.json`),
      ar: path.join(localesRoot, 'ar', `${namespace}.json`),
    }

    const dictionaries = {
      en: await readJson(files.en),
      ar: await readJson(files.ar),
    }

    const result = await syncNamespace(namespace, dictionaries)
    totalIssues += result.issues.length
    totalUpdated += result.updated

    printNamespaceReport(namespace, result, maxExamples)

    if (shouldFix) {
      for (const lang of result.changedLanguages) {
        await fs.writeFile(files[lang], `${JSON.stringify(dictionaries[lang], null, 2)}\n`, 'utf8')
      }
    }
  }

  console.log(
    `\n[i18n] ${shouldFix ? 'fixed' : 'checked'} ${namespaces.length} namespace(s). ` +
      `issues: ${totalIssues}, updated: ${totalUpdated}.`
  )

  if (!shouldFix && totalIssues > 0) {
    console.log('[i18n] Run `npm run i18n:translate` to write translated values.')
  }
}

async function syncNamespace(namespace, dictionaries) {
  const enFlat = flatten(dictionaries.en)
  const arFlat = flatten(dictionaries.ar)
  const allKeys = unique([...Object.keys(enFlat), ...Object.keys(arFlat)]).sort()
  const issues = []
  const changedLanguages = new Set()
  let updated = 0

  for (const key of allKeys) {
    const enValue = enFlat[key]
    const arValue = arFlat[key]

    if (typeof enValue === 'string' && typeof arValue === 'undefined') {
      const issue = issueFor(namespace, key, 'ar', 'missing', enValue)
      issues.push(issue)
      updated += await maybeTranslateAndSet(dictionaries.ar, key, enValue, 'en', 'ar', changedLanguages)
      continue
    }

    if (typeof arValue === 'string' && typeof enValue === 'undefined') {
      const issue = issueFor(namespace, key, 'en', 'missing', arValue)
      issues.push(issue)
      updated += await maybeTranslateAndSet(dictionaries.en, key, arValue, 'ar', 'en', changedLanguages)
      continue
    }

    if (typeof enValue !== 'string' || typeof arValue !== 'string') {
      continue
    }

    if (isSuspiciousValue(enValue, 'en', arValue)) {
      issues.push(issueFor(namespace, key, 'en', 'wrong-language', enValue))
      updated += await maybeTranslateAndSet(dictionaries.en, key, arValue, 'ar', 'en', changedLanguages)
      continue
    }

    if (isSuspiciousValue(arValue, 'ar', enValue)) {
      issues.push(issueFor(namespace, key, 'ar', 'wrong-language', arValue))
      updated += await maybeTranslateAndSet(dictionaries.ar, key, enValue, 'en', 'ar', changedLanguages)
      continue
    }

    if (looksLikeUntranslatedPair(enValue, arValue)) {
      issues.push(issueFor(namespace, key, 'ar', 'same-as-english', arValue))
      updated += await maybeTranslateAndSet(dictionaries.ar, key, enValue, 'en', 'ar', changedLanguages)
    }
  }

  return { issues, updated, changedLanguages }
}

async function maybeTranslateAndSet(dictionary, key, sourceText, sourceLang, targetLang, changedLanguages) {
  if (!shouldFix || !isTranslatableText(sourceText)) {
    return 0
  }

  const translated = await translateText(sourceText, sourceLang, targetLang)
  if (!translated || translated.trim() === '') {
    return 0
  }

  setByPath(dictionary, key, translated)
  changedLanguages.add(targetLang)
  return 1
}

async function translateText(text, sourceLang, targetLang) {
  const glossaryValue = getGlossaryValue(text, sourceLang, targetLang)
  if (glossaryValue) {
    return glossaryValue
  }

  const { protectedText, placeholders } = protectPlaceholders(text)
  let translated

  if (providerName === 'google') {
    translated = await translateWithGoogle(protectedText, sourceLang, targetLang)
  } else if (providerName === 'libretranslate') {
    translated = await translateWithLibreTranslate(protectedText, sourceLang, targetLang)
  } else if (providerName === 'mymemory') {
    translated = await translateWithMyMemory(protectedText, sourceLang, targetLang)
  } else if (providerName === 'none') {
    return ''
  } else {
    throw new Error(`Unknown provider "${providerName}". Use google, libretranslate, mymemory, or none.`)
  }

  await sleep(Number(args.delay || 150))
  return restorePlaceholders(translated, placeholders)
}

function getGlossaryValue(text, sourceLang, targetLang) {
  const dictionary = glossary[`${sourceLang}:${targetLang}`]
  if (!dictionary) return undefined
  return dictionary.get(normalizeText(text))
}

async function translateWithGoogle(text, sourceLang, targetLang) {
  const url =
    'https://translate.googleapis.com/translate_a/single' +
    `?client=gtx&sl=${encodeURIComponent(sourceLang)}` +
    `&tl=${encodeURIComponent(targetLang)}` +
    `&dt=t&q=${encodeURIComponent(text)}`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Google Translate request failed: ${response.status} ${response.statusText}`)
  }
  const body = await response.json()
  return body?.[0]?.map((part) => part?.[0] || '').join('') || ''
}

async function translateWithLibreTranslate(text, sourceLang, targetLang) {
  const endpoint = process.env.LIBRETRANSLATE_URL || 'http://localhost:5000/translate'
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      q: text,
      source: sourceLang,
      target: targetLang,
      format: 'text',
      api_key: process.env.LIBRETRANSLATE_API_KEY || undefined,
    }),
  })
  if (!response.ok) {
    throw new Error(`LibreTranslate request failed: ${response.status} ${response.statusText}`)
  }
  const body = await response.json()
  return body.translatedText || ''
}

async function translateWithMyMemory(text, sourceLang, targetLang) {
  const url =
    'https://api.mymemory.translated.net/get' +
    `?q=${encodeURIComponent(text)}` +
    `&langpair=${encodeURIComponent(`${sourceLang}|${targetLang}`)}`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`MyMemory request failed: ${response.status} ${response.statusText}`)
  }
  const body = await response.json()
  return body?.responseData?.translatedText || ''
}

function isSuspiciousValue(value, targetLang, sourceValue) {
  if (!isTranslatableText(value)) return false

  if (targetLang === 'en') {
    return containsArabic(value)
  }

  if (targetLang === 'ar') {
    if (containsArabic(value)) return false
    if (!containsLatin(value)) return false
    if (isCodeLike(value)) return false
    if (sourceValue && normalizeText(value) === normalizeText(sourceValue)) return true
    return value.split(/\s+/).filter(Boolean).length > 1
  }

  return false
}

function looksLikeUntranslatedPair(enValue, arValue) {
  if (!isTranslatableText(enValue) || !isTranslatableText(arValue)) return false
  if (normalizeText(enValue) !== normalizeText(arValue)) return false
  if (isCodeLike(enValue)) return false
  if (enValue.trim().length <= 3 && !force) return false
  return containsLatin(enValue) && !containsArabic(arValue)
}

function isTranslatableText(value) {
  if (typeof value !== 'string') return false
  const trimmed = value.trim()
  if (!trimmed) return false
  if (placeholderPattern.test(trimmed.replace(placeholderPattern, ''))) {
    placeholderPattern.lastIndex = 0
  }
  placeholderPattern.lastIndex = 0
  if (trimmed.replace(placeholderPattern, '').trim() === '') return false
  if (/^https?:\/\//i.test(trimmed)) return false
  if (/^[\w.+-]+@[\w.-]+\.[a-z]{2,}$/i.test(trimmed)) return false
  if (/^[A-Z0-9_./:-]+$/.test(trimmed) && !force) return false
  return /[\p{L}\p{N}]/u.test(trimmed)
}

function isCodeLike(value) {
  const trimmed = value.trim()
  if (/^\/[\w./:[\]-]+$/.test(trimmed)) return true
  if (/^[A-Z0-9_./:-]+$/.test(trimmed)) return true
  if (/^[\w.+-]+@[\w.-]+\.[a-z]{2,}$/i.test(trimmed)) return true
  return false
}

function protectPlaceholders(text) {
  const placeholders = []
  const protectedText = text.replace(placeholderPattern, (match) => {
    const token = `ZXCVPH${placeholders.length}ZXCV`
    placeholders.push({ token, value: match })
    return token
  })
  return { protectedText, placeholders }
}

function restorePlaceholders(text, placeholders) {
  let restored = text
  for (const { token, value } of placeholders) {
    restored = restored.replaceAll(token, value)
    restored = restored.replaceAll(token.toLowerCase(), value)
  }
  return restored
}

function flatten(value, prefix = '', result = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return result
  }

  for (const [key, child] of Object.entries(value)) {
    const nextKey = prefix ? `${prefix}.${key}` : key
    if (child && typeof child === 'object' && !Array.isArray(child)) {
      flatten(child, nextKey, result)
    } else {
      result[nextKey] = child
    }
  }

  return result
}

function setByPath(obj, key, value) {
  const parts = key.split('.')
  let cursor = obj
  for (const part of parts.slice(0, -1)) {
    if (!cursor[part] || typeof cursor[part] !== 'object' || Array.isArray(cursor[part])) {
      cursor[part] = {}
    }
    cursor = cursor[part]
  }
  cursor[parts.at(-1)] = value
}

async function discoverNamespaces() {
  const namespaceSets = await Promise.all(
    supportedLanguages.map(async (lang) => {
      const dir = path.join(localesRoot, lang)
      const entries = await fs.readdir(dir, { withFileTypes: true })
      return entries
        .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
        .map((entry) => path.basename(entry.name, '.json'))
    })
  )
  return unique(namespaceSets.flat()).sort()
}

async function readJson(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'))
  } catch (error) {
    throw new Error(`Cannot read ${path.relative(projectRoot, filePath)}: ${error.message}`)
  }
}

function printNamespaceReport(namespace, result, exampleLimit) {
  console.log(`\n[i18n:${namespace}] issues: ${result.issues.length}, updated: ${result.updated}`)
  for (const issue of result.issues.slice(0, exampleLimit)) {
    console.log(`- ${issue.type}: ${issue.lang}.${issue.key} = ${JSON.stringify(issue.value)}`)
  }
  if (result.issues.length > exampleLimit) {
    console.log(`- ...and ${result.issues.length - exampleLimit} more`)
  }
}

function issueFor(namespace, key, lang, type, value) {
  return { namespace, key, lang, type, value }
}

function parseArgs(argv) {
  const parsed = {}
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (!arg.startsWith('--')) continue
    const [rawKey, inlineValue] = arg.slice(2).split('=')
    const key = rawKey.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
    if (inlineValue !== undefined) {
      parsed[key] = inlineValue
    } else if (argv[index + 1] && !argv[index + 1].startsWith('--')) {
      parsed[key] = argv[index + 1]
      index += 1
    } else {
      parsed[key] = true
    }
  }
  return parsed
}

function containsArabic(value) {
  return /[\u0600-\u06FF]/.test(value)
}

function containsLatin(value) {
  return /[A-Za-z]/.test(value)
}

function normalizeText(value) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function unique(values) {
  return [...new Set(values)]
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
