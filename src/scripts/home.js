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
const thumbs = Array.from(document.querySelectorAll('.g-item'))
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
thumbs.forEach((t, i) => t.addEventListener('click', () => openLb(i)))
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
