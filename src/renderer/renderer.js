/* ═══════════════════════════════════════════════════════
   FILMOTEKA — Renderer
   ═══════════════════════════════════════════════════════ */

// ── State ───────────────────────────────────────────────
const state = {
  movies: [],
  settings: { apiKey: '' },
  filter: 'all',
  sort: 'title',
  search: '',
  editingId: null,
  scanResults: [],
  curtainOpen: false,
}

// ── Init ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  state.settings = await api.loadSettings()
  state.movies   = await api.loadMovies()
  updateCounts()
  renderShelves()

  // Window maximize toggle
  api.onMaximized((isMax) => {
    document.getElementById('btn-maximize').textContent = isMax ? '❐' : '□'
  })

  // Show curtain for 0.6s then wait for click
  setTimeout(() => {
    document.getElementById('curtain').style.cursor = 'pointer'
  }, 600)
})

// ══════════════════════════════════════════════════════════
// CURTAIN / ZAVJESA
// ══════════════════════════════════════════════════════════
function openCurtain() {
  if (state.curtainOpen) return
  state.curtainOpen = true

  const curtain = document.getElementById('curtain')
  const app     = document.getElementById('app')

  curtain.classList.add('opening')

  // Light flash effect
  const flash = document.createElement('div')
  flash.style.cssText = `
    position:fixed;inset:0;z-index:9998;
    background:rgba(255,240,180,0);pointer-events:none;
    transition:background 0.4s ease;
  `
  document.body.appendChild(flash)
  setTimeout(() => { flash.style.background = 'rgba(255,240,180,0.15)' }, 600)
  setTimeout(() => { flash.style.background = 'rgba(255,240,180,0)'   }, 1200)

  // Reveal app
  setTimeout(() => {
    curtain.style.display = 'none'
    flash.remove()
    app.classList.remove('app-hidden')
    app.classList.add('app-visible')
    animateCardsIn()
  }, 2600)
}

// ══════════════════════════════════════════════════════════
// SHELVES RENDERING
// ══════════════════════════════════════════════════════════
function getFilteredMovies() {
  return state.movies
    .filter(m => state.filter === 'all' || m.category === state.filter)
    .filter(m => !state.search || m.title.toLowerCase().includes(state.search.toLowerCase()))
    .sort((a, b) => {
      if (state.sort === 'rating') return (parseFloat(b.imdbRating) || 0) - (parseFloat(a.imdbRating) || 0)
      if (state.sort === 'year')   return (parseInt(b.year) || 0)         - (parseInt(a.year) || 0)
      if (state.sort === 'date')   return (b.dateAdded || '').localeCompare(a.dateAdded || '')
      return a.title.localeCompare(b.title)
    })
}

function renderShelves() {
  const container  = document.getElementById('shelves-container')
  const emptyState = document.getElementById('empty-state')
  const movies     = getFilteredMovies()

  if (movies.length === 0) {
    container.innerHTML  = ''
    emptyState.style.display = 'flex'
    return
  }
  emptyState.style.display = 'none'

  const perShelf = Math.max(4, Math.floor((window.innerWidth - 60) / 148))
  container.innerHTML = ''

  for (let i = 0; i < movies.length; i += perShelf) {
    const chunk = movies.slice(i, i + perShelf)
    container.appendChild(buildShelf(chunk))
  }
}

function buildShelf(movies) {
  const shelf = document.createElement('div')
  shelf.className = 'shelf'

  const row = document.createElement('div')
  row.className = 'shelf-movies'
  movies.forEach((m, idx) => row.appendChild(buildCard(m, idx)))

  const board = document.createElement('div')
  board.className = 'shelf-board'

  shelf.appendChild(row)
  shelf.appendChild(board)
  return shelf
}

