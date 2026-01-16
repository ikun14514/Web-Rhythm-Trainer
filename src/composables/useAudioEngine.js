import { ref } from 'vue'

export function useAudioEngine() {
  const audioContext = ref(null)
  const masterGain = ref(null)
  const audioBuffers = ref({})
  let schedulerInterval = null
  let nextNoteTime = 0
  let beatCount = 0
  let bpm = 60
  let lookahead = 25.0
  let scheduleAheadTime = 0.1
  let onBeatCallback = null
  
  const noteFrequencies = {
    'C': 261.63, 'C#': 277.18, 'D': 293.66, 'D#': 311.13,
    'E': 329.63, 'F': 349.23, 'F#': 369.99, 'G': 392.00,
    'G#': 415.30, 'A': 440.00, 'A#': 466.16, 'B': 493.88
  }
  
  const init = async () => {
    if (audioContext.value) return
    
    audioContext.value = new (window.AudioContext || window.webkitAudioContext)()
    masterGain.value = audioContext.value.createGain()
    masterGain.value.connect(audioContext.value.destination)
    masterGain.value.gain.value = 0.5
    
    await loadAudioFiles()
  }
  
  const loadAudioFiles = async () => {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    const octaves = [1, 2, 3, 4, 5]
    
    for (const octave of octaves) {
      for (const note of notes) {
        let fileName
        const lowerNote = note.toLowerCase()
        
        if (note.includes('#')) {
          fileName = `${lowerNote}${octave}.mp3`
        } else {
          fileName = `${lowerNote}${octave}.mp3`
        }
        
        try {
          const response = await fetch(`/sounds/${fileName}`)
          const arrayBuffer = await response.arrayBuffer()
          const audioBuffer = await audioContext.value.decodeAudioData(arrayBuffer)
          audioBuffers.value[`${note}${octave}`] = audioBuffer
        } catch (error) {
          console.warn(`Failed to load audio file: ${fileName}`, error)
        }
      }
    }
  }
  
  const getFrequency = (note, octave) => {
    const baseFreq = noteFrequencies[note]
    const octaveMultiplier = Math.pow(2, octave - 4)
    return baseFreq * octaveMultiplier
  }
  
  const playNote = (note, octave, duration = 0.5, startTime = 0) => {
    if (!audioContext.value) return
    
    const buffer = audioBuffers.value[`${note}${octave}`]
    if (!buffer) {
      console.warn(`Audio buffer not found for ${note}${octave}`)
      return
    }
    
    const source = audioContext.value.createBufferSource()
    source.buffer = buffer
    source.connect(masterGain.value)
    
    const actualStartTime = startTime || audioContext.value.currentTime
    
    if (duration > 0 && duration < buffer.duration) {
      source.start(actualStartTime, 0, duration)
    } else {
      source.start(actualStartTime)
    }
  }
  
  const playMetronome = (time) => {
    if (!audioContext.value) return
    
    const actualTime = time || audioContext.value.currentTime
    
    const oscillator = audioContext.value.createOscillator()
    const gainNode = audioContext.value.createGain()
    
    oscillator.type = 'sawtooth'
    oscillator.frequency.value = 1200
    
    gainNode.gain.setValueAtTime(0.25, actualTime)
    gainNode.gain.exponentialRampToValueAtTime(0.001, actualTime + 0.08)
    
    oscillator.connect(gainNode)
    gainNode.connect(masterGain.value)
    
    oscillator.start(actualTime)
    oscillator.stop(actualTime + 0.08)
  }
  
  const scheduleNote = (beatNumber, time) => {
    playMetronome(time)
    
    if (onBeatCallback) {
      setTimeout(() => {
        onBeatCallback(beatNumber)
      }, (time - audioContext.value.currentTime) * 1000)
    }
  }
  
  const nextNote = () => {
    const secondsPerBeat = 60.0 / bpm
    nextNoteTime += secondsPerBeat
    beatCount++
    if (beatCount > 4) {
      beatCount = 1
    }
  }
  
  const scheduler = () => {
    while (nextNoteTime < audioContext.value.currentTime + scheduleAheadTime) {
      scheduleNote(beatCount, nextNoteTime)
      nextNote()
    }
  }
  
  const startMetronome = (bpmValue, callback) => {
    bpm = bpmValue
    onBeatCallback = callback
    beatCount = 1
    nextNoteTime = audioContext.value.currentTime + 0.1
    
    if (schedulerInterval) {
      clearInterval(schedulerInterval)
    }
    
    schedulerInterval = setInterval(scheduler, lookahead)
  }
  
  const stopMetronome = () => {
    if (schedulerInterval) {
      clearInterval(schedulerInterval)
      schedulerInterval = null
    }
    onBeatCallback = null
    beatCount = 0
    nextNoteTime = 0
  }
  
  const pauseMetronome = () => {
    if (schedulerInterval) {
      clearInterval(schedulerInterval)
      schedulerInterval = null
    }
  }
  
  const resumeMetronome = () => {
    if (!schedulerInterval && audioContext.value) {
      nextNoteTime = audioContext.value.currentTime + 0.1
      schedulerInterval = setInterval(scheduler, lookahead)
    }
  }
  
  const stopAll = () => {
    stopMetronome()
    if (audioContext.value) {
      audioContext.value.close()
      audioContext.value = null
      masterGain.value = null
    }
  }
  
  return {
    init,
    playNote,
    playMetronome,
    startMetronome,
    stopMetronome,
    pauseMetronome,
    resumeMetronome,
    stopAll
  }
}
