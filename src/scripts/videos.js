import { videoCard } from './common.js'
import { getVideos } from './content.js'

// Fill the grid on the Live videos page (videos added in admin, else config.js)
const grid = document.getElementById('videoGrid')
const empty = document.getElementById('videoEmpty')

getVideos().then((list) => {
  if (list.length > 0) {
    empty.classList.add('hidden')
    list.forEach((v) => grid.appendChild(videoCard(v)))
  }
})
