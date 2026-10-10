// Searchable dropdowns for every <select> in the app.
// Kept identical across the JSS repos — change it everywhere together.
//
// installSearchableSelects() is called once at startup. From then on, opening
// any single-choice <select> (click, tap or keyboard) shows a search panel
// instead of the native list. The native <select> stays in the page and stays
// the source of truth: picking an option sets its selectedIndex and fires the
// usual `input` + `change` events, so React/Next onChange handlers, forms and
// validation work unchanged.
//
// Program lists (options like "Plum Borough Tennis Spring 2026") are shown
// newest year first, then season (Fall, Summer, Spring, Winter), then
// alphabetically by the rest of the name — partner, then sport — with a
// heading per season.
//
// Opt out per element with <select data-native-select>.

const SEASONS = { winter: 1, spring: 2, summer: 3, fall: 4, autumn: 4 }
const SEASON_YEAR_RE = /\b(winter|spring|summer|fall|autumn)\s+(20\d{2})\b/i

/** Lowercase, accent-free text for matching. */
export function normalize(s) {
  return String(s || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim()
}

/** Every word of the query must appear somewhere in the text (any order). */
export function matchesQuery(text, query) {
  const q = normalize(query)
  if (!q) return true
  const t = normalize(text)
  return q.split(' ').every((w) => t.includes(w))
}

/** {year, season, rest} for a program-looking label, else null. */
export function programKey(label) {
  const m = SEASON_YEAR_RE.exec(String(label || ''))
  if (!m) return null
  const season = m[1].toLowerCase() === 'autumn' ? 'fall' : m[1].toLowerCase()
  const rest = (String(label).slice(0, m.index) + ' ' + String(label).slice(m.index + m[0].length))
    .replace(/[\s\u2014\u2013-]+$/g, '').replace(/^[\s\u2014\u2013-]+/g, '').replace(/\s+/g, ' ').trim()
  return { year: Number(m[2]), season, rest }
}

/** Newest year first, then Fall → Winter, then partner/sport A–Z. */
export function compareProgramLabels(a, b) {
  const ka = programKey(a)
  const kb = programKey(b)
  if (!ka || !kb) return ka ? -1 : kb ? 1 : 0
  return (kb.year - ka.year)
    || (SEASONS[kb.season] - SEASONS[ka.season])
    || ka.rest.localeCompare(kb.rest, undefined, { sensitivity: 'base', numeric: true })
}

const titleCase = (s) => s.charAt(0).toUpperCase() + s.slice(1)

/**
 * Display rows for a select: [{type:'header', label}] and
 * [{type:'option', index, label, group, disabled}].
 * opts: [{index, label, value, disabled, group}] in DOM order.
 */
export function buildRows(opts) {
  const hasGroups = opts.some((o) => o.group)
  const real = opts.filter((o) => o.value !== '')
  const programish = real.filter((o) => programKey(o.label))
  const programMode = !hasGroups && programish.length >= 4 && programish.length >= real.length * 0.6

  const rows = []
  if (!programMode) {
    let group = null
    for (const o of opts) {
      if (o.group && o.group !== group) rows.push({ type: 'header', label: o.group })
      group = o.group
      rows.push({ type: 'option', ...o })
    }
    return { rows, programMode }
  }

  // Placeholder-style options ("— Select a program —", "All programs") stay on top.
  const top = opts.filter((o) => o.value === '' || (!programKey(o.label) && opts.indexOf(o) < opts.findIndex((x) => programKey(x.label))))
  const progs = opts.filter((o) => o.value !== '' && programKey(o.label))
    .sort((a, b) => compareProgramLabels(a.label, b.label))
  const other = opts.filter((o) => !top.includes(o) && !progs.includes(o))
  for (const o of top) rows.push({ type: 'option', ...o })
  let heading = null
  for (const o of progs) {
    const k = programKey(o.label)
    const h = `${titleCase(k.season)} ${k.year}`
    if (h !== heading) rows.push({ type: 'header', label: h })
    heading = h
    rows.push({ type: 'option', ...o, group: h })
  }
  if (other.length) {
    rows.push({ type: 'header', label: 'Other' })
    for (const o of other) rows.push({ type: 'option', ...o, group: 'Other' })
  }
  return { rows, programMode }
}

/** Rows left after filtering; headers only when something under them matches. */
export function filterRows(rows, query) {
  if (!normalize(query)) return rows
  const out = []
  let pendingHeader = null
  for (const r of rows) {
    if (r.type === 'header') { pendingHeader = r; continue }
    if (matchesQuery(`${r.label} ${r.group || ''}`, query)) {
      if (pendingHeader) { out.push(pendingHeader); pendingHeader = null }
      out.push(r)
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// DOM layer (browser only)

const CSS = `
.jss-ss-backdrop{position:fixed;inset:0;z-index:2147482999;background:transparent}
.jss-ss-panel{position:fixed;z-index:2147483000;background:#fff;color:#1a2340;border:1px solid #d6dbe8;border-radius:12px;box-shadow:0 14px 40px rgba(16,24,40,.22);display:flex;flex-direction:column;overflow:hidden;font-family:inherit;font-size:14px;line-height:1.35;text-align:left}
.jss-ss-search{margin:8px;padding:9px 12px 9px 34px;border:1px solid #d6dbe8;border-radius:8px;font:inherit;font-size:16px;color:#1a2340;background:#f7f8fc url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round'%3E%3Ccircle cx='11' cy='11' r='7'/%3E%3Cpath d='m20 20-3.5-3.5'/%3E%3C/svg%3E") no-repeat 11px center;outline:none;box-sizing:border-box;width:calc(100% - 16px)}
.jss-ss-search:focus{border-color:#1a2340;background-color:#fff}
.jss-ss-list{overflow-y:auto;overscroll-behavior:contain;padding:0 6px 6px;-webkit-overflow-scrolling:touch}
.jss-ss-head{position:sticky;top:0;background:#fff;padding:8px 10px 4px;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#6b7280}
.jss-ss-opt{display:flex;align-items:flex-start;gap:8px;width:100%;padding:9px 10px;border:0;border-radius:8px;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}
.jss-ss-opt[aria-selected="true"]{font-weight:700}
.jss-ss-opt.is-active{background:#eef1f8}
.jss-ss-opt[aria-disabled="true"]{color:#9ca3af;cursor:default}
.jss-ss-check{width:16px;flex:0 0 16px;color:#1a2340}
.jss-ss-empty{padding:14px 12px;color:#6b7280}
.jss-ss-count{padding:4px 14px 8px;font-size:12px;color:#6b7280;border-top:1px solid #eef1f8}
@media (max-width:640px){.jss-ss-opt{padding:12px 10px;font-size:16px}}
`

let installed = false
let current = null // { select, panel, backdrop, cleanup }
let touch = null
let lastTouchEnd = 0

function eligible(el) {
  return el instanceof HTMLSelectElement && !el.multiple && !el.disabled
    && !el.hasAttribute('data-native-select') && el.size <= 1 && el.options.length > 0
}

function readOptions(select) {
  return Array.from(select.options).map((o, index) => ({
    index,
    label: (o.label || o.textContent || '').trim(),
    value: o.value,
    disabled: o.disabled || (o.parentElement instanceof HTMLOptGroupElement && o.parentElement.disabled),
    hidden: o.hidden,
    group: o.parentElement instanceof HTMLOptGroupElement ? o.parentElement.label : null,
  })).filter((o) => !o.hidden)
}

function choose(select, index) {
  if (select.selectedIndex !== index) {
    select.selectedIndex = index
    select.dispatchEvent(new Event('input', { bubbles: true }))
    select.dispatchEvent(new Event('change', { bubbles: true }))
  }
}

function close(refocus) {
  if (!current) return
  const { select } = current
  current.cleanup()
  current = null
  if (refocus && select.isConnected) select.focus({ preventScroll: true })
}

function open(select) {
  if (current && current.select === select) return
  close(false)
  const doc = select.ownerDocument
  const host = select.closest('dialog[open]') || doc.body
  const opts = readOptions(select)
  const { rows } = buildRows(opts)
  const narrow = window.innerWidth <= 640

  const backdrop = doc.createElement('div')
  backdrop.className = 'jss-ss-backdrop'
  const panel = doc.createElement('div')
  panel.className = 'jss-ss-panel'
  panel.setAttribute('role', 'dialog')
  panel.setAttribute('aria-label', select.getAttribute('aria-label') || 'Choose an option')
  const input = doc.createElement('input')
  input.className = 'jss-ss-search'
  input.type = 'search'
  input.placeholder = 'Search\u2026'
  input.setAttribute('autocomplete', 'off')
  input.setAttribute('autocapitalize', 'off')
  input.setAttribute('spellcheck', 'false')
  input.setAttribute('role', 'combobox')
  input.setAttribute('aria-expanded', 'true')
  const list = doc.createElement('div')
  list.className = 'jss-ss-list'
  list.setAttribute('role', 'listbox')
  const count = doc.createElement('div')
  count.className = 'jss-ss-count'
  panel.append(input, list, count)

  const totalOptions = rows.filter((r) => r.type === 'option').length
  let visible = []
  let active = -1

  const setActive = (i, scroll) => {
    const btns = list.querySelectorAll('.jss-ss-opt')
    btns.forEach((b, j) => b.classList.toggle('is-active', j === i))
    active = i
    if (scroll && btns[i]) btns[i].scrollIntoView({ block: 'nearest' })
    if (btns[i]) input.setAttribute('aria-activedescendant', btns[i].id)
  }

  const render = () => {
    visible = filterRows(rows, input.value)
    list.textContent = ''
    let n = 0
    for (const r of visible) {
      if (r.type === 'header') {
        const h = doc.createElement('div')
        h.className = 'jss-ss-head'
        h.textContent = r.label
        list.append(h)
        continue
      }
      const b = doc.createElement('button')
      b.type = 'button'
      b.className = 'jss-ss-opt'
      b.id = `jss-ss-opt-${r.index}`
      b.setAttribute('role', 'option')
      b.setAttribute('aria-selected', String(r.index === select.selectedIndex))
      if (r.disabled) b.setAttribute('aria-disabled', 'true')
      b.dataset.index = String(r.index)
      const check = doc.createElement('span')
      check.className = 'jss-ss-check'
      check.textContent = r.index === select.selectedIndex ? '\u2713' : ''
      const label = doc.createElement('span')
      label.textContent = r.label || '\u00a0'
      b.append(check, label)
      list.append(b)
      n++
    }
    if (!n) {
      const e = doc.createElement('div')
      e.className = 'jss-ss-empty'
      e.textContent = 'No matches'
      list.append(e)
    }
    count.textContent = input.value ? `${n} of ${totalOptions}` : `${totalOptions} option${totalOptions === 1 ? '' : 's'}`
    const opts2 = visible.filter((r) => r.type === 'option')
    let start = opts2.findIndex((r) => r.index === select.selectedIndex && !r.disabled)
    if (start < 0 || input.value) start = opts2.findIndex((r) => !r.disabled)
    setActive(start, true)
  }

  const position = () => {
    if (!select.isConnected) { close(false); return }
    const vw = window.innerWidth
    const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight
    if (narrow) {
      Object.assign(panel.style, { left: '8px', right: '8px', top: 'max(8px, env(safe-area-inset-top))', width: 'auto', maxHeight: `${Math.round(vh * 0.62)}px` })
      return
    }
    const r = select.getBoundingClientRect()
    const width = Math.min(Math.max(r.width, 280), 480, vw - 16)
    const left = Math.min(Math.max(8, r.left), vw - width - 8)
    const below = vh - r.bottom - 12
    const above = r.top - 12
    const placeBelow = below >= 260 || below >= above
    const maxH = Math.max(180, Math.min(420, placeBelow ? below : above))
    Object.assign(panel.style, {
      left: `${left}px`, width: `${width}px`, maxHeight: `${maxH}px`, right: 'auto',
      top: placeBelow ? `${r.bottom + 4}px` : 'auto',
      bottom: placeBelow ? 'auto' : `${vh - r.top + 4}px`,
    })
  }

  const pick = (i) => {
    const r = visible.filter((x) => x.type === 'option')[i]
    if (!r || r.disabled) return
    choose(select, r.index)
    close(true)
  }

  list.addEventListener('click', (e) => {
    const b = e.target.closest('.jss-ss-opt')
    if (!b || b.getAttribute('aria-disabled') === 'true') return
    const i = Array.from(list.querySelectorAll('.jss-ss-opt')).indexOf(b)
    pick(i)
  })
  list.addEventListener('mousemove', (e) => {
    const b = e.target.closest('.jss-ss-opt')
    if (b) setActive(Array.from(list.querySelectorAll('.jss-ss-opt')).indexOf(b), false)
  })
  input.addEventListener('input', render)
  input.addEventListener('keydown', (e) => {
    const n = list.querySelectorAll('.jss-ss-opt').length
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(Math.min(n - 1, active + 1), true) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(Math.max(0, active - 1), true) }
    else if (e.key === 'Home' && !input.value) { e.preventDefault(); setActive(0, true) }
    else if (e.key === 'End' && !input.value) { e.preventDefault(); setActive(n - 1, true) }
    else if (e.key === 'Enter') { e.preventDefault(); pick(active) }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true) }
    else if (e.key === 'Tab') { close(false) }
  })
  backdrop.addEventListener('mousedown', (e) => { e.preventDefault(); close(true) })
  backdrop.addEventListener('touchend', (e) => { e.preventDefault(); close(false) }, { passive: false })

  const onScroll = (e) => { if (!panel.contains(e.target)) position() }
  const onResize = () => position()
  window.addEventListener('scroll', onScroll, true)
  window.addEventListener('resize', onResize)
  if (window.visualViewport) window.visualViewport.addEventListener('resize', onResize)

  host.append(backdrop, panel)
  current = {
    select,
    cleanup() {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
      if (window.visualViewport) window.visualViewport.removeEventListener('resize', onResize)
      backdrop.remove()
      panel.remove()
    },
  }
  render()
  position()
  // On phones, only raise the keyboard straight away for long lists.
  if (!narrow || totalOptions > 8) input.focus({ preventScroll: true })
}

function onMouseDown(e) {
  if (e.button !== 0 || Date.now() - lastTouchEnd < 800) return
  const sel = e.target instanceof Element ? e.target.closest('select') : null
  if (!sel || !eligible(sel)) return
  e.preventDefault()
  sel.focus({ preventScroll: true })
  open(sel)
}

function onTouchStart(e) {
  const sel = e.target instanceof Element ? e.target.closest('select') : null
  if (!sel || !eligible(sel) || e.touches.length !== 1) { touch = null; return }
  touch = { sel, x: e.touches[0].clientX, y: e.touches[0].clientY }
}

function onTouchEnd(e) {
  const t = touch
  touch = null
  if (!t || !t.sel.isConnected) return
  const p = e.changedTouches[0]
  if (!p || Math.abs(p.clientX - t.x) > 10 || Math.abs(p.clientY - t.y) > 10) return // a scroll, not a tap
  e.preventDefault() // stops the native picker (and the synthetic click/focus)
  lastTouchEnd = Date.now()
  open(t.sel)
}

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '')

function onKeyDown(e) {
  const sel = e.target
  if (!eligible(sel) || current) return
  const opens = e.key === 'Enter' || e.key === ' ' || e.key === 'F4'
    || ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && (e.altKey || IS_MAC))
  if (!opens) return
  e.preventDefault()
  open(sel)
}

/** Call once on the client. Safe to call more than once. */
export function installSearchableSelects() {
  if (installed || typeof document === 'undefined') return
  installed = true
  const style = document.createElement('style')
  style.setAttribute('data-jss-searchable-select', '')
  style.textContent = CSS
  document.head.append(style)
  document.addEventListener('mousedown', onMouseDown, true)
  document.addEventListener('touchstart', onTouchStart, { capture: true, passive: true })
  document.addEventListener('touchend', onTouchEnd, { capture: true, passive: false })
  document.addEventListener('keydown', onKeyDown, true)
}
