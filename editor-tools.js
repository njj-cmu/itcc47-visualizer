/* Touch-friendly indentation for the shared pseudocode textareas. */
(function () {
  const INDENT = '    ';

  function editIndent(textarea, direction) {
    const value = textarea.value;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const lineStart = value.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
    const nextBreak = value.indexOf('\n', end);
    const lineEnd = nextBreak === -1 ? value.length : nextBreak;
    const selected = value.slice(lineStart, lineEnd);
    const lines = selected.split('\n');
    let removedBeforeStart = 0;
    let totalDelta = 0;

    const changed = lines.map((line, index) => {
      if (direction === 'indent') {
        totalDelta += INDENT.length;
        return INDENT + line;
      }
      const match = line.match(/^( {1,4}|\t)/);
      const amount = match ? match[0].length : 0;
      if (index === 0) removedBeforeStart = amount;
      totalDelta -= amount;
      return line.slice(amount);
    }).join('\n');

    textarea.value = value.slice(0, lineStart) + changed + value.slice(lineEnd);
    const newStart = direction === 'indent'
      ? start + INDENT.length
      : Math.max(lineStart, start - removedBeforeStart);
    const newEnd = Math.max(newStart, end + totalDelta);
    textarea.focus();
    textarea.setSelectionRange(newStart, newEnd);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  }

  document.querySelectorAll('[data-editor-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const textarea = document.getElementById(button.dataset.editorTarget);
      if (textarea && !textarea.disabled) editIndent(textarea, button.dataset.editorAction);
    });
  });

  document.querySelectorAll('textarea.code-editor').forEach((textarea) => {
    textarea.addEventListener('keydown', (event) => {
      if (event.key !== 'Tab') return;
      event.preventDefault();
      editIndent(textarea, event.shiftKey ? 'outdent' : 'indent');
    });
  });

  window.ITCC47EditorTools = Object.freeze({ editIndent });
})();
