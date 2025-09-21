function main() {

  const genRandomStr = () => Math.random().toString(36).slice(2, 7)

  logseq.provideModel({
    async startCustomTimer (e) {
      const timerId = e.dataset.timerId
      const slotId = e.dataset.slotId
      const blockUuid = e.dataset.blockUuid
      // Get user input minutes
      const minsInput = document.querySelector(`#input-${timerId}`)
      const durationMins = Number(minsInput?.value) || 1
      const startTime = Date.now()
      const newContent = `{{renderer :dangerzone_${timerId},${startTime},${durationMins}}}`
      await logseq.Editor.updateBlock(blockUuid, newContent)
      renderTimer({ timerId: `dangerzone_${timerId}`, slotId, startTime, durationMins })
    }
  })

  logseq.Editor.registerSlashCommand(
    'dangerzone', async () => {
      let block = await logseq.Editor.insertAtEditingCursor(
        `{{renderer :dangerzone_${genRandomStr()}}}`
      )
      // if (!block) return;

      // let timeRemaining = 60;
      // const intervalID = setInterval(async () => {
      //   timeRemaining = timeRemaining -1;
      //   if (timeRemaining >=0) {
      //     await logseq.Editor.updateBlock(
      //       block.uuid,
      //       `Dangerzone: ${timeRemaining} seconds left...`
      //     );
      //   } else {
      //     clearInterval(intervalID);
      //     await logseq.Editor.updateBlock(
      //       block.uuid,
      //       `Time's up!`
      //     );
      //   }}, 1000);

    }); 

    function renderTimer ({ timerId, slotId, startTime, durationMins }) {
    if (!startTime) return
    const duration = (durationMins || 1) * 60 // seconds
    function _render () {
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
          `<span>Dangerzone: ${mins}:${secs.toString().padStart(2, '0')} left</span>`
      })
      if (!done) setTimeout(_render, 1000)
    }
    _render()
  }

  // Macro renderer hook
  logseq.App.onMacroRendererSlotted(({ slot, payload }) => {
    const args = payload.arguments
    const type = args[0]
    const startTime = args[1]
    const durationMins = args[2]
    if (!type?.startsWith(':dangerzone_')) return
    const id = type.split('_')[1]?.trim()
    const timerId = 'dangerzone_' + id
    if (!startTime || startTime === '') {
      logseq.provideUI({
        key: timerId,
        slot, reset: true,
        template: `
          <input id="input-${id}" type="number" min="1" placeholder="Minutes" style="width:50px"/>
          <button data-slot-id="${slot}"
                  data-timer-id="${id}"
                  data-block-uuid="${payload.uuid}"
                  data-on-click="startCustomTimer">
            Start
          </button>
        `
      })
      return
    }
    renderTimer({ timerId, slotId: slot, startTime: Number(startTime), durationMins: Number(durationMins) })
  })
}

logseq.ready(main).catch(console.error);