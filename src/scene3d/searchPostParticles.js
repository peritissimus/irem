import { config } from '../config.js'
import { PostParticle } from './PostParticle.js'
import { uiController } from '../controllers/uiController.js'
import { fakeParticles } from './fakeParticles.js'
import { scene3dController } from '../controllers/scene3dController.js'
import { onHidden as post2dHidden } from '../ui/post2d.js'
import lerp from 'mout/math/lerp'
import clamp from 'mout/math/clamp'
import THREE from '../libs/threejs/Three.js'
import { EKTweener } from '../ektweener.js'

const particles = []

let queuedPosts
let isHiding = false
let selectedParticle = null
let cameraDistance
let maxItems
const previousCameraTarget = new THREE.Vector3()
const previousLookAtTarget = new THREE.Vector3()
const clickLookAt = new THREE.Object3D()
const clickCamera = new THREE.Object3D()

function init(scene) {
  cameraDistance = config.SCENE_CAMERA_HORIZONTAL_DISTANCE
  maxItems = config.POST_SEARCH_WITH_TAG_RESULT_MAX
  for (let i = maxItems; i--;) {
    const particle = new PostParticle({ type: 'search', visible: false })
    particle.onClick = onParticleClick
    particle.floatRadius = (0.5 + Math.random() * 0.5) * 10
    particle.floatTime = Math.random() * Math.PI * 2
    particle.floatSpeed = (0.3 + Math.random() * 0.7) * 0.03
    particles.push(particle)
    scene.add(particle)
  }
  post2dHidden.add(onPost2dHidden)
}

function show(posts) {
  if (searchPostParticles.visible) {
    queuedPosts = posts
    if (!isHiding) hide()
    return
  }

  searchPostParticles.visible = true
  const lookAtTarget = scene3dController.lookAtTargetPosition
  const horizontalAngle = scene3dController.lookAtHorizontalAngle
  const cameraVector = scene3dController.cameraVector.clone()
  cameraVector.y = 0
  cameraVector.normalize()
  scene3dController.resetCamera({
    hasControl: false,
    lockControl: true,
    duration: 3,
    canInteractiveWithPost: true,
    cameraOffsetY: 100,
    lookAtOffsetY: 230,
  })

  const count = Math.min(maxItems, posts.length)
  const arc = (count / (count + 1) - 0.5) * 2 * Math.PI
  const startAngle = horizontalAngle + Math.PI / 2 + (Math.PI - arc) / 2
  const durationRange = lerp(clamp(count / 50, 0, 1), 2, 10)
  const delayRange = lerp(clamp(count / 50, 0, 1), 0.25, 2)
  let longestDuration = 0

  for (let i = 0; i < count; i++) {
    const particle = particles[i]
    const post = posts[i]
    particle.visible = true
    particle.changePost(post)
    const angle = startAngle + (i / count) * arc
    const radius = 500 + 1000 * Math.random()
    const sideOffset = (Math.random() * 2 - 0.5) * 300
    particle.position.x = lookAtTarget.x - Math.sin(angle) * radius + cameraVector.x * sideOffset
    particle.position.z = lookAtTarget.z + Math.cos(angle) * radius + cameraVector.z * sideOffset
    particle.yMax = 320 + Math.random() * 240
    const scale = (particle.scale.x = particle.scale.y = particle.scale.z = 0.05 + 0.08 * Math.random())
    const imageScale = 188 / Math.min(post.resized_img_width, post.resized_img_height)
    particle.scaleFixScaleRatio = imageScale * 4 * scale * particle.uniforms.popScale.value
    particle.scaleFixScaleOffsetX =
      -particle.scaleFixScaleRatio * post.img_offset_x * (post.resized_img_width - 128 / imageScale) / 2 -
      -174 * particle.scaleFixScaleRatio
    particle.scaleFixScaleOffsetY =
      particle.scaleFixScaleRatio * post.img_offset_y * (post.resized_img_height - 128 / imageScale) / 2
    const duration = 4 + Math.random() * durationRange
    const delay = Math.random() * delayRange
    EKTweener.killTweensOf(particle)
    EKTweener.to(particle, duration, { fadeValue: 1, delay, ease: 'easeOutCirc' })
    EKTweener.to(particle.uniforms.showScale, 0, { value: 0 })
    EKTweener.to(particle.uniforms.showScale, duration, {
      value: 1,
      delay,
      ease: 'easeOutSine',
    })
    if (duration > longestDuration) longestDuration = duration
  }

  cameraVector.y = 0
  fakeParticles.uniforms.posOffset.value.x = lookAtTarget.x
  fakeParticles.uniforms.posOffset.value.z = lookAtTarget.z
  fakeParticles.uniforms.cameraVector.value.copy(cameraVector.multiplyScalar(cameraDistance))
  EKTweener.killTweensOf(fakeParticles)
  EKTweener.to(fakeParticles, (longestDuration > 6 ? 6 : longestDuration) / 6 * 8, {
    time: 1,
    ease: 'easeOutSine',
  })
}

