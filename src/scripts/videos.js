import { videoCard } from './common.js'
import { config } from './config.js'

// Fill the grid on the Live videos page from config.videos
const grid = document.getElementById('videoGrid')
const empty = document.getElementById('videoEmpty')

if (config.videos.length > 0) {
  empty.classList.add('hidden')
  config.videos.forEach((v) => grid.appendChild(videoCard(v)))
}
