/* Data-driven ITCC45 topic groups. Activity content remains outside the DOM shell. */
(() => {
  const root = document.getElementById('itcc45-topic-groups');
  if (!root || typeof ITCC45Activities === 'undefined') return;

  const topics = [
    { id: 'classes', title: 'Classes', summary: 'Build blueprints, follow self, and separate class-owned state from instance-owned state.' },
    { id: 'objects', title: 'Objects', summary: 'Track identity, independent state, and the difference between another object and another reference.' },
    { id: 'encapsulation', title: 'Encapsulation', summary: 'Preserve invariants and understand what Python underscore conventions actually guarantee.' },
    { id: 'inheritance', title: 'Inheritance', summary: 'Trace reuse, overriding, lookup, and deliberate base initialization with super().' },
    { id: 'abstraction', title: 'Class Abstraction', summary: 'Hide implementation detail first, then use ABC when a contract needs enforcement.' },
    { id: 'polymorphism', title: 'Polymorphism', summary: 'Send one message and follow runtime dispatch instead of branching on type labels.' },
  ];

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  topics.forEach((topic, topicIndex) => {
    const activities = ITCC45Activities.forTopic(topic.id);
    const item = element('li', 'oop-topic-group');
    item.dataset.topic = topic.id;

    const heading = element('header', 'oop-topic-group-heading');
    heading.append(element('span', 'topic-number', String(topicIndex + 1).padStart(2, '0')));
    const copy = element('div', 'topic-copy');
    const title = element('h2', '', topic.title);
    title.id = `topic-${topic.id}`;
    copy.append(title, element('p', '', topic.summary));
    const practice = element('a', 'topic-practice-link', 'Practice 3 tasks');
    practice.href = `itcc45-practice.html?topic=${encodeURIComponent(topic.id)}`;
    practice.dataset.icon = 'terminal';
    heading.append(copy, practice);

    const list = element('div', 'oop-example-list');
    list.setAttribute('aria-labelledby', title.id);
    activities.forEach((activity, activityIndex) => {
      const card = element('article', 'oop-example-card');
      const meta = element('div', 'oop-example-meta');
      meta.append(element('span', `example-context context-${activity.context}`, activity.context.replace('-', ' ')), element('span', 'example-position', `Example ${activityIndex + 1} of ${activities.length}`));
      const prefix = activity.topic === 'Class Abstraction' ? 'Class abstraction: ' : `${activity.topic}: `;
      const cardTitle = element('h3', '', activity.title.replace(prefix, ''));
      const goal = element('p', 'oop-example-goal', activity.learningGoal);
      const link = element('a', 'oop-example-link', 'Open example');
      link.href = `visualizer.html?course=itcc45&activity=${encodeURIComponent(activity.id)}`;
      link.dataset.icon = 'code';
      card.append(meta, cardTitle, goal, link);
      list.append(card);
    });

    item.append(heading, list);
    root.append(item);
  });
})();
