(function () {
  'use strict';
  const root = document.getElementById('network-practice-questions');
  if (!root || typeof ComputerNetworkingPractice === 'undefined') return;
  let progress = ComputerNetworkingPractice.read(localStorage);
  const count = document.getElementById('network-practice-progress');
  const resetButton = document.getElementById('network-reset-practice');

  function updateProgress() {
    count.textContent = `${progress.solvedIds.length} / ${ComputerNetworkingPractice.QUESTIONS.length} complete`;
    root.querySelectorAll('[data-question-id]').forEach((article) => {
      article.classList.toggle('is-solved', progress.solvedIds.includes(article.dataset.questionId));
    });
  }

  const groups = new Map();
  function selectQuestion(group, id, focus = false) {
    group.activeId = id;
    group.element.querySelectorAll('[data-question-id]').forEach(article => {
      const active = article.dataset.questionId === id;
      article.querySelector('form').hidden = !active;
      article.querySelector('.net-question-summary').hidden = active;
      if (active && focus) article.querySelector('h2').focus();
    });
    group.nav.querySelectorAll('button').forEach(button => button.setAttribute('aria-current', button.dataset.question === id ? 'step' : 'false'));
  }
  const diagram = `<figure class="net-question-diagram" aria-label="Classroom connection: laptop to access point to switch to edge router to learning server"><div class="net-device-chain">${[
    ['Laptop', '<path d="M9 10h46v31H9zM3 48h58l-6-7H9z"/>'],
    ['Access point', '<path d="M7 39h50v13H7zM32 39V21m-15-6a22 22 0 0 1 30 0M22 21a15 15 0 0 1 20 0M28 27a6 6 0 0 1 8 0"/>'],
    ['Switch', '<rect x="5" y="18" width="54" height="29" rx="4"/><path d="M13 28h6v7h-6zm11 0h6v7h-6zm11 0h6v7h-6zm11 0h6v7h-6z"/>'],
    ['Edge router', '<circle cx="32" cy="32" r="26"/><path d="M32 9v17m-6-11 6-6 6 6M32 55V38m-6 11 6 6 6-6M9 32h17m-11-6-6 6 6 6M55 32H38m11-6 6 6-6 6"/>'],
    ['Learning server', '<rect x="17" y="5" width="30" height="54" rx="3"/><path d="M23 15h18M23 23h18M23 31h18M29 49h6"/>'],
  ].map(([label, shape]) => `<div><svg viewBox="0 0 64 64" aria-hidden="true">${shape}</svg><span>${label}</span></div>`).join('')}</div></figure>`;
  ComputerNetworkingPractice.QUESTIONS.forEach((question, questionIndex) => {
    if (!groups.has(question.group)) {
      const element = document.createElement('section');
      element.className = 'net-question-group'; element.id = `network-group-${question.module}`;
      element.setAttribute('aria-label', question.group);
      const heading = document.createElement('header');
      heading.className = 'net-practice-group-heading';
      heading.innerHTML = `<div><span>${question.module === 1 ? 'Current sequence' : 'Available preview'}</span><h2>${question.group}</h2></div>`;
      const nav = document.createElement('nav'); nav.className = 'net-question-pager'; nav.setAttribute('aria-label', `${question.group} checks`);
      nav.innerHTML = `<span>${ComputerNetworkingPractice.QUESTIONS.filter(item => item.group === question.group).length} checks</span>`;
      heading.appendChild(nav); element.appendChild(heading); root.appendChild(element);
      groups.set(question.group, { element, nav, activeId: question.id });
    }
    const group = groups.get(question.group);
    const article = document.createElement('article');
    article.className = 'net-practice-card';
    article.dataset.questionId = question.id;
    const form = document.createElement('form');
    form.innerHTML = `<header><span>Check ${questionIndex + 1} of ${ComputerNetworkingPractice.QUESTIONS.length}</span><h2 tabindex="-1">${question.title}</h2></header><p>${question.prompt}</p>${question.id === 'identify-network-roles' ? diagram : ''}<fieldset><legend>Choose one answer</legend>${question.choices.map((choice, choiceIndex) => `<label><input type="radio" name="${question.id}" value="${choiceIndex}" required><span>${choice}</span></label>`).join('')}</fieldset><div class="net-practice-actions"><button class="btn net-primary" type="submit">Check answer</button></div><div class="net-practice-feedback" role="status" aria-live="polite" hidden></div>`;
    const feedback = form.querySelector('.net-practice-feedback');
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const selected = Number(new FormData(form).get(question.id));
      const correct = selected === question.answer;
      feedback.hidden = false;
      feedback.className = `net-practice-feedback ${correct ? 'is-correct' : 'is-incorrect'}`;
      feedback.innerHTML = `<strong>${correct ? 'Correct.' : 'Not quite.'}</strong> ${question.explanation}`;
      if (correct) progress = ComputerNetworkingPractice.markSolved(localStorage, progress, question.id);
      updateProgress();
    });
    const summary = document.createElement('button');
    summary.type = 'button'; summary.className = 'net-question-summary';
    summary.innerHTML = `<span>Check ${questionIndex + 1} of ${ComputerNetworkingPractice.QUESTIONS.length}</span><strong>${question.title}</strong><span>Open check →</span>`;
    summary.addEventListener('click', () => selectQuestion(group, question.id, true));
    article.append(summary, form); group.element.appendChild(article);
    const selector = document.createElement('button'); selector.type = 'button'; selector.dataset.question = question.id;
    selector.textContent = String(group.nav.querySelectorAll('button').length + 1);
    selector.setAttribute('aria-label', `Check ${questionIndex + 1}: ${question.title}`);
    selector.addEventListener('click', () => selectQuestion(group, question.id)); group.nav.appendChild(selector);
  });
  groups.forEach(group => selectQuestion(group, group.activeId));

  resetButton.addEventListener('click', () => {
    progress = ComputerNetworkingPractice.reset(localStorage);
    root.querySelectorAll('form').forEach((form) => form.reset());
    root.querySelectorAll('.net-practice-feedback').forEach((feedback) => { feedback.hidden = true; feedback.textContent = ''; });
    updateProgress();
  });
  updateProgress();
})();
