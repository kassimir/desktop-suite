const log = require('why-is-node-running')
// Electron Imports
const {app, BrowserWindow, screen, ipcMain} = require('electron')
app.allowRendererProcessReue = true
// Node Imports
const path = require('path')
const fs = require('fs')
const { exec, spawn } = require('child_process')
const si = require('systeminformation')

// Third-party Imports
const iconExtractor = require('icon-extractor')

// Other Imports
const actions = require('./actions')
const state = require('../state.management')
const Button = require('../models/button')

const estate = {
  set: (key, val) => {
    state.set(key, val)
    emitState()
  }
}

let manufacturer, brand, speed, cores, socket, avgSpeed, minSpeed, maxSpeed
let totalMem, freeMem, usedMem, activeMem, swapTotal, swapUsed, swapFree
let avgLoad, currLoad, currLoadUser, currLoadSys, cpus /*array of data*/
let drives, netSpeed, graphicsCard, distro

let cpuP, speedP, memP, graphP, loadP, driveP, netP, distP

let windowWidth, windowHeight

let desktopWindow, drawerWindow, appBarWindow, rotaryWindow, debugWindow
// These variables seem opposite, but ahkIn means from ahk to node, so that is ahk out, and this is ahk in, and vice versa
let ahkIn, ahkOut

actions.startAhkMQOut()
  .then(a => {
    ahkOut = a
  })

function createMainWindow() {
  // actions.startBrowser()

  const {w, h} = screen.getAllDisplays()
    .filter(display => {
      if (display.bounds.x >= 0) return display
    })
    .map(display =>
      ({w: display.bounds.width, h: display.bounds.height}))
    .reduce( (acc, cum) =>
      ({w: acc.w + cum.w, h: acc.h}))

  windowWidth = w
  windowHeight = h

  // desktopWindow = new BrowserWindow({
  //   x: -2000,
  //   y: 0,
  //   width: w,
  //   height: h,
  //   skipTaskbar: true,
  //   webPreferences: {
  //     nodeIntegration: true
  //   },
  //   frame: false,
  //   resizable: false,
  //   transparent: true
  // })
  //
  // desktopWindow.loadFile('html/desktop.html')
  // state.set('dskWebcontents', desktopWindow.webContents)
  // state.get('dskWebcontents').openDevTools()
  // createRotaryMenu()
  createAppBarWindow()
}

function createAppBarWindow() {
  appBarWindow = new BrowserWindow({
    x: 0,
    y: 0,
    frame: false,
    transparent: true,
    resizable: false,
    skipTaskbar: true,
    type: 'toolbar',
    webPreferences: {
      nodeIntegration: true
    }
  })

  appBarWindow.setBounds({width: windowWidth})
  appBarWindow.setContentBounds({width: windowWidth, height: 64, x: 0, y: 0})
  appBarWindow.loadFile('html/appbar.html')
  state.set('abWebcontents', appBarWindow.webContents)
  // appBarWindow.webContents.on('dom-ready', () => actions.ahkMessage('appbar'))
  // state.get('abWebcontents').openDevTools()

  createDrawerWindow()
}

function createDrawerWindow() {
  drawerWindow = new BrowserWindow({
    width: 260,
    height: windowHeight - 64,
    x: 0,
    y: 64,
    webPreferences: {
      nodeIntegration: true
    },
    frame: false,
    skipTaskbar: true,
    transparent: true,
    resizable: false
  })

  drawerWindow.loadFile('html/drawer.html')
  state.set('dwWebcontents', drawerWindow.webContents)
  drawerWindow.webContents.on('dom-ready', () => {
    drawerData()
    actions.ahkMessage('drawer')
  })
  // state.get('dwWebcontents').openDevTools()

  createRotaryMenu()
}

function drawerData(reload = false) {
  if (state.get('drawerOpen')) {
    state.set('drawerOpen', false)
    return actions.ahkMessage('drawerClose')
  }

  state.get('dwWebcontents').send('faves', getFaves())
  state.get('dwWebcontents').send('games', getGames())

  Promise.all(getSysData()).then(d => {
    // cpuP
    manufacturer = d[0].manufacturer
    brand = d[0].brand
    speed = d[0].speed
    cores = d[0].cores
    socket = d[0].socket

    // speedP
    avgSpeed = d[1].avg + ' GHz'
    minSpeed = d[1].min + ' GHz'
    maxSpeed = d[1].max + ' GHz'

    // memP
    totalMem = convertMem(d[2].total)
    freeMem = convertMem(d[2].free)
    usedMem = convertMem(d[2].used)
    activeMem = convertMem(d[2].active)
    swapTotal = convertMem(d[2].swaptotal)
    swapUsed = convertMem(d[2].swapused)
    swapFree = convertMem(d[2].swapfree)

    // graphP
    graphicsCard = d[3].controllers[0].model;

    //loadP
    [avgLoad, currLoad, currLoadUser, currLoadSys] = convertToPercent(
      d[4].avgload,
      d[4].currentload,
      d[4].currentload_user,
      d[4].currentload_system
    )
    cpus = d[4].cpus

    // driveP
    drives = d[5]

    // netP
    const wifi = d[6].find(i => i.iface === 'Wi-Fi 2')
    netSpeed = wifi.speed

    // distP
    distro = d[7].distro

    const compinfo = {
      brand, speed, cores, socket, avgSpeed, minSpeed, maxSpeed,
      totalMem, freeMem, usedMem, activeMem, swapTotal, swapUsed, swapFree,
      avgLoad, currLoad, currLoadUser, currLoadSys, cpus,
      drives, netSpeed, graphicsCard, distro, manufacturer, reload
    }

    state.get('dwWebcontents').send('compinfo', compinfo)

    state.set('drawerOpen', true)

    function convertToPercent(...nums) {
      return nums.map(num => parseFloat(num).toFixed(2) + '%')
    }

    function convertMem(num) {
      return num < 10000000000
        ? (num / 1000000).toFixed(2) + ' MB'
        : (num / 1000000000).toFixed(2) + ' GB'
    }
  })

  actions.ahkMessage('drawerOpen')

  function getFaves() {
    return fs.readdirSync('./faves')
  }

  function getGames() {
    return fs.readdirSync('./games')
  }
}

function createRotaryMenu() {
  const width = 400
  const height = 400
  rotaryWindow = new BrowserWindow({
    width: width,
    height: height,
    x: 500,
    y: 500,
    webPreferences: {
      nodeIntegration: true
    },
    frame: false,
    skipTaskbar: true,
    resize: false,
    transparent: true,
    alwaysOnTop: true,
    show: false
  })

  rotaryWindow.loadFile('html/rotarymenu.html')
  state.set('rotWebcontents', rotaryWindow.webContents)
  rotaryWindow.webContents.on('dom-ready', () => {
    actions.startAhkMQIn()
      .then(a => {
        ahkIn = a
        watchIncoming()
      })
  })
  // state.get('rotWebcontents').openDevTools()

  // createDebug()
}

function createDebug() {
  debugWindow = new BrowserWindow({
    width: 300,
    height: 105,
    x: 1144,
    y: 676,
    webPreferences: {
      nodeIntegration: true
    }
  })

  debugWindow.loadFile('html/debug.html')
}

app.whenReady().then(createMainWindow)
// app.whenReady().then(createAppBarWindow)

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', function () {
  if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
})

ipcMain.on('ahkMsg', (e, a) => {
  actions.ahkMessage(a)
})

ipcMain.on('changeColor', (e, a) => {
  actions.ahkMessage(`setcolor-${a}`)
})

ipcMain.on('browserResize', () => {
  actions.ahkMessage('browserResize')
})

ipcMain.on('getState', (e, a) => {
  e.reply('getState', state.getAllNonWCStates())
})

ipcMain.on('setState', (e, a) => {
  Object.keys(a).forEach(k => {
    estate.set(k, a[k])
  })
})

ipcMain.on('rotShow', (e, a) => {
  const { width, height } = rotaryWindow.getBounds()

  let {x, y} = screen.screenToDipPoint(screen.getCursorScreenPoint())
  x -= width / 2
  y -= height / 2

  rotaryWindow.setBounds({x, y})
  rotaryWindow.show()
})

ipcMain.on('log', (e, a) => {
  console.log(a)
})

ipcMain.on('rotAlt', (e, a) => {
  estate.set('rotMenuOpen', false)
  buildRotaryMenu(alternateConfig[a])
})

