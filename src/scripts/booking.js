import { links } from './common.js'
import { config } from './config.js'

// Booking enquiry form: builds a ready-to-send message.
// There is no server, so the form opens the visitor's email app (or WhatsApp) with the text filled in.
const form = document.getElementById('bookingForm')
const waBtn = document.getElementById('sendWhatsapp')
const note = document.getElementById('formNote')

function buildMessage() {
  const d = new FormData(form)
  const lines = [
    'Hello Dynamite Band,',
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
  const subject = 'Booking enquiry for Dynamite Band'
  const body = buildMessage()
  window.location.href = `mailto:${config.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  note.textContent = 'Your email app should open with the message ready. If it does not, copy the details and email us directly.'
})

if (links.whatsapp) {
  waBtn.addEventListener('click', () => {
    if (!form.reportValidity()) return
    const number = String(config.whatsapp).replace(/\D/g, '')
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(buildMessage())}`, '_blank', 'noopener')
  })
} else {
  waBtn.classList.add('is-disabled')
  waBtn.setAttribute('aria-disabled', 'true')
  waBtn.setAttribute('title', 'Coming soon')
}
