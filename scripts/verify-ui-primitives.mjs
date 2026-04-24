// Parse-check for CircleBtn and SimpleScrollPane. Both transitively import
// jQuery 1.11 which needs a real DOM to evaluate under Node; runtime import
// isn't feasible without jsdom. Acorn gives us syntax + module-shape checks.

import { readFileSync } from 'node:fs'
import { Parser } from 'acorn'

const files = [
  'src/ui/com/CircleBtn.js',
  'src/widgets/SimpleScrollPane.js',
  'src/ektweener.js',
]

const checks = []

for (const path of files) {
  const source = readFileSync(path, 'utf8')
  try {
    const ast = Parser.parse(source, { ecmaVersion: 'latest', sourceType: 'module' })
    const exports = []
    const imports = []
    for (const node of ast.body) {
      if (node.type === 'ExportNamedDeclaration') {
        if (node.declaration?.type === 'ClassDeclaration') exports.push(node.declaration.id.name)
        else if (node.declaration?.type === 'FunctionDeclaration')
          exports.push(node.declaration.id.name)
        else if (node.declaration?.declarations) {
          for (const d of node.declaration.declarations) exports.push(d.id.name)
        }
      } else if (node.type === 'ImportDeclaration') {
        imports.push(node.source.value)
      }
    }
    checks.push([`${path}: parses`, true])
    checks.push([`${path}: has at least one export`, exports.length > 0])
    console.log(`    ${path}`)
    console.log(`      imports: ${imports.join(', ')}`)
    console.log(`      exports: ${exports.join(', ')}`)
  } catch (err) {
    checks.push([`${path}: parses`, false])
    console.error(`    ${path}: ${err.message}`)
  }
}

// Sanity: exports match what downstream modules expect
const cbSource = readFileSync('src/ui/com/CircleBtn.js', 'utf8')
checks.push(['CircleBtn exports the class', /export class CircleBtn\b/.test(cbSource)])

const spSource = readFileSync('src/widgets/SimpleScrollPane.js', 'utf8')
checks.push([
  'SimpleScrollPane exports the class',
  /export class SimpleScrollPane\b/.test(spSource),
])

// Key behavior sanity (regex-based spot checks on patterns that matter)
checks.push([
  'CircleBtn uses inputController.add for over/out/click',
  /inputController\.add\([\s\S]+?['"]over['"][\s\S]+?inputController\.add\([\s\S]+?['"]out['"][\s\S]+?inputController\.add\([\s\S]+?['"]click['"]/.test(cbSource),
])
checks.push([
  'CircleBtn reads config.transform3DStyle per-instance',
  /this\.transform3DStyle\s*=\s*config\.transform3DStyle/.test(cbSource),
])
checks.push([
  'SimpleScrollPane picks move strategy at construction',
  /this\._moveElementTo\s*=\s*pickMoveStrategy\(\)/.test(spSource),
])
checks.push([
  'SimpleScrollPane delta log size matches original (5)',
  /DELTA_LOG_SIZE\s*=\s*5/.test(spSource),
])
checks.push([
  'SimpleScrollPane uses stageReference.onRender',
  /stageReference\.onRender\.(add|remove)/.test(spSource),
])

let failed = 0
for (const [name, ok] of checks) {
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}`)
  if (!ok) failed += 1
}
console.log(`\n${checks.length - failed}/${checks.length} passed`)
process.exit(failed ? 1 : 0)
