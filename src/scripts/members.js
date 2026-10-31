import { DEFAULT_MEMBERS } from './members-data.js'
import { getMembers } from './content.js'

const grid = document.getElementById('memberGrid')
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
let members = DEFAULT_MEMBERS.map((m) => ({ ...m }))

function safeUrl(u) {
  if (!u || !String(u).trim()) return ''
  try { const x = new URL(u, location.href); return /^https?:$/.test(x.protocol) ? x.href : '' } catch { return '' }
}

function render() {
  grid.innerHTML = ''
  members.forEach((m) => {
    const b = document.createElement('button')
    b.type = 'button'
    b.className = 'card member member-in'
    b.dataset.id = m.id
    b.setAttribute('aria-haspopup', 'dialog')
    const ph = document.createElement('div'); ph.className = 'member-photo'
    const img = document.createElement('img')
    img.src = m.photo || 'images/logo-symbol.png'; img.alt = m.name + ', ' + m.role; img.loading = 'lazy'
    img.style.objectPosition = m.pos || 'center'
    ph.appendChild(img)
    const body = document.createElement('div'); body.className = 'member-body'
    const h = document.createElement('h3'); h.className = 'font-display text-2xl text-white'; h.textContent = m.name
    const r = document.createElement('p'); r.className = 'text-sm text-accent tracking-widest uppercase mt-1'; r.textContent = m.role
    const more = document.createElement('span'); more.className = 'member-link'; more.textContent = 'About →'
    body.append(h, r, more)
    b.append(ph, body)
    b.addEventListener('click', () => openMember(m, img))
    grid.appendChild(b)
  })
}
render()
getMembers().then((list) => { if (list.length) { members = list; render() } }).catch(() => {})

// ---------- modal with a smooth "photo flies left, text slides in from the right" ----------
let modal = null
let lastCard = null

function openMember(m, srcImg) {
  if (modal) return
  lastCard = srcImg.closest('.member')
  const url = safeUrl(m.portfolio)
  modal = document.createElement('div')
  modal.className = 'mm'
  modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true'); modal.setAttribute('aria-label', m.name)
  modal.innerHTML =
    '<div class="mm-backdrop"></div>' +
    '<div class="mm-box">' +
      '<button class="mm-close" type="button" aria-label="Close">&times;</button>' +
      '<div class="mm-photo"><img alt=""></div>' +
      '<div class="mm-text">' +
        '<p class="eyebrow mm-role"></p><h3 class="mm-name font-display"></h3>' +
        '<p class="mm-bio"></p>' +
        '<div class="mm-portfolio"><span class="mm-pl">Personal portfolio</span></div>' +
      '</div>' +
    '</div>'
  const $ = (s) => modal.querySelector(s)
  const realImg = $('.mm-photo img')
  realImg.src = srcImg.src; realImg.alt = srcImg.alt; realImg.style.objectPosition = m.pos || 'center'
  $('.mm-role').textContent = m.role
  $('.mm-name').textContent = m.name
  $('.mm-bio').textContent = m.bio || 'More about ' + m.name + ' is coming soon.'
  const pf = $('.mm-portfolio')
  if (url) {
    const a = document.createElement('a'); a.className = 'btn btn-solid btn-small'; a.href = url; a.target = '_blank'; a.rel = 'noopener'
    a.textContent = 'Open portfolio →'; pf.appendChild(a)
  } else {
    const s = document.createElement('span'); s.className = 'mm-soon'; s.textContent = 'Portfolio coming soon'; pf.appendChild(s)
  }
  document.body.appendChild(modal)
  document.body.style.overflow = 'hidden'

  const target = $('.mm-photo')
  const from = srcImg.getBoundingClientRect()
  const to = target.getBoundingClientRect()
  const text = $('.mm-text'), backdrop = $('.mm-backdrop'), close = $('.mm-close')
  close.addEventListener('click', closeMember)
  backdrop.addEventListener('click', closeMember)
  document.addEventListener('keydown', onKey)

  if (reduce) { close.focus(); return }
  realImg.style.visibility = 'hidden'
  text.style.opacity = '0'
  const flyer = document.createElement('img')
  flyer.src = srcImg.src; flyer.className = 'mm-flyer'; flyer.style.objectPosition = m.pos || 'center'
  setBox(flyer, from)
  modal.appendChild(flyer)
  modal._flyer = flyer; modal._from = from
  const ease = 'cubic-bezier(.22,.8,.24,1)'
  backdrop.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 350, fill: 'both' })
  const fly = flyer.animate([boxFrame(from), boxFrame(to)], { duration: 560, easing: ease, fill: 'forwards' })
  text.animate([{ opacity: 0, transform: 'translateX(70px)' }, { opacity: 1, transform: 'none' }], { duration: 560, delay: 140, easing: ease, fill: 'both' })
  fly.onfinish = () => { realImg.style.visibility = ''; flyer.remove(); close.focus() }
}

function setBox(el, r) { Object.assign(el.style, { position: 'fixed', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' }) }
function boxFrame(r) { return { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' } }

function closeMember() {
  if (!modal) return
  const m = modal
  modal = null
  document.removeEventListener('keydown', onKey)
  const done = () => { m.remove(); document.body.style.overflow = ''; if (lastCard) lastCard.focus() }
  if (reduce) return done()
  const photo = m.querySelector('.mm-photo img')
  const to = photo.getBoundingClientRect()
  const card = lastCard ? lastCard.querySelector('img') : null
  const back = card ? card.getBoundingClientRect() : to
  const flyer = document.createElement('img')
  flyer.src = photo.src; flyer.className = 'mm-flyer'; flyer.style.objectPosition = photo.style.objectPosition
  setBox(flyer, to); m.appendChild(flyer); photo.style.visibility = 'hidden'
  const ease = 'cubic-bezier(.4,0,.2,1)'
  m.querySelector('.mm-text').animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(70px)' }], { duration: 300, easing: ease, fill: 'forwards' })
  m.querySelector('.mm-close').style.opacity = '0'
  m.querySelector('.mm-backdrop').animate([{ opacity: 1 }, { opacity: 0 }], { duration: 420, delay: 120, fill: 'forwards' })
  flyer.animate([boxFrame(to), boxFrame(back)], { duration: 460, easing: ease, fill: 'forwards' }).onfinish = done
}

function onKey(e) { if (e.key === 'Escape') closeMember() }
