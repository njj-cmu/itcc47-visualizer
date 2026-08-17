/* Touch-friendly indentation for the shared pseudocode textareas. */
(function () {
  const INDENT = '    ';
  const pointerViewports = new WeakMap();

  function captureViewportScroll(element) {
    const containers = [];
    let parent = element?.parentElement || null;
    while (parent && parent !== document.body && parent !== document.documentElement) {
      if (parent.scrollHeight > parent.clientHeight || parent.scrollWidth > parent.clientWidth) {
        containers.push({ element: parent, top: parent.scrollTop, left: parent.scrollLeft });
      }
      parent = parent.parentElement;
    }
    const pageX = window.scrollX;
    const pageY = window.scrollY;
    return {
      restore() {
        containers.forEach(({ element: container, top, left }) => {
          container.scrollTop = top;
          container.scrollLeft = left;
        });
        window.scrollTo(pageX, pageY);
      },
    };
  }

  function focusWithoutViewportShift(element, selectionStart, selectionEnd, snapshot) {
    const viewport = snapshot || captureViewportScroll(element);
    try {
      element.focus({ preventScroll: true });
    } catch (error) {
      element.focus();
    }
    if (Number.isInteger(selectionStart)) {
      element.setSelectionRange(selectionStart, Number.isInteger(selectionEnd) ? selectionEnd : selectionStart);
    }
    viewport.restore();
    requestAnimationFrame(() => viewport.restore());
    return viewport;
  }

  function editIndent(textarea, direction, viewportSnapshot) {
    const viewport = viewportSnapshot || captureViewportScroll(textarea);
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
    focusWithoutViewportShift(textarea, newStart, newEnd, viewport);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    viewport.restore();
  }

  document.querySelectorAll('[data-editor-action]').forEach((button) => {
    button.addEventListener('pointerdown', (event) => {
      const textarea = document.getElementById(button.dataset.editorTarget);
      if (textarea && !textarea.disabled) pointerViewports.set(button, captureViewportScroll(textarea));
      event.preventDefault();
    });
    button.addEventListener('click', () => {
      const textarea = document.getElementById(button.dataset.editorTarget);
      const viewport = pointerViewports.get(button);
      pointerViewports.delete(button);
      if (textarea && !textarea.disabled) editIndent(textarea, button.dataset.editorAction, viewport);
    });
  });

  document.querySelectorAll('textarea.code-editor').forEach((textarea) => {
    textarea.addEventListener('keydown', (event) => {
      if (event.key !== 'Tab') return;
      event.preventDefault();
      editIndent(textarea, event.shiftKey ? 'outdent' : 'indent');
    });
  });

  window.ITCC47EditorTools = Object.freeze({
    captureViewportScroll,
    editIndent,
    focusWithoutViewportShift,
  });
})();
