// Resize a picked image in the browser and return a JPEG data URL small enough to store in Firestore.
export function resizeToDataUrl(file, max = 1600, limit = 900000) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k)
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(url)
      let q = 0.84, out = c.toDataURL('image/jpeg', q)
      while (out.length > limit && q > 0.4) { q -= 0.08; out = c.toDataURL('image/jpeg', q) }
      out.length > limit ? reject(new Error('too big')) : resolve(out)
    }
    img.onerror = () => reject(new Error('not an image'))
    img.src = url
  })
}
