export class Signal {
  #bindings = []

  add(listener, context = null) {
    if (typeof listener !== 'function') return listener
    if (!this.#bindings.some((binding) => binding.listener === listener && binding.context === context)) {
      this.#bindings.push({ listener, context })
    }
    return listener
  }

  remove(listener, context = null) {
    this.#bindings = this.#bindings.filter(
      (binding) => binding.listener !== listener || binding.context !== context,
    )
    return listener
  }

  dispatch(...args) {
    for (const { listener, context } of [...this.#bindings]) {
      listener.apply(context, args)
    }
  }

  removeAll() {
    this.#bindings = []
  }
}

export default { Signal }