function buildCard(movie, idx) {
  const card = document.createElement('div')
  card.className = 'movie-card'
  card.style.animationDelay = `${idx * 60}ms`
  card.dataset.id = movie.id

  const hasPoster = movie.poster && movie.poster !== 'N/A' && (movie.poster.startsWith('http') || movie.poster.startsWith('data:'))
  const initial   = (movie.title || '?').charAt(0).toUpperCase()
  const catIcon   = movie.category === 'domaci' ? '🏠' : '🌍'
  const rating    = movie.imdbRating && movie.imdbRating !== 'N/A' ? movie.imdbRating : ''

  card.innerHTML = `
    <div class="movie-poster">
      ${hasPoster
        ? `<img src="${esc(movie.poster)}" alt="${esc(movie.title)}" loading="lazy"
               onerror="this.parentElement.innerHTML=makePlaceholder('${esc(initial)}','${esc(movie.title)}')">`
        : `<div class="poster-placeholder">
             <div class="placeholder-initial">${esc(initial)}</div>
             <div class="placeholder-title">${esc(movie.title)}</div>
           </div>`}
      ${movie.watched ? '<div class="watched-badge" title="Gledan">✓</div>' : ''}
      <div class="movie-overlay">
        ${rating ? `<div class="overlay-rating">⭐ ${esc(rating)}</div>` : ''}
        ${movie.drive ? `<div class="overlay-drive">📀 ${esc(movie.drive)}</div>` : ''}
        <div class="overlay-actions">
          <button class="overlay-btn" onclick="event.stopPropagation();openDetail('${movie.id}')">Info</button>
          <button class="overlay-btn" onclick="event.stopPropagation();editMovie('${movie.id}')">Uredi</button>
          <button class="overlay-btn del" onclick="event.stopPropagation();deleteMovie('${movie.id}')">✕</button>
        </div>
      </div>
    </div>
    <div class="movie-info">
      <div class="movie-title">${esc(movie.title)}</div>
      <div class="movie-meta">${movie.year ? esc(movie.year) : ''} ${catIcon}</div>
    </div>
  `

  card.addEventListener('click', () => openDetail(movie.id))
  return card
}

function makePlaceholder(initial, title) {
  return `<div class="poster-placeholder">
    <div class="placeholder-initial">${initial}</div>
    <div class="placeholder-title">${title}</div>
  </div>`
}
window.makePlaceholder = makePlaceholder

function animateCardsIn() {
  const cards = document.querySelectorAll('.movie-card')
  cards.forEach((c, i) => { c.style.animationDelay = `${i * 45}ms` })
}

// ══════════════════════════════════════════════════════════
// FILTER / SORT / SEARCH
// ══════════════════════════════════════════════════════════
function setFilter(filter, btn) {
  state.filter = filter
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'))
  btn.classList.add('active')
  renderShelves()
}

function setSort(val) {
  state.sort = val
  renderShelves()
}

function onSearch(val) {
  state.search = val
  renderShelves()
}

function updateCounts() {
  const all   = state.movies.length
  const dom   = state.movies.filter(m => m.category === 'domaci').length
  const str   = state.movies.filter(m => m.category === 'strani').length
  document.getElementById('count-all').textContent    = all
  document.getElementById('count-domaci').textContent = dom
  document.getElementById('count-strani').textContent = str

  const avg = state.movies.reduce((s, m) => s + (parseFloat(m.imdbRating) || 0), 0)
  const avgStr = state.movies.length ? (avg / state.movies.length).toFixed(1) : '–'
  document.getElementById('titlebar-stats').textContent =
    `${all} filmova  ·  Domaći: ${dom}  ·  Strani: ${str}  ·  Prosjek IMDB: ⭐ ${avgStr}`
}

