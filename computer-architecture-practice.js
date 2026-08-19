(function () {
  'use strict';
  const root = document.getElementById('ca-practice-questions');
  if (!root || typeof ComputerArchitecturePractice === 'undefined') return;
  let progress = ComputerArchitecturePractice.read(localStorage);
  const count = document.getElementById('ca-practice-progress');
  const resetButton = document.getElementById('ca-reset-practice');

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
    sectionElement.innerHTML = `<header><span>${section.title}</span><p>${section.description}</p></header><div class="ca-practice-section-cards"></div>`;
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

  resetButton.addEventListener('click', () => {
    progress = ComputerArchitecturePractice.reset(localStorage);
    root.querySelectorAll('form').forEach((form) => form.reset());
    root.querySelectorAll('.ca-practice-feedback').forEach((feedback) => { feedback.hidden = true; feedback.textContent = ''; });
    updateProgress();
  });
  updateProgress();
})();
