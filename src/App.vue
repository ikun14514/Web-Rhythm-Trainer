<template>
  <div class="app">
    <header class="header">
      <h1>音感练习器</h1>
      <p class="subtitle">提升你的绝对音感和音程识别能力</p>
    </header>
    
    <main class="main-content">
      <div class="feedback-section" :class="{ 'correct': feedback === 'correct', 'wrong': feedback === 'wrong' }">
        <div v-if="feedback" class="feedback-message">
          {{ feedback === 'correct' ? '正确！' : '错误！' }}
        </div>
        <div v-if="correctAnswer" class="correct-answer">
          正确答案: {{ correctAnswer }}
        </div>
        <div v-if="userAnswer && !feedback" class="user-answer">
          你的答案: {{ userAnswer }}
        </div>
      </div>
      
      <div class="staff-section" v-if="showStaff">
        <StaffDisplay 
          :notes="currentQuestion ? currentQuestion.notes : []"
          :show-staff="showStaff"
        />
      </div>
      
      <div class="keyboard-section">
        <PianoKeyboard 
          ref="keyboardRef"
          :notes="visibleNotes"
          :input-mode="inputMode"
          :is-practicing="isPracticing"
          :can-input="canInput"
          @note-clicked="handleNoteInput"
        />
      </div>
      
      <div class="settings-section">
        <SettingsPanel
          :note-range="noteRange"
          :bpm="bpm"
          :practice-mode="practiceMode"
          :input-mode="inputMode"
          :show-keyboard="showKeyboard"
          :show-staff="showStaff"
          :show-black-keys="showBlackKeys"
          :is-practicing="isPracticing"
          :is-paused="isPaused"
          @update:note-range="noteRange = $event"
          @update:bpm="bpm = $event"
          @update:practice-mode="practiceMode = $event"
          @update:input-mode="inputMode = $event"
          @update:show-keyboard="showKeyboard = $event"
          @update:show-staff="showStaff = $event"
          @update:show-black-keys="showBlackKeys = $event"
          @start-practice="startPractice"
          @stop-practice="stopPractice"
          @pause-practice="pausePractice"
          @resume-practice="resumePractice"
        />
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import PianoKeyboard from './components/PianoKeyboard.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import StaffDisplay from './components/StaffDisplay.vue'
import { useAudioEngine } from './composables/useAudioEngine'
import { useMIDIInput } from './composables/useMIDIInput'
import { useMicrophoneInput } from './composables/useMicrophoneInput'

const keyboardRef = ref(null)
const noteRange = ref({ start: 'C3', end: 'C5' })
const bpm = ref({ slider: 60, input: 60 })
const practiceMode = ref('single')
const inputMode = ref('keyboard')
const showKeyboard = ref(true)
const showStaff = ref(false)
const showBlackKeys = ref(true)
const isPracticing = ref(false)
const isPaused = ref(false)
const canInput = ref(false)
const feedback = ref(null)
const correctAnswer = ref(null)
const currentQuestion = ref(null)
const userAnswer = ref(null)
const userAnswers = ref([])

const audioEngine = useAudioEngine()
const { midiEnabled, connectMIDI, disconnectMIDI } = useMIDIInput()
const { microphoneEnabled, startMicrophone, stopMicrophone, detectedPitch } = useMicrophoneInput()

const visibleNotes = computed(() => {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const octaves = [3, 4, 5]
  const result = []
  
  octaves.forEach(octave => {
    notes.forEach(note => {
      result.push({ note, octave, fullName: `${note}${octave}` })
    })
  })
  
  return result
})

let practiceInterval = null
let beatCount = 0

const startPractice = async () => {
  try {
    await audioEngine.init()
    
    if (inputMode.value === 'midi') {
      await connectMIDI()
    } else if (inputMode.value === 'microphone') {
      await startMicrophone()
    }
    
    isPracticing.value = true
    isPaused.value = false
    beatCount = 0
    feedback.value = null
    correctAnswer.value = null
    userAnswer.value = null
    
    audioEngine.startMetronome(bpm.value.slider, handleBeat)
    
  } catch (error) {
    console.error('启动练习失败:', error)
    alert('启动练习失败，请检查音频设备设置')
  }
}

const pausePractice = () => {
  if (!isPracticing.value) return
  
  isPaused.value = true
  canInput.value = false
  audioEngine.pauseMetronome()
}

const resumePractice = () => {
  if (!isPracticing.value || !isPaused.value) return
  
  isPaused.value = false
  audioEngine.resumeMetronome()
}

const stopPractice = () => {
  audioEngine.stopMetronome()
  
  isPracticing.value = false
  isPaused.value = false
  canInput.value = false
  feedback.value = null
  correctAnswer.value = null
  userAnswer.value = null
  userAnswers.value = []
  beatCount = 0
  
  if (inputMode.value === 'midi') {
    disconnectMIDI()
  } else if (inputMode.value === 'microphone') {
    stopMicrophone()
  }
}

