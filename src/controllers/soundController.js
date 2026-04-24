import signals from '../events/signal.js'
import { EKTweener } from '../ektweener.js'

let bgmAudio
let addAudio

function applyVolume() {
  if (bgmAudio) bgmAudio.volume = soundController.globalVolume
  if (addAudio) addAudio.volume = soundController.globalVolume
}

function init() {
  const audioCaps = window.Modernizr?.audio || {}
  const extension = audioCaps.mp3 ? 'mp3' : audioCaps.ogg ? 'ogg' : null

  if (window.__DISABLE_ARCHIVE_AUDIO__ || !extension) return

  bgmAudio = new Audio(`audio/loop.${extension}`)
  addAudio = new Audio(`audio/add.${extension}`)
  bgmAudio.loop = true
  mute(0)
}

function playBgm() {
  if (!bgmAudio) return
  bgmAudio.play()
  if (bgmAudio.readyState) {
    bgmAudio.currentTime = 0.1
  }
}

function playAdd() {
  if (addAudio) addAudio.play()
}

function mute(duration) {
  soundController.isMute = true
  soundController.onMuteToggled.dispatch(true)
  EKTweener.to(soundController, duration === undefined ? 1 : duration, {
    globalVolume: 0,
    ease: 'linear',
    onUpdate: applyVolume,
  })
}

function unmute() {
  soundController.isMute = false
  soundController.onMuteToggled.dispatch(false)
  EKTweener.to(soundController, 0, {
    globalVolume: 1,
    ease: 'linear',
    onUpdate: applyVolume,
  })
  playBgm()
}

function toggleMute() {
  if (soundController.isMute) {
    unmute()
  } else {
    mute()
  }
}

export const soundController = {
  globalVolume: 0,
  isMute: true,
  onMuteToggled: new signals.Signal(),
  init,
  playBgm,
  playAdd,
  mute,
  unmute,
  toggleMute,
}
