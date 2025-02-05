import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import puppeteer, { Browser, Page } from 'puppeteer'
import { sendNotification } from './bot'
import log from './log'

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  let count = 0
  ipcMain.on('ping', (event) => {
    const message = 'Pong' + count
    console.log(message)
    event.reply('ping-reply', message)
    count++
  })

  // IPC Test for Tzuchi
  const URL = 'https://tzuchipalembang.org'
  const USERNAME = 'sa'
  const PASSWORD = 'sa'
  let tzuchiBrowser: Browser | null = null
  let tzuchiFirstPage: Page | null = null
  const launchTzuchiBrowser = async () => {
    if (!tzuchiBrowser) {
      tzuchiBrowser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        userDataDir: './user-data'
      })
    }
    if (!tzuchiFirstPage) tzuchiFirstPage = await tzuchiBrowser.pages().then((pages) => pages[0])
  }
  const closeTzuchiBrowser = async () => {
    if (tzuchiFirstPage) {
      await tzuchiFirstPage.close()
      tzuchiFirstPage = null
    }
    if (tzuchiBrowser) {
      await tzuchiBrowser.close()
      tzuchiBrowser = null
    }
  }
  const resetTzuchiBrowser = async () => {
    tzuchiBrowser = null
    tzuchiFirstPage = null
    await launchTzuchiBrowser()
  }
  const handleLogMessage = (type: string, message: string) => {
    console[type](message)
    log[type](message)
    sendNotification(message)
  }
  ipcMain.handle('login-tzuchi', async () => {
    try {
      await launchTzuchiBrowser()

      await tzuchiFirstPage!.goto(URL + '/login')
      if (tzuchiFirstPage!.url() !== URL + '/login') {
        handleLogMessage('info', 'Already Login Tzuchi')
        return
      }

      const selectorUsername = `div.ui.stacked.segment > div.field > input[type="text"][placeholder="VIS ID / Email / Phone"]`
      const selectorPassword = `div.ui.stacked.segment > div.field > div.ui.icon.input > input[type="password"][placeholder="Password"]`
      const selectorSubmit = `div.ui.stacked.segment > button.ui.fluid.large.blue.submit.button`
      await tzuchiFirstPage!.locator(selectorUsername).fill(USERNAME)
      await tzuchiFirstPage!.locator(selectorPassword).fill(PASSWORD)
      await tzuchiFirstPage!.locator(selectorSubmit).click()
      await tzuchiFirstPage!.waitForNavigation()

      handleLogMessage('info', 'Login Tzuchi')
    } catch (error) {
      handleLogMessage('error', JSON.stringify(error))
      await resetTzuchiBrowser()
    }
  })
  ipcMain.handle('logout-tzuchi', async () => {
    try {
      if (!tzuchiBrowser || !tzuchiFirstPage) {
        handleLogMessage('info', 'Please Login Tzuchi First')
        return
      }

      await tzuchiFirstPage!.goto(URL + '/superadmin')
      if (tzuchiFirstPage!.url() !== URL + '/superadmin') {
        handleLogMessage('info', 'Already Logout Tzuchi')
        return
      }

      const selectorDropdown = `div.right.menu > div.ui.dropdown.item`
      const selectorLogout = `div.right.menu > div.ui.dropdown.item.active.visible > div.menu.left.transition.visible > a:nth-child(3)`
      await tzuchiFirstPage!.locator(selectorDropdown).click()
      await tzuchiFirstPage!.locator(selectorLogout).click()
      await tzuchiFirstPage!.waitForNavigation()

      setTimeout(async () => {
        await closeTzuchiBrowser()
        handleLogMessage('info', 'Logout Tzuchi')
      }, 5000)
    } catch (error) {
      handleLogMessage('error', (error as Error).stack ?? 'Error')
      await resetTzuchiBrowser()
    }
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
