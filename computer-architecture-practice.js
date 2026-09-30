(function () {
  'use strict';
  const root = document.getElementById('ca-practice-questions');
  if (!root || typeof ComputerArchitecturePractice === 'undefined') return;
  let progress = ComputerArchitecturePractice.read(localStorage);
  const count = document.getElementById('ca-practice-progress');
  const resetButton = document.getElementById('ca-reset-practice');
  const tabs = document.getElementById('ca-section-tabs');
  const sections = ComputerArchitecturePractice.SECTIONS;

  function selectSection(id, focus = false) {
    [...tabs.children].forEach((tab) => {
      const selected = tab.dataset.section === id;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      if (selected && focus) tab.focus();
      document.getElementById(tab.getAttribute('aria-controls')).hidden = !selected;
    });
  }

  function updateProgress() {
    count.textContent = `${progress.solvedIds.length} / ${ComputerArchitecturePractice.QUESTIONS.length} complete`;
    root.querySelectorAll('[data-question-id]').forEach((article) => {
      article.classList.toggle('is-solved', progress.solvedIds.includes(article.dataset.questionId));
    });
  }

  ComputerArchitecturePractice.SECTIONS.forEach((section) => {
    const sectionElement = document.createElement('section');
    sectionElement.id = section.id;
    sectionElement.className = 'ca-practice-section';
    sectionElement.setAttribute('role', 'tabpanel');
    sectionElement.setAttribute('aria-labelledby', `tab-${section.id}`);
    sectionElement.innerHTML = `<p class="section-description">${section.description}</p><div class="ca-practice-section-cards"></div>`;
    const tab = document.createElement('button');
    tab.type = 'button'; tab.id = `tab-${section.id}`; tab.dataset.section = section.id;
    tab.setAttribute('role', 'tab'); tab.setAttribute('aria-controls', section.id);
    tab.textContent = section.title;
    tab.addEventListener('click', () => selectSection(section.id));
    tab.addEventListener('keydown', event => {
      const index = sections.indexOf(section);
      const next = { ArrowRight: (index + 1) % sections.length, ArrowLeft: (index + sections.length - 1) % sections.length, Home: 0, End: sections.length - 1 }[event.key];
      if (next === undefined) return;
      event.preventDefault(); selectSection(sections[next].id, true);
    });
    tabs.appendChild(tab);
    const cards = sectionElement.querySelector('.ca-practice-section-cards');
    ComputerArchitecturePractice.QUESTIONS.filter((question) => question.section === section.id).forEach((question) => {
      const questionIndex = ComputerArchitecturePractice.QUESTIONS.indexOf(question);
      const article = document.createElement('article');
      article.className = 'ca-practice-card';
      article.dataset.questionId = question.id;
      const form = document.createElement('form');
      form.innerHTML = `<header><span>Check ${questionIndex + 1} of ${ComputerArchitecturePractice.QUESTIONS.length}</span><h2>${question.title}</h2></header><p>${question.prompt}</p><fieldset><legend>Choose one answer</legend>${question.choices.map((choice, choiceIndex) => `<label><input type="radio" name="${question.id}" value="${choiceIndex}" required><span>${choice}</span></label>`).join('')}</fieldset><div class="ca-practice-actions"><button class="btn ca-primary" type="submit">Check answer</button></div><div class="ca-practice-feedback" role="status" aria-live="polite" hidden></div>`;
      const feedback = form.querySelector('.ca-practice-feedback');
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const selected = Number(new FormData(form).get(question.id));
        const correct = selected === question.answer;
        feedback.hidden = false;
        feedback.className = `ca-practice-feedback ${correct ? 'is-correct' : 'is-incorrect'}`;
        feedback.innerHTML = `<strong>${correct ? 'Correct.' : 'Not quite.'}</strong> ${question.explanation}`;
        if (correct) progress = ComputerArchitecturePractice.markSolved(localStorage, progress, question.id);
        updateProgress();
      });
      article.appendChild(form);
      cards.appendChild(article);
    });
    root.appendChild(sectionElement);
  });
  selectSection(sections[0].id);

  resetButton.addEventListener('click', () => {
    progress = ComputerArchitecturePractice.reset(localStorage);
    root.querySelectorAll('form').forEach((form) => form.reset());
    root.querySelectorAll('.ca-practice-feedback').forEach((feedback) => { feedback.hidden = true; feedback.textContent = ''; });
    updateProgress();
  });
  updateProgress();
})();
