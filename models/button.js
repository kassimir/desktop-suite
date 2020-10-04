class Button {
  icon = null
  text = null
  id = null
  action = null
  closeMenu = null
  dataset = null
  position = null

  constructor(icon, text, id, action, closeMenu = true, dataset = 'image', position = {x: 0, y: 0}) {
    this.icon = icon
    this.text = text
    this.id = id
    this.action = action
    this.closeMenu = closeMenu
    this.dataset = dataset
    this.position = position
  }
}

module.exports = Button
