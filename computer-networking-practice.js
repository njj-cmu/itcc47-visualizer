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

  ComputerNetworkingPractice.QUESTIONS.forEach((question, questionIndex) => {
    const article = document.createElement('article');
    article.className = 'net-practice-card';
    article.dataset.questionId = question.id;
    const form = document.createElement('form');
    form.innerHTML = `<header><span>Check ${questionIndex + 1} of ${ComputerNetworkingPractice.QUESTIONS.length}</span><h2>${question.title}</h2></header><p>${question.prompt}</p><fieldset><legend>Choose one answer</legend>${question.choices.map((choice, choiceIndex) => `<label><input type="radio" name="${question.id}" value="${choiceIndex}" required><span>${choice}</span></label>`).join('')}</fieldset><div class="net-practice-actions"><button class="btn net-primary" type="submit">Check answer</button></div><div class="net-practice-feedback" role="status" aria-live="polite" hidden></div>`;
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
    article.appendChild(form);
    root.appendChild(article);
  });

  resetButton.addEventListener('click', () => {
    progress = ComputerNetworkingPractice.reset(localStorage);
    root.querySelectorAll('form').forEach((form) => form.reset());
    root.querySelectorAll('.net-practice-feedback').forEach((feedback) => { feedback.hidden = true; feedback.textContent = ''; });
    updateProgress();
  });
  updateProgress();
})();
