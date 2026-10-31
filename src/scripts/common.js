import '../css/style.css'
import { config } from './config.js'

// ---------- header background after scrolling ----------
const header = document.getElementById('site-header')
const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 40)
onScroll()
window.addEventListener('scroll', onScroll, { passive: true })

// ---------- mobile menu ----------
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

// ---------- fade-in on scroll ----------
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

// ---------- contact links (Zalo, WhatsApp, email) from config.js ----------
const digits = (s) => String(s || '').replace(/\D/g, '')
const subject = 'Booking enquiry for Dynamite Band'

export const links = {
  email: config.email ? `mailto:${config.email}?subject=${encodeURIComponent(subject)}` : '',
  zalo: digits(config.zalo) ? `https://zalo.me/${digits(config.zalo)}` : '',
  whatsapp: digits(config.whatsapp)
    ? `https://wa.me/${digits(config.whatsapp)}?text=${encodeURIComponent('Hi Dynamite Band, I would like to book you for an event.')}`
    : '',
}

document.querySelectorAll('[data-contact]').forEach((el) => {
  const href = links[el.dataset.contact]
  if (href) {
    el.setAttribute('href', href)
    if (el.dataset.contact !== 'email') {
      el.setAttribute('target', '_blank')
      el.setAttribute('rel', 'noopener')
    }
  } else {
    el.removeAttribute('href')
    el.setAttribute('aria-disabled', 'true')
    el.setAttribute('title', 'Coming soon')
    el.classList.add('is-disabled')
  }
})

document.querySelectorAll('[data-contact-text="email"]').forEach((el) => {
  el.textContent = config.email
})

// ---------- copy email button ----------
document.querySelectorAll('[data-copy-email]').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const msg = document.querySelector('[data-copy-msg]')
    let ok = false
    try {
      await navigator.clipboard.writeText(config.email)
      ok = true
    } catch (e) {
      ok = false
    }
    if (msg) {
      msg.textContent = ok ? 'Email address copied.' : 'Please copy it manually: ' + config.email
      setTimeout(() => { msg.textContent = '' }, 3500)
    }
  })
})

// ---------- YouTube "lite" player (loads the video only when clicked) ----------
export function videoCard(video) {
  const wrap = document.createElement('div')
  wrap.className = 'video-card card'
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = 'video-thumb'
  btn.setAttribute('aria-label', 'Play video: ' + video.title)
  btn.innerHTML =
    `<img src="https://i.ytimg.com/vi/${video.id}/hqdefault.jpg" alt="" loading="lazy">` +
    '<span class="play-circle"><svg class="text-accent" width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.2v13.6a1 1 0 0 0 1.5.86l11-6.8a1 1 0 0 0 0-1.72l-11-6.8A1 1 0 0 0 8 5.2z"/></svg></span>'
  btn.addEventListener('click', () => {
    const iframe = document.createElement('iframe')
    iframe.src = `https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0`
    iframe.title = video.title
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
    iframe.allowFullscreen = true
    btn.replaceWith(iframe)
  })
  const cap = document.createElement('p')
  cap.className = 'video-caption'
  cap.textContent = video.title
  wrap.append(btn, cap)
  return wrap
}

import './chat.js'
import './contactbox.js'
