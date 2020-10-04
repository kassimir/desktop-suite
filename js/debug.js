const ipcRenderer = require('electron').ipcRenderer
const  { get, create, add, modStyle } = require('../js/utils')

function setColor() {
  const color = get('input').value

  ipcRenderer.send('changeColor', color)
}