ipcMain.on('action', (e, a) => {
  if (typeof a === 'object') {
    return spawn(`"${a.shortcut}"`, null, {shell: true})
  }

  if (a.substr(0, 5) === 'media') {
    a = a.substr(5)
    state.get('abWebcontents').send('rotMedia', a)
  }

  if (a.substr(0, 2) === 'a-') { // WinActivate
    return actions.ahkMessage(a)
  }

  switch (a) {
    case 'drawer':
      return actions.ahkMessage('drawer')
    case 'appBar':
      return
      // return actions.ahkMessage('appBar')
    case 'hulu':
    case 'netflix':
    case 'funimation':
      estate.set('videoLoaded', true)
      actions.navigate()[a]().then(() => console.log('finished navigation promise: ', a))
      break
    case 'playPause':
      actions.streamControls().playPause()
      return estate.set('videoPaused', !state.get('videoPaused'))
    case 'rewind':
    case 'ff':
      return actions.streamControls()[a]()
    case 'fullscreen':
      actions.streamControls().fullscreen()
      return estate.set('videoFullscreen', !state.get('videoFullscreen'))
    case 'toggleVideoPlayer':
      actions.navigate().home()
      return actions.ahkMessage('toggleVideoPlayer')
    case 'closerot':
      estate.set('rotMenuOpen', false)
      return rotaryWindow.hide()
    default:
      return console.log('invalid action: ', a)
  }
})

ipcMain.on('icon', (e, a) => {
  const iconRet = getIcon({nm: a.name, pth: a.path})
  iconRet.iconSpawn.on('data', data => {
    // process.kill(iconRet.pid) // Icon Spawn is not exiting on its own, so I'm killing it myself.
    e.reply(`${a.name}-icon`, JSON.parse(data.toString()))
  })
})

function getIcon({nm, pth}) {
  const spawnPath = path.join(__dirname, '../', 'IconExtractor', 'IconExtractor.exe')

  const iconSpawn = exec(spawnPath, {shell: true, timeout: 5000})
  const fnData = JSON.stringify({context: nm, path: pth}) + '\n'
  iconSpawn.stdin.write(fnData)

  iconSpawn.on('error', error => console.log('errorrr: ', error.toString()))
  iconSpawn.stderr.on('stderr', error => console.log('error: ', error.toString()))
  iconSpawn.on('data', data => {

  })
  return {iconSpawn: iconSpawn.stdout, pid: iconSpawn.pid}
}

function emitState() {
  state.getAllWCStates().forEach(wc => {
    if (wc) wc.send('getState', state.getAllNonWCStates())
  })
}

function watchIncoming() {
  let dataString = '';
  ahkIn.stdout.on('data', function (data) {
    dataString += data.toString();
    let received = '';
    for (let i = 0; i < data.length; i++) {
      received += String.fromCharCode(data[i]);
    }

    if (received === 'rotary') buildRotaryMenu()
    // else if (received === 'closeRot') rotaryWindow.send('destroy')
    else if (received === 'media') buildRotaryMenu(mediaControls())
    else if (received === 'drawerToggle') drawerData(true)
    else if (received === 'tabright') state.get('dwWebcontents').send('wheelTab', 'r')
    else if (received === 'tableft') state.get('dwWebcontents').send('wheelTab', 'l')
    else {
      try {
        const maybeJSON = checkDataForEscapes(received)

        if (!!maybeJSON && JSON.parse(maybeJSON)) getTasks(JSON.parse(maybeJSON))
      } catch (e) {
        //   let str = ''
        //   for (let i = 0; i < 680; i++) {
        //     str += received[i]
        //   }
        //   console.log('received not recognized: ', str)}
        console.log('Received command not recognized: ', received)
      }
    }
  });
}

function checkDataForEscapes(jsonData) {
  return typeof jsonData === 'string' ? jsonData.replace(/\\/g, '\\\\') : null
}

let alternateConfig = []

