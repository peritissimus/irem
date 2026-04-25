import { config } from '../config.js'
import { PostParticle } from './PostParticle.js'
import { postController } from '../controllers/postController.js'
import { scene3dController } from '../controllers/scene3dController.js'
import { snoise2D } from '../utils/noiseUtils.js'
import { lerp } from '../utils/native.js'
import { Vector3 } from 'three'
import '../libs/threejs/Three.js'

const maxNewItemsPerFrame = 20

const particles = []
let cameraToLookAt
let billboardUp
let cellSize
let zoomThreshold
let sizeMin
let sizeMax
let maxItems

function init(scene) {
  cellSize = config.PARTICLE_FIELD_GRID_SIZE / config.PARTICLE_FIELD_SEGMENT_SIZE
  zoomThreshold = config.NAV_SEARCH_ZOOM_THRESHOLD
  sizeMin = config.NAV_SEARCH_SIZE_MIN
  sizeMax = config.NAV_SEARCH_SIZE_MAX
  maxItems = config.NAV_SEARCH_ITEMS_MAX
  cameraToLookAt = new Vector3()
  billboardUp = new Vector3()
  for (let i = maxItems; i--;) {
    const particle = new PostParticle({ type: 'nav', visible: true })
    particle.scale.x = particle.scale.y = particle.scale.z = 0.01
    particle.position.y = 9999
    particle.uniforms.fade.value = 0
    particle.uniforms.popScale.value = 3
    particles.push(particle)
    scene.add(particle)
  }
}

function update() {
  const cameraPosition = scene3dController.cameraPosition
  const lookAtPosition = scene3dController.lookAtPosition
  const lookAtX = lookAtPosition.x
  const lookAtZ = lookAtPosition.z
  let foundCount = 0
  const candidates = []
  const result = []
  let gridX = (lookAtX / cellSize) | 0
  let gridY = (lookAtZ / cellSize) | 0
  let spiralIndex = 0
  const zoom = scene3dController.zoom
  const shouldShow = zoom > zoomThreshold
  const fadeTarget = shouldShow ? 1 : 0

  billboardUp.x = lookAtX - cameraPosition.x
  billboardUp.z = lookAtZ - cameraPosition.z
  billboardUp.y = Math.atan2(
    lookAtPosition.y - cameraPosition.y,
    Math.sqrt(billboardUp.x * billboardUp.x + billboardUp.z * billboardUp.z),
  )

  if (shouldShow) {
    const rings = ((lerp(zoom, sizeMin, sizeMax) / 2) | 0) + 1
    let ring = 0
    let step = 0.5
    for (;;) {
      if (spiralIndex === 0) {
        ring++
      } else {
        const edge = (2 * ring - 1) * (2 * ring - 1)
        if (spiralIndex === edge) {
          gridY--
        } else {
          const direction = ((spiralIndex - edge) * step) | 0
          if (direction === 0) gridX++
          if (direction === 1) gridY++
          if (direction === 2) gridX--
          if (direction === 3) {
            gridY--
            if ((spiralIndex - edge + 1) * step === 4) {
              ring++
              if (ring >= rings) break
              step = 0.5 / ring
            }
          }
        }
      }

      const worldX = gridX * cellSize
      const worldZ = gridY * cellSize
      const base = snoise2D(worldX * 0.1, worldZ * 0.1)
      let score = (base + snoise2D(worldX * 0.005, worldZ * 0.005)) * 0.5
      score =
        1 -
        (Math.cos(score * Math.PI) + 1) / 2 -
        base -
        snoise2D(worldX * 0.03, worldZ * 0.03)
      score -=
        snoise2D(worldX * 0.003 + 2.1, worldZ * 0.003 + 2.1) * 1.5 +
        snoise2D(worldX * 0.3 + 1.1, worldZ * 0.3 + 1.1) +
        snoise2D(worldX * 0.001 + 1.1, worldZ * 0.001 + 1.1)
      score *= 0.5
      if (score > 0.75) {
        candidates.push(gridX, gridY, score, false)
        foundCount++
        if (foundCount >= maxItems) break
      }
      spiralIndex++
    }
  }

  for (const particle of particles) {
    particle.hasMatch = false
    // Faster fade-in: original 0.03 lerp meant ~3s for newly-spawned
    // particles to reach full opacity, which during continuous nav
    // looked like particles "disappearing". 0.1 = ~0.5s, much snappier.
    particle.uniforms.fade.value += (fadeTarget - particle.uniforms.fade.value) * 0.1
  }

  for (let i = 0; i < foundCount; i++) {
    const x = candidates[i * 4]
    const y = candidates[i * 4 + 1]
    for (const particle of particles) {
      if (particle.gridX === x && particle.gridY === y) {
        particle.hasMatch = true
        candidates[i * 4 + 3] = particle
        break
      }
    }
  }

  let newItems = 0
  for (let i = 0; i < foundCount; i++) {
    const x = candidates[i * 4]
    const y = candidates[i * 4 + 1]
    const score = candidates[i * 4 + 2]
    let particle = candidates[i * 4 + 3]

    if (!particle) {
      for (const item of particles) {
        if (!item.hasMatch) {
          particle = item
          particle.gridX = x
          particle.gridY = y
          particle.hasMatch = true
          particle.changePost(postController.takePost())
          const worldX = (particle.sumX = x * cellSize)
          const worldZ = (particle.sumY = y * cellSize)
          particle.position.x = worldX + (snoise2D(worldX * 0.3, worldZ * 0.3) - 0.5) * 8
          particle.position.y =
            snoise2D(worldX * 0.0013 + 4, worldZ * 0.0013 + 4) * -40 +
            snoise2D(worldX * 0.0006 + 32, worldZ * 0.0006 + 32) * -90 +
            snoise2D(worldX * 200 + 12, worldZ * 200 + 12) * 10
          particle.position.z = worldZ + (snoise2D(worldX * 0.4, worldZ * 0.4) - 0.5) * 8
          particle.uniforms.fade.value = 0
          break
        }
      }
      newItems++
    }

    cameraToLookAt.copy(particle.position)
    cameraToLookAt.sub(cameraPosition)
    cameraToLookAt.x -= scene3dController.cameraVector.x * (-0.2 + 0.4 * zoom)
    cameraToLookAt.y -= scene3dController.cameraVector.y * (-0.2 + 0.4 * zoom)
    cameraToLookAt.z -= scene3dController.cameraVector.z * (-0.2 + 0.4 * zoom)
    particle.scale.x =
      particle.scale.y =
      particle.scale.z =
        (3 / cameraToLookAt.length()) * lerp(score, 0.4, 1) * (window.devicePixelRatio || 1)
    particle.up.copy(billboardUp)
    particle.lookAt(cameraPosition)
    particle.update()
    result.push(particle)
    if (newItems >= maxNewItemsPerFrame) break
  }

  return result.sort((a, b) => a - b)
}

export const navPostParticles = {
  visible: false,
  particles,
  init,
  update,
}
