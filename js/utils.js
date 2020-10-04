const { ipcRenderer } = require('electron')
const get = (ele, options = {singleArray: false, zeroArray: false}) => {
  const fele = document.querySelectorAll(ele)

  if (!fele.length && !options.zeroArray) return null
  else if (!fele.length && options.zeroArray) return []

  if (fele.length === 1 && !options.singleArray) return fele[0]
  else return fele
}

const create = (ele, attrs, listeners) => {
  // create element
  const e = document.createElement(ele)
  // add any attributes
  if (attrs) {
    // TODO: change this to Object.keys(attrs).forEach() to remove hasOwnProperty check
    for (let key in attrs) {
      if (attrs.hasOwnProperty(key)) {
        if (typeof attrs[key] === 'object' && !Array.isArray(attrs[key])) {
          for (let k in attrs[key]) {
            e[key][k] = attrs[key][k]
          }
        } else {
          if (key === 'class') {
            if (Array.isArray(attrs[key])) attrs[key].forEach( c => e.classList.add(c))
            else e.classList.add(attrs[key])
          }
          else if (key.includes('data')) e.setAttribute(key, attrs[key])
          else e[key] = attrs[key]
        }
      }
    }
  }
  // add any event listeners
  if (listeners) {
    for (let l in listeners) {
      if (listeners.hasOwnProperty(l)) e.addEventListener(l, listeners[l])
    }
  }
  return e
}

const add = (parent, ...children) => {
  if (children.length < 2) parent.appendChild(children[0])
  else children.forEach(child => parent.appendChild(child))
}

function modClass(ele, type, ...args) {
  if (type === 'remove') {
    ele.classList.remove(args[0])
  } else if (type === 'add') {
    ele.classList.add(args[0])
  } else if (type === 'toggle') {
    if (ele.classList.contains(args[0])) ele.classList.remove(args[0])
    ele.classList.add(args[1])
  }
}

function modStyle(ele, args = {}) {
  Object.keys(args).forEach( key => {
    if (args.hasOwnProperty(key)) ele.style[key] = args[key]
  })
}

function logToMain(msg) {
  ipcRenderer.send('log', msg)
}

module.exports = { get, create, add, modClass, modStyle, logToMain }