const handleBeat = (beatNumber) => {
  beatCount = beatNumber
  
  if (beatCount === 1) {
    generateQuestion()
    playQuestion()
    canInput.value = false
  } else if (beatCount === 2) {
    canInput.value = true
  } else if (beatCount === 4) {
    canInput.value = false
    revealAnswer()
  }
}

const generateQuestion = () => {
  const notes = visibleNotes.value
  const startIndex = notes.findIndex(n => n.fullName === noteRange.value.start)
  const endIndex = notes.findIndex(n => n.fullName === noteRange.value.end)
  const availableNotes = notes.slice(startIndex, endIndex + 1)
  
  if (practiceMode.value === 'single') {
    const randomNote = availableNotes[Math.floor(Math.random() * availableNotes.length)]
    currentQuestion.value = { type: 'single', notes: [randomNote] }
  } else if (practiceMode.value === 'interval') {
    const index1 = Math.floor(Math.random() * (availableNotes.length - 1))
    const index2 = index1 + Math.floor(Math.random() * 12) + 1
    currentQuestion.value = { 
      type: 'interval', 
      notes: [availableNotes[index1], availableNotes[index2]] 
    }
  } else if (practiceMode.value === 'melodic') {
    const index1 = Math.floor(Math.random() * (availableNotes.length - 1))
    const index2 = index1 + Math.floor(Math.random() * 12) + 1
    currentQuestion.value = { 
      type: 'melodic', 
      notes: [availableNotes[index1], availableNotes[index2]] 
    }
  } else if (practiceMode.value === 'chord') {
    const chordTypes = ['major', 'minor', 'diminished', 'augmented']
    const chordType = chordTypes[Math.floor(Math.random() * chordTypes.length)]
    const rootIndex = Math.floor(Math.random() * (availableNotes.length - 8))
    const rootNote = availableNotes[rootIndex]
    
    const chordNotes = [rootNote]
    const intervals = getChordIntervals(chordType)
    intervals.forEach(interval => {
      const noteIndex = rootIndex + interval
      if (noteIndex < availableNotes.length) {
        chordNotes.push(availableNotes[noteIndex])
      }
    })
    
    currentQuestion.value = { type: 'chord', notes: chordNotes, chordType }
  } else if (practiceMode.value === 'scale') {
    const scaleTypes = ['major', 'minor', 'pentatonic', 'blues']
    const scaleType = scaleTypes[Math.floor(Math.random() * scaleTypes.length)]
    const rootIndex = Math.floor(Math.random() * (availableNotes.length - 12))
    const rootNote = availableNotes[rootIndex]
    
    const scaleNotes = [rootNote]
    const intervals = getScaleIntervals(scaleType)
    intervals.forEach(interval => {
      const noteIndex = rootIndex + interval
      if (noteIndex < availableNotes.length) {
        scaleNotes.push(availableNotes[noteIndex])
      }
    })
    
    currentQuestion.value = { type: 'scale', notes: scaleNotes, scaleType }
  }
}

const getChordIntervals = (chordType) => {
  const chordIntervals = {
    'major': [4, 7],
    'minor': [3, 7],
    'diminished': [3, 6],
    'augmented': [4, 8]
  }
  return chordIntervals[chordType] || [4, 7]
}

const getScaleIntervals = (scaleType) => {
  const scaleIntervals = {
    'major': [2, 4, 5, 7, 9, 11],
    'minor': [2, 3, 5, 7, 8, 10],
    'pentatonic': [2, 4, 7, 9],
    'blues': [3, 5, 6, 7, 10]
  }
  return scaleIntervals[scaleType] || [2, 4, 5, 7, 9, 11]
}

const playQuestion = () => {
  if (!currentQuestion.value) return
  
  const beatDuration = 60 / bpm.value.slider
  
  if (currentQuestion.value.type === 'single') {
    const note = currentQuestion.value.notes[0]
    audioEngine.playNote(note.note, note.octave, beatDuration)
  } else if (currentQuestion.value.type === 'interval') {
    const [note1, note2] = currentQuestion.value.notes
    audioEngine.playNote(note1.note, note1.octave, beatDuration)
    audioEngine.playNote(note2.note, note2.octave, beatDuration)
  } else if (currentQuestion.value.type === 'melodic') {
    const [note1, note2] = currentQuestion.value.notes
    audioEngine.playNote(note1.note, note1.octave, beatDuration)
    setTimeout(() => {
      audioEngine.playNote(note2.note, note2.octave, beatDuration)
    }, beatDuration * 1000)
  } else if (currentQuestion.value.type === 'chord') {
    currentQuestion.value.notes.forEach(note => {
      audioEngine.playNote(note.note, note.octave, beatDuration)
    })
  } else if (currentQuestion.value.type === 'scale') {
    currentQuestion.value.notes.forEach((note, index) => {
      setTimeout(() => {
        audioEngine.playNote(note.note, note.octave, beatDuration * 0.5)
      }, index * beatDuration * 1000 * 0.5)
    })
  }
}