// ══════════════════════════════════════════════════════════
// DETAIL MODAL
// ══════════════════════════════════════════════════════════
function openDetail(id) {
  const m = state.movies.find(x => x.id === id)
  if (!m) return

  const hasPoster = m.poster && m.poster !== 'N/A' && (m.poster.startsWith('http') || m.poster.startsWith('data:'))
  const rating    = m.imdbRating && m.imdbRating !== 'N/A' ? m.imdbRating : '–'
  const catLabel  = m.category === 'domaci' ? '🏠 Domaći' : '🌍 Strani'

  document.getElementById('modal-detail-content').innerHTML = `
    <div class="detail-layout">
      <div class="detail-poster">
        ${hasPoster
          ? `<img src="${esc(m.poster)}" alt="${esc(m.title)}">`
          : `<div class="movie-poster" style="width:180px;height:267px;border-radius:8px;overflow:hidden">
               <div class="poster-placeholder" style="height:100%">
                 <div class="placeholder-initial">${esc(m.title.charAt(0))}</div>
                 <div class="placeholder-title">${esc(m.title)}</div>
               </div>
             </div>`}
      </div>
      <div class="detail-info">
        <div class="detail-title">${esc(m.title)}</div>
        <div class="detail-year">${esc(m.year || '')} ${catLabel}</div>
        <div class="detail-rating-bar">
          <div class="detail-imdb">⭐ ${esc(rating)}</div>
          <div class="detail-imdb-label">IMDB ocjena</div>
          ${m.watched ? '<div class="detail-imdb" style="background:rgba(46,204,113,0.2);color:#2ecc71;margin-left:8px">✓ Gledan</div>' : ''}
        </div>
        <div class="detail-meta-grid">
          ${m.genre    ? `<div class="detail-meta-item"><label>Žanr</label><span>${esc(m.genre)}</span></div>` : ''}
          ${m.runtime  ? `<div class="detail-meta-item"><label>Trajanje</label><span>${esc(m.runtime)}</span></div>` : ''}
          ${m.director ? `<div class="detail-meta-item"><label>Reditelj</label><span>${esc(m.director)}</span></div>` : ''}
          ${m.language ? `<div class="detail-meta-item"><label>Jezik</label><span>${esc(m.language)}</span></div>` : ''}
          ${m.country  ? `<div class="detail-meta-item"><label>Zemlja</label><span>${esc(m.country)}</span></div>` : ''}
          ${m.imdbVotes? `<div class="detail-meta-item"><label>IMDB glasovi</label><span>${esc(m.imdbVotes)}</span></div>` : ''}
          ${m.drive    ? `<div class="detail-meta-item span2"><label>Lokacija</label><span>📀 ${esc(m.drive)}</span></div>` : ''}
          ${m.filename ? `<div class="detail-meta-item span2"><label>Fajl</label><span style="font-size:11px;color:var(--text2)">${esc(m.filename)}</span></div>` : ''}
          ${m.awards   ? `<div class="detail-meta-item span2"><label>Nagrade</label><span style="font-size:12px">${esc(m.awards)}</span></div>` : ''}
        </div>
        ${m.plot ? `<div class="detail-plot">${esc(m.plot)}</div>` : ''}
        <div class="detail-actions">
          <button class="nav-btn" onclick="editMovie('${m.id}');closeModal('modal-detail')">✏ Uredi</button>
          <button class="nav-btn" onclick="toggleWatched('${m.id}')">
            ${m.watched ? '○ Označi kao negledano' : '✓ Označi kao gledano'}
          </button>
          ${m.drive ? `<button class="nav-btn" onclick="api.openInExplorer('${esc(m.drive)}')">📁 Otvori folder</button>` : ''}
          <button class="nav-btn btn-danger" onclick="deleteMovie('${m.id}');closeModal('modal-detail')">🗑 Briši</button>
        </div>
      </div>
    </div>
  `
  openModal('modal-detail')
}

function toggleWatched(id) {
  const m = state.movies.find(x => x.id === id)
  if (!m) return
  m.watched = !m.watched
  persist()
  renderShelves()
  closeModal('modal-detail')
  toast(m.watched ? '✓ Označeno kao gledano' : 'Označeno kao negledano', 'info')
}

// ══════════════════════════════════════════════════════════
// ADD / EDIT MODAL
// ══════════════════════════════════════════════════════════
function openAddModal() {
  state.editingId = null
  clearAddForm()
  document.getElementById('modal-add-title').textContent = '＋ Dodaj film'
  document.getElementById('omdb-status').textContent = ''
  document.getElementById('omdb-results').style.display = 'none'
  openModal('modal-add')
}

