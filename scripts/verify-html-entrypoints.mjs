import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { Parser } from 'acorn'

const root = process.cwd()
const entrypoints = ['index.html', 'en.html']
const requiredGlobals = [
  'LANG',
  'ENV_ID',
  'IS_DEV',
  'SITE_DESCRIPTION',
  'TWITTER_SITE_DESCRIPTION',
  'POST_DESCRIPTION',
  'TWITTER_POST_DESCRIPTION',
  'SUPPORT_WEBGL',
  'DEFAULT_POSTS',
  'DEFAULT_POST',
  'SETTINGS',
  'INSTAGRAM_ID',
  'FACEBOOK_ID',
  'ERROR_MESSAGES',
]
const requiredMarkup = [
  'app',
  'base-3d-container',
  'preloader',
  'add-steps',
  'nav',
  'footer',
  'post-2d',
]

function extractScripts(html) {
  return [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].map(
    (match) => ({
      attrs: match[1],
      body: match[2],
    }),
  )
}

function extractDeclaredGlobals(scriptSource) {
  const ast = Parser.parse(scriptSource, {
    ecmaVersion: 'latest',
    sourceType: 'script',
  })
  const globals = new Set()

  for (const node of ast.body) {
    if (node.type !== 'VariableDeclaration') continue
    for (const declaration of node.declarations) {
      if (declaration.id.type === 'Identifier') {
        globals.add(declaration.id.name)
      }
    }
  }

  return globals
}

function resolvePublicPath(urlPath) {
  const cleanPath = urlPath.split('?')[0]
  if (cleanPath.startsWith('/src/')) return path.join(root, cleanPath.slice(1))
  if (cleanPath.startsWith('/')) return path.join(root, 'public', cleanPath.slice(1))
  return path.join(root, cleanPath)
}

function hasClass(html, className) {
  const classAttrPattern = /\bclass=["']([^"']+)["']/gi
  for (const match of html.matchAll(classAttrPattern)) {
    if (match[1].split(/\s+/).includes(className)) return true
  }
  return false
}

const failures = []
const htmlByEntrypoint = new Map()

for (const entrypoint of entrypoints) {
  const abs = path.join(root, entrypoint)
  if (!existsSync(abs)) {
    failures.push(`${entrypoint}: missing HTML entrypoint`)
    continue
  }

  const html = readFileSync(abs, 'utf8')
  htmlByEntrypoint.set(entrypoint, html)

  for (const className of requiredMarkup) {
    if (!hasClass(html, className)) failures.push(`${entrypoint}: missing .${className}`)
  }

  const moduleSrc = html.match(/<script\b[^>]*type=["']module["'][^>]*src=["']([^"']+)["']/i)?.[1]
  if (!moduleSrc) {
    failures.push(`${entrypoint}: missing module script entrypoint`)
  } else if (!existsSync(resolvePublicPath(moduleSrc))) {
    failures.push(`${entrypoint}: module script does not resolve: ${moduleSrc}`)
  }

  for (const link of html.matchAll(/<link\b[^>]*href=["']([^"']+)["'][^>]*>/gi)) {
    const href = link[1]
    if (href.startsWith('data:')) continue
    if (!existsSync(resolvePublicPath(href))) {
      failures.push(`${entrypoint}: linked asset does not resolve: ${href}`)
    }
  }

  const declaredGlobals = new Set()
  for (const script of extractScripts(html)) {
    if (/\bsrc=/.test(script.attrs)) continue
    try {
      for (const name of extractDeclaredGlobals(script.body)) declaredGlobals.add(name)
    } catch (err) {
      failures.push(`${entrypoint}: inline script syntax error: ${err.message}`)
    }
  }

  for (const name of requiredGlobals) {
    if (!declaredGlobals.has(name)) {
      failures.push(`${entrypoint}: missing required global ${name}`)
    }
  }
}

const indexHtml = htmlByEntrypoint.get('index.html')
const enHtml = htmlByEntrypoint.get('en.html')
if (indexHtml && enHtml && indexHtml !== enHtml) {
  failures.push('index.html and en.html differ')
}

console.log(`Checked ${htmlByEntrypoint.size} HTML entrypoint(s)`)

if (failures.length) {
  for (const failure of failures) console.log(`FAIL  ${failure}`)
  console.log(`\n${failures.length} failure(s)`)
  process.exit(1)
}

console.log('ok  HTML entrypoints expose required boot data and assets')
