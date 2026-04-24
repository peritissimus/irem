export function qs(selector, root = document) {
  return root.querySelector(selector)
}

export function qsa(selector, root = document) {
  return Array.from(root.querySelectorAll(selector))
}

export function remove(selectorOrNode, root = document) {
  const nodes =
    typeof selectorOrNode === 'string'
      ? qsa(selectorOrNode, root)
      : [selectorOrNode].filter(Boolean)
  for (const node of nodes) node.remove()
}

export function show(node, display = '') {
  node.style.display = display
}

export function setHeight(node, height) {
  node.style.height = typeof height === 'number' ? `${height}px` : height
}

export function setText(node, text) {
  node.textContent = text
}
