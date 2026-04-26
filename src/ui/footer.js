import { config } from "../config.js";
import { inputController } from "../controllers/inputController.js";
import { soundController } from "../controllers/soundController.js";
import { preloaderController } from "../controllers/preloaderController.js";
import { animator } from "../animation/animator.js";
import {
  qs,
  setHeight,
  show as showElement,
  toggleClass,
  withDescendants,
} from "../utils/dom.js";

let container;
let bg;
let soundBtn;

function preInit() {
  container = qs(".footer");
  preloaderController.add(withDescendants(container));
}

function init() {
  bindElements();
  bindEvents();
  if (!config.DISABLE_SOUND_ON_START) soundController.unmute(0);
}

function bindElements() {
  bg = qs(".footer-bg");
  soundBtn = qs(".footer-sound-btn");
}

function bindEvents() {
  if (soundBtn) inputController.add(soundBtn, "click", onSoundClick);
  soundController.onMuteToggled.add(onMuteToggled);
}

function onMuteToggled(muted) {
  if (!soundBtn) return;
  toggleClass(soundBtn, "selected", !muted);
}

function onSoundClick() {
  soundController.toggleMute();
}

function show() {
  showElement(container);
  animator.fromTo(
    container,
    { opacity: 0 },
    { duration: 0.5, opacity: 1, ease: "none" },
  );
}

function showBg() {
  animator.to(bg, { duration: 1.3, scaleY: 1, ease: "circ.out" });
}

function hideBg() {
  animator.to(bg, { duration: 1.3, scaleY: 0, ease: "circ.out" });
}

function updateFading(ratio) {
  const style = document.createElement("style");
  style.textContent = `.footer-fade-item{opacity: ${ratio * 0.5}}`;
  document.head.append(style);
}

function changeHeight(height) {
  setHeight(container, height);
}

export const footer = {
  preInit,
  init,
  show,
  showBg,
  hideBg,
  updateFading,
  changeHeight,
};
