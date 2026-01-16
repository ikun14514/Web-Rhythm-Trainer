<template>
  <div class="settings-panel">
    <div class="settings-grid">
      <div class="setting-group">
        <h3>音符范围</h3>
        <div class="note-range-selector">
          <label>
            起始音符:
            <select v-model="localNoteRange.start" @change="updateNoteRange">
              <option v-for="note in allNotes" :key="note" :value="note">{{ note }}</option>
            </select>
          </label>
          <label>
            结束音符:
            <select v-model="localNoteRange.end" @change="updateNoteRange">
              <option v-for="note in allNotes" :key="note" :value="note">{{ note }}</option>
            </select>
          </label>
        </div>
      </div>
      
      <div class="setting-group">
        <h3>BPM(速度)</h3>
        <div class="bpm-control">
          <input 
            type="range" 
            v-model.number="localBpm.slider" 
            min="30" 
            max="180" 
            step="5"
            @input="updateBpmFromSlider"
          >
          <div class="bpm-display">
            <input 
              type="number" 
              v-model.number="localBpm.input" 
              min="30" 
              max="180"
              @change="updateBpmFromInput"
            >
            <span>BPM</span>
          </div>
        </div>
      </div>
      
      <div class="setting-group">
        <h3>练习模式选择</h3>
        <div class="practice-modes">
          <button 
            v-for="mode in practiceModes" 
            :key="mode.value"
            :class="['mode-btn', { active: localPracticeMode === mode.value }]"
            @click="updatePracticeMode(mode.value)"
          >
            {{ mode.label }}
          </button>
        </div>
      </div>
      
      <div class="setting-group">
        <h3>输入方式选择</h3>
        <div class="input-modes">
          <button 
            v-for="mode in inputModes" 
            :key="mode.value"
            :class="['mode-btn', { active: localInputMode === mode.value }]"
            @click="updateInputMode(mode.value)"
          >
            {{ mode.label }}
          </button>
        </div>
      </div>
      
      <div class="setting-group">
        <h3>显示设置</h3>
        <div class="display-settings">
          <label class="toggle-label">
            <input type="checkbox" v-model="localShowKeyboard" @change="updateShowKeyboard">
            <span>显示虚拟键盘</span>
          </label>
          <label class="toggle-label">
            <input type="checkbox" v-model="localShowStaff" @change="updateShowStaff">
            <span>显示五线谱</span>
          </label>
          <label class="toggle-label">
            <input type="checkbox" v-model="localShowBlackKeys" @change="updateShowBlackKeys">
            <span>显示黑键</span>
          </label>
        </div>
      </div>
    </div>
    
    <div class="action-buttons">
      <button 
        v-if="!isPracticing"
        class="start-btn"
        @click="togglePractice"
      >
        开始练习
      </button>
      <div v-else class="control-buttons">
        <button 
          v-if="!isPaused"
          class="pause-btn"
          @click="pausePractice"
        >
          暂停
        </button>
        <button 
          v-if="isPaused"
          class="resume-btn"
          @click="resumePractice"
        >
          继续
        </button>
        <button 
          class="stop-btn"
          @click="stopPractice"
        >
          停止
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  noteRange: {
    type: Object,
    required: true
  },
  bpm: {
    type: Object,
    required: true
  },
  practiceMode: {
    type: String,
    required: true
  },
  inputMode: {
    type: String,
    required: true
  },
  showKeyboard: {
    type: Boolean,
    required: true
  },
  showStaff: {
    type: Boolean,
    required: true
  },
  showBlackKeys: {
    type: Boolean,
    required: true
  },
  isPracticing: {
    type: Boolean,
    default: false
  },
  isPaused: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits([
  'update:note-range',
  'update:bpm',
  'update:practice-mode',
  'update:input-mode',
  'update:show-keyboard',
  'update:show-staff',
  'update:show-black-keys',
  'start-practice',
  'stop-practice',
  'pause-practice',
  'resume-practice'
])

const localNoteRange = ref({ ...props.noteRange })
const localBpm = ref({ ...props.bpm })
const localPracticeMode = ref(props.practiceMode)
const localInputMode = ref(props.inputMode)
const localShowKeyboard = ref(props.showKeyboard)
const localShowStaff = ref(props.showStaff)
const localShowBlackKeys = ref(props.showBlackKeys)

const allNotes = computed(() => {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const octaves = [2, 3, 4, 5, 6]
  const result = []
  
  octaves.forEach(octave => {
    notes.forEach(note => {
      result.push(`${note}${octave}`)
    })
  })
  
  return result
})