function editMovie(id) {
  const m = state.movies.find(x => x.id === id)
  if (!m) return
  state.editingId = id
  clearAddForm()
  document.getElementById('modal-add-title').textContent = '✏ Uredi film'

  document.getElementById('f-title').value    = m.title    || ''
  document.getElementById('f-year').value     = m.year     || ''
  document.getElementById('f-category').value = m.category || 'strani'
  document.getElementById('f-rating').value   = m.imdbRating && m.imdbRating !== 'N/A' ? m.imdbRating : ''
  document.getElementById('f-runtime').value  = m.runtime  || ''
  document.getElementById('f-drive').value    = m.drive    || ''
  document.getElementById('f-filename').value = m.filename || ''
  document.getElementById('f-genre').value    = m.genre    || ''
  document.getElementById('f-director').value = m.director || ''
  const posterVal = (m.poster && m.poster !== 'N/A') ? m.poster : ''
  document.getElementById('f-poster').value = posterVal
  document.getElementById('f-poster-base64').value = ''
  if (posterVal) {
    setPosterPreview(posterVal)
    setPosterStatus('', '')
  } else {
    resetPosterPreview()
  }
  document.getElementById('f-plot').value     = m.plot     || ''
  document.getElementById('f-watched').checked= m.watched  || false
  document.getElementById('f-imdbid').value   = m.imdbId   || ''
  document.getElementById('omdb-search-input').value = m.title || ''
  openModal('modal-add')
}

function clearAddForm() {
  ['f-title','f-year','f-rating','f-runtime','f-drive','f-filename',
   'f-genre','f-director','f-poster','f-plot','f-imdbid','f-poster-base64','omdb-search-input','omdb-year-input']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = '' })
  document.getElementById('f-category').value = 'strani'
  document.getElementById('f-watched').checked = false
  document.getElementById('omdb-status').textContent = ''
  document.getElementById('omdb-results').style.display = 'none'
  resetPosterPreview()
}

function saveMovie() {
  const title = document.getElementById('f-title').value.trim()
  if (!title) { toast('Unesite naziv filma', 'error'); return }

  const movie = {
    id:         state.editingId || genId(),
    title,
    year:       document.getElementById('f-year').value.trim(),
    category:   document.getElementById('f-category').value,
    imdbRating: document.getElementById('f-rating').value.trim() || 'N/A',
    runtime:    document.getElementById('f-runtime').value.trim(),
    drive:      document.getElementById('f-drive').value.trim(),
    filename:   document.getElementById('f-filename').value.trim(),
    genre:      document.getElementById('f-genre').value.trim(),
    director:   document.getElementById('f-director').value.trim(),
    poster:     (() => {
      const b64 = document.getElementById('f-poster-base64').value
      if (b64) return b64
      const url = document.getElementById('f-poster').value.trim()
      return url || 'N/A'
    })(),
    plot:       document.getElementById('f-plot').value.trim(),
    watched:    document.getElementById('f-watched').checked,
    imdbId:     document.getElementById('f-imdbid').value.trim(),
    dateAdded:  state.editingId
      ? (state.movies.find(m => m.id === state.editingId)?.dateAdded || today())
      : today(),
  }

  if (state.editingId) {
    const idx = state.movies.findIndex(m => m.id === state.editingId)
    if (idx !== -1) state.movies[idx] = movie
    toast('Film ažuriran ✓', 'success')
  } else {
    state.movies.push(movie)
    toast('Film dodat ✓', 'success')
  }

  persist()
  updateCounts()
  renderShelves()
  closeModal('modal-add')
}

function deleteMovie(id) {
  const m = state.movies.find(x => x.id === id)
  if (!m) return
  if (!confirm(`Brisati "${m.title}"?`)) return
  state.movies = state.movies.filter(x => x.id !== id)
  persist()
  updateCounts()
  renderShelves()
  toast('Film obrisan', 'info')
}

