function main() {
  const genRandomStr = () => Math.random().toString(36).slice(2, 7)

  logseq.Editor.registerSlashCommand('dangerzone', async () => {
    // Ask user for duration in minutes via prompt
    const durationStr = await logseq.UI.showModalPrompt({
      title: 'Set Dangerzone Timer Duration (minutes)',
      label: 'Minutes',
      placeholder: 'Enter duration in minutes',
      defaultValue: '25',
      validation: value => {
        const n = Number(value)
        if (!n || n < 1 || n > 999) return 'Please enter a number from 1 to 999'
        return true
      }
    })

    if (!durationStr) {
      logseq.App.showMsg('Canceled timer creation')
      return
    }

    const duration = Number(durationStr)
    const id = genRandomStr()
    // Insert macro with duration parameter (no start time yet)
    await logseq.Editor.insertAtEditingCursor(`{{renderer :dangerzone_${id},,${duration}}}`)
  })

  // Renderer function like before, listens to macro render slots
  async function renderTimer({ timerId, slotId, startTime, durationMins }) {
    if (!startTime) return
    const duration = (durationMins || 1) * 60

    function _render() {
      const elapsed = Math.floor((Date.now() - startTime) / 1000)
      const left = Math.max(0, duration - elapsed)
      const mins = Math.floor(left / 60)
      const secs = left % 60
      const done = left <= 0

      logseq.provideUI({
        key: timerId,
        slot: slotId,
        reset: true,
        template: done
          ? `<span>✅ Timer Done!</span>`
          : `<span>Dangerzone: ${mins}:${secs.toString().padStart(2, '0')} left</span>`
      })

      if (!done) setTimeout(_render, 1000)
    }
    _render()
  }

  logseq.provideModel({
    async startTimer(e) {
      const timerId = e.dataset.timerId
      const slotId = e.dataset.slotId
      const blockUuid = e.dataset.blockUuid

      const startTime = Date.now()
      // Update block inserting the start time (keeping duration same)
      const block = await logseq.Editor.getBlock(blockUuid)
      if (!block?.content) return

      // Extract duration from existing macro
      const macroRegex = /\{\{renderer\s+:dangerzone_[^,}]+(?:,([^,}]*))?,([^,}]+)?\}\}/
      const match = block.content.match(macroRegex)
      if (!match) return
      const currentDuration = match[2] || '25'

      // Update macro with startTime and duration
      const newContent = block.content.replace(
        macroRegex,
        `{{renderer :dangerzone_${timerId},${startTime},${currentDuration}}}`
      )
      await logseq.Editor.updateBlock(blockUuid, newContent)

      renderTimer({ timerId: `dangerzone_${timerId}`, slotId, startTime, durationMins: Number(currentDuration) })
    }
  })

  logseq.App.onMacroRendererSlotted(({ slot, payload }) => {
    const args = payload.arguments
    const type = args[0]
    const startTime = args[1]
    const durationMins = args[2]

    if (!type?.startsWith(':dangerzone_')) return

    const id = type.split('_')[1]?.trim()
    const timerId = 'dangerzone_' + id

    if (!startTime || startTime === '') {
      // Render a simple "START" button
      logseq.provideUI({
        key: timerId,
        slot,
        reset: true,
        template: `<button data-slot-id="${slot}"
                          data-timer-id="${id}"
                          data-block-uuid="${payload.uuid}"
                          data-on-click="startTimer">
                    Start
                   </button>`
      })
      return
    }
    renderTimer({ timerId, slotId: slot, startTime: Number(startTime), durationMins: Number(durationMins) })
  })
}

logseq.ready(main).catch(console.error)