const practiceModes = [
  { value: 'single', label: '单音识别' },
  { value: 'interval', label: '音程识别' },
  { value: 'melodic', label: '旋律音程' },
  { value: 'chord', label: '和弦识别' },
  { value: 'scale', label: '音阶识别' }
]

const inputModes = [
  { value: 'keyboard', label: '虚拟键盘' },
  { value: 'microphone', label: '麦克风（目前仅支持单音）' },
  { value: 'midi', label: 'MIDI' }
]

const updateNoteRange = () => {
  emit('update:note-range', { ...localNoteRange.value })
}

const updateBpmFromSlider = () => {
  localBpm.value.slider = Math.min(Math.max(localBpm.value.slider, 30), 180)
  localBpm.value.input = localBpm.value.slider
  emit('update:bpm', { ...localBpm.value })
}

const updateBpmFromInput = () => {
  localBpm.value.input = Math.min(Math.max(localBpm.value.input, 30), 180)
  localBpm.value.slider = localBpm.value.input
  emit('update:bpm', { ...localBpm.value })
}

const updatePracticeMode = (mode) => {
  localPracticeMode.value = mode
  emit('update:practice-mode', mode)
}

const updateInputMode = (mode) => {
  localInputMode.value = mode
  emit('update:input-mode', mode)
}

const updateShowKeyboard = () => {
  emit('update:show-keyboard', localShowKeyboard.value)
}

const updateShowStaff = () => {
  emit('update:show-staff', localShowStaff.value)
}

const updateShowBlackKeys = () => {
  emit('update:show-black-keys', localShowBlackKeys.value)
}

const togglePractice = () => {
  if (props.isPracticing) {
    emit('stop-practice')
  } else {
    emit('start-practice')
  }
}

const pausePractice = () => {
  emit('pause-practice')
}

const resumePractice = () => {
  emit('resume-practice')
}

const stopPractice = () => {
  emit('stop-practice')
}
</script>

<style scoped>
.settings-panel {
  width: 100%;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.setting-group {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.setting-group h3 {
  margin: 0 0 12px 0;
  font-size: 1rem;
  color: #495057;
  display: flex;
  align-items: center;
  gap: 8px;
}

.note-range-selector {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.note-range-selector label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  color: #6c757d;
}

.note-range-selector select {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  background: white;
  font-size: 0.9rem;
}

.bpm-control {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.bpm-control input[type="range"] {
  width: 100%;
  cursor: pointer;
}

.bpm-display {
  display: flex;
  align-items: center;
  gap: 8px;
}

.bpm-display input[type="number"] {
  width: 70px;
  padding: 6px 10px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 1rem;
  text-align: center;
}

.bpm-display span {
  font-weight: bold;
  color: #495057;
}

.practice-modes,
.input-modes {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mode-btn {
  padding: 10px 15px;
  border: 2px solid #dee2e6;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s ease;
  text-align: left;
}

.mode-btn:hover {
  border-color: #667eea;
  background: #f8f9fa;
}

.mode-btn.active {
  border-color: #667eea;
  background: #667eea;
  color: white;
}

.display-settings {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  font-size: 0.9rem;
  color: #6c757d;
}

.toggle-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.tuning-control {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tuning-control label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  color: #6c757d;
}

.tuning-control input[type="number"] {
  width: 80px;
  padding: 6px 10px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 0.9rem;
  text-align: center;
}

.action-buttons {
  display: flex;
  justify-content: center;
  padding-top: 10px;
  border-top: 1px solid #e9ecef;
}

.control-buttons {
  display: flex;
  gap: 15px;
  justify-content: center;
}

.start-btn,
.pause-btn,
.resume-btn,
.stop-btn {
  padding: 15px 40px;
  font-size: 1.1rem;
  font-weight: bold;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  color: white;
}

.start-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.start-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
}

.pause-btn {
  background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%);
  box-shadow: 0 4px 15px rgba(255, 152, 0, 0.4);
}

.pause-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(255, 152, 0, 0.5);
}

.resume-btn {
  background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
  box-shadow: 0 4px 15px rgba(76, 175, 80, 0.4);
}

.resume-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(76, 175, 80, 0.5);
}

.stop-btn {
  background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%);
  box-shadow: 0 4px 15px rgba(244, 67, 54, 0.4);
}

.stop-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(244, 67, 54, 0.5);
}

@media (max-width: 768px) {
  .settings-grid {
    grid-template-columns: 1fr;
    gap: 15px;
  }
  
  .setting-group {
    padding: 12px;
  }
  
  .setting-group h3 {
    font-size: 0.9rem;
  }
  
  .start-btn {
    padding: 12px 30px;
    font-size: 1rem;
  }
}
</style>
