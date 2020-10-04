// Node Imports
const path = require('path')
const fs = require('fs')
const spawn = require('child_process').spawn

// Selenium Imports
const { Builder, By, until, Key } = require('selenium-webdriver');

// My Imports
const state = require('../state.management')

let driver, ahkMQIn, ahkMQOut, streamingService

const STREAMING = {
  Netflix: 'netflix',
  Hulu: 'hulu',
  Funimation: 'funimation'
}

// This is the Electron/AHK "message queue"
async function startAhkMQIn() {
  ahkMQIn = await spawn('D:/AHK/AutoHotkey.exe', ['stdout.ahk']);
  return ahkMQIn
}

async function startAhkMQOut() {
  ahkMQOut = await spawn('D:/AHK/AutoHotkey.exe', ['stdin.ahk'])
  return ahkMQOut
}

async function startBrowser() {
  ahkMessage('videoplayer')
  driver = await new Builder().forBrowser('MicrosoftEdge').build()
  await driver.get('http://v.eadpool.com') // My sweet home page
}

const streamControls = () => {
  const BUTTONS = {
    netflix: {
      rewind: '.button-nfplayerBackTen',
      play: '.button-nfplayerPlay',
      pause: '.button-nfplayerPause',
      ff: '.button-nfplayerFastForward'
    },
    hulu: {
      rewind: '.controls__rewind-button-icon',
      play: '.controls__playback-button-playing',
      pause: '.controls__playback-button-paused',
      ff: '.controls__fastforward-button-icon'
    },
    funimation: {
      rewind: '#funimation-control-back',
      play: '.funimation-icon-play',
      pause: '.funimation-icon-pause',
      ff: '#funimation-control-forward',
      altFn: function() {
        clickButton(arguments[0])

        function clickButton(button) {
          const frame = document.querySelector('iframe')
          if (frame) {
            const b = frame.contentDocument.querySelector(button)
            if (b) b.click()
          } else setTimeout(() => clickButton(button), 500)
        }
      }
    }
  }

  const site = BUTTONS[streamingService]

  return {
    playPause,
    rewind: () => clickButton('rewind'),
    ff: () => clickButton('ff'),
    fullscreen
  }

  function playPause() {
    const vp = state.get('videoPaused')
    if (vp) {
      clickButton('play')
    } else {
      clickButton('pause')
    }
  }

  function fullscreen() {
    const fs = state.get('videoFullscreen')
    if (fs) {
      ahkMessage('videorestore')
    } else {
      ahkMessage('videofullscreen')
    }
  }

  function clickButton(button) {
    const but = site[button]
    const altFn = site['altFn']

    if (!altFn) {
      driver.executeScript(
        function() {
          const b = document.querySelector(`${arguments[0]}`)
          if (b) b.click()
        }, but)
    } else {
      driver.executeScript(altFn, but)
    }
  }
}

const q = ele => driver.findElement(By.css(ele))

const logIn = () => {
  return {
    hulu,
    netflix,
    funimation
  }

  async function hulu() {
    // const rect = await driver.manage().window().getRect()
    // if (rect.width < 1050) {
    //   ipcRenderer.send('ahkMessage', 'browserResize')
    // }
    await q('button[class="navigation__login-button navigation__action-button navigation__cta"]').click()

    await driver.sleep(1000)

    const logInfo = {
      userEle: '#email_id',
      passEle: '#password_id',
      userText: 'cstanleymo@hotmail.com',
      passText: 'Lawliet13'
    }
    await lg('hulu', logInfo)
  }

  async function netflix() {
    await driver.get('https://www.netflix.com/login')
    const url = await driver.getCurrentUrl()
    if (!url.includes('login')) return navigate().netflix()
    const logInfo = {
      userEle: '#id_userLoginId',
      passEle: '#id_password',
      userText: 'chris@chris.im',
      passText: 'marble55'
    }
    await lg('netflix', logInfo)
  }

  async function funimation() {
    await driver.get('https://www.funimation.com/log-in/')
  }

  async function lg(domain, {userEle, passEle, loginEle, userText, passText}) {
    await until.elementLocated(By.css(userEle))
    await driver.sleep(400)
    const user = q(userEle)
    const pass =  q(passEle)

    const lbut =  q(loginEle)

    user.sendKeys(`${userText}`)
    if (loginEle) {
      pass.sendKeys(`${passText}`)
      await driver.sleep(500)
      lbut.click()
    } else {
      pass.sendKeys(`${passText}`, Key.ENTER)
    }
    driver.sleep('10000').then(() => saveCookies(domain))
  }
}

