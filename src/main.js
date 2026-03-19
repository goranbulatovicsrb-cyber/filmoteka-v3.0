const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const https = require('https')

let mainWindow

const getDataPath = (file) => path.join(app.getPath('userData'), file)

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    frame: false,
    backgroundColor: '#08090f',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false
    },
    show: false
  })

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'))

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window-maximized', true)
  })
  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window-maximized', false)
  })
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// ── Window controls ──────────────────────────────────────
ipcMain.on('win-minimize', () => mainWindow?.minimize())
ipcMain.on('win-maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize()
  else mainWindow?.maximize()
})
ipcMain.on('win-close', () => mainWindow?.close())

// ── Load movies ──────────────────────────────────────────
ipcMain.handle('load-movies', () => {
  const p = getDataPath('movies.json')
  try {
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'))
    return []
  } catch { return [] }
})

// ── Save movies ──────────────────────────────────────────
ipcMain.handle('save-movies', (_, movies) => {
  try {
    fs.writeFileSync(getDataPath('movies.json'), JSON.stringify(movies, null, 2))
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e.message }
  }
})

// ── Load / save settings ─────────────────────────────────
ipcMain.handle('load-settings', () => {
  const p = getDataPath('settings.json')
  try {
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'))
    return { apiKey: '' }
  } catch { return { apiKey: '' } }
})

ipcMain.handle('save-settings', (_, settings) => {
  try {
    fs.writeFileSync(getDataPath('settings.json'), JSON.stringify(settings, null, 2))
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e.message }
  }
})

// ── OMDB search ──────────────────────────────────────────
ipcMain.handle('search-omdb', (_, { title, year, apiKey }) => {
  return new Promise((resolve) => {
    if (!apiKey) return resolve({ error: 'No API key' })
    const y = year ? `&y=${encodeURIComponent(year)}` : ''
    const url = `https://www.omdbapi.com/?t=${encodeURIComponent(title)}${y}&plot=full&apikey=${apiKey}`
    const req = https.get(url, (res) => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => {
        try { resolve(JSON.parse(data)) }
        catch { resolve({ error: 'Parse error' }) }
      })
    })
    req.on('error', (e) => resolve({ error: e.message }))
    req.setTimeout(10000, () => { req.destroy(); resolve({ error: 'Timeout' }) })
  })
})

// ── OMDB search by ID ────────────────────────────────────
ipcMain.handle('search-omdb-id', (_, { imdbId, apiKey }) => {
  return new Promise((resolve) => {
    if (!apiKey) return resolve({ error: 'No API key' })
    const url = `https://www.omdbapi.com/?i=${imdbId}&plot=full&apikey=${apiKey}`
    const req = https.get(url, (res) => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => {
        try { resolve(JSON.parse(data)) }
        catch { resolve({ error: 'Parse error' }) }
      })
    })
    req.on('error', (e) => resolve({ error: e.message }))
    req.setTimeout(10000, () => { req.destroy(); resolve({ error: 'Timeout' }) })
  })
})

// ── OMDB title search (multiple results) ─────────────────
ipcMain.handle('search-omdb-multi', (_, { title, apiKey }) => {
  return new Promise((resolve) => {
    if (!apiKey) return resolve({ error: 'No API key' })
    const url = `https://www.omdbapi.com/?s=${encodeURIComponent(title)}&type=movie&apikey=${apiKey}`
    const req = https.get(url, (res) => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => {
        try { resolve(JSON.parse(data)) }
        catch { resolve({ error: 'Parse error' }) }
      })
    })
    req.on('error', (e) => resolve({ error: e.message }))
    req.setTimeout(10000, () => { req.destroy(); resolve({ error: 'Timeout' }) })
  })
})

// ── Scan folder ──────────────────────────────────────────
ipcMain.handle('scan-folder', (_, folderPath) => {
  try {
    if (!fs.existsSync(folderPath)) return { error: 'Folder ne postoji' }
    const videoExts = new Set(['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.m4v', '.flv', '.ts', '.mpg', '.mpeg', '.divx', '.rm', '.rmvb'])
    const files = fs.readdirSync(folderPath).filter(f => {
      const ext = path.extname(f).toLowerCase()
      return videoExts.has(ext)
    })
    return { files }
  } catch (e) {
    return { error: e.message }
  }
})

// ── Open folder dialog ───────────────────────────────────
ipcMain.handle('open-folder-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Odaberi folder sa filmovima'
  })
  return result.canceled ? null : result.filePaths[0]
})

// ── Open file in explorer ────────────────────────────────
ipcMain.on('open-in-explorer', (_, folderPath) => {
  if (folderPath && fs.existsSync(folderPath)) {
    shell.openPath(folderPath)
  }
})
