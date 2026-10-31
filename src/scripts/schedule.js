import { firebaseConfig } from './firebase-config.js'

// "This week" schedule on the home page. Shows come live from Firestore (collection "shows"),
// so edits made in the admin calendar appear here without reloading.
const weekEl = document.getElementById('schWeek')
if (weekEl) {
  const rangeEl = document.getElementById('schRange')
  const liveEl = document.getElementById('schLive')
  const pill = document.getElementById('nextShow')
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  let shows = []
  let unsub = null
  let subFor = ''

  const pad = (n) => String(n).padStart(2, '0')
  const key = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
  const parse = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d) }
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e }
  const when = (s) => { const [h, m] = (s.start || '23:59').split(':').map(Number); const d = parse(s.date); d.setHours(h || 0, m || 0, 0, 0); return d }

  function render() {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const week = [...Array(7)].map((_, i) => addDays(today, i))
    rangeEl.textContent = week[0].getDate() + ' ' + MONTHS[week[0].getMonth()] + ' – ' + week[6].getDate() + ' ' + MONTHS[week[6].getMonth()]
    weekEl.innerHTML = ''
    week.forEach((d, i) => {
      const k = key(d)
      const day = el('article', 'sch-day' + (i === 0 ? ' today' : ''))
      const head = el('header', 'sch-head')
      head.append(el('span', 'sch-dow', i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : DAYS[d.getDay()]), el('span', 'sch-date', d.getDate()), el('span', 'sch-mon', MONTHS[d.getMonth()]))
      day.append(head)
      const list = shows.filter((s) => s.date === k).sort((a, b) => (a.start || '').localeCompare(b.start || ''))
      if (!list.length) day.append(el('p', 'sch-none', 'No show'))
      list.forEach((s) => {
        const e = el(s.link ? 'a' : 'div', 'sch-show' + (i === 0 && when(s) < now && s.start ? ' past' : ''))
        if (s.link) { e.href = s.link; e.target = '_blank'; e.rel = 'noopener' }
        e.append(el('strong', 'sch-time', s.start ? s.start + (s.end ? '–' + s.end : '') : 'All day'))
        e.append(el('span', 'sch-title', s.title))
        const where = [s.venue, s.city].filter(Boolean).join(', ')
        if (where) e.append(el('span', 'sch-where', where))
        if (s.note) e.append(el('span', 'sch-note', s.note))
        day.append(e)
      })
      weekEl.append(day)
    })
    // next show pill in the hero
    const next = shows.map((s) => ({ s, t: when(s) })).filter((x) => (x.s.start ? x.t >= now : addDays(parse(x.s.date), 1) > now)).sort((a, b) => a.t - b.t)[0]
    if (next && pill) {
      const d = parse(next.s.date)
      const diff = Math.round((d - today) / 86400000)
      const label = diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : DAYS[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()]
      pill.textContent = ''
      pill.append(el('i', 'dot'), el('span', '', 'Next show · ' + label + (next.s.start ? ' · ' + next.s.start : '') + ' · ' + next.s.title))
      pill.hidden = false
    } else if (pill) pill.hidden = true
  }

  async function subscribe() {
    const now = new Date()
    const from = key(now)
    if (from === subFor) return
    subFor = from
    if (unsub) { unsub(); unsub = null }
    if (!firebaseConfig.apiKey) return
    try {
      const [{ db }, f] = await Promise.all([import('./firebase.js'), import('firebase/firestore')])
      const q = f.query(f.collection(db, 'shows'), f.where('date', '>=', from), f.where('date', '<=', key(addDays(now, 90))))
      unsub = f.onSnapshot(q, (snap) => {
        shows = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((s) => s.scope !== 'qt')
        liveEl.classList.add('on')
        render()
      }, () => { liveEl.classList.remove('on') })
    } catch { liveEl.classList.remove('on') }
  }

  render()
  subscribe()
  // keep "today", past shows and the next-show pill correct while the page stays open
  setInterval(() => { subscribe(); render() }, 30000)
}
