// Electron imports
const ipcRenderer = require('electron').ipcRenderer
const path = require('path')

// Utility imports
const { get, create, add, modClass } = require('../js/utils')

// Tabs
const tabs = [
  {
    name: 'Sys',
    position: 0
  },
  {
    name: 'Faves',
    position: 1
  },
  {
    name: 'Games',
    position: 2
  }
]

let tempState
ipcRenderer.send('getState')
ipcRenderer.on('getState', (e, a) => tempState = { ...a })

let dataUpdate

tabs.forEach( tab => {
  const classes = !tab.position ? ['tab', 'selected-tab'] : 'tab'
  const dis = !tab.position ? 'block' : 'none'
  add(
    get('#tabs'),
    create(
      'div',
      {
        id: tab.name,
        textContent: `${tab.position}: ${tab.name}`,
        order: tab.position,
        class: classes
      },
      {
        'click': () => switchTab(tab.name)
      }
    )
  )
  get(`#${tab.name.toLowerCase()}-tab`).style.display = dis
})

function switchTab(name) {
  tabs.forEach( tab => {
    if (tab.name === name) {
      get(`#${tab.name.toLowerCase()}-tab`).style.display = 'block'
      modClass(get(`#${tab.name}`), 'add', 'selected-tab')
    } else {
      get(`#${tab.name.toLowerCase()}-tab`).style.display = 'none'
      modClass(get(`#${tab.name}`), 'remove', 'selected-tab')
    }
  })
}

function wheelTab(dir) {
  const currentTab = get('.selected-tab')
  const currentPosition = +parseInt(currentTab.textContent.substr(0, 1))
  if ( (dir === 'l' && !currentPosition) || (dir === 'r' && currentPosition === tabs.length) ) return
  if (dir === 'r') switchTab(tabs.find(t => t.position === currentPosition + 1).name)
  else  switchTab(tabs.find(t => t.position === currentPosition - 1).name)
}

ipcRenderer.on('wheelTab', (e, a) => {
  wheelTab(a)
})

ipcRenderer.on('faves', (e, a) => {
  buildDrawerTab(a, get('#faves-tab'))
})

ipcRenderer.on('games', (e, a) => {
  buildDrawerTab(a, get('#games-tab'))
})

function buildDrawerTab(a, parent) {
  parent.innerHTML = '';
  const folder = parent.id === 'faves-tab' ? '\\faves' : '\\games'
  const spath = `${path.join(__dirname, '..', folder)}`

  if (folder === '\\games') {
    addButton('Open Steam', `${path.join(__dirname, '..', 'steam.lnk')}`)
    addButton('Open Epic', `${path.join(__dirname, '..', 'epic.lnk')}`)
  }

  a.forEach(b => addButton(b))

  function addButton(button, pth) {
    const shortcut = pth ? pth : `${spath}\\${button}`

    const div = create(
      'div',
      {
        class: 'btn'
      },
      {
        'click': () => {
          ipcRenderer.send('action', {shortcut})
        }
      }
    )
    const span = create(
      'span',
      {
        textContent: button.replace('.lnk', '').replace('.url', '')
      }
    )
    add(div, span)
    add(parent, div)
  }
}

ipcRenderer.on('compinfo', (e, a) => {
  const {
    manufacturer,
    brand,
    speed,
    cores,
    socket,
    avgSpeed,
    minSpeed,
    maxSpeed,
    totalMem,
    freeMem,
    usedMem,
    activeMem,
    swapTotal,
    swapUsed,
    swapFree,
    avgLoad,
    currLoad,
    currLoadUser,
    currLoadSys,
    cpus,
    drives,
    netSpeed,
    graphicsCard,
    distro,
    reload
  } = a

  drives.forEach((drive, ind) => {
    if (reload) return get(`#drive-${ind} > td`).textContent = `${drive.fs} ${convert(drive.used)} / ${convert(drive.size)} (${percent(drive.use)}%)`

    const tr = create('tr',
      {
        id: `drive-${ind}`,
        colSpan: '2'
      })
    const td = create('td',
      {
        textContent: `${drive.fs} ${convert(drive.used)} / ${convert(drive.size)} (${percent(drive.use)}%)`,
        colSpan: '2'
      })
    add(tr, td)
    if (!ind) {
      get('#drives').after(tr)
    } else {
      get(`#drive-${ind - 1}`).after(tr)
    }
  })

  setData('cpuname', `${manufacturer} ${brand}`)
  setData('cpuinfo', `${speed} GHz / ${cores} cores (virtual) / ${socket}`)
  setData('graphics', graphicsCard)
  setData('distro', distro)
  setData('wifispeed', `WiFi Speed: ${netSpeed} Mbps`)
  setData('cpuavg', `${avgSpeed}`)
  setData('cpumin', `${minSpeed}`)
  setData('cpumax', `${maxSpeed}`)
  setData('totalmem', totalMem)
  setData('freemem', freeMem)
  setData('activemem', activeMem)
  setData('usedmem', usedMem)
  setData('swaptotal', swapTotal)
  setData('swapused', swapUsed)
  setData('swapfree', swapFree)
  setData('avgload', avgLoad)
  setData('currload', currLoad)
  setData('currloaduser', currLoadUser)
  setData('currloadsys', currLoadSys)

  cpus.forEach( (cpu, ind) => {
    if (reload) {
      const ele = get(`cpu-${ind}-data`)
      if (ele) return ele.textContent = `${percent(cpu.load)}%`
      else return
    }
    const before = !ind ? get('#currloadsystr') : get(`#cpu-${ind-1}-tr`)
    const tr = create(
      'tr',
      {
        id: `cpu-${ind}-tr`
      }
    )
    const td1 = create(
      'td',
      {
        id: `cpu-${ind}-label`,
        textContent: `Core ${ind + 1}:`
      }
    )
    const td2 = create(
      'td',
      {
        id: `cpu-${ind}-data`,
        textContent: `${percent(cpu.load)}%`
      }
    )
    add(tr, td1)
    add(tr, td2)
    before.after(tr)
  })
})

function setData(id, data) {
  get(`#${id}`).textContent = data
}

function convert(num) {
  return num < 1000000000000
    ? parseFloat(num / 1000000000).toFixed(1) + ' GB'
    : parseFloat(num / 1000000000000).toFixed(1) + ' TB'
}

function percent(num) {
  return parseFloat(num).toFixed(1)
}
