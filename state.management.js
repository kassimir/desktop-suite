const state = {
  // Web Contents
  dskWebcontents: null, // desktopWindow webcontents
  dwWebcontents: null, // drawerWindow webcontents
  abWebcontents: null, // appbarWindow webcontents
  rotWebcontents: null, // rotaryWindow webcontents
  // App Bar State
  shortcutIconsShow: false,
  mediaIconsShow: false,
  // Video States
  videoPaused: false, // true if video is pause; false if video is not paused
  videoFullscreen: false, // true if video is full screen; false if not full screen
  videoLoaded: false, // true if streaming video is currently loaded; false if not
  selectedMedia: 'poop',
  // Drawer State
  drawerOpen: false,
  // Rotary Menu States
  rotMenuOpen: false
}

function set(key, val) {
  if (typeof state[key] === 'undefined') return console.log('That state does not exist: ', key)
  state[key] = val
}

function get(key) {
  if (typeof state[key] === 'undefined') return console.log('That state does not exist: ', key)
  return state[key]
}

function getAllStates() {
  return state
}

function getAllWCStates() {
  return [
    state.dskWebcontents,
    state.dwWebcontents,
    state.abWebcontents,
    state.rotWebcontents
  ]
}

function getAllNonWCStates() {
  const states = { ...state }
  delete states.abWebcontents
  delete states.dskWebcontents
  delete states.rotWebcontents
  delete states.dwWebcontents
  return states
}

module.exports = { set, get, getAllStates, getAllWCStates, getAllNonWCStates }
