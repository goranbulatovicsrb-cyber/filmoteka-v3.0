const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  // Movies
  loadMovies:     ()         => ipcRenderer.invoke('load-movies'),
  saveMovies:     (movies)   => ipcRenderer.invoke('save-movies', movies),

  // Settings
  loadSettings:   ()         => ipcRenderer.invoke('load-settings'),
  saveSettings:   (s)        => ipcRenderer.invoke('save-settings', s),

  // OMDB
  searchOmdb:     (params)   => ipcRenderer.invoke('search-omdb', params),
  searchOmdbId:   (params)   => ipcRenderer.invoke('search-omdb-id', params),
  searchOmdbMulti:(params)   => ipcRenderer.invoke('search-omdb-multi', params),

  // File system
  scanFolder:     (path)     => ipcRenderer.invoke('scan-folder', path),
  openFolderDialog:()        => ipcRenderer.invoke('open-folder-dialog'),
  openInExplorer: (path)     => ipcRenderer.send('open-in-explorer', path),

  // Window controls
  minimize:   () => ipcRenderer.send('win-minimize'),
  maximize:   () => ipcRenderer.send('win-maximize'),
  close:      () => ipcRenderer.send('win-close'),

  // Window state listener
  onMaximized: (cb) => ipcRenderer.on('window-maximized', (_, v) => cb(v))
})
