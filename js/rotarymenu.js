// Electron imports
const { ipcRenderer, remote, screen } = require('electron')

// Utility imports
const { get, create, add, modClass } = require('../js/utils')

// Model imports
const Button = require('../models/button')

// Customizable Data
let options, rotateSpeed, dataset

// This keeps the UI from breaking down, if you send it a mouse wheel event before it can finish
// its rotation. Scroll enough times, and it turns into a jumbled mess. It's kind of funny but
// kills the vibe. True when rotating; false when done.
let rotating = false
// Allows for setup of a couple elements so as to not have to destroy everything and rebuild.
let initialLoad = true

const _ = {
  body: get('body'),
  container: get('#container')
}

ipcRenderer.on('config', (e, data = {options: [], rotateSpeed: '0.4s', dataset: null}) => {
  options = data.options
  rotateSpeed = data.rotateSpeed
  buildMenu()
})

ipcRenderer.on('destroy', destroyMenu)

function buildMenu() {
  if (initialLoad) {

    const bounds = options.length * 60 > 400 ? options.length * 60 : 400

    remote.getCurrentWindow().setBounds({
      width: bounds,
      height: bounds
    })

    const mainButton = create(
      'div',
      {
        id: 'main-button',
        class: 'dark'
      }, {
        'mousedown': () => keyPress(this),
        'mouseup': () => submitOption(this)
      })
    const displayName = create(
      'div',
      {
        id: 'display-name',
        class: 'dark',
        style: {width: (options.length * 60) / 2 + 'px'}
      }
    )
    const selectedOption = create(
      'span',
      {
        id: 'selected-option'
      }
    )

    add(displayName, selectedOption)
    add(_.container, displayName)
    add(_.container, mainButton)

    initialLoad = false
  }

  const points = options.length
  const radius = points * 10 < 60 ? 60 : points * 10

  let x, y;

  for (let i = 0; i < points; i++)
  {
    x = Math.round(radius * Math.cos(2 * Math.PI * i / points))
    y = Math.round(radius * Math.sin(2 * Math.PI * i / points))

    options[i].position = {x: x, y: y}

    buildSatellite(x, y, i)
  }

  _.body.addEventListener('wheel', rotateMenu)
}

function buildSatellite(x, y, i) {
  if (!i) {
    x = y = 0
    get('#display-name > span').textContent = options[i].text
  }

  const satellite = create(
    'div',
    {
      style: {
        position: 'absolute',
        left: x + 'px',
        top: y + 'px',
        transition: `top ${rotateSpeed}, left ${rotateSpeed}, background-color ${rotateSpeed}`
      },
      id: options[i].id,
      class: ['satellite', 'light']
    },
    {
      'mousedown': e => keyPress(e.target),
      'mouseup': e => submitOption(e.target, options[i].action, options[i].closeMenu, e.ctrlKey),
      'mouseover': e => {
        get('#display-name > span').textContent = options[i].text
        modClass(e.target, 'toggle', 'light', 'dark')
      },
      'mouseout': e => {
        get('#display-name > span').textContent = ''
        modClass(e.target, 'toggle', 'dark', 'light')
      }
    }
  )

  let icon
  if (options[i].icon.substr(0, 2) === 'fa') { // font awesome
    icon = create(
      'i',
      {
        style: {pointerEvents: 'none'},
        class: ['fas', options[i].icon]
      }
    )
  } else if (options[i].dataset === 'base64') { // Icon Extractor - base64
    icon = create(
      'img',
      {
        style: {
          pointerEvents: 'none',
          width: '60%',
          height: '60%',
          filter: `grayscale(100%) url('#firstaccent')`
        },
        src: `data:image/png;base64, ${options[i].icon}`
      }
    )
  } else { // custom icons
    icon = create(
      'img',
      {
        style: {
          pointerEvents: 'none',
          width: '60%',
          height: '60%',
          filter: `grayscale(100%) url('#firstaccent')`
        },
        src: options[i].icon
      }
    )
  }

  add(satellite, icon)
  add(_.container, satellite)

  ipcRenderer.send('rotShow')
}

function keyPress (ele) {
  if (ele.style.top === '0px' && ele.style.left === '0px') {
    modClass(ele, 'toggle', 'dark', 'light')
    modClass(get('#display-name'), 'toggle', 'dark', 'light')
  } else modClass(ele, 'toggle', 'light', 'dark')
}

function submitOption (ele, action, close, alt) {
  if (ele.style.top === '0px' && ele.style.left === '0px') {
    modClass(ele, 'toggle', 'light', 'dark')
    modClass(get('#display-name'), 'toggle', 'light', 'dark')
  } else modClass(ele, 'toggle', 'dark', 'light')

  if (action.substr(0, 7) === 'altmenu') {
    ipcRenderer.send('rotAlt', action.substr(7))
  } else {
    if (alt) action += '-alt'
    ipcRenderer.send('action', action)
  }

  if (close) destroyMenu()
}

function convertRotateSpeed() {
  return parseFloat(rotateSpeed.substring(0, rotateSpeed.length - 1)) * 500
}

function destroyMenu() {
  const satellites = get('.satellite')
  if (satellites && satellites.length) {
    satellites.forEach(s => _.container.removeChild(s))
    ipcRenderer.send('action', 'closerot')
  }
}

function rotateMenu(e) {
  if (rotating) return
  rotating = true
  setTimeout(() => rotating = false, convertRotateSpeed())
  let dir = () => {}
  if (e.deltaY > 0) {
    dir = num => ++num
  } else dir = num => --num
  const satellites = get('.satellite')
  satellites.forEach( sat => {
    let x, y

    let self = options.findIndex( opt => opt.id === sat.id)
    let index = dir(self)
    if (index === options.length) {
      index = 0
    } else if (index === -1) {
      index = options.length - 1
    }
    if (sat.style.left === '0px' && sat.style.top === '0px') {
      modClass(sat, 'toggle', 'dark', 'light')
    }
    const n = get(`#${options[index].id}`)
    x = n.style.left
    y = n.style.top
    options[self].position.x = x
    options[self].position.y = y
  })
  satellites.forEach( sat => {
    let self = options.findIndex( opt => opt.id === sat.id)
    sat.style.left = options[self].position.x
    sat.style.top = options[self].position.y
    if (sat.style.left === '0px' && sat.style.top === '0px') {
      modClass(sat, 'toggle', 'light', 'dark')
      get('#display-name > span').textContent = options[self].text
    }
  })
}
