/* =====================================================================
   main.js: ping pong scoreboard logic

   Contents:
     1. Constants, helpers and languages
     2. Settings (saved in localStorage)
     3. Setup screen
     4. Game rules
     5. Drawing the game screen
     6. Game actions (point, undo, screens)
     7. Tap effects
     8. Buttons and keyboard
     9. Start

   The whole file is wrapped in { } so its variables stay private
   and don't leak into the page's global scope.
   ===================================================================== */
{
  /* ---------- 1. Constants and helpers ---------- */

  // The 8 colors a player can pick (the index is what gets saved)
  const PALETTE = [
    '#185FA5', // blue
    '#A32D2D', // red
    '#0F6E56', // green
    '#D85A30', // orange
    '#534AB7', // purple
    '#BA7517', // amber
    '#3B6D11', // olive
    '#993556', // pink
  ]

  const STORAGE_KEY = 'ppcfg'
  const TARGET_OPTIONS = [11, 21] // "play to"
  const SERVE_OPTIONS = [1, 2, 3, 4, 5] // "switch serve every"
  const EFFECT_DURATION_MS = 750 // matches --dur-plus in variables.css (.7s) plus a margin

  // Short way to grab an element by its id
  const $ = (id) => document.getElementById(id)


  /* ---------- Languages ---------- */

  // Every text on screen, in each language.
  // Keys used in index.html (data-i18n / data-i18n-aria) must exist here.
  const TEXT = {
    he: {
      title: 'לוח ניקוד פינג פונג',
      language: 'שפה',
      playTo: 'משחק עד',
      serveEvery: 'החלפת הגשה כל',
      start: 'התחל משחק',
      resume: 'חזור למשחק הנוכחי',
      player: 'שחקן',
      playerName: 'שם שחקן',
      color: 'צבע',
      firstServe: 'מגיש ראשון',
      settings: 'הגדרות',
      fullscreen: 'מסך מלא',
      swap: 'החלפת צדדים',
      undo: 'ביטול נקודה אחרונה',
      rematch: 'משחק חוזר',
      toSettings: 'להגדרות',
      serving: 'מגיש',
      wins: 'ניצחונות',
      deuce: 'דיוס',
      advantage: 'יתרון',
      won: (name) => `${name} ניצח`,
    },
    en: {
      title: 'Ping Pong Scoreboard',
      language: 'Language',
      playTo: 'Play to',
      serveEvery: 'Switch serve every',
      start: 'Start game',
      resume: 'Back to current game',
      player: 'Player',
      playerName: 'Player name',
      color: 'Color',
      firstServe: 'Serves first',
      settings: 'Settings',
      fullscreen: 'Fullscreen',
      swap: 'Swap sides',
      undo: 'Undo last point',
      rematch: 'Rematch',
      toSettings: 'Settings',
      serving: 'Serving',
      wins: 'Wins',
      deuce: 'Deuce',
      advantage: 'Advantage',
      won: (name) => `${name} wins`,
    },
  }

  // Short label for each language on the small toggle next to the title
  const LANGUAGE_LABELS = { he: 'עב', en: 'EN' }
  const LANGUAGE_OPTIONS = Object.keys(LANGUAGE_LABELS)

  // Right-to-left languages
  const RTL_LANGUAGES = ['he']

  // Default name for player 0 / 1 in a given language ("שחקן 1" / "Player 1")
  const defaultName = (p, lang) => `${TEXT[lang].player} ${p + 1}`

  // Is this name one of the default names, in any language?
  const isDefaultName = (name, p) =>
    LANGUAGE_OPTIONS.some((lang) => name === defaultName(p, lang))


  /* ---------- 2. Settings (saved in localStorage) ---------- */

  // The settings chosen on the setup screen
  let cfg = {
    lang: 'he', // 'he' or 'en'
    names: [defaultName(0, 'he'), defaultName(1, 'he')],
    colors: [0, 1], // index in PALETTE for each player
    target: 11, // points needed to win
    every: 2, // serve switches every N points
    first: 0, // which player serves first (0 or 1)
  }

  // Load saved settings, if there are any.
  // try/catch: storage can be blocked (private mode) or hold broken data.
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (saved && saved.names) cfg = Object.assign(cfg, saved)
  } catch (e) {}
  if (!TEXT[cfg.lang]) cfg.lang = 'he' // unknown language in saved data

  // Get a text in the current language
  const t = (key) => TEXT[cfg.lang][key]

  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg))
    } catch (e) {}
  }

  // The current game. null until the first game starts.
  //   score:        [player 0 points, player 1 points]
  //   history:      who won each point, in order (used by undo)
  //   firstServer:  who served first in this game
  //   swapped:      true when the players switched sides on screen
  //   wins:         games won by each player (kept across rematches)
  let game = null


  /* ---------- 3. Setup screen ---------- */

  // Build a segmented selector (a row of buttons where one is selected).
  //   el:       the container element
  //   values:   the options to show
  //   key:      which setting in cfg it controls ('lang', 'target' or 'every')
  //   label:    (optional) text to show for each value; default is the value itself
  //   onChange: (optional) called after the user picks a value
  function renderSelector(el, values, key, { label = (v) => v, onChange } = {}) {
    el.innerHTML = values
      .map((v) => {
        const selected = cfg[key] === v ? 'on' : ''
        return `<button data-v="${v}" class="${selected}">${label(v)}</button>`
      })
      .join('')

    el.onclick = (e) => {
      const btn = e.target.closest('button')
      if (!btn) return
      // data-v is always a string: turn it back into a number when it's a number
      const raw = btn.dataset.v
      cfg[key] = typeof values[0] === 'number' ? +raw : raw
      saveSettings()
      renderSelector(el, values, key, { label, onChange })
      if (onChange) onChange()
    }
  }

  // Put the current language on the page:
  // direction (right-to-left or left-to-right), tab title,
  // and every element marked with data-i18n / data-i18n-aria in index.html
  function applyLanguage() {
    const root = document.documentElement
    root.lang = cfg.lang
    root.dir = RTL_LANGUAGES.includes(cfg.lang) ? 'rtl' : 'ltr'
    document.title = t('title')

    document
      .querySelectorAll('[data-i18n]')
      .forEach((el) => (el.textContent = t(el.dataset.i18n)))
    document
      .querySelectorAll('[data-i18n-aria]')
      .forEach((el) => el.setAttribute('aria-label', t(el.dataset.i18nAria)))
  }

  // Called when the user switches language
  function changeLanguage() {
    // Names still at their default ("שחקן 1") switch to the new language ("Player 1").
    // Names the user typed stay as they are.
    cfg.names = cfg.names.map((name, p) =>
      isDefaultName(name, p) ? defaultName(p, cfg.lang) : name
    )
    saveSettings()
    applyLanguage()
    openSetup() // redraw the setup screen in the new language
  }

  // HTML for one color swatch in a player card
  function swatchHtml(player, colorIndex) {
    const other = 1 - player
    const classes = [
      cfg.colors[player] === colorIndex ? 'sel' : '', // this player's color
      cfg.colors[other] === colorIndex ? 'taken' : '', // the other player's color
    ].join(' ')
    return `<button data-p="${player}" data-i="${colorIndex}"
      style="background:${PALETTE[colorIndex]}" class="${classes}"
      aria-label="${t('color')} ${colorIndex + 1}"></button>`
  }

  // HTML for one player card: name, colors, "first serve" button
  function playerCardHtml(p) {
    const color = PALETTE[cfg.colors[p]]
    const safeName = cfg.names[p].replace(/"/g, '&quot;') // so quotes don't break the input
    const firstOn = cfg.first === p ? 'on' : ''
    const swatches = PALETTE.map((_, i) => swatchHtml(p, i)).join('')

    return `
      <div class="pc" style="--c:${color}">
        <input id="n${p}" maxlength="14" value="${safeName}" aria-label="${t('playerName')} ${p + 1}">
        <div class="sw">${swatches}</div>
        <button class="first ${firstOn}" data-first="${p}">
          <span class="ball"></span>${t('firstServe')}
        </button>
      </div>`
  }

  // Draw both player cards and color the paddles in the title
  function renderPlayers() {
    $('rub0').setAttribute('fill', PALETTE[cfg.colors[0]])
    $('rub1').setAttribute('fill', PALETTE[cfg.colors[1]])
    $('players').innerHTML = playerCardHtml(0) + playerCardHtml(1)
  }

  // Clicks inside the player cards (one listener for all buttons)
  $('players').addEventListener('click', (e) => {
    const btn = e.target.closest('button')
    if (!btn) return

    if (btn.dataset.first !== undefined) {
      // "First serve" button
      cfg.first = +btn.dataset.first
    } else {
      // Color swatch. If the other player has this color, they trade colors.
      const p = +btn.dataset.p
      const colorIndex = +btn.dataset.i
      const other = 1 - p
      if (cfg.colors[other] === colorIndex) cfg.colors[other] = cfg.colors[p]
      cfg.colors[p] = colorIndex
    }

    saveSettings()
    renderPlayers()
  })

  // Save names while typing (input ids are "n0" and "n1")
  $('players').addEventListener('input', (e) => {
    if (e.target.id[0] === 'n') {
      cfg.names[+e.target.id[1]] = e.target.value
      saveSettings()
    }
  })

  // Read the final names; an empty name falls back to the default
  function readNames() {
    cfg.names = [0, 1].map((p) => $('n' + p).value.trim() || defaultName(p, cfg.lang))
    saveSettings()
  }


  /* ---------- 4. Game rules ---------- */

  // Start a new game. Side swap and win counts carry over from the last game.
  function newGame(firstServer) {
    game = {
      score: [0, 0],
      history: [],
      firstServer,
      swapped: game ? game.swapped : false,
      wins: game ? game.wins : [0, 0],
    }
  }

  // Who serves now?
  // Returns { player, turn }: turn is which serve of the round (1, 2, ...),
  // or 0 during deuce.
  function currentServer() {
    const [a, b] = game.score
    const played = a + b
    const deuceAt = cfg.target - 1 // e.g. 10 when playing to 11
    const every = cfg.every

    // Deuce (both reached 10 in an 11 game): serve switches after every point
    if (a >= deuceAt && b >= deuceAt) {
      const pointsBeforeDeuce = 2 * deuceAt
      const switches =
        Math.floor(pointsBeforeDeuce / every) + (played - pointsBeforeDeuce)
      return { player: game.firstServer ^ switches % 2, turn: 0 }
    }

    // Normal play: serve switches every `every` points.
    // XOR (^) with 1 flips between player 0 and 1.
    const switches = Math.floor(played / every)
    return { player: game.firstServer ^ switches % 2, turn: (played % every) + 1 }
  }

  // Who won? Returns 0 or 1, or -1 if the game is still going.
  // To win: reach the target AND lead by at least 2 points.
  function getWinner() {
    const [a, b] = game.score
    if (Math.max(a, b) >= cfg.target && Math.abs(a - b) >= 2) return a > b ? 0 : 1
    return -1
  }

  // True when both players reached target-1 and nobody has won yet
  function isDeuce() {
    const [a, b] = game.score
    const deuceAt = cfg.target - 1
    return getWinner() < 0 && a >= deuceAt && b >= deuceAt
  }


  /* ---------- 5. Drawing the game screen ---------- */

  // Restart a CSS animation on an element (remove the class, force a reflow, add it again)
  function replayAnimation(el, className) {
    el.classList.remove(className)
    void el.offsetWidth
    el.classList.add(className)
  }

  // Fill one half of the screen with a player's info.
  //   slot:      0 = left/top half, 1 = right/bottom half
  //   p:         the player shown in that half
  //   bumpScore: true to play the score "pop" animation
  function renderHalf(slot, p, bumpScore) {
    const half = $('h' + slot)
    const server = currentServer()
    const gameOver = getWinner() >= 0

    half.dataset.p = p // so a tap knows which player to score for
    half.style.background = PALETTE[cfg.colors[p]]

    // Score
    const num = half.querySelector('.num')
    num.textContent = game.score[p]
    if (bumpScore) replayAnimation(num, 'pop')

    // Name
    half.querySelector('.nm').textContent = cfg.names[p]

    // Games won (shown only after the first game ends)
    const totalGames = game.wins[0] + game.wins[1]
    half.querySelector('.gw').textContent = totalGames ? `${t('wins')}: ${game.wins[p]}` : ''

    // "Serving" badge, e.g. "מגיש · 1/2" / "Serving · 1/2"
    const badge = half.querySelector('.srv')
    badge.classList.toggle('on', !gameOver && server.player === p)
    badge.querySelector('.st').textContent =
      server.turn && cfg.every > 1
        ? `${t('serving')} · ${server.turn}/${cfg.every}`
        : t('serving')
  }

  // The label in the middle of the top bar: rules, or deuce/advantage
  function renderCenterLabel() {
    const label = $('mid')
    const [a, b] = game.score

    if (isDeuce()) {
      label.className = 'mid deuce'
      label.textContent =
        a === b ? t('deuce') : `${t('deuce')} · ${t('advantage')}: ${cfg.names[a > b ? 0 : 1]}`
    } else {
      label.className = 'mid'
      const plural = cfg.every > 1 ? 'S' : ''
      label.textContent = `TO ${cfg.target} · ${cfg.every} SERVE${plural}`
    }
  }

  // The win overlay: shown only when someone won
  function renderWinOverlay() {
    const w = getWinner()
    $('win').classList.toggle('on', w >= 0)
    if (w >= 0) {
      $('wName').textContent = t('won')(cfg.names[w])
      $('wScore').textContent = `${game.score[w]} : ${game.score[1 - w]}`
    }
  }

  // Redraw the whole game screen.
  // scoredPlayer (optional): the player who just scored, to animate their number.
  function render(scoredPlayer) {
    const order = game.swapped ? [1, 0] : [0, 1] // which player sits in each half
    order.forEach((p, slot) => renderHalf(slot, p, scoredPlayer === p))
    renderCenterLabel()
    renderWinOverlay()
  }


  /* ---------- 6. Game actions ---------- */

  // Add a point to player p
  function addPoint(p) {
    if (!game || getWinner() >= 0) return // no game, or it's already over
    game.history.push(p)
    game.score[p]++
    if (getWinner() >= 0) game.wins[p]++ // this point won the game
    render(p)
  }

  // Take back the last point
  function undo() {
    if (!game || !game.history.length) return
    const winnerBefore = getWinner()
    const p = game.history.pop()
    if (winnerBefore >= 0) game.wins[winnerBefore]-- // cancel the win too
    game.score[p]--
    render()
  }

  // Show one screen ('setup' or 'game') and hide the other
  function showScreen(id) {
    document
      .querySelectorAll('.screen')
      .forEach((s) => s.classList.toggle('on', s.id === id))
  }

  // Go to the setup screen
  function openSetup() {
    renderPlayers()
    renderSelector($('segLang'), LANGUAGE_OPTIONS, 'lang', {
      label: (lang) => LANGUAGE_LABELS[lang],
      onChange: changeLanguage,
    })
    renderSelector($('segTarget'), TARGET_OPTIONS, 'target')
    renderSelector($('segEvery'), SERVE_OPTIONS, 'every')
    // "Back to game" appears only if a game is in progress
    const gameInProgress = game && game.history.length && getWinner() < 0
    $('resume').hidden = !gameInProgress
    showScreen('setup')
  }

  // Keep the screen from turning off during a game (where supported)
  async function keepScreenOn() {
    try {
      if (navigator.wakeLock) await navigator.wakeLock.request('screen')
    } catch (e) {}
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await document.documentElement.requestFullscreen()
    } catch (e) {}
  }


  /* ---------- 7. Tap effects ---------- */

  // Ripple + floating "+1" at the tap point
  function showTapEffect(half, e) {
    if (!game || getWinner() >= 0) return

    // Tap position inside the half (keyboard "clicks" have no position: use the center)
    const rect = half.getBoundingClientRect()
    const x = (e.clientX || rect.left + rect.width / 2) - rect.left
    const y = (e.clientY || rect.top + rect.height / 2) - rect.top
    const rippleSize = Math.max(rect.width, rect.height) * 1.6

    const ripple = document.createElement('span')
    ripple.className = 'rip'
    ripple.style.cssText = `left:${x}px;top:${y}px;width:${rippleSize}px;height:${rippleSize}px`

    const plus = document.createElement('span')
    plus.className = 'plus'
    plus.textContent = '+1'
    plus.style.cssText = `left:${x}px;top:${y}px`

    half.append(ripple, plus)
    setTimeout(() => {
      ripple.remove()
      plus.remove()
    }, EFFECT_DURATION_MS)
  }


  /* ---------- 8. Buttons and keyboard ---------- */

  // Tap on a half = point for the player shown there
  ;['h0', 'h1'].forEach((id) => {
    const half = $(id)
    half.addEventListener('click', (e) => {
      showTapEffect(half, e)
      addPoint(+half.dataset.p)
    })
  })

  // Flash animation on every icon button
  document.querySelectorAll('.ib').forEach((btn) =>
    btn.addEventListener('click', () => replayAnimation(btn, 'tap'))
  )

  // Top bar
  $('bSet').onclick = openSetup
  $('bFull').onclick = toggleFullscreen
  $('bSwap').onclick = () => {
    game.swapped = !game.swapped
    render()
  }
  $('bUndo').onclick = undo

  // Win overlay
  $('bAgain').onclick = () => {
    newGame(1 - game.firstServer) // rematch: the other player serves first
    render()
  }
  $('bUndoWin').onclick = undo
  $('bToSet').onclick = openSetup

  // Setup screen
  $('start').onclick = () => {
    readNames()
    game = null // a fresh start also resets swap and win counts
    newGame(cfg.first)
    showScreen('game')
    render()
    keepScreenOn()
  }
  $('resume').onclick = () => {
    readNames()
    showScreen('game')
    render()
  }

  // Keyboard (only on the game screen):
  //   ← / → : point for the left / right player
  //   Backspace or z : undo
  document.addEventListener('keydown', (e) => {
    if (!$('game').classList.contains('on')) return
    if (e.key === 'ArrowLeft') addPoint(+$('h0').dataset.p)
    else if (e.key === 'ArrowRight') addPoint(+$('h1').dataset.p)
    else if (e.key === 'Backspace' || e.key === 'z') undo()
  })


  /* ---------- 9. Start ---------- */

  applyLanguage()
  openSetup()
}