// ══════════════════════════════════════════════════════════
// OMDB INTEGRATION
// ══════════════════════════════════════════════════════════
async function fetchOmdb() {
  const title = document.getElementById('omdb-search-input').value.trim()
  const year  = document.getElementById('omdb-year-input').value.trim()
  if (!title) { toast('Unesite naziv filma', 'error'); return }

  if (!state.settings.apiKey) {
    toast('Unesite OMDB API ključ u Postavkama ⚙', 'error')
    return
  }

  const statusEl  = document.getElementById('omdb-status')
  const resultsEl = document.getElementById('omdb-results')
  const btn       = document.getElementById('omdb-fetch-btn')

  statusEl.textContent = '⏳ Pretražujem IMDB...'
  statusEl.className   = 'omdb-status loading'
  resultsEl.style.display = 'none'
  btn.disabled = true

  // Try multi-search first for list
  const multi = await api.searchOmdbMulti({ title, apiKey: state.settings.apiKey })

  if (multi && multi.Search && multi.Search.length > 0) {
    resultsEl.innerHTML = ''
    resultsEl.style.display = 'flex'
    multi.Search.slice(0, 6).forEach(item => {
      const div = document.createElement('div')
      div.className = 'omdb-result-item'
      div.innerHTML = `
        ${item.Poster && item.Poster !== 'N/A'
          ? `<img src="${esc(item.Poster)}" onerror="this.style.display='none'">`
          : '<div style="width:32px;height:48px;background:var(--surface3);border-radius:3px;flex-shrink:0"></div>'}
        <div class="omdb-result-info">
          <div class="omdb-result-title">${esc(item.Title)}</div>
          <div class="omdb-result-meta">${esc(item.Year)} · ${esc(item.Type)}</div>
        </div>
      `
      div.addEventListener('click', () => fetchOmdbById(item.imdbID))
      resultsEl.appendChild(div)
    })
    statusEl.textContent = `Pronađeno ${multi.Search.length} rezultata — odaberi film:`
    statusEl.className   = 'omdb-status success'
  } else {
    // Direct single search
    const result = await api.searchOmdb({ title, year, apiKey: state.settings.apiKey })
    if (result && result.Response === 'True') {
      fillFormFromOmdb(result)
      statusEl.textContent = `✓ Pronađeno: ${result.Title} (${result.Year})`
      statusEl.className   = 'omdb-status success'
    } else {
      statusEl.textContent = '✗ Film nije pronađen na IMDB'
      statusEl.className   = 'omdb-status error'
    }
  }

  btn.disabled = false
}

async function fetchOmdbById(imdbId) {
  const statusEl = document.getElementById('omdb-status')
  statusEl.textContent = '⏳ Učitavam detalje...'
  statusEl.className   = 'omdb-status loading'

  const result = await api.searchOmdbId({ imdbId, apiKey: state.settings.apiKey })
  if (result && result.Response === 'True') {
    fillFormFromOmdb(result)
    document.getElementById('omdb-results').style.display = 'none'
    statusEl.textContent = `✓ Podaci preuzeti: ${result.Title} (${result.Year})`
    statusEl.className   = 'omdb-status success'
  } else {
    statusEl.textContent = '✗ Greška pri preuzimanju podataka'
    statusEl.className   = 'omdb-status error'
  }
}

function fillFormFromOmdb(data) {
  document.getElementById('f-title').value    = data.Title    || ''
  document.getElementById('f-year').value     = data.Year     || ''
  document.getElementById('f-rating').value   = data.imdbRating && data.imdbRating !== 'N/A' ? data.imdbRating : ''
  document.getElementById('f-runtime').value  = data.Runtime  || ''
  document.getElementById('f-genre').value    = data.Genre    || ''
  document.getElementById('f-director').value = data.Director || ''
  document.getElementById('f-plot').value     = data.Plot     || ''
  document.getElementById('f-imdbid').value   = data.imdbID   || ''
  document.getElementById('omdb-search-input').value = data.Title || ''

  const poster = data.Poster && data.Poster !== 'N/A' ? data.Poster : ''
  document.getElementById('f-poster').value = poster
  document.getElementById('f-poster-base64').value = ''
  if (poster) {
    setPosterPreview(poster)
    setPosterStatus('✓ Poster preuzet sa IMDB-a', 'success')
  } else {
    resetPosterPreview()
    setPosterStatus('⚠ Poster nije dostupan na IMDB — postavi vlastiti ispod', 'warn')
  }
}

// ══════════════════════════════════════════════════════════
// SCAN FOLDER
// ══════════════════════════════════════════════════════════
function openScanModal() {
  document.getElementById('scan-path').value   = ''
  document.getElementById('scan-drive').value  = ''
  document.getElementById('scan-list').innerHTML  = ''
  document.getElementById('scan-footer').style.display = 'none'
  document.getElementById('scan-progress-bar').style.display = 'none'
  document.getElementById('scan-start-btn').disabled = false
  state.scanResults = []
  openModal('modal-scan')
}

async function pickScanFolder() {
  const folder = await api.openFolderDialog()
  if (folder) {
    document.getElementById('scan-path').value = folder
    if (!document.getElementById('scan-drive').value) {
      // Auto-fill drive label from path
      const driveMatch = folder.match(/^([A-Za-z]:)/)
      if (driveMatch) document.getElementById('scan-drive').value = driveMatch[1]
    }
  }
}

async function startScan() {
  const folderPath = document.getElementById('scan-path').value.trim()
  if (!folderPath) { toast('Odaberite folder', 'error'); return }

  const category = document.getElementById('scan-category').value
  const drive    = document.getElementById('scan-drive').value.trim()
  const skipExisting = document.getElementById('scan-skip-existing').checked
  const fetchOmdbData = document.getElementById('scan-fetch-omdb').checked && state.settings.apiKey

  const btn = document.getElementById('scan-start-btn')
  btn.disabled = true

  const result = await api.scanFolder(folderPath)
  if (result.error) {
    toast(`Greška: ${result.error}`, 'error')
    btn.disabled = false
    return
  }

  let files = result.files || []

  if (skipExisting) {
    const existingFilenames = new Set(state.movies.map(m => m.filename?.toLowerCase()))
    files = files.filter(f => !existingFilenames.has(f.toLowerCase()))
  }

  if (files.length === 0) {
    toast('Nema novih video fajlova u folderu', 'info')
    btn.disabled = false
    return
  }

  // Show progress
  const progressBar  = document.getElementById('scan-progress-bar')
  const progressFill = document.getElementById('scan-progress-fill')
  const progressText = document.getElementById('scan-progress-text')
  const progressPct  = document.getElementById('scan-progress-pct')
  const listEl       = document.getElementById('scan-list')

  progressBar.style.display = 'block'
  listEl.innerHTML  = ''
  state.scanResults = []

  for (let i = 0; i < files.length; i++) {
    const file      = files[i]
    const parsed    = parseFilename(file)
    const pct       = Math.round(((i + 1) / files.length) * 100)

    progressFill.style.width = pct + '%'
    progressPct.textContent  = pct + '%'
    progressText.textContent = `Skeniranje: ${file}`

    // Add item to list (loading state)
    const item = document.createElement('div')
    item.className = 'scan-item loading'
    item.id = `scan-item-${i}`
    item.innerHTML = `
      <div class="scan-item-status">⏳</div>
      <div class="scan-item-info">
        <div class="scan-item-title">${esc(parsed.title)}</div>
        <div class="scan-item-meta">${esc(parsed.year || '')} · ${esc(file)}</div>
      </div>
    `
    listEl.appendChild(item)
    listEl.scrollTop = listEl.scrollHeight

    let movieData = {
      id:        genId(),
      title:     parsed.title,
      year:      parsed.year || '',
      category,
      drive,
      filename:  file,
      poster:    'N/A',
      imdbRating:'N/A',
      dateAdded: today(),
      watched:   false,
    }

    // Fetch OMDB
    if (fetchOmdbData) {
      await sleep(300) // rate limit courtesy
      const omdb = await api.searchOmdb({
        title:  parsed.title,
        year:   parsed.year,
        apiKey: state.settings.apiKey,
      })
      if (omdb && omdb.Response === 'True') {
        movieData = {
          ...movieData,
          title:     omdb.Title    || parsed.title,
          year:      omdb.Year     || parsed.year,
          imdbRating:omdb.imdbRating || 'N/A',
          runtime:   omdb.Runtime  || '',
          genre:     omdb.Genre    || '',
          director:  omdb.Director || '',
          poster:    omdb.Poster !== 'N/A' ? omdb.Poster : 'N/A',
          plot:      omdb.Plot     || '',
          imdbId:    omdb.imdbID   || '',
          language:  omdb.Language || '',
          country:   omdb.Country  || '',
          imdbVotes: omdb.imdbVotes|| '',
          awards:    omdb.Awards   || '',
        }
        item.className = 'scan-item found'
        item.innerHTML = `
          ${omdb.Poster && omdb.Poster !== 'N/A'
            ? `<img src="${esc(omdb.Poster)}" onerror="this.style.display='none'">`
            : '<div class="scan-item-status">✅</div>'}
          <div class="scan-item-info">
            <div class="scan-item-title">${esc(movieData.title)}</div>
            <div class="scan-item-meta">${esc(movieData.year)} · ⭐ ${esc(movieData.imdbRating)}</div>
          </div>
          <div class="scan-item-status">✅</div>
        `
      } else {
        item.className = 'scan-item notfound'
        item.innerHTML = `
          <div class="scan-item-status">⚠</div>
          <div class="scan-item-info">
            <div class="scan-item-title">${esc(parsed.title)}</div>
            <div class="scan-item-meta">Nije pronađeno na IMDB · ${esc(file)}</div>
          </div>
        `
      }
    } else {
      item.className = 'scan-item found'
      item.querySelector('.scan-item-status').textContent = '✓'
    }

    state.scanResults.push(movieData)
  }

  progressText.textContent = 'Skeniranje završeno!'
  document.getElementById('scan-summary').textContent =
    `${state.scanResults.length} filmova pronađeno`
  document.getElementById('scan-footer').style.display = 'flex'
  btn.disabled = false
}

