function main() {
  const genRandomStr = () => Math.random().toString(36).slice(2, 7)
  const DEFAULT_DURATION = 5 // minutes

  // Map to hold active timer timeout IDs keyed by timerId
  const activeTimers = new Map()

  logseq.provideModel({
    // Called on user clicking START button
    async startTimer(e) {
      const timerId = e.dataset.timerId
      const slotId = e.dataset.slotId
      const blockUuid = e.dataset.blockUuid

      const block = await logseq.Editor.getBlock(blockUuid)
      if (!block?.content) return

      const startTime = Date.now()

      // Regex to parse macro args: ID, firstArg, secondArg (duration)
      const macroRegex = /\{\{renderer\s+:dangerzone_([^,}]+),([^,}]+)(?:,([^,}]+))?\}\}/
      const match = block.content.match(macroRegex)
      if (!match) return

      const id = match[1].trim()
      let firstArg = match[2].trim()       // could be duration or start time
      let secondArg = match[3]?.trim() || DEFAULT_DURATION.toString()

      // check if already started (firstArg is timestamp)
      const isStarted = firstArg.length > 10 && !isNaN(Number(firstArg))

      let duration, newContent

      if (isStarted) {
        // already started: update start time with current, keep duration
        duration = secondArg
        newContent = block.content.replace(
          macroRegex,
          `{{renderer :dangerzone_${timerId},${startTime},${duration}}}`
        )
      } else {
        // Not started yet: firstArg is duration, shift to second argument
        duration = firstArg || DEFAULT_DURATION.toString()
        newContent = block.content.replace(
          macroRegex,
          `{{renderer :dangerzone_${timerId},${startTime},${duration}}}`
        )
      }

      await logseq.Editor.updateBlock(blockUuid, newContent)

      // NEW: Start watching for typing activity on child blocks
      startTypingMonitor({ timerId: `dangerzone_${timerId}`, blockUuid })


      // start rendering timer UI
      startRenderingTimer({ timerId: `dangerzone_${timerId}`, slotId, startTime, durationMins: Number(duration) })
    }
  })

  // slash command inserts a timer macro with default duration
  logseq.Editor.registerSlashCommand('dangerzone', async () => {
    const id = genRandomStr()
    await logseq.Editor.insertAtEditingCursor(`{{renderer :dangerzone_${id},${DEFAULT_DURATION}}}`)
  })

  // Starts rendering timer UI and manages active timer for cleanup
  function startRenderingTimer({ timerId, slotId, startTime, durationMins }) {
    if (!startTime) return
    const duration = (durationMins || DEFAULT_DURATION) * 60 // seconds

    // Clear any existing timer for the same id before starting new one
    if (activeTimers.has(timerId)) {
      clearTimeout(activeTimers.get(timerId))
      activeTimers.delete(timerId)
    }

    function _render() {
      const elapsed = Math.floor((Date.now() - startTime) / 1000)
      const left = Math.max(0, duration - elapsed)
      const mins = Math.floor(left / 60)
      const secs = left % 60
      const done = left <= 0

      try {
        logseq.provideUI({
          key: timerId,
          slot: slotId,
          reset: true,
          template: done
            ? `<span>✅ Timer Done!</span>`
            : `<span>Dangerzone: ${mins}:${secs.toString().padStart(2, '0')} left</span>`
        })
      } catch (e) {
        // Ignore UI update errors (e.g., slot missing)
      }

      if (!done) {
        const timeoutId = setTimeout(_render, 1000)
        activeTimers.set(timerId, timeoutId)
      } else {
        activeTimers.delete(timerId)
      }
    }
    _render()
  }

  // monitor typing activity and delete children if inactive too long
  function startTypingMonitor({ timerId, blockUuid }) {
    // TODO: Initialize inactivity counter
    // TODO: Get all child blocks of blockUuid
    // TODO: Subscribe to onBlockChanged for each child
    // TODO: In the callback, reset inactivity counter
    // TODO: Start interval that increments inactivity counter every second
    // TODO: When counter reaches INACTIVITY_THRESHOLD, call deleteChildBlocks()
    // TODO: Store cleanup function in typingWatchers Map
  }

  // NEW: Delete all child blocks but keep the parent
  async function deleteChildBlocks(blockUuid) {
    // TODO: Use logseq.Editor.getBlock(blockUuid) to get parent block
    // TODO: Check if block.children exists and has length > 0
    // TODO: Loop through block.children array
    // TODO: For each child UUID, call await logseq.Editor.removeBlock(childUuid)
    // TODO: show a notification that children were deleted
  }

  // Cleanup timers when page changes or block unmounts to avoid errors
  logseq.App.onPageChanged(() => {
    for (const timeoutId of activeTimers.values()) {
      clearTimeout(timeoutId)
    }
    activeTimers.clear()

      // NEW: Clean up typing watchers and inactivity timers
    for (const [timerId, cleanup] of typingWatchers.entries()) {
      // TODO: Call cleanup function to unsubscribe from DB changes
      // TODO: Clear any running inactivity interval
    }
    typingWatchers.clear()
    inactivityTimers.clear()
  
  })

  // For now, onPageChanged covers most cases

  // Macro renderer hook
  logseq.App.onMacroRendererSlotted(({ slot, payload }) => {
    const args = payload.arguments
    const type = args[0]
    if (!type?.startsWith(':dangerzone_')) return

    const id = type.split('_')[1]?.trim()
    const timerId = 'dangerzone_' + id

    const firstArgRaw = args[1] ?? ''
    const secondArgRaw = args[2] ?? ''

    const firstArg = firstArgRaw.toString().trim()
    const secondArg = secondArgRaw.toString().trim()

    // Determine if timer started (firstArg is timestamp)
    const isStarted = firstArg.length > 10 && !isNaN(Number(firstArg))

    if (!isStarted) {
      // Not started: show START button and current duration
      logseq.provideUI({
        key: timerId,
        slot,
        reset: true,
        template: `
          <button data-slot-id="${slot}"
                  data-timer-id="${id}"
                  data-block-uuid="${payload.uuid}"
                  data-on-click="startTimer">
            Start
          </button>
          <div style="margin-top:6px; font-size:smaller; color:#666;">
            Duration (minutes): ${firstArg || DEFAULT_DURATION}
          </div>
        `
      })
      return
    }

    // Timer running: start countdown rendering
    startRenderingTimer({
      timerId,
      slotId: slot,
      startTime: Number(firstArg),
      durationMins: Number(secondArg) || DEFAULT_DURATION
    })
  })
}

logseq.ready(main).catch(console.error)