export const UI_SOUND_SRC = {
  contactBell: '/sounds/contact-bell.mp3',
  twinkle: '/sounds/twinkle.mp3',
  chomp: '/sounds/chomp.mp3',
}

const audioBySrc = new Map()

export function playUiSound(src) {
  if (typeof window === 'undefined') return

  try {
    let audio = audioBySrc.get(src)
    if (!audio) {
      audio = new Audio(src)
      audio.preload = 'auto'
      audioBySrc.set(src, audio)
    }
    audio.currentTime = 0
    void audio.play().catch(() => {})
  } catch {
    return
  }
}

export function playContactBellSound() {
  playUiSound(UI_SOUND_SRC.contactBell)
}

export function playTwinkleSound() {
  playUiSound(UI_SOUND_SRC.twinkle)
}

export function playChompSound() {
  playUiSound(UI_SOUND_SRC.chomp)
}

export function resetUiSoundsForTests() {
  audioBySrc.clear()
}