function addScannedMovies() {
  if (state.scanResults.length === 0) return
  state.movies.push(...state.scanResults)
  persist()
  updateCounts()
  renderShelves()
  closeModal('modal-scan')
  toast(`${state.scanResults.length} filmova dodano u kolekciju ✓`, 'success')
  state.scanResults = []
}

// ── Filename parser ────────────────────────────────────
function parseFilename(filename) {
  // Remove extension
  let name = filename.replace(/\.[^.]+$/, '')

  // Extract year (4-digit, 1900-2099)
  const yearMatch = name.match(/[\[(]?((?:19|20)\d{2})[\])]?/)
  const year = yearMatch ? yearMatch[1] : ''

  // Cut everything from year onwards (quality tags etc.)
  if (yearMatch) name = name.slice(0, yearMatch.index)

  // Remove known quality/release tags
  name = name.replace(
    /\b(?:1080[pi]|720[pi]|480[pi]|4[Kk]|2160[pi]|BluRay|BDRip|BRRip|DVDRip|DVDSCR|HDTV|WEBRip|WEB[-.]?DL|WEB|AMZN|DSNP|HULU|NF|PROPER|REPACK|REMASTERED|EXTENDED|THEATRICAL|UNRATED|DC|HDR|SDR|HEVC|x26[45]|h\.?26[45]|XviD|DivX|FLAC|DD5\.1|AAC|AC3|DTS|Atmos|TrueHD|MP3|YIFY|YTS|RARBG|FGT|ION10|EVO|MeGusta)\b.*/gi,
    ''
  )

  // Replace dots & underscores with spaces
  name = name.replace(/[._]/g, ' ')

  // Remove leading/trailing dashes, brackets, spaces
  name = name.replace(/^[-–—\s[\]()]+|[-–—\s[\]()]+$/g, '').trim()

  // Collapse multiple spaces
  name = name.replace(/\s{2,}/g, ' ').trim()

  return { title: name || filename, year }
}

// ══════════════════════════════════════════════════════════
// SETTINGS
// ══════════════════════════════════════════════════════════
function openSettingsModal() {
  document.getElementById('settings-apikey').value = state.settings.apiKey || ''
  openModal('modal-settings')
}

