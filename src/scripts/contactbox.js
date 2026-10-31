import { config } from './config.js'
import { firebaseConfig } from './firebase-config.js'

// "Email" buttons open a message box on the page instead of leaving the site.
// With Firebase set up the message goes straight to the band's inbox (admin.html).
// Without it, the box falls back to the visitor's own email app.
const hasFirebase = !!firebaseConfig.apiKey
const subject = 'Message for Dynamite Band'

const dlg = document.createElement('dialog')
dlg.id = 'contactBox'
dlg.className = 'contact-box'
dlg.innerHTML = `
  <form method="dialog" id="cbForm">
    <div class="flex items-start justify-between mb-5">
      <h2 class="font-display text-3xl text-white">Send us a message</h2>
      <button type="button" id="cbClose" class="text-3xl leading-none text-white" aria-label="Close">&times;</button>
    </div>
    <div class="grid gap-4">
      <div class="field"><label for="cb-name">Your name</label><input id="cb-name" name="name" required maxlength="60" autocomplete="name"></div>
      <div class="field"><label for="cb-contact">Phone / Zalo / email so we can reply</label><input id="cb-contact" name="contact" required maxlength="80"></div>
      <div class="field"><label for="cb-msg">Message</label><textarea id="cb-msg" name="message" rows="6" required maxlength="1000" placeholder="Tell us the date, place and type of event..."></textarea></div>
    </div>
    <div class="flex flex-wrap items-center gap-4 mt-6">
      <button class="btn btn-solid" type="submit" id="cbSend">Send message</button>
      <a class="text-sm text-stone-400 underline" id="cbMail" target="_blank" rel="noopener">Use my email app instead</a>
    </div>
    <p id="cbNote" class="mt-4 text-sm text-accent" aria-live="polite"></p>
  </form>`
document.body.appendChild(dlg)

const $ = (id) => document.getElementById(id)
const form = $('cbForm'), note = $('cbNote')

function bodyText(d) {
  return `Name: ${d.name}\nContact: ${d.contact}\n\n${d.message}`
}
function mailtoHref(d) {
  return `mailto:${config.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText(d))}`
}
function data() {
  return { name: $('cb-name').value.trim(), contact: $('cb-contact').value.trim(), message: $('cb-msg').value.trim() }
}

document.querySelectorAll('[data-contact="email"]').forEach((el) => {
  el.addEventListener('click', (e) => {
    e.preventDefault()
    note.textContent = ''
    dlg.showModal()
    $('cb-name').focus()
  })
})
// The email address text itself is also clickable and opens the same box.
document.querySelectorAll('[data-contact-text="email"]').forEach((el) => {
  el.classList.add('email-link')
  el.setAttribute('role', 'button')
  el.setAttribute('tabindex', '0')
  el.setAttribute('title', 'Write us a message')
  const open = () => { note.textContent = ''; dlg.showModal(); $('cb-name').focus() }
  el.addEventListener('click', open)
  el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open() } })
})
$('cbClose').addEventListener('click', () => dlg.close())
dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close() })

$('cbMail').addEventListener('click', () => { $('cbMail').href = mailtoHref(data()) })

form.addEventListener('submit', async (e) => {
  e.preventDefault()
  const d = data()
  if (!d.name || !d.contact || !d.message) return
  if (!hasFirebase) {
    window.location.href = mailtoHref(d)
    note.textContent = 'Your email app should open with the message ready.'
    return
  }
  const btn = $('cbSend')
  btn.disabled = true
  note.textContent = 'Sending...'
  try {
    const [{ auth, db }, a, f] = await Promise.all([import('./firebase.js'), import('firebase/auth'), import('firebase/firestore')])
    const cred = auth.currentUser ? { user: auth.currentUser } : await a.signInAnonymously(auth)
    const uid = cred.user.uid
    const text = `[Contact: ${d.contact}]\n${d.message}`
    await f.setDoc(f.doc(db, 'chats', uid), { name: d.name, lastMessage: d.message.slice(0, 120), updatedAt: f.serverTimestamp(), fromBand: false }, { merge: true })
    await f.addDoc(f.collection(db, 'chats', uid, 'messages'), { text, from: 'customer', createdAt: f.serverTimestamp() })
    try { localStorage.setItem('dynChatName', d.name) } catch (err) {}
    note.textContent = 'Thank you! Your message was sent. We will reply using the contact you gave.'
    form.reset()
  } catch (err) {
    note.textContent = 'Could not send. Please use "Use my email app instead", Zalo or WhatsApp.'
  } finally {
    btn.disabled = false
  }
})
