import signals from './events/signal.js'
import { config, initConfig } from './config.js'
import {
  installArchiveApiShim,
  installArchiveGlobals,
  installModernizrShim,
} from './archive-runtime.js'
import { qs, qsa } from './utils/dom.js'

installModernizrShim()
installArchiveGlobals(signals)
installArchiveApiShim()

window.__IREM_RUNTIME__ = 'esm'

if (window.SUPPORT_WEBGL) {
  initConfig()

  const [
    { uiController },
    { postController },
    { stepController },
    { soundController },
    { inputController },
    { preloaderController },
    { tutorialController },
    { scene3dController },
    { SimpleScrollPane },
    { stageReference },
  ] = await Promise.all([
    import('./controllers/uiController.js'),
    import('./controllers/postController.js'),
    import('./controllers/stepController.js'),
    import('./controllers/soundController.js'),
    import('./controllers/inputController.js'),
    import('./controllers/preloaderController.js'),
    import('./controllers/tutorialController.js'),
    import('./controllers/scene3dController.js'),
    import('./widgets/SimpleScrollPane.js'),
    import('./stageReference.js'),
  ])

  boot({
    uiController,
    postController,
    stepController,
    soundController,
    inputController,
    preloaderController,
    tutorialController,
    scene3dController,
    SimpleScrollPane,
    stageReference,
  })
}

function boot({
  uiController,
  postController,
  stepController,
  soundController,
  inputController,
  preloaderController,
  tutorialController,
  scene3dController,
  SimpleScrollPane,
  stageReference,
}) {
  stageReference.init()
  stageReference.startRender()
  preloaderController.add(config.colorMapPath)

  qsa('.scroll-wrapper').forEach((wrapper) => {
    wrapper.scrollPane = new SimpleScrollPane(
      wrapper,
      qs('.scroll-move-container', wrapper),
      qs('.scroll-indicator', wrapper),
    )
    wrapper.scrollPane.init()

    inputController.add(qs('.scroll-indicator-wrapper', wrapper), 'down', function onDown(event) {
      if (event.target === event.currentTarget) {
        const rect = event.target.getBoundingClientRect()
        this.parentNode.scrollPane.moveToRatio(
          -(event.y - (rect.top + window.pageYOffset)) / event.target.offsetHeight,
        )
      }
    })
  })

  preloaderController.onReadyComplete.add(() => {
    config.colorMap = preloaderController.getLoadedItemByURL(config.colorMapPath).content
    soundController.init()
    tutorialController.init()
    scene3dController.init()

    setTimeout(() => {
      uiController.preInit()
      config.appContainer.classList.add('show')
      preloaderController.add(config.uiAssetPath)
      uiController._appInitFunc = () => appInit({
        uiController,
        postController,
        stepController,
        preloaderController,
        scene3dController,
      })
      preloaderController.start()
    }, 1000)
  })

  preloaderController.preStart()
}

function appInit({
  uiController,
  postController,
  stepController,
  preloaderController,
  scene3dController,
}) {
  config.uiAsset = preloaderController.getLoadedItemByURL(config.uiAssetPath).content
  uiController.init()
  postController.init()
  stepController.init()
  scene3dController.showParticles()

  if (postController.DEFAULT_POST) {
    uiController.preShowPost2d(postController.DEFAULT_POST)
    uiController.showPost2d(postController.DEFAULT_POST)
    stepController.hide()
    scene3dController.disableControl()
  } else {
    stepController.show()
  }
}