async function saveSettings() {
  const key = document.getElementById('settings-apikey').value.trim()
  state.settings.apiKey = key
  await api.saveSettings(state.settings)
  toast('Postavke sačuvane ✓', 'success')
  closeModal('modal-settings')
}

// ══════════════════════════════════════════════════════════
// MODAL HELPERS
// ══════════════════════════════════════════════════════════
function openModal(id) {
  document.getElementById(id).style.display = 'flex'
}

function closeModal(id, event) {
  if (event && event.target !== document.getElementById(id)) return
  document.getElementById(id).style.display = 'none'
}

// Keyboard: Escape closes modal
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    ['modal-add','modal-detail','modal-scan','modal-settings'].forEach(id => {
      const el = document.getElementById(id)
      if (el && el.style.display !== 'none') el.style.display = 'none'
    })
    if (!state.curtainOpen) openCurtain()
  }
})

// ══════════════════════════════════════════════════════════
// UTILITIES
// ══════════════════════════════════════════════════════════
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

function esc(str) {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

async function persist() {
  await api.saveMovies(state.movies)
}

function openLink(url) {
  // Opens external link (handled by shell in main process via webContents navigation)
  const a = document.createElement('a')
  a.href = url; a.click()
}

function toast(msg, type = 'info') {
  const container = document.getElementById('toast-container')
  const div = document.createElement('div')
  div.className = `toast ${type}`
  div.textContent = msg
  container.appendChild(div)
  setTimeout(() => div.remove(), 3500)
}

// Re-render on resize for responsive shelf columns
window.addEventListener('resize', () => {
  if (state.curtainOpen) renderShelves()
})


// ══════════════════════════════════════════════════════════
// POSTER HELPERS
// ══════════════════════════════════════════════════════════
function setPosterPreview(src) {
  const img   = document.getElementById('poster-preview-img')
  const empty = document.getElementById('poster-preview-empty')
  img.src = src
  img.style.display = 'block'
  if (empty) empty.style.display = 'none'
}

function resetPosterPreview() {
  const img   = document.getElementById('poster-preview-img')
  const empty = document.getElementById('poster-preview-empty')
  if (img)   { img.src = ''; img.style.display = 'none' }
  if (empty) empty.style.display = 'flex'
  setPosterStatus('', '')
}

function setPosterStatus(msg, type) {
  const el = document.getElementById('poster-status')
  if (!el) return
  el.textContent = msg
  el.style.color = type === 'success' ? '#2ecc71'
                 : type === 'warn'    ? '#f39c12'
                 : type === 'error'   ? '#e74c3c'
                 : 'var(--text2)'
}

function onPosterUrlChange(url) {
  document.getElementById('f-poster-base64').value = ''
  if (url && url.startsWith('http')) {
    setPosterPreview(url)
    setPosterStatus('', '')
  } else if (!url) {
    resetPosterPreview()
  }
}

function onPosterFileChange(input) {
  const file = input.files && input.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (e) => {
    const base64 = e.target.result
    document.getElementById('f-poster-base64').value = base64
    document.getElementById('f-poster').value = ''
    setPosterPreview(base64)
    setPosterStatus('✓ Vlastita slika uploadovana', 'success')
  }
  reader.readAsDataURL(file)
  // reset file input so same file can be re-selected
  input.value = ''
}

// Expose to HTML onclick
window.openCurtain   = openCurtain
window.setFilter     = setFilter
window.setSort       = setSort
window.onSearch      = onSearch
window.openAddModal  = openAddModal
window.openDetail    = openDetail
window.editMovie     = editMovie
window.deleteMovie   = deleteMovie
window.toggleWatched = toggleWatched
window.fetchOmdb     = fetchOmdb
window.openScanModal = openScanModal
window.pickScanFolder= pickScanFolder
window.startScan     = startScan
window.addScannedMovies = addScannedMovies
window.openSettingsModal= openSettingsModal
window.saveSettings  = saveSettings
window.saveMovie     = saveMovie
window.closeModal    = closeModal
window.openLink      = openLink
window.onPosterUrlChange  = onPosterUrlChange
window.onPosterFileChange = onPosterFileChange
