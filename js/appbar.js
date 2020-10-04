const ipcRenderer = require('electron').ipcRenderer
const iconExtractor = require('icon-extractor');

const  { get, create, add, modStyle } = require('../js/utils')

const container = get('#shortcuts')
let tempState
ipcRenderer.send('getState')
ipcRenderer.on('getState', (e, a) => {
  if (
    typeof tempState !== 'undefined'
    && typeof tempState.videoPaused !== 'undefined'
    && tempState.videoPaused !== a.videoPaused
  ) {
    setPlayPause(!a.videoPaused)
  }
  tempState = { ...a }
})

const state = {
  get: key => tempState[key],
  set: (key, val) => {
    tempState[key] = val
    ipcRenderer.send('setState', {[key]: tempState[key]})
  }
}

// TODO: get this from json file
const shortcuts = [
  {name: 'vivaldi', path: 'C:\\Users\\Deadpool\\AppData\\Local\\Vivaldi\\Application\\vivaldi.exe'},
  {name: 'webstorm', path: 'D:\\Program Files\\JetBrains\\WebStorm 2019.3.4\\bin\\webstorm64.exe'},
  {name: 'putty', path: 'D:\\Program Files\\PuTTY\\putty.exe'},
  {name: 'notepad', path: 'C:\\Windows\\system32\\notepad.exe'},
  {name: 'winscp', path: 'D:\\Program Files (x86)\\WinSCP\\WinSCP.exe'}
]

const mediaShortcuts = ['hulu', 'hbo', 'netflix', 'funimation', 'amazon']

// buildShortcuts()
buildClock()
// buildMedia()

function buildMedia() {
  const container = get('#mediacontainer_outer')

  mediaShortcuts.forEach( media => {
    const cont = create(
      'div',
      {
        id: media,
        class: 'image-container'
      },
      {
        'click': () => toggleMediaContainer(media),
        'mouseenter': () => {
          modStyle(get(`#${media} > img`), {filter: `grayscale(100%) url('#firstaccent')`})
          setTimeout(() =>
            modStyle(get(`#${media} > img`), {filter: `grayscale(100%) url('#maincolor')`})
            , 2000)
        },
        'mouseleave': () => {
          modStyle(get(`#${media} > img`), {filter: `grayscale(100%) url('#maincolor')`})
        }
      }
    )
    const img = create(
      'img',
      {
        src: `../images/${media}.png`,
        style: {
          filter: `grayscale(100%) url('#maincolor')`
        }
      }
    )
    add(cont, img)
    add(container, cont)
  })
}

function buildShortcuts() {
  shortcuts.forEach( shortcut => {
    const iconContainer = create(
      'div',
      {
        class: 'icon-container'
      },
      {
        'click': () => toggleShortcuts({shortcut: shortcut.path}),
        'mouseenter': () => {
          modStyle(get(`#${shortcut.name}`), {filter: `grayscale(100%) url('#firstaccent')`})
          setTimeout(() =>
              modStyle(get(`#${shortcut.name}`), {filter: `grayscale(100%) url('#maincolor')`})
            , 2000)
        },
        'mouseleave': () => {
          modStyle(get(`#${shortcut.name}`), {filter: `grayscale(100%) url('#maincolor')`})
        }
      }
    )
    const icon = create(
      'img',
      {
        class: 'icon',
        id: shortcut.name,
        style: {
          filter: `grayscale(100%) url('#maincolor')`
        }
      }
    )
    add(iconContainer, icon)
    add(container, iconContainer)
    ipcRenderer.send('icon', shortcut)
    ipcRenderer.on(`${shortcut.name}-icon`, addIcon)
  })
}

function toggleShortcuts(actn) {
  const shortFlag = state.get('shortcutIconsShow')
  const allShorts = get('.icon-container')
  if (!shortFlag) {
    allShorts.forEach( s => s.style.transform = 'none')
  } else {
    const px = 63 * shortcuts.length
    allShorts.forEach( s => s.style.transform = `translateX(-${px}px)`)
  }

  state.set('shortcutIconsShow', !shortFlag)
  if (actn) action(actn)
}

