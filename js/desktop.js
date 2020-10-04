const ipcRenderer = require('electron').ipcRenderer

let tempState
ipcRenderer.send('getState')
ipcRenderer.on('getState', (e, a) => tempState = { ...a })

// ipcRenderer.send('ahkMsg', 'desktop')