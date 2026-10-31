import { links } from './common.js'
import { config } from './config.js'

// Booking enquiry form: builds a ready-to-send message.
// There is no server, so the form opens the visitor's email app (or WhatsApp) with the text filled in.
const form = document.getElementById('bookingForm')
const waBtn = document.getElementById('sendWhatsapp')
const note = document.getElementById('formNote')
const gmailBtn = document.getElementById('sendGmail')

// Also keep a copy of each request for the band's customer notes (admin page). Never blocks sending.
async function saveRequest(via) {
  try {
    const d = new FormData(form)
    const [{ auth, db }, a, f] = await Promise.all([import('./firebase.js'), import('firebase/auth'), import('firebase/firestore')])
    if (!auth.currentUser) await a.signInAnonymously(auth)
    const cut = (v, n) => String(v || '').trim().slice(0, n)
    await f.addDoc(f.collection(db, 'requests'), {
      name: cut(d.get('name'), 80), contact: cut(d.get('contact'), 120), type: cut(d.get('type'), 40),
      date: cut(d.get('date'), 20), place: cut(d.get('place'), 200), message: cut(d.get('message'), 2000),
      via, createdAt: f.serverTimestamp(),
    })
  } catch { /* the message still goes out by mail / WhatsApp */ }
}

function buildMessage() {
  const d = new FormData(form)
  const lines = [
    'Hello Dynamites Band,',
    '',
    'I would like to book you for an event.',
    '',
    'Name: ' + (d.get('name') || ''),
    'Phone / Zalo / email: ' + (d.get('contact') || ''),
    'Event type: ' + (d.get('type') || ''),
    'Date: ' + (d.get('date') || ''),
    'Place: ' + (d.get('place') || ''),
    '',
    'Details:',
    d.get('message') || '',
  ]
  return lines.join('\n')
}

form.addEventListener('submit', (e) => {
  e.preventDefault()
  saveRequest('email')
  const subject = 'Booking enquiry for Dynamites Band'
  const body = buildMessage()
  window.location.href = `mailto:${config.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  note.textContent = 'Your email app should open with the message ready. If it does not, copy the details and email us directly.'
})

if (links.whatsapp) {
  waBtn.addEventListener('click', () => {
    if (!form.reportValidity()) return
    saveRequest('whatsapp')
    const number = String(config.whatsapp).replace(/\D/g, '')
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(buildMessage())}`, '_blank', 'noopener')
  })
} else {
  waBtn.classList.add('is-disabled')
  waBtn.setAttribute('aria-disabled', 'true')
  waBtn.setAttribute('title', 'Coming soon')
}

// Gmail on the web: for visitors who use Gmail but have no email app set up.
gmailBtn.addEventListener('click', () => {
  if (!form.reportValidity()) return
  saveRequest('gmail')
  const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(config.email)}&su=${encodeURIComponent('Booking enquiry for Dynamites Band')}&body=${encodeURIComponent(buildMessage())}`
  window.open(url, '_blank', 'noopener')
  note.textContent = 'Gmail opened in a new tab with your message ready. Press Send there.'
})
