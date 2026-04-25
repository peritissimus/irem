import { rtrim } from './utils/native.js'
import { qs } from './utils/dom.js'

export const config = {}

export function initConfig() {
  config.appContainer = qs('.app')
  config.LANG = window.LANG
  config.ENV_ID = window.ENV_ID
  config.IS_DEV = import.meta.env.DEV || window.IS_DEV
  config.LANG_LONG = { fr: 'French', en: 'English' }[config.LANG]

  config.POST_ID_OFFSET = 1248

  config.BASE_URL = import.meta.env.DEV
    ? window.location.origin
    : rtrim(qs('base').getAttribute('href'), ['/'])
  config.SITE_URL = config.BASE_URL

  config.settings = window.SETTINGS
  config.ERROR_MESSAGES = window.ERROR_MESSAGES
  config.SITE_DESCRIPTION = window.SITE_DESCRIPTION
  config.TWITTER_SITE_DESCRIPTION = window.TWITTER_SITE_DESCRIPTION
  config.POST_DESCRIPTION = window.POST_DESCRIPTION
  config.TWITTER_POST_DESCRIPTION = window.TWITTER_POST_DESCRIPTION
  config.INSTAGRAM_ID = window.INSTAGRAM_ID
  config.FACEBOOK_ID = window.FACEBOOK_ID

  config.SKIP_PRELOADER = config.IS_DEV
  config.SKIP_ADJUSTMENT_TUTORIALS = config.IS_DEV
  config.DISABLE_SOUND_ON_START = config.IS_DEV

  config.USES_STATS = false
  config.UPLOADS_FOLDER = window.__UPLOADS_ROOT

  config.POST_SEARCH_RESULT_MAX = 200
  config.POST_SEARCH_WITH_TAG_RESULT_MAX = 200
  config.POST_DISPLAY_AMOUNT_MAX = 20
  config.POST_CANVAS_SIZE = 512
  config.POST_IMAGE_PADDING = 60

  config.SCENE_3D_FOV = 100
  config.SCENE_3D_FOV_MAX = 100
  config.SCENE_3D_FOV_MIN = 25
  config.SCENE_CAMERA_HORIZONTAL_DISTANCE = 750
  config.SCENE_CAMERA_VERTICAL_BASE_DISTANCE = 110
  config.SCENE_CAMERA_VERTICAL_UP_DISTANCE = 200
  config.SCENE_CAMERA_VERTICAL_DOWN_DISTANCE = 60

  config.PARTICLE_TEXTURE_SIZE = 128
  config.PARTICLE_THUMB_SIZE = 128
  config.PARTICLE_FIELD_SEGMENT_SIZE = 200
  config.PARTICLE_FIELD_GRID_SEG = 3
  config.PARTICLE_FIELD_GRID_SIZE = 2000

  config.NAV_SEARCH_SIZE_MIN = 50
  config.NAV_SEARCH_SIZE_MAX = 100
  config.NAV_SEARCH_ZOOM_THRESHOLD = 0.7
  config.NAV_SEARCH_ITEMS_MAX = 200

  config.STEP_CIRCLE_PARTICLE_AMOUNT_PER_DEGREE = 100
  config.DEFAULT_NOISE_RATIO = 0.24

  const Modernizr = window.Modernizr
  config.transitionStyle = Modernizr.prefixed('transition')
  config.transformStyle = Modernizr.prefixed('transform')
  config.transform3DStyle = Modernizr.csstransforms3d ? config.transformStyle : false
  config.transformPerspectiveStyle = Modernizr.prefixed('perspective')
  config.transformOriginStyle = Modernizr.prefixed('transformOrigin')

  config.isRetina = Boolean(window.devicePixelRatio) && window.devicePixelRatio >= 1.5

  config.webkitFilter =
    document.body.style.webkitFilter === undefined ? false : 'webkitFilter'

  config.uiAssetPath = config.isRetina ? 'img/ui_x2.png' : 'img/ui.png'
  config.colorMapPath = 'img/colorMap.png'
}
