<template>
  <div class="staff-display" v-if="showStaff">
    <div class="staff-container">
      <svg class="staff-svg" viewBox="0 0 400 100">
        <g class="staff-lines">
          <line x1="0" y1="20" x2="400" y2="20" stroke="#333" stroke-width="1"/>
          <line x1="0" y1="35" x2="400" y2="35" stroke="#333" stroke-width="1"/>
          <line x1="0" y1="50" x2="400" y2="50" stroke="#333" stroke-width="1"/>
          <line x1="0" y1="65" x2="400" y2="65" stroke="#333" stroke-width="1"/>
          <line x1="0" y1="80" x2="400" y2="80" stroke="#333" stroke-width="1"/>
        </g>
        
        <g class="clef">
          <text x="20" y="65" font-size="50" font-family="serif" fill="#333">𝄞</text>
        </g>
        
        <g class="notes">
          <g v-for="(note, index) in displayedNotes" :key="index">
            <line 
              v-if="note.stem"
              :x1="note.x + 8" 
              :y1="note.stemDirection === 'up' ? note.y : note.y + 25"
              :x2="note.x + 8" 
              :y2="note.stemDirection === 'up' ? note.y + 35 : note.y"
              stroke="#333" 
              stroke-width="1.5"
            />
            <ellipse 
              :cx="note.x + 8" 
              :cy="note.y + 12.5" 
              :rx="7" 
              :ry="5"
              fill="#333"
            />
            <line 
              v-if="note.ledgerLines && note.ledgerLines.top > 0"
              v-for="i in note.ledgerLines.top"
              :key="'top-' + i"
              x1="note.x" 
              :y1="note.y - 15 - (i * 10)"
              x2="note.x + 16" 
              :y2="note.y - 15 - (i * 10)"
              stroke="#333" 
              stroke-width="1"
            />
            <line 
              v-if="note.ledgerLines && note.ledgerLines.bottom > 0"
              v-for="i in note.ledgerLines.bottom"
              :key="'bottom-' + i"
              x1="note.x" 
              :y1="note.y + 40 + (i * 10)"
              x2="note.x + 16" 
              :y2="note.y + 40 + (i * 10)"
              stroke="#333" 
              stroke-width="1"
            />
          </g>
        </g>
      </svg>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  notes: {
    type: Array,
    default: () => []
  },
  showStaff: {
    type: Boolean,
    default: true
  }
})

const notePositions = {
  'C': { line: 0, offset: 0 },
  'D': { line: 0, offset: 10 },
  'E': { line: 1, offset: 0 },
  'F': { line: 1, offset: 10 },
  'G': { line: 2, offset: 0 },
  'A': { line: 2, offset: 10 },
  'B': { line: 3, offset: 0 }
}

const displayedNotes = computed(() => {
  if (!props.notes || props.notes.length === 0) return []
  
  const baseX = 80
  const spacing = 50
  
  return props.notes.map((note, index) => {
    const noteName = note.note
    const octave = note.octave
    const baseNote = noteName.replace('#', '')
    const isSharp = noteName.includes('#')
    
    const position = notePositions[baseNote]
    if (!position) return null
    
    let line = position.line + (octave - 4) * 7
    let offset = position.offset
    
    if (isSharp) {
      offset += 5
    }
    
    const y = 50 - (line * 5) + (offset / 2)
    const x = baseX + (index * spacing)
    
    const stemDirection = y > 50 ? 'down' : 'up'
    
    let ledgerLines = { top: 0, bottom: 0 }
    const topLines = Math.floor((50 - y) / 10)
    const bottomLines = Math.floor((y - 80) / 10)
    
    if (topLines > 0) {
      ledgerLines.top = topLines
    }
    if (bottomLines > 0) {
      ledgerLines.bottom = bottomLines
    }
    
    return {
      x,
      y,
      stem: true,
      stemDirection,
      ledgerLines: ledgerLines.top > 0 || ledgerLines.bottom > 0 ? ledgerLines : null
    }
  }).filter(n => n !== null)
})
</script>

<style scoped>
.staff-display {
  width: 100%;
  padding: 20px 0;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.staff-container {
  width: 100%;
  overflow-x: auto;
}

.staff-svg {
  width: 100%;
  height: auto;
  min-height: 120px;
}

.staff-lines line {
  stroke: #333;
  stroke-width: 1;
}

.clef text {
  font-family: 'Times New Roman', serif;
  font-size: 50px;
  fill: #333;
}

.notes ellipse {
  fill: #333;
}

.notes line {
  stroke: #333;
  stroke-width: 1.5;
}

@media (max-width: 768px) {
  .staff-svg {
    min-height: 100px;
  }
  
  .clef text {
    font-size: 40px;
  }
}
</style>
