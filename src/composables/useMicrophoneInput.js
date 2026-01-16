import { ref } from 'vue'

export function useMicrophoneInput() {
  const microphoneEnabled = ref(false)
  const audioContext = ref(null)
  const analyser = ref(null)
  const detectedPitch = ref(null)
  
  const noteFrequencies = {
    'C': 261.63, 'C#': 277.18, 'D': 293.66, 'D#': 311.13,
    'E': 329.63, 'F': 349.23, 'F#': 369.99, 'G': 392.00,
    'G#': 415.30, 'A': 440.00, 'A#': 466.16, 'B': 493.88
  }
  
  const frequencyToNote = (frequency) => {
    const A4 = 440
    const C0 = A4 * Math.pow(2, -4.75)
    const halfSteps = Math.round(12 * Math.log2(frequency / C0))
    const octave = Math.floor(halfSteps / 12)
    const noteIndex = halfSteps % 12
    
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    
    return {
      note: noteNames[noteIndex],
      octave,
      fullName: `${noteNames[noteIndex]}${octave}`,
      frequency
    }
  }
  
  const autoCorrelate = (buffer, sampleRate) => {
    const SIZE = buffer.length
    let rms = 0
    
    for (let i = 0; i < SIZE; i++) {
      rms += buffer[i] * buffer[i]
    }
    rms = Math.sqrt(rms / SIZE)
    
    if (rms < 0.01) return -1
    
    let r1 = 0
    let r2 = SIZE - 1
    const threshold = 0.2
    
    for (let i = 0; i < SIZE / 2; i++) {
      if (Math.abs(buffer[i]) < threshold) {
        r1 = i
        break
      }
    }
    
    for (let i = 1; i < SIZE / 2; i++) {
      if (Math.abs(buffer[SIZE - i]) < threshold) {
        r2 = SIZE - i
        break
      }
    }
    
    const buf2 = buffer.slice(r1, r2)
    const c = new Array(buf2.length).fill(0)
    
    for (let i = 0; i < buf2.length; i++) {
      for (let j = 0; j < buf2.length - i; j++) {
        c[i] = c[i] + buf2[j] * buf2[j + i]
      }
    }
    
    let d = 0
    while (c[d] > c[d + 1]) d++
    
    let maxVal = -1
    let maxPos = -1
    
    for (let i = d; i < buf2.length; i++) {
      if (c[i] > maxVal) {
        maxVal = c[i]
        maxPos = i
      }
    }
    
    let T0 = maxPos
    
    const x1 = c[T0 - 1]
    const x2 = c[T0]
    const x3 = c[T0 + 1]
    const a = (x1 + x3 - 2 * x2) / 2
    const b = (x3 - x1) / 2
    
    if (a) T0 = T0 - b / (2 * a)
    
    return sampleRate / T0
  }
  
  const startMicrophone = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('浏览器不支持麦克风访问')
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      audioContext.value = new (window.AudioContext || window.webkitAudioContext)()
      const source = audioContext.value.createMediaStreamSource(stream)
      analyser.value = audioContext.value.createAnalyser()
      analyser.value.fftSize = 2048
      
      source.connect(analyser.value)
      
      const bufferLength = analyser.value.fftSize
      const buffer = new Float32Array(bufferLength)
      
      const detectPitch = () => {
        analyser.value.getFloatTimeDomainData(buffer)
        const frequency = autoCorrelate(buffer, audioContext.value.sampleRate)
        
        if (frequency !== -1 && frequency > 50 && frequency < 2000) {
          const noteInfo = frequencyToNote(frequency)
          detectedPitch.value = noteInfo
          
          window.dispatchEvent(new CustomEvent('microphone-pitch', { 
            detail: noteInfo 
          }))
        }
        
        if (microphoneEnabled.value) {
          requestAnimationFrame(detectPitch)
        }
      }
      
      microphoneEnabled.value = true
      detectPitch()
      
    } catch (error) {
      console.error('麦克风访问失败:', error)
      throw error
    }
  }
  
  const stopMicrophone = () => {
    microphoneEnabled.value = false
    detectedPitch.value = null
    
    if (audioContext.value) {
      audioContext.value.close()
      audioContext.value = null
    }
  }
  
  return {
    microphoneEnabled,
    detectedPitch,
    startMicrophone,
    stopMicrophone
  }
}
