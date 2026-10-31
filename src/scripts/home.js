import { videoCard } from './common.js'
import { config } from './config.js'

// ---------- featured live video on the home page ----------
const featured = document.getElementById('featuredVideo')
if (featured) {
  if (config.videos.length > 0) {
    featured.innerHTML = ''
    featured.appendChild(videoCard(config.videos[0]))
  }
}

// ---------- lightbox for gallery photos ----------
const lb = document.getElementById('lightbox')
const lbImg = document.getElementById('lbImg')
const thumbs = []
const addThumbs = () => { thumbs.length = 0; thumbs.push(...document.querySelectorAll('.g-item')); thumbs.forEach((t, i) => { t.onclick = () => openLb(i) }) }
let current = 0
let lastFocus = null

function show(i) {
  current = (i + thumbs.length) % thumbs.length
  lbImg.src = thumbs[current].dataset.full
  lbImg.alt = thumbs[current].dataset.alt || ''
}
function openLb(i) {
  lastFocus = document.activeElement
  show(i)
  lb.classList.add('open')
  document.body.style.overflow = 'hidden'
  document.getElementById('lbClose').focus()
}
function closeLb() {
  lb.classList.remove('open')
  document.body.style.overflow = ''
  if (lastFocus) lastFocus.focus()
}
addThumbs()
document.getElementById('lbClose').addEventListener('click', closeLb)
document.getElementById('lbPrev').addEventListener('click', () => show(current - 1))
document.getElementById('lbNext').addEventListener('click', () => show(current + 1))
lb.addEventListener('click', (e) => { if (e.target === lb) closeLb() })
document.addEventListener('keydown', (e) => {
  if (!lb.classList.contains('open')) return
  if (e.key === 'Escape') closeLb()
  if (e.key === 'ArrowLeft') show(current - 1)
  if (e.key === 'ArrowRight') show(current + 1)
})

// ---------- extra photos added by the band from the admin page ----------
const more = document.getElementById('morePhotos')
if (more) {
  import('./firebase.js').then(async ({ db }) => {
    const { collection, getDocs, query, orderBy } = await import('firebase/firestore')
    const snap = await getDocs(query(collection(db, 'photos'), orderBy('createdAt', 'desc')))
    if (snap.empty) return
    snap.forEach((d) => {
      const p = d.data()
      const b = document.createElement('button')
      b.type = 'button'; b.className = 'g-item'; b.dataset.caption = p.caption || ''; b.dataset.full = p.src; b.dataset.alt = p.caption || 'Band photo'
      const img = document.createElement('img'); img.src = p.src; img.alt = p.caption || 'Band photo'; img.loading = 'lazy'
      b.appendChild(img)
      const w = document.createElement('div'); w.appendChild(b); more.appendChild(w)
    })
    more.hidden = false
    addThumbs()
  }).catch(() => {})
}
