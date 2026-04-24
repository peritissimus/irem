import THREE from '../libs/threejs/Three.js'

THREE.MaskPass = function MaskPass(scene, camera) {
  this.scene = scene
  this.camera = camera
  this.enabled = true
  this.clear = true
  this.needsSwap = false
  this.inverse = false
}

THREE.MaskPass.prototype = {
  render(renderer, writeBuffer, readBuffer) {
    const context = renderer.context
    context.colorMask(false, false, false, false)
    context.depthMask(false)
    const writeValue = this.inverse ? 0 : 1
    const clearValue = this.inverse ? 1 : 0
    context.enable(context.STENCIL_TEST)
    context.stencilOp(context.REPLACE, context.REPLACE, context.REPLACE)
    context.stencilFunc(context.ALWAYS, writeValue, 0xffffffff)
    context.clearStencil(clearValue)
    renderer.render(this.scene, this.camera, readBuffer, this.clear)
    renderer.render(this.scene, this.camera, writeBuffer, this.clear)
    context.colorMask(true, true, true, true)
    context.depthMask(true)
    context.stencilFunc(context.EQUAL, 1, 0xffffffff)
    context.stencilOp(context.KEEP, context.KEEP, context.KEEP)
  },
}

THREE.ClearMaskPass = function ClearMaskPass() {
  this.enabled = true
}

THREE.ClearMaskPass.prototype = {
  render(renderer) {
    renderer.context.disable(renderer.context.STENCIL_TEST)
  },
}

export default THREE.MaskPass
