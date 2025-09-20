function main() {
  logseq.Editor.registerSlashCommand('dangerzone-start', function() {
    console.log('Dangerzone ready!');
    logseq.UI.showMsg('Dangerzone timer started', 'success', { timeout: 3000 });
  });
}

logseq.ready(main).catch(console.error);