import '../css/style.css'

// header background after scrolling
const header = document.getElementById('site-header')
const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 40)
onScroll()
window.addEventListener('scroll', onScroll, { passive: true })

// mobile menu
const menuBtn = document.getElementById('menuBtn')
const menu = document.getElementById('mobileMenu')
menuBtn.addEventListener('click', () => {
  const open = menu.classList.toggle('hidden') === false
  menuBtn.setAttribute('aria-expanded', String(open))
  header.classList.toggle('scrolled', open || window.scrollY > 40)
})
menu.querySelectorAll('a').forEach((a) =>
  a.addEventListener('click', () => {
    menu.classList.add('hidden')
    menuBtn.setAttribute('aria-expanded', 'false')
  }),
)

// fade-in on scroll
const items = document.querySelectorAll('.reveal')
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('in')
          io.unobserve(e.target)
        }
      })
    },
    { threshold: 0.12 },
  )
  items.forEach((el) => io.observe(el))
} else {
  items.forEach((el) => el.classList.add('in'))
}

// lightbox for gallery photos
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

// copy email button
const copyBtn = document.getElementById('copyEmail')
const copyMsg = document.getElementById('copyMsg')
copyBtn.addEventListener('click', async () => {
  const email = copyBtn.dataset.email
  let ok = false
  try {
    await navigator.clipboard.writeText(email)
    ok = true
  } catch (e) {
    ok = false
  }
  copyMsg.textContent = ok ? 'Email address copied.' : 'Please copy it manually: ' + email
  setTimeout(() => { copyMsg.textContent = '' }, 3500)
})
