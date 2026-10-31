import { firebaseConfig } from './firebase-config.js'

// Live chat widget for customers. Firebase is only downloaded when the visitor opens the chat.
if (firebaseConfig.apiKey) {
  const root = document.createElement('div')
  root.id = 'chatRoot'
  root.innerHTML = `
    <button id="chatBubble" class="chat-bubble" type="button" aria-label="Chat with the band" aria-expanded="false">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg>
    </button>
    <section id="chatPanel" class="chat-panel" hidden aria-label="Chat with Dynamite Band">
      <header class="chat-head"><div><strong>Dynamite Band</strong><span>We usually reply within a day</span></div>
        <button id="chatClose" type="button" aria-label="Close chat">&times;</button></header>
      <form id="chatName" class="chat-name">
        <p>Hi! What should we call you?</p>
        <input id="chatNameInput" required maxlength="40" placeholder="Your name" autocomplete="name">
        <button class="btn btn-solid btn-small" type="submit">Start chat</button>
      </form>
      <div id="chatBody" class="chat-body" hidden>
        <div id="chatList" class="chat-list" aria-live="polite"></div>
        <form id="chatForm" class="chat-form">
          <input id="chatInput" required maxlength="1000" placeholder="Write a message..." autocomplete="off">
          <button class="btn btn-solid btn-small" type="submit">Send</button>
        </form>
        <p id="chatNote" class="chat-note"></p>
      </div>
    </section>`
  document.body.appendChild(root)

  const $ = (id) => document.getElementById(id)
  const bubble = $('chatBubble'), panel = $('chatPanel')
  const safe = {
    get: (k) => { try { return localStorage.getItem(k) } catch (e) { return null } },
    set: (k, v) => { try { localStorage.setItem(k, v) } catch (e) {} },
  }
  let fb = null, started = false, uid = null, name = safe.get('dynChatName') || ''

  async function load() {
    if (fb) return fb
    const [{ auth, db }, a, f] = await Promise.all([
      import('./firebase.js'),
      import('firebase/auth'),
      import('firebase/firestore'),
    ])
    fb = { auth, db, ...a, ...f }
    return fb
  }

  function addBubble(m) {
    const d = document.createElement('div')
    d.className = 'chat-msg ' + (m.from === 'band' ? 'band' : 'me')
    d.textContent = m.text
    $('chatList').appendChild(d)
    $('chatList').scrollTop = $('chatList').scrollHeight
  }

  async function start() {
    if (started) return
    started = true
    $('chatName').hidden = true
    $('chatBody').hidden = false
    try {
      const { auth, db, signInAnonymously, collection, query, orderBy, onSnapshot } = await load()
      const cred = auth.currentUser ? { user: auth.currentUser } : await signInAnonymously(auth)
      uid = cred.user.uid
      const q = query(collection(db, 'chats', uid, 'messages'), orderBy('createdAt'))
      onSnapshot(q, (snap) => {
        $('chatList').innerHTML = ''
        if (snap.empty) addBubble({ from: 'band', text: 'Hi ' + name + '! Tell us about your event and we will reply here.' })
        snap.forEach((d) => addBubble(d.data()))
      })
    } catch (e) {
      started = false
      $('chatNote').textContent = 'Chat is unavailable right now. Please use Zalo, WhatsApp or email below.'
    }
  }

  function toggle(open) {
    panel.hidden = !open
    bubble.setAttribute('aria-expanded', String(open))
    if (open) {
      if (name) start()
      else $('chatNameInput').focus()
    }
  }
  bubble.addEventListener('click', () => toggle(panel.hidden))
  $('chatClose').addEventListener('click', () => toggle(false))

  $('chatName').addEventListener('submit', (e) => {
    e.preventDefault()
    name = $('chatNameInput').value.trim()
    if (!name) return
    safe.set('dynChatName', name)
    start()
  })

  $('chatForm').addEventListener('submit', async (e) => {
    e.preventDefault()
    const text = $('chatInput').value.trim()
    if (!text || !uid) return
    $('chatInput').value = ''
    try {
      const { db, doc, setDoc, addDoc, collection, serverTimestamp } = fb
      await setDoc(doc(db, 'chats', uid), { name, lastMessage: text.slice(0, 120), updatedAt: serverTimestamp(), fromBand: false }, { merge: true })
      await addDoc(collection(db, 'chats', uid, 'messages'), { text, from: 'customer', createdAt: serverTimestamp() })
      $('chatNote').textContent = ''
    } catch (err) {
      $('chatInput').value = text
      $('chatNote').textContent = 'Could not send. Please try again or use Zalo / WhatsApp.'
    }
  })
}