const handleNoteInput = (note) => {
  if (!canInput.value || !currentQuestion.value) return
  
  if (practiceMode.value === 'single') {
    userAnswer.value = note.fullName
    let isCorrect = note.fullName === currentQuestion.value.notes[0].fullName
    
    if (isCorrect) {
      feedback.value = 'correct'
    } else {
      feedback.value = 'wrong'
    }
  } else if (practiceMode.value === 'interval' || practiceMode.value === 'melodic') {
    userAnswer.value = note.fullName
    let isCorrect = currentQuestion.value.notes.some(n => n.fullName === note.fullName)
    
    if (isCorrect) {
      feedback.value = 'correct'
    } else {
      feedback.value = 'wrong'
    }
  } else if (practiceMode.value === 'chord' || practiceMode.value === 'scale') {
    if (!userAnswers.value.includes(note.fullName)) {
      userAnswers.value.push(note.fullName)
    }
    
    const allCorrect = currentQuestion.value.notes.every(n => 
      userAnswers.value.includes(n.fullName)
    )
    
    if (userAnswers.value.length === currentQuestion.value.notes.length) {
      if (allCorrect) {
        feedback.value = 'correct'
      } else {
        feedback.value = 'wrong'
      }
    }
  }
  
  if (feedback.value) {
    setTimeout(() => {
      feedback.value = null
      userAnswers.value = []
    }, 1000)
  }
}

const revealAnswer = () => {
  if (!currentQuestion.value) return
  
  if (currentQuestion.value.type === 'single') {
    correctAnswer.value = currentQuestion.value.notes[0].fullName
  } else if (currentQuestion.value.type === 'chord') {
    const chordTypeNames = {
      'major': '大三和弦',
      'minor': '小三和弦',
      'diminished': '减三和弦',
      'augmented': '增三和弦'
    }
    correctAnswer.value = `${currentQuestion.value.notes.map(n => n.fullName).join(' - ')} (${chordTypeNames[currentQuestion.value.chordType]})`
  } else if (currentQuestion.value.type === 'scale') {
    const scaleTypeNames = {
      'major': '大调音阶',
      'minor': '小调音阶',
      'pentatonic': '五声音阶',
      'blues': '布鲁斯音阶'
    }
    correctAnswer.value = `${currentQuestion.value.notes.map(n => n.fullName).join(' - ')} (${scaleTypeNames[currentQuestion.value.scaleType]})`
  } else {
    correctAnswer.value = currentQuestion.value.notes.map(n => n.fullName).join(' - ')
  }
}

onMounted(() => {
  if (midiEnabled.value) {
    connectMIDI()
  }
})

watch(bpm, (newBpm) => {
  if (isPracticing.value && !isPaused.value) {
    audioEngine.stopMetronome()
    audioEngine.startMetronome(newBpm.slider, handleBeat)
  }
}, { deep: true })

onUnmounted(() => {
  stopPractice()
})
</script>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: url('https://edgeoneimg.cdn.sn/i/69637b0710a72_1768127239.webp');
  background-size: cover;
  background-position: center;
  background-attachment: fixed;
}

.header {
  text-align: center;
  padding: 20px;
  color: white;
}

.header h1 {
  font-size: 2.5rem;
  margin-bottom: 10px;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

.subtitle {
  font-size: 1.1rem;
  opacity: 0.9;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 20px;
  gap: 20px;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}

.keyboard-section {
  background: rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.settings-section {
  background: rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.feedback-section {
  background: rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 16px;
  padding: 30px;
  text-align: center;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
}

.feedback-section.correct {
  background: #4CAF50;
  color: white;
  animation: pulse-green 0.5s ease;
}

.feedback-section.wrong {
  background: #f44336;
  color: white;
  animation: pulse-red 0.5s ease;
}

.feedback-message {
  font-size: 2rem;
  font-weight: bold;
  margin-bottom: 10px;
}

.correct-answer {
  font-size: 1.5rem;
  opacity: 0.9;
}

.user-answer {
  font-size: 1.3rem;
  color: #667eea;
  margin-bottom: 10px;
  font-weight: 500;
}

.staff-section {
  background: rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

@keyframes pulse-green {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

@keyframes pulse-red {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

@media (max-width: 768px) {
  .header h1 {
    font-size: 1.8rem;
  }
  
  .subtitle {
    font-size: 0.9rem;
  }
  
  .main-content {
    padding: 10px;
    gap: 15px;
  }
  
  .keyboard-section,
  .settings-section,
  .feedback-section {
    padding: 15px;
  }
  
  .feedback-message {
    font-size: 1.5rem;
  }
  
  .correct-answer {
    font-size: 1.2rem;
  }
}
</style>