function buildClock() {
  const d = new Date()
  const time = get('#time')
  const date = get('#date')
  const hour = create('span', {id: 'clock-hour'})
  const ellipse1 = create('span', {textContent: ':', class: 'first-accent'})
  const minute = create('span', {id: 'clock-min'})
  const ellipse2 = create('span', {textContent: ':', class: 'first-accent'})
  const second = create('span', {id: 'clock-second', class: 'second-accent'})
  const splitDate = d.toDateString().split(' ')
  const day = create('span', {id: 'clock-day', class: 'second-accent'})
  const today = create('span', {id: 'clock-today'})
  const year = create('span', {textContent: splitDate[3], class: 'second-accent'})
  add(time, hour)
  add(time, ellipse1)
  add(time, minute)
  add(time, ellipse2)
  add(time, second)
  add(date, day)
  add(date, today)
  add(date, year)

  setTime()
  setDate()
  setInterval(setTime, 1000)
  setInterval(setDate, 60000)
}

function setTime() {
  const d = new Date()
  const splitTime = d.toLocaleTimeString().split(':')
  get('#clock-hour').textContent = splitTime[0]
  get('#clock-min').textContent = splitTime[1]
  get('#clock-second').textContent = splitTime[2]
}

function setDate() {
  const d = new Date()
  const splitDate = d.toDateString().split(' ')
  get('#clock-day').textContent = splitDate[0] + 'day '
  get('#clock-today').textContent = splitDate[1] + ' ' + splitDate[2] + ' '
}

function addIcon(_, a) {
  const i = get(`#${a.Context}`)
  if (!i || i.src) return
  i.src = `data:image/png;base64, ${a.Base64ImageData}`
}

function action(action) {
  ipcRenderer.send('action', action)
}

ipcRenderer.on('streamData', (e, a) => {
  setStreamData({title: a.title, episode: a.episode})
})

function setPlayPause(videoPaused) {
  get('#control-pause').style.display = videoPaused ? 'inline-block' : 'none'
  get('#control-play').style.display = videoPaused ? 'none' : 'inline-block'
}

function setStreamData({title, episode, togglePlayer} = {title: null, episode: null, togglePlayer: 'close'}) {
  if (togglePlayer) {
    const tgl = togglePlayer === 'close'
    if (tgl) {
      get('#close-video').style.display = 'none'
      get('#open-video').style.display = 'flex'
      get('#stream-data').style.visibility = 'hidden'
      state.set('mediaIconsShow', false)
      state.set('videoLoaded', false)
      state.set('selectedMedia', 'poop')
      toggleMediaContainer(null, true)
    } else {
      get('#close-video').style.display = 'flex'
      get('#open-video').style.display = 'none'
    }

    action('toggleVideoPlayer')
  }

  const tele = get('#stream-title')
  const eele = get('#stream-episode')

  tele.textContent = title
  eele.textContent = episode

  if (title && episode) {
    get('#stream-data').style.visibility = 'visible'
    get('#control-play').style.display = 'none'
    get('#control-pause').style.display = 'inline-block'
  }
}

function toggleMediaContainer(media = null, close = false) {
  const selectedMedia = close ? 'poop' : state.get('selectedMedia')
  const mediaFlag = close ? false : state.get('mediaIconsShow')
  if (media && selectedMedia !== media) ipcRenderer.send('action', media)
  else if (media && !mediaFlag) return // Turns off click event for when media is already selected
  else if (!media && mediaFlag && selectedMedia) media = selectedMedia

  const allOpts = get('.image-container')
  const streamData = get('#stream-data')
  streamData.style.transform = !mediaFlag ? 'none' : 'translateX(314px)'
  allOpts.forEach( (div, ind) => {
    let style = mediaFlag ? 'translateX(378px)' : 'none'
    if (media) {
      state.set('selectedMedia', media)
      if (div.id === media) {
        const px = 63 * (allOpts.length - (ind + 1))
        style = `translate(${px}px)`
      }
    }
    div.style.transform = style;
  })
  state.set('mediaIconsShow', !mediaFlag)
}

ipcRenderer.on('rotMedia', (e, a) => {
  state.set('mediaIconsShow', false)
  state.set('selectedMedia', a)
  const allOpts = get('.image-container')
  get('#stream-data').style.transform = 'translate(314px)'
  allOpts.forEach( (div, ind) => {
    if (div.id === a) {
      const px = 63 * (allOpts.length - (ind + 1))
      div.style.transform = `translate(${px}px)`
    }
  })
})
