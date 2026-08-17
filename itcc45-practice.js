/* Structured ITCC45 practice with minimal, versioned local progress. */
(function () {
  const STORAGE_KEY = 'itcc45.practice:v1';
  const params = new URLSearchParams(location.search);
  let activeTopic = BSITOOPPractice.topic(params.get('topic'));
  let topicChallenges = BSITOOPPractice.forTopic(activeTopic.id);
  let activeIndex = Math.max(0, topicChallenges.findIndex((item) => item.id === params.get('challenge')));
  let solved = loadProgress();

  const els = {
    topicNav: document.getElementById('practice-topic-nav'), progress: document.getElementById('practice-progress-count'),
    clear: document.getElementById('clear-practice-progress'), position: document.getElementById('practice-position'),
    heading: document.getElementById('practice-heading'), kind: document.getElementById('practice-kind'),
    title: document.getElementById('challenge-title'), code: document.getElementById('challenge-code'),
    prompt: document.getElementById('challenge-prompt'), form: document.getElementById('challenge-form'),
    choices: document.getElementById('challenge-choices'), feedback: document.getElementById('challenge-feedback'),
    retry: document.getElementById('retry-challenge'), previous: document.getElementById('previous-challenge'),
    next: document.getElementById('next-challenge'), dots: document.getElementById('challenge-dots'), lab: document.getElementById('practice-lab-link'),
  };

  function loadProgress() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!stored || stored.contentVersion !== BSITOOPPractice.CONTENT_VERSION || !Array.isArray(stored.solvedIds)) return new Set();
      return new Set(stored.solvedIds.filter((id) => BSITOOPPractice.get(id)));
    } catch (error) { return new Set(); }
  }
  function saveProgress() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ contentVersion: BSITOOPPractice.CONTENT_VERSION, solvedIds: [...solved] })); } catch (error) { /* storage is optional */ }
  }
  function escapeHtml(value) { return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }
  function current() { return topicChallenges[activeIndex]; }

  function renderTopics() {
    els.topicNav.innerHTML = BSITOOPPractice.topics.map((topic) => {
      const complete = BSITOOPPractice.forTopic(topic.id).filter((challenge) => solved.has(challenge.id)).length;
      return `<a href="itcc45-practice.html?topic=${topic.id}" class="${topic.id === activeTopic.id ? 'active' : ''}"><span>${String(topic.number).padStart(2, '0')}</span><strong>${escapeHtml(topic.title)}</strong><small>${complete}/3</small></a>`;
    }).join('');
    els.progress.textContent = `${solved.size} / ${BSITOOPPractice.challenges.length} complete`;
  }

  function renderChallenge(updateUrl = true) {
    const challenge = current();
    els.position.textContent = `Task ${activeIndex + 1} of ${topicChallenges.length}`;
    els.heading.textContent = activeTopic.title;
    els.kind.textContent = challenge.kind;
    els.title.textContent = challenge.title;
    els.code.textContent = challenge.code;
    els.prompt.textContent = challenge.prompt;
    els.choices.innerHTML = challenge.choices.map((choice, index) => `<label><input type="radio" name="answer" value="${index}"><span>${escapeHtml(choice)}</span></label>`).join('');
    els.feedback.hidden = true; els.feedback.className = 'challenge-feedback'; els.feedback.textContent = '';
    els.retry.hidden = true;
    els.previous.disabled = activeIndex === 0;
    els.next.disabled = activeIndex === topicChallenges.length - 1;
    els.dots.innerHTML = topicChallenges.map((item, index) => `<button type="button" aria-label="Task ${index + 1}${solved.has(item.id) ? ', complete' : ''}" aria-current="${index === activeIndex ? 'step' : 'false'}" data-index="${index}" class="${solved.has(item.id) ? 'complete' : ''}">${index + 1}</button>`).join('');
    els.lab.href = `visualizer.html?course=itcc45&activity=${encodeURIComponent(activeTopic.activity)}`;
    if (updateUrl) {
      const url = new URL(location.href); url.searchParams.set('topic', activeTopic.id); url.searchParams.set('challenge', challenge.id);
      history.replaceState({}, '', url);
    }
  }

  els.form.addEventListener('submit', (event) => {
    event.preventDefault();
    const selected = els.form.querySelector('input[name="answer"]:checked');
    if (!selected) { els.feedback.hidden = false; els.feedback.className = 'challenge-feedback is-warning'; els.feedback.textContent = 'Choose an answer before checking.'; return; }
    const challenge = current(); const correct = Number(selected.value) === challenge.answer;
    els.feedback.hidden = false; els.feedback.className = `challenge-feedback ${correct ? 'is-correct' : 'is-incorrect'}`;
    els.feedback.innerHTML = `<strong>${correct ? 'That reasoning holds.' : 'Not yet.'}</strong><p>${escapeHtml(challenge.explanation)}</p>`;
    els.retry.hidden = correct;
    if (correct) { solved.add(challenge.id); saveProgress(); renderTopics(); renderChallenge(false); els.feedback.hidden = false; els.feedback.className = 'challenge-feedback is-correct'; els.feedback.innerHTML = `<strong>That reasoning holds.</strong><p>${escapeHtml(challenge.explanation)}</p>`; }
  });
  els.retry.addEventListener('click', () => renderChallenge(false));
  els.previous.addEventListener('click', () => { if (activeIndex > 0) { activeIndex -= 1; renderChallenge(); } });
  els.next.addEventListener('click', () => { if (activeIndex < topicChallenges.length - 1) { activeIndex += 1; renderChallenge(); } });
  els.dots.addEventListener('click', (event) => { const button = event.target.closest('[data-index]'); if (button) { activeIndex = Number(button.dataset.index); renderChallenge(); } });
  els.clear.addEventListener('click', () => { solved = new Set(); saveProgress(); renderTopics(); renderChallenge(false); });

  renderTopics(); renderChallenge();
})();
