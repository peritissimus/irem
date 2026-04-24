const DEFAULT_EVAL_REPLACE_REGEX = /\/\*EVAL (.+)\*\//g

export function evalReplace(input, scopeVariables, regex = DEFAULT_EVAL_REPLACE_REGEX) {
  const names = Object.keys(scopeVariables || {})
  const values = names.map((name) => scopeVariables[name])

  return input.replace(regex, (_match, expression) => {
    const normalizedExpression = expression.trim().replace(/;+\s*$/, '')
    const fn = new Function(...names, `return (${normalizedExpression});`)
    return fn(...values)
  })
}

export function stripHTML(input) {
  return input.replace(/<(?:.|\n)*?>/gm, '')
}
