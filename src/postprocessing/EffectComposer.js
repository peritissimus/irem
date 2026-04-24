import THREE from '../libs/threejs/Three.js'

THREE.EffectComposer = function EffectComposer(renderer, renderTarget) {
  this.renderer = renderer
  let target = renderTarget
  if (target === undefined) {
    const width = window.innerWidth || 1
    const height = window.innerHeight || 1
    target = new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBFormat,
      stencilBuffer: false,
    })
  }
  this.renderTarget1 = target
  this.renderTarget2 = target.clone()
  this.writeBuffer = this.renderTarget1
  this.readBuffer = this.renderTarget2
  this.passes = []
  if (THREE.CopyShader === undefined) console.error('THREE.EffectComposer relies on THREE.CopyShader')
  this.copyPass = new THREE.ShaderPass(THREE.CopyShader)
}

THREE.EffectComposer.prototype = {
  swapBuffers() {
    const tmp = this.readBuffer
    this.readBuffer = this.writeBuffer
    this.writeBuffer = tmp
  },
  addPass(pass) {
    this.passes.push(pass)
  },
  insertPass(pass, index) {
    this.passes.splice(index, 0, pass)
  },
  render(delta) {
    this.writeBuffer = this.renderTarget1
    this.readBuffer = this.renderTarget2
    let maskActive = false
    for (let i = 0, len = this.passes.length; i < len; i++) {
      const pass = this.passes[i]
      if (!pass.enabled) continue
      pass.render(this.renderer, this.writeBuffer, this.readBuffer, delta, maskActive)
      if (pass.needsSwap) {
        if (maskActive) {
          const context = this.renderer.context
          context.stencilFunc(context.NOTEQUAL, 1, 0xffffffff)
          this.copyPass.render(this.renderer, this.writeBuffer, this.readBuffer, delta)
          context.stencilFunc(context.EQUAL, 1, 0xffffffff)
        }
        this.swapBuffers()
      }
      if (pass instanceof THREE.MaskPass) maskActive = true
      else if (pass instanceof THREE.ClearMaskPass) maskActive = false
    }
  },
  reset(renderTarget) {
    let target = renderTarget
    if (target === undefined) {
      target = this.renderTarget1.clone()
      target.width = window.innerWidth
      target.height = window.innerHeight
    }
    this.renderTarget1 = target
    this.renderTarget2 = target.clone()
    this.writeBuffer = this.renderTarget1
    this.readBuffer = this.renderTarget2
  },
  setSize(width, height) {
    const target = this.renderTarget1.clone()
    target.width = width
    target.height = height
    this.reset(target)
  },
}

THREE.EffectComposer.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
THREE.EffectComposer.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null)
THREE.EffectComposer.scene = new THREE.Scene()
THREE.EffectComposer.scene.add(THREE.EffectComposer.quad)

export default THREE.EffectComposer