function getTasks(jsonData) {
  if (!state.get('rotMenuOpen')) rotaryWindow.send('destroy')
  const config = {
    options: [],
    rotateSpeed: '0.4s',
    dataset: 'base64'
  }
  let iconCount = 1
  const noDupes = []
  const dupes = []
  const pids = []
  alternateConfig = []
  jsonData.forEach(task => {
    if (noDupes.includes(task.path)) dupes.push(task.path)
    else noDupes.push(task.path)
  })
  jsonData.forEach( task => {
    const {iconSpawn, pid} = getIcon({nm: '', pth: task.path})
    pids.push(pid)
    const full = !!(+task.full)
    if (dupes.includes(task.path) && !full) {
      const split = task.path.split('\\')
      const exe = split[split.length - 1]
      if (!alternateConfig[exe]) {
        alternateConfig[exe] = {
          options: [],
          rotateSpeed: '0.4s'
        }
        iconSpawn.on('data', data => {
          const pth = JSON.parse(data.toString())['Path'].split('\\')
          alternateConfig[exe].options.push(new Button(JSON.parse(data.toString())['Base64ImageData'], task.title, `task-${task.id}`, `a-${task.id}`, true, 'base64'))
          config.options.push(new Button(JSON.parse(data.toString())['Base64ImageData'], `${pth[pth.length - 1].split('.')[0]} (${getDupeNum(task.path)})`, `task-${task.id}`, `altmenu${exe}`, true, 'base64'))
          iconCount++
          if (iconCount === jsonData.length) {
            buildRotaryMenu(config, pids)
          }
        })
      } else {
        iconSpawn.on('data', data => {
          alternateConfig[exe].options.push(new Button(JSON.parse(data.toString())['Base64ImageData'], task.title, `task-${task.id}`, `a-${task.id}`, true, 'base64'))
          iconCount++
          if (iconCount === jsonData.length) {
            buildRotaryMenu(config, pids)
          }
        })
      }
    } else {
      iconSpawn.on('data', data => {
        config.options.push(new Button(JSON.parse(data.toString())['Base64ImageData'], task.title, `task-${task.id}`, `a-${task.id}`, true, 'base64'))
        iconCount++
        if (iconCount === jsonData.length) {
          buildRotaryMenu(config, pids)
        }
      })
    }
  })

  function getDupeNum(pth) {
    return dupes.filter(d => d === pth).length + 1
  }
}

function buildRotaryMenu(config, pids) {
  if (state.get('rotMenuOpen')) {
    rotaryWindow.hide()
    state.get('rotWebcontents').send('destroy')
    estate.set('rotMenuOpen', false)
    return
  }

  estate.set('rotMenuOpen', true)

  if (!config) {
    if (state.get('videoLoaded')) config = videoControls()
    else config = mediaControls()
  }

  state.get('rotWebcontents').send('config', config)
  if (pids) setTimeout(() => pids.forEach(p => process.kill(p)), 2000)
}

function videoControls() {
  const pp = state.get('videoPaused')
    ? new Button('fa-play', 'Play', 'playPause', 'playPause', true)
    : new Button('fa-pause', 'Pause', 'playPause', 'playPause', true)

  const ff = state.get('videoFullscreen')
    ? new Button('fa-compress', 'Compress', 'compress', 'fullscreen', true)
    : new Button('fa-expand', 'Fullscreen', 'fullscreen', 'fullscreen', true)

  return {
    options: [
      pp,
      ff,
      new Button('fa-forward', 'Fast Forward', 'ff', 'ff', false),
      new Button('fa-chevron-left', 'Back', 'back', 'back', true),
      new Button('fa-asterisk', 'Focus', 'focus', 'focus', true),
      new Button('fa-backward', 'Rewind', 'rewind', 'rewind', false)
    ],
    rotateSpeed: '0.4s'
  }
}

function mediaControls() {
  return {
    options: [
      new Button('../images/hbo.png', 'HBO', 'hbo', 'mediahbo', true),
      new Button('../images/hulu.png', 'Hulu', 'hulu', 'mediahulu', true),
      new Button('../images/netflix.png', 'Netflix', 'netflix', 'medianetflix', true),
      new Button('../images/funimation.png', 'Funimation', 'funimation', 'mediafunimation', true),
      new Button('../images/amazon.png', 'Amazon Prime', 'amazon', 'mediaamazon', true)
    ],
    rotateSpeed: '0.4s'
  }
}

function getSysData() {
  cpuP = si.cpu()
  speedP = si.cpuCurrentspeed()
  memP = si.mem()
  graphP = si.graphics()
  loadP = si.currentLoad()
  driveP = si.fsSize()
  netP = si.networkInterfaces()
  distP = si.osInfo()

  return [
    cpuP,
    speedP,
    memP,
    graphP,
    loadP,
    driveP,
    netP,
    distP
  ]
}
