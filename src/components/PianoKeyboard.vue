<template>
  <div class="piano-keyboard" v-if="showKeyboard">
    <div class="keyboard-container">
      <div 
        v-for="note in notes" 
        :key="note.fullName"
        v-show="!note.note.includes('#') || showBlackKeys"
        :class="['key', note.note.includes('#') ? 'black-key' : 'white-key', { 
          'active': activeNote === note.fullName,
          'disabled': !canInput || !isPracticing
        }]"
        :style="getKeyStyle(note)"
        @click="handleClick(note)"
      >
        <span v-if="!note.note.includes('#')" class="key-label">{{ note.fullName }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  notes: {
    type: Array,
    required: true
  },
  inputMode: {
    type: String,
    default: 'keyboard'
  },
  isPracticing: {
    type: Boolean,
    default: false
  },
  canInput: {
    type: Boolean,
    default: false
  },
  showBlackKeys: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['note-clicked'])

const activeNote = ref(null)
const showKeyboard = ref(true)

const getKeyStyle = (note) => {
  if (note.note.includes('#')) {
    const whiteNotes = props.notes.filter(n => !n.note.includes('#'))
    const whiteKeyIndex = whiteNotes.findIndex(n => n.octave === note.octave && n.note === note.note.replace('#', ''))
    
    if (whiteKeyIndex >= 0 && whiteKeyIndex < whiteNotes.length - 1) {
      const leftPercent = ((whiteKeyIndex + 1) * 100 / whiteNotes.length) - 1.5
      return {
        left: `${leftPercent}%`
      }
    }
  }
  return {}
}

const handleClick = (note) => {
  if (!props.canInput || !props.isPracticing) return
  
  activeNote.value = note.fullName
  emit('note-clicked', note)
  
  setTimeout(() => {
    activeNote.value = null
  }, 200)
}

const handleMIDINote = (event) => {
  if (props.inputMode !== 'midi') return
  if (!props.canInput || !props.isPracticing) return
  
  const note = props.notes.find(n => n.fullName === event.detail.fullName)
  if (note) {
    activeNote.value = note.fullName
    emit('note-clicked', note)
    
    setTimeout(() => {
      activeNote.value = null
    }, 200)
  }
}

const handleMicrophonePitch = (event) => {
  if (props.inputMode !== 'microphone') return
  if (!props.canInput || !props.isPracticing) return
  
  const note = props.notes.find(n => n.fullName === event.detail.fullName)
  if (note) {
    activeNote.value = note.fullName
    emit('note-clicked', note)
    
    setTimeout(() => {
      activeNote.value = null
    }, 200)
  }
}

const handleKeyPress = (event) => {
  if (props.inputMode !== 'keyboard') return
  if (!props.canInput || !props.isPracticing) return
  
  const keyMap = {
    'a': 'C', 'w': 'C#', 's': 'D', 'e': 'D#', 'd': 'E', 'f': 'F',
    't': 'F#', 'g': 'G', 'y': 'G#', 'h': 'A', 'u': 'A#', 'j': 'B',
    'k': 'C5', 'o': 'C#5', 'l': 'D5'
  }
  
  const noteName = keyMap[event.key.toLowerCase()]
  if (!noteName) return
  
  const note = props.notes.find(n => n.fullName === noteName)
  if (note) {
    activeNote.value = note.fullName
    emit('note-clicked', note)
    
    setTimeout(() => {
      activeNote.value = null
    }, 200)
  }
}

onMounted(() => {
  window.addEventListener('midi-note-on', handleMIDINote)
  window.addEventListener('microphone-pitch', handleMicrophonePitch)
  window.addEventListener('keydown', handleKeyPress)
})

onUnmounted(() => {
  window.removeEventListener('midi-note-on', handleMIDINote)
  window.removeEventListener('microphone-pitch', handleMicrophonePitch)
  window.removeEventListener('keydown', handleKeyPress)
})

defineExpose({
  showKeyboard
})
</script>

<style scoped>
.piano-keyboard {
  width: 100%;
  overflow-x: auto;
  padding: 10px 0;
}

.keyboard-container {
  position: relative;
  display: flex;
  height: 200px;
  min-width: 800px;
  background: #1a1a1a;
  border-radius: 8px;
  padding: 10px;
  box-shadow: inset 0 2px 10px rgba(0, 0, 0, 0.5);
}

.key {
  position: relative;
  cursor: pointer;
  transition: all 0.1s ease;
  user-select: none;
}

.white-key {
  flex: 1;
  height: 100%;
  background: linear-gradient(to bottom, #ffffff 0%, #f0f0f0 100%);
  border: 1px solid #ccc;
  border-radius: 0 0 6px 6px;
  margin: 0 1px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.white-key:hover:not(.disabled) {
  background: linear-gradient(to bottom, #f8f8f8 0%, #e8e8e8 100%);
}

.white-key.active:not(.disabled) {
  background: linear-gradient(to bottom, #e0e0e0 0%, #d0d0d0 100%);
  transform: translateY(2px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.white-key.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.black-key {
  position: absolute;
  width: 3%;
  height: 60%;
  background: linear-gradient(to bottom, #333 0%, #000 100%);
  border-radius: 0 0 4px 4px;
  z-index: 10;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.4);
}

.black-key:hover:not(.disabled) {
  background: linear-gradient(to bottom, #444 0%, #111 100%);
}

.black-key.active:not(.disabled) {
  background: linear-gradient(to bottom, #555 0%, #222 100%);
  transform: translateY(2px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
}

.black-key.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.key-label {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 12px;
  color: #666;
  font-weight: bold;
}

@media (max-width: 768px) {
  .keyboard-container {
    height: 150px;
    min-width: 600px;
  }
  
  .key-label {
    font-size: 10px;
    bottom: 5px;
  }
}
</style>
