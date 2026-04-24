// Static ESM graph verifier for converted modules.
//
// This verifies the clean ESM-only source tree:
// - syntax parses with Acorn
// - relative imports resolve to real files
// - named imports exist on the target module when the target has been converted
// - expected singleton/module exports are present for known converted files

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { Parser } from 'acorn'

const root = process.cwd()
const srcDir = path.join(root, 'src')

const expectedExports = new Map(
  Object.entries({
    'src/config.js': ['config', 'initConfig'],
    'src/stageReference.js': ['stageReference'],
    'src/controllers/inputController.js': ['inputController'],
    'src/controllers/postController.js': ['postController'],
    'src/controllers/preloaderController.js': ['preloaderController'],
    'src/controllers/scene3dController.js': ['scene3dController'],
    'src/controllers/soundController.js': ['soundController'],
    'src/controllers/stepController.js': ['stepController'],
    'src/controllers/trackingController.js': [
      'trackPage',
      'trackEvent',
      'track',
      'trackDom',
      'trackingController',
    ],
    'src/controllers/tutorialController.js': ['tutorialController'],
    'src/controllers/uiController.js': ['uiController'],
    'src/loader/browser/getStyle.js': ['getStyle'],
    'src/loader/quickLoader.js': ['quickLoader'],
    'src/loader/types/Abstract.js': ['AbstractItem'],
    'src/loader/types/AudioItem.js': ['AudioItem'],
    'src/loader/types/ImageItem.js': ['ImageItem'],
    'src/loader/types/JSONPItem.js': ['JSONPItem'],
    'src/posts/Post.js': ['Post'],
    'src/ui/com/CircleBtn.js': ['CircleBtn', 'default'],
    'src/ui/credit.js': ['credit'],
    'src/ui/errorBlocker.js': ['errorBlocker'],
    'src/ui/footer.js': ['footer'],
    'src/ui/header.js': ['header'],
    'src/ui/nav.js': ['nav'],
    'src/ui/post2d.js': ['post2d', 'onHidden'],
    'src/ui/preloader.js': ['preloader'],
    'src/ui/search.js': ['search'],
    'src/ui/terms.js': ['terms'],
    'src/utils/noiseUtils.js': ['snoise2D'],
    'src/utils/socialUtils.js': [
      'parseTweet',
      'parseLinks',
      'getFacebookShareLink',
      'getGplusShareLink',
      'getTwitterShareLink',
      'getPinterestShareLink',
      'socialShare',
    ],
    'src/utils/stringUtils.js': ['evalReplace', 'stripHTML'],
    'src/widgets/SimpleScrollPane.js': ['SimpleScrollPane', 'default'],
  }),
)

function toProjectPath(absPath) {
  return path.relative(root, absPath).split(path.sep).join('/')
}

function walkJsFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const abs = path.join(dir, name)
    const rel = toProjectPath(abs)
    if (rel.startsWith('src/shaders/')) continue
    const st = statSync(abs)
    if (st.isDirectory()) walkJsFiles(abs, out)
    else if (name.endsWith('.js')) out.push(abs)
  }
  return out
}

function parseFile(absPath) {
  const source = readFileSync(absPath, 'utf8')
  return Parser.parse(source, {
    ecmaVersion: 'latest',
    sourceType: 'module',
    locations: true,
  })
}

function collectModuleShape(ast) {
  const imports = []
  const exports = new Set()

  for (const node of ast.body) {
    if (node.type === 'ImportDeclaration') {
      imports.push({
        source: node.source.value,
        line: node.loc.start.line,
        specifiers: node.specifiers.map((specifier) => {
          if (specifier.type === 'ImportDefaultSpecifier') {
            return { imported: 'default', local: specifier.local.name }
          }
          if (specifier.type === 'ImportNamespaceSpecifier') {
            return { imported: '*', local: specifier.local.name }
          }
          return { imported: specifier.imported.name, local: specifier.local.name }
        }),
      })
    }

    if (node.type === 'ExportDefaultDeclaration') {
      exports.add('default')
    }

    if (node.type === 'ExportNamedDeclaration') {
      if (node.declaration?.type === 'VariableDeclaration') {
        for (const decl of node.declaration.declarations) {
          if (decl.id.type === 'Identifier') exports.add(decl.id.name)
        }
      } else if (
        node.declaration?.type === 'FunctionDeclaration' ||
        node.declaration?.type === 'ClassDeclaration'
      ) {
        exports.add(node.declaration.id.name)
      }

      for (const specifier of node.specifiers ?? []) {
        exports.add(specifier.exported.name)
      }
    }
  }

  return { imports, exports }
}

function resolveRelativeImport(fromAbs, specifier) {
  if (!specifier.startsWith('.')) return null

  const cleanSpecifier = specifier.split('?')[0]
  const base = path.resolve(path.dirname(fromAbs), cleanSpecifier)
  const candidates = [
    base,
    `${base}.js`,
    path.join(base, 'index.js'),
  ]
  return candidates.find((candidate) => existsSync(candidate)) ?? candidates[0]
}

const files = walkJsFiles(srcDir)
const modules = new Map()
const failures = []

for (const abs of files) {
  const rel = toProjectPath(abs)
  try {
    modules.set(rel, collectModuleShape(parseFile(abs)))
  } catch (err) {
    failures.push(`${rel}: parse failed: ${err.message}`)
  }
}

for (const [rel, expected] of expectedExports) {
  const shape = modules.get(rel)
  if (!shape) {
    failures.push(`${rel}: expected converted file is missing`)
    continue
  }
  for (const name of expected) {
    if (!shape.exports.has(name)) {
      failures.push(`${rel}: missing expected export "${name}"`)
    }
  }
}

for (const abs of files) {
  const fromRel = toProjectPath(abs)
  const shape = modules.get(fromRel)
  if (!shape) continue

  for (const importInfo of shape.imports) {
    const resolved = resolveRelativeImport(abs, importInfo.source)
    if (!resolved) continue

    if (!existsSync(resolved)) {
      failures.push(
        `${fromRel}:${importInfo.line}: unresolved relative import "${importInfo.source}"`,
      )
      continue
    }

    const targetRel = toProjectPath(resolved)
    const targetShape = modules.get(targetRel)
    if (!targetShape) continue

    for (const specifier of importInfo.specifiers) {
      if (specifier.imported === '*') continue
      if (!targetShape.exports.has(specifier.imported)) {
        failures.push(
          `${fromRel}:${importInfo.line}: "${importInfo.source}" does not export "${specifier.imported}"`,
        )
      }
    }
  }
}

const moduleCount = modules.size
console.log(`Checked ${moduleCount} converted ESM modules`)

if (failures.length) {
  for (const failure of failures) console.log(`FAIL  ${failure}`)
  console.log(`\n${failures.length} failure(s)`)
  process.exit(1)
}

console.log('ok  ESM graph parses and resolved converted imports')