function onParticleClick() {
  const particle = this
  const post = particle.post
  selectedParticle = particle
  particle.onOver()
  uiController.preShowPost2d(post)
  previousCameraTarget.copy(scene3dController.cameraTargetPosition)
  previousLookAtTarget.copy(scene3dController.lookAtTargetPosition)
  clickLookAt.position.copy(particle.position)
  clickLookAt.position.y = particle.yMax
  clickLookAt.rotation.copy(particle.rotation)
  clickLookAt.translateX(particle.scaleFixScaleOffsetX)
  clickLookAt.translateY(particle.scaleFixScaleOffsetY)
  clickCamera.position.copy(particle.position)
  clickCamera.rotation.copy(particle.rotation)
  clickCamera.translateX(particle.scaleFixScaleOffsetX)
  clickCamera.translateY(particle.scaleFixScaleOffsetY)
  clickCamera.translateZ(scene3dController.fixedScalePointLength * particle.scaleFixScaleRatio)
  const offset = scene3dController.cameraPosOffset
  offset.tX = (Math.random() > 0.5 ? 1 : -1) * (0.5 + Math.random() * 0.5) * 90
  offset.tY = (Math.random() > 0.5 ? 1 : -1) * (0.5 + Math.random() * 0.5) * 90
  offset.tZ = (Math.random() > 0.5 ? 1 : -1) * (0.5 + Math.random() * 0.5) * 90
  scene3dController.moveTo({
    hasControl: false,
    lockControl: true,
    cameraOffsetAnimation: 1,
    duration: 2,
    controller: { blurBlendRatio: 0, zoom: 0, targetZoom: 0, cameraSwingRadius: 0 },
    camera: {
      x: clickCamera.position.x,
      y: clickCamera.position.y,
      z: clickCamera.position.z,
      ease: 'easeInOutSine',
    },
    lookAt: { x: clickLookAt.position.x, y: clickLookAt.position.y, z: clickLookAt.position.z },
    cb() {
      uiController.showPost2d(post)
    },
  })
}

function onPost2dHidden() {
  if (selectedParticle) {
    selectedParticle.onOut()
    scene3dController.moveTo({
      hasControl: false,
      lockControl: true,
      canInteractiveWithPost: true,
      duration: 2,
      controller: { blurBlendRatio: 1, zoom: 0, targetZoom: 0, cameraSwingRadius: 0.6 },
      camera: {
        x: previousCameraTarget.x,
        y: previousCameraTarget.y,
        z: previousCameraTarget.z,
        ease: 'easeOutSine',
      },
      lookAt: {
        x: previousLookAtTarget.x,
        y: previousLookAtTarget.y,
        z: previousLookAtTarget.z,
        ease: 'easeInSine',
      },
      cb() {
        selectedParticle = null
      },
    })
  }
}

function clampedNorm(value, min, max) {
  return clamp((value - min) / (max - min), 0, 1)
}

function update() {
  const result = []
  const cameraPosition = scene3dController.cameraPosition
  const alphaDistance = selectedParticle ? scene3dController.fixedScalePointLength * selectedParticle.scale.x : 0

  for (const particle of particles) {
    if (particle.visible) {
      particle.update()
      particle.position.y =
        particle.fadeValue * particle.yMax +
        particle.floatRadius * Math.sin((particle.floatTime += particle.floatSpeed)) *
          (1 - particle.uniforms.pop.value)
      particle.uniforms.fade.value = particle.fadeValue
      const distance = particle.position.distanceTo(cameraPosition)
      if (particle.renderDepth !== -99999) particle.renderDepth = distance
      if (selectedParticle !== null) {
        if (selectedParticle !== particle) {
          particle.uniforms.alpha.value =
            distance <= alphaDistance ? 0 : Math.pow(clampedNorm(distance, alphaDistance, alphaDistance * 4), 3)
          particle.lookAt(cameraPosition)
        }
      } else {
        particle.uniforms.alpha.value = 1
        particle.lookAt(cameraPosition)
      }
      result.push(particle)
    } else {
      particle.renderDepth = 99999999
    }
  }

  return result.sort((a, b) => a.renderDepth - b.renderDepth)
}

function hide() {
  if (selectedParticle) {
    selectedParticle.onOut()
    selectedParticle = null
  }
  isHiding = true
  let longest = -1
  const count = Math.min(maxItems, particles.length)
  const durationRange = lerp(clamp(count / 50, 0, 1), 0.5, 2)
  const delayRange = lerp(clamp(count / 50, 0, 1), 0.25, 1.5)

  for (let i = 0; i < count; i++) {
    const particle = particles[i]
    if (particle.visible) {
      const duration = 1 + Math.random() * durationRange
      const delay = Math.random() * delayRange
      EKTweener.killTweensOf(particle)
      EKTweener.to(particle, duration, {
        fadeValue: 0,
        delay,
        ease: 'easeInCirc',
        onComplete: hideParticle,
      })
      EKTweener.to(particle.uniforms.showScale, duration, {
        value: 0,
        delay,
        ease: 'easeInSine',
      })
      longest = Math.max(duration + delay, longest)
    }
  }

  EKTweener.killTweensOf(fakeParticles)
  EKTweener.to(fakeParticles, (longest > 6 ? 6 : longest) / 6 * 10, {
    time: 0,
    ease: 'easeInSine',
    onComplete: finishHide,
  })
}

function hideParticle() {
  this._appliedTarget.visible = false
}

function finishHide() {
  isHiding = false
  searchPostParticles.visible = false
  if (queuedPosts) {
    const posts = queuedPosts
    queuedPosts = null
    show(posts)
  }
}

export const searchPostParticles = {
  visible: false,
  particles,
  init,
  update,
  show,
  hide,
}
