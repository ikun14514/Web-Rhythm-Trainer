import { ref, onMounted, onUnmounted } from 'vue'

export function useMIDIInput() {
  const midiEnabled = ref(false)
  const midiInputs = ref([])
  const currentMIDIInput = ref(null)
  
  const noteToName = {
    0: 'C', 1: 'C#', 2: 'D', 3: 'D#', 4: 'E', 5: 'F',
    6: 'F#', 7: 'G', 8: 'G#', 9: 'A', 10: 'A#', 11: 'B'
  }
  
  const getNoteFromMIDI = (midiNote) => {
    const note = midiNote % 12
    const octave = Math.floor(midiNote / 12) - 1
    return {
      note: noteToName[note],
      octave,
      fullName: `${noteToName[note]}${octave}`
    }
  }
  
  const handleMIDIMessage = (message) => {
    const [command, note, velocity] = message.data
    
    if (command === 144 && velocity > 0) {
      const noteInfo = getNoteFromMIDI(note)
      window.dispatchEvent(new CustomEvent('midi-note-on', { 
        detail: noteInfo 
      }))
    }
  }
  
  const connectMIDI = async () => {
    if (!navigator.requestMIDIAccess) {
      throw new Error('浏览器不支持MIDI')
    }
    
    try {
      const midiAccess = await navigator.requestMIDIAccess()
      
      midiAccess.inputs.forEach(input => {
        midiInputs.value.push(input)
      })
      
      midiAccess.onstatechange = (event) => {
        if (event.port.type === 'input') {
          if (event.port.state === 'connected') {
            if (!midiInputs.value.find(i => i.id === event.port.id)) {
              midiInputs.value.push(event.port)
            }
          } else {
            midiInputs.value = midiInputs.value.filter(i => i.id !== event.port.id)
          }
        }
      }
      
      if (midiInputs.value.length > 0) {
        currentMIDIInput.value = midiInputs.value[0]
        currentMIDIInput.value.onmidimessage = handleMIDIMessage
        midiEnabled.value = true
      }
      
    } catch (error) {
      console.error('MIDI连接失败:', error)
      throw error
    }
  }
  
  const disconnectMIDI = () => {
    if (currentMIDIInput.value) {
      currentMIDIInput.value.onmidimessage = null
      currentMIDIInput.value = null
    }
    midiEnabled.value = false
    midiInputs.value = []
  }
  
  return {
    midiEnabled,
    midiInputs,
    connectMIDI,
    disconnectMIDI
  }
}
