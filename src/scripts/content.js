import { config } from './config.js'
import { firebaseConfig } from './firebase-config.js'
import { DEFAULT_MEMBERS } from './members-data.js'

// Reads content the band edits from the admin page. Every function falls back to the
// built-in defaults, so the site still works if Firebase is slow, blocked or empty.
async function fs() {
  if (!firebaseConfig.apiKey) throw new Error('no firebase')
  const [{ db }, f] = await Promise.all([import('./firebase.js'), import('firebase/firestore')])
  return { db, ...f }
}

export async function getVideos() {
  try {
    const { db, collection, getDocs, query, orderBy } = await fs()
    const snap = await getDocs(query(collection(db, 'videos'), orderBy('createdAt', 'desc')))
    const list = snap.docs.map((d) => ({ id: d.data().ytId, title: d.data().title || 'Live video', docId: d.id })).filter((v) => v.id)
    if (list.length) return list
  } catch { /* use defaults */ }
  return config.videos
}

export async function getMembers() {
  let overrides = {}
  let extra = []
  try {
    const { db, collection, getDocs } = await fs()
    const snap = await getDocs(collection(db, 'members'))
    snap.forEach((d) => { overrides[d.id] = d.data() })
  } catch { /* defaults only */ }
  const merged = DEFAULT_MEMBERS.map((m, i) => ({ ...m, order: (i + 1) * 10, ...clean(overrides[m.id]) }))
  const ids = new Set(DEFAULT_MEMBERS.map((m) => m.id))
  for (const [id, o] of Object.entries(overrides)) if (!ids.has(id)) extra.push({ id, pos: 'center', portfolio: '', bio: '', ...clean(o) })
  return [...merged, ...extra].filter((m) => !m.hidden && m.name).sort((a, b) => (a.order ?? 100) - (b.order ?? 100))
}
function clean(o) { return o ? Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== '' || v === '')) : {} }

export async function getTexts() {
  try {
    const { db, doc, getDoc } = await fs()
    const s = await getDoc(doc(db, 'site', 'texts'))
    return s.exists() ? s.data() : {}
  } catch { return {} }
}
