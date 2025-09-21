function main() {
  logseq.Editor.registerSlashCommand(
    'dangerzone', async () => {
      let block = await logseq.Editor.getCurrentBlock();
      if (!block) return;

      let timeRemaining = 60;
      const intervalID = setInterval(async () => {
        timeRemaining = timeRemaining -1;
        if (timeRemaining >=0) {
          await logseq.Editor.updateBlock(
            block.uuid,
            `Dangerzone: ${timeRemaining} seconds left...`
          );
        } else {
          clearInterval(intervalID);
          await logseq.Editor.updateBlock(
            block.uuid,
            `Time's up!`
          );
        }}, 1000);

    }); 

}

logseq.ready(main).catch(console.error);