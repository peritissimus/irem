import { config } from '../config.js'
import { uiController } from '../controllers/uiController.js'
import { evalReplace } from '../utils/stringUtils.js'
import { mixIn } from '../utils/native.js'
import * as THREE from 'three'
import '../libs/threejs/Three.js'
import { animator } from '../animation/animator.js'
import vertexShaderSource from '../shaders/postParticle/vertex.glsl?raw'
import fragmentShaderSource from '../shaders/postParticle/fragment.glsl?raw'

const vertexShader = evalReplace(vertexShaderSource, { THREE })
const fragmentShader = evalReplace(fragmentShaderSource, { THREE })
let blankCanvas = null

function getSize() {
  return config.POST_CANVAS_SIZE || 512
}

function getBlankCanvas() {
  if (!blankCanvas) {
    const size = getSize()
    blankCanvas = document.createElement('canvas')
    blankCanvas.width = size
    blankCanvas.height = size
    const ctx = blankCanvas.getContext('2d')
    ctx.fillStyle = '#fefcfe'
    ctx.fillRect(0, 0, size, size)
  }
  return blankCanvas
}

export class PostParticle extends THREE.Mesh {
  constructor(options) {
    const size = getSize()
    const blank = getBlankCanvas()
    const uniforms = {
      fogColor: { type: 'c', value: new THREE.Color(0) },
      fogDensity: { type: 'f', value: 0.025 },
      fogFar: { type: 'f', value: 2000 },
      fogNear: { type: 'f', value: 1 },
      tex: { type: 't', value: new THREE.Texture(blank) },
      u_time: { type: 'f', value: Math.random() * 100 },
      alpha: { type: 'f', value: 1 },
      fade: { type: 'f', value: 0 },
      pop: { type: 'f', value: 0 },
      popScale: { type: 'f', value: 1.3 },
      showScale: { type: 'f', value: 1 },
    }
    super(
      new THREE.PlaneGeometry(size, size, 1, 1),
      new THREE.ShaderMaterial({
        uniforms,
        vertexShader,
        fragmentShader,
        depthTest: false,
        depthWrite: false,
        transparent: true,
        fog: true,
      }),
    )
    // Modern Three's frustum culling tests the geometry's bounding sphere
    // against the camera frustum after applying the mesh's matrixWorld.
    // Our PostParticles billboard via lookAt() and use a per-frame scale
    // tied to camera distance, which makes the bounding-sphere math fight
    // with quick camera rotations — particles flicker out mid-navigation.
    // The pool is fixed-size so skipping culling costs nothing.
    this.frustumCulled = false
    mixIn(
      this,
      {
        uniforms,
        texture: uniforms.tex.value,
        renderDepth: 0,
        canvasStatus: -1,
        interactive: true,
      },
      options,
    )
  }

  changePost(post) {
    this.post = post
    this.canvasStatus = -1
  }

  _updateCanvas() {
    const status = this.canvasStatus
    const post = this.post
    if (post) {
      if (post.isThumbLoaded) {
        if (status < 1) this._redrawThumb()
      } else if (status < 0) {
        this._redrawBlank()
      }
    } else if (status < 0) {
      this._redrawBlank()
    }
  }

  update() {
    this._updateCanvas()
    this.uniforms.u_time.value += 0.01
  }

  _redrawBlank() {
    this.texture.image = getBlankCanvas()
  }

  _redrawThumb() {
    const image = this.post.thumb
    const src = image && (image.currentSrc || image.src || '')
    let isRemote = false
    if (src) {
      try {
        const url = new URL(src, location.href)
        isRemote = url.protocol !== 'data:' && url.protocol !== 'blob:' && url.origin !== location.origin
      } catch {
        isRemote = true
      }
    }
    this.texture.image = isRemote ? getBlankCanvas() : image
    this.canvasStatus = 1
    this.texture.needsUpdate = true
  }

  onOver() {
    this._renderDepth = this.renderDepth
    this.renderDepth = -99999
    const pop = this.uniforms.pop
    animator.killTweensOf(pop, 'value')
    animator.to(pop, { duration: (1 - pop.value) * 0.3, value: 1 })
  }

  onOut() {
    this.renderDepth = this._renderDepth
    const pop = this.uniforms.pop
    animator.killTweensOf(pop, 'value')
    animator.to(pop, { duration: pop.value * 0.3, value: 0 })
  }

  onClick() {
    const post = this.post
    uiController.preShowPost2d(post)
    uiController.showPost2d(post)
  }
}

export default PostParticle
