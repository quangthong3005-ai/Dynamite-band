import '../css/style.css'
import { auth, db } from './firebase.js'
import { adminEmails } from './firebase-config.js'
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'
import { collection, query, orderBy, onSnapshot, doc, setDoc, addDoc, serverTimestamp } from 'firebase/firestore'

const $ = (id) => document.getElementById(id)
let currentChat = null
let unsubChats = null
let unsubMsgs = null

$('signIn').addEventListener('click', () => signInWithPopup(auth, new GoogleAuthProvider()).catch(() => {}))
$('signOut').addEventListener('click', () => signOut(auth))

onAuthStateChanged(auth, (user) => {
  const ok = !!user && !user.isAnonymous && adminEmails.includes(user.email)
  $('loginBox').hidden = ok
  $('app').hidden = !ok
  $('signOut').hidden = !ok
  $('loginMsg').textContent = user && !user.isAnonymous && !ok ? user.email + ' is not allowed to use this page.' : ''
  if (unsubChats) { unsubChats(); unsubChats = null }
  if (ok) watchChats()
})

function watchChats() {
  unsubChats = onSnapshot(query(collection(db, 'chats'), orderBy('updatedAt', 'desc')), (snap) => {
    const list = $('chatsList')
    list.innerHTML = ''
    if (snap.empty) list.textContent = 'No conversations yet.'
    snap.forEach((d) => {
      const c = d.data()
      const b = document.createElement('button')
      b.type = 'button'
      b.className = 'admin-chat' + (d.id === currentChat ? ' active' : '')
      const n = document.createElement('strong'); n.textContent = c.name || 'Guest'
      const l = document.createElement('span'); l.textContent = c.lastMessage || ''
      b.append(n, l)
      b.addEventListener('click', () => openChat(d.id, c.name))
      list.appendChild(b)
    })
  })
}

function openChat(id, name) {
  currentChat = id
  $('chatTitle').textContent = name || 'Guest'
  $('replyForm').hidden = false
  if (unsubMsgs) unsubMsgs()
  unsubMsgs = onSnapshot(query(collection(db, 'chats', id, 'messages'), orderBy('createdAt')), (snap) => {
    const box = $('adminMsgs')
    box.innerHTML = ''
    snap.forEach((d) => {
      const m = d.data()
      const el = document.createElement('div')
      el.className = 'chat-msg ' + (m.from === 'band' ? 'me' : 'band')
      el.textContent = m.text
      box.appendChild(el)
    })
    box.scrollTop = box.scrollHeight
  })
  document.querySelectorAll('.admin-chat').forEach((b) => b.classList.remove('active'))
}

$('replyForm').addEventListener('submit', async (e) => {
  e.preventDefault()
  const text = $('replyInput').value.trim()
  if (!text || !currentChat) return
  $('replyInput').value = ''
  await setDoc(doc(db, 'chats', currentChat), { lastMessage: 'Band: ' + text.slice(0, 110), updatedAt: serverTimestamp(), fromBand: true }, { merge: true })
  await addDoc(collection(db, 'chats', currentChat, 'messages'), { text, from: 'band', createdAt: serverTimestamp() })
})
