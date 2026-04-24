// Tiny Node ESM loader that mirrors Vite's behavior of trying `.js` when a bare
// specifier resolves to a CJS package subpath with no extension (e.g. `mout/string/rtrim`).
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context)
  } catch (err) {
    if (err.code !== 'ERR_MODULE_NOT_FOUND') throw err
    try {
      return await nextResolve(`${specifier}.js`, context)
    } catch {
      throw err
    }
  }
}