const navigate = () => {
  return {
    home: () => driver.get('https://v.eadpool.com'),
    hulu,
    netflix,
    funimation
  }

  async function watchUrlChange(url, opts) {
    await navEleTrigger(url, opts.watch.element)
    const curl = await driver.getCurrentUrl()
    if (curl !== url) { // navigated to another url
      if (
        ['hbo', 'hulu', 'netflix', 'funimation', 'amazon']
          .filter(s => s !== opts.site)
          .find(s => curl.includes(s))
      ) { // check if moved to a different site)
        return
      }

      if (opts.watch.keyword) {
        if (curl.includes(opts.watch.keyword)) {
          await opts.watch.streamFn()
          return watchUrlChange(curl)
        }
      } else if (opts.watch.element) {
        const eleExist = driver.wait(until.elementLocated(By.css(opts.watch.element)), 3000)
        if (eleExist) {
          await opts.watch.streamFn()
          maximizeVideo()
          return watchUrlChange(curl, opts)
        } else return watchUrlChange(curl, opts)
      }
    } else if (driver.findElement(By.css(opts.watch.element))) {
      await opts.watch.streamFn()
      if (opts.watch.site === 'funimation') maximizeVideo()
      return watchUrlChange(curl, opts)
    }
    return watchUrlChange(curl, opts)
  }

  async function navEleTrigger(u, ele) {
    return driver.wait(async () => {
      const cu = await driver.getCurrentUrl()
      if (cu !== u) return true

      if (ele) return driver.findElement(By.css(ele))
    })
  }

  async function hulu() {
    streamingService = STREAMING.Hulu
    await driver.get('http://hulu.com')
    const url = await driver.getCurrentUrl()

    if (!url.includes('hulu')) { // I don't know what this could be, but I guess try again??
      return navigate().hulu()
    } else {
      if (url.includes('welcome')) { // Not logged in!
        return loadCookies('hulu')() // load cookies
      } else { // Logged in!
        let currentUrl = await driver.getCurrentUrl()

        // wait for navigation to either another site or watching a video
        await navEleTrigger(currentUrl)
        currentUrl = await driver.getCurrentUrl()

        const opts = {
          site: 'hulu',
          watch: {
            keyword: 'watch',
            streamFn: streamFn
          }
        }

        async function streamFn() {
          await until.elementLocated(By.css('.controls__time-wrap'))
          await driver.sleep(5000)
          function findFn() {
            const titleEle = document.querySelector('.metadata-area__second-line')
            const episodeEle = document.querySelector('.metadata-area__third-line')
            const title = titleEle ? titleEle.textContent : ''
            const episode = episodeEle ? episodeEle.textContent.replace('•', '-') : ''
            return {title, episode}
          }
          await getStreamData(findFn)
        }

        await watchUrlChange(currentUrl, opts)
      }
    }
  }

  async function netflix() {
    streamingService = STREAMING.Netflix
    await driver.get('https://netflix.com')
    const url = await driver.getCurrentUrl()

    if (!url.includes('netflix')) { // I don't know what this could be, but I guess try again??
      return navigate().netflix()
    } else {
      if (!url.includes('browse')) { // Not logged in! (https://www.netflix.com/browse is logged in url)
        return loadCookies('netflix')() // load cookies
      } else { // Logged in!
        let currentUrl = await driver.getCurrentUrl()

        await navEleTrigger(currentUrl)
        currentUrl = await driver.getCurrentUrl()

        const opts = {
          site: 'netflix',
          watch: {
            keyword: 'watch',
            streamFn
          }
        }

        async function streamFn() {
          await until.elementLocated((By.css('.ellipsize-text')))
          await driver.sleep(5000)
          function findFn() {
            const titleEle = document.querySelector('.ellipsize-text > h4')
            const episodes = document.querySelectorAll('.ellipsize-text > span')
            if (!titleEle && !episodes.length) {
              const movieEle = document.querySelector('.ellipsize-text')
              if (movieEle) return {title: movieEle.textContent, episode: ' '}
            }
            const episode1 = episodes.length ? episodes[0] : ''
            const episode2 = episodes.length ? episodes[1] : ''
            const title = titleEle ? titleEle.textContent : ''
            const episode = episode1 && episode2 ? `${episode1.textContent} ${episode2.textContent}` : ''
            return {title, episode}
          }
          return await getStreamData(findFn)
        }

        await watchUrlChange(currentUrl, opts)
      }
    }
  }

  async function funimation() {
    streamingService = STREAMING.Funimation
    await driver.get('https://www.funimation.com/account/#subscription')
    const url = await driver.getCurrentUrl()

    if (!url.includes('funimation')) { // I don't know what this could be, but I guess try again??
      return navigate().funimation()
    } else {
      if (!url.includes('account')) { // Not logged in! (https://www.funimation.com/account/#subscription is logged in url)
        // Funimation is fucking stupid with their cookies. They have a piece of shit site, and I fucking hate them
        // So I have to fucking just log in every time.
        await logIn().funimation()
        let currentUrl = await driver.getCurrentUrl()
        await navEleTrigger(currentUrl)
        currentUrl = await driver.getCurrentUrl()

        const opts = {
          site: 'funimation',
          watch: {
            element: 'section.video-player-section'
          }
        }

        await driver.wait(until.elementLocated(By.css('section.video-player-section')))
        await until.elementLocated((By.css('.vjs-control-bar')))
        await driver.sleep(5000)
        function findFn() {
          const titleEle = document.querySelector('iframe').contentDocument.querySelector('.vjs-dock-title')
          const episodeEle = document.querySelector('iframe').contentDocument.querySelector('.vjs-dock-description')
          const title = titleEle ? titleEle.textContent : ''
          const episode = episodeEle ? episodeEle.innerText.replace('\n', ': ') : ''
          return {title, episode}
        }
        return getStreamData(findFn)
          .then(maximizeVideo)
      }
    }
  }

  function maximizeVideo() {
    function fn() {
      const q = (ele, prnt) => !prnt ? document.querySelector(ele) : prnt.querySelector(ele)
      const header = q('.skinny')
      const comments = q('.content-episode')
      const footer = q('footer')
      new Array(header, comments, footer).forEach( ele => ele.parentElement.removeChild(ele))
      const body = q('body')
      const main = q('#main')
      const section = q('section.video-player-section')
      const cont = q('.container', section)
      const row = q('.row', cont)
      const vcont = q('.video-player-container', row)
      body.style.position = 'absolute'
      body.style.top = '0'
      body.style.right = '0'
      body.style.bottom = '0'
      body.style.left = '0'
      new Array(main, section, cont, row, vcont).forEach( (e, i) => {
        e.style.width = '100%'
        e.style.height = '100%'
      })
    }
    driver.executeScript(fn)
  }

  async function getStreamData(fn) {
    driver.executeScript(fn)
      .then(ret => {
        const {
          title,
          episode
        } = ret
        if (!title || !episode) {
          driver.sleep(500).then(() => getStreamData(fn))
        }
        else state.get('abWebcontents').send('streamData', {title, episode})
      })
  }
}

function saveCookies(domain) {
  driver.manage().getCookies().then(cookies => {
    fs.writeFileSync(path.join(__dirname, '../', 'cookies', domain), JSON.stringify(cookies))
  })

  setInterval(saveCookies, 15 * 60 * 1000) // save cookies every 15 minutes
}

const loadCookies = (domain) => {
  const cookies = JSON.parse(fs.readFileSync(path.join(__dirname, '../', 'cookies', domain)).toString())

  return async function() {
    const promises = []
    if (cookies.length && cookies.some(c => c.domain.includes(domain))) { // add cookies, if they exist
      cookies.forEach( cookie => {
        if (cookie.domain.includes(domain)) {
          promises.push(driver.manage().addCookie(cookie))
        }
      })
      await Promise.all(promises)
      return navigate()[domain]()
    } else {
      return logIn()[domain]()
    } // log in, if cookies don't exist (they should)
  }
}

function ahkMessage(message) {
  ahkMQOut.stdin.write(message + '\r\n')
}

module.exports = {
  startBrowser,
  navigate,
  ahkMessage,
  streamControls,
  startAhkMQIn,
  startAhkMQOut
}