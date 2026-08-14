/* Course-neutral registry for the BSIT Learning Lab static shell. */
const BSITLearningLab = (() => {
  const SCHEMA_VERSION = 1;
  const courses = new Map();
  const activityCatalogs = new Map();
  const curriculumCatalogs = new Map();

  function registerCourse(course) {
    if (!course || !course.id || !course.code || !course.title || !course.home) {
      throw new Error('Courses require id, code, title, and home.');
    }
    const frozen = Object.freeze({ ...course, nav: Object.freeze([...(course.nav || [])]) });
    courses.set(frozen.id, frozen);
    return frozen;
  }

  function registerActivities(courseId, catalog) {
    if (!courses.has(courseId) || !catalog || typeof catalog.list !== 'function') return false;
    activityCatalogs.set(courseId, catalog);
    return true;
  }

  function registerCurriculum(courseId, catalog) {
    if (!courses.has(courseId) || !catalog || typeof catalog.stateForResource !== 'function') return false;
    curriculumCatalogs.set(courseId, catalog);
    return true;
  }

  function getCourse(id) { return courses.get(id) || null; }
  function listCourses() { return Object.freeze([...courses.values()]); }
  function listActivities(courseId) {
    const catalog = activityCatalogs.get(courseId);
    return Object.freeze(catalog ? [...catalog.list()] : []);
  }
  function getActivity(courseId, activityId) {
    const activities = listActivities(courseId);
    return activities.find((activity) => activity.id === activityId) || activities[0] || null;
  }
  function getCurriculum(courseId) { return curriculumCatalogs.get(courseId) || null; }
  function resolveCourse(id) { return courses.has(id) ? id : 'itcc47'; }

  registerCourse({
    id: 'itcc45', code: 'ITCC45', title: 'Object-Oriented Programming',
    shortTitle: 'Python Object Lab', home: 'itcc45.html', accent: 'violet',
    nav: [
      { href: 'itcc45.html', label: 'Home', icon: 'start' },
      { href: 'visualizer.html?course=itcc45&activity=itcc45-classes-blueprint', label: 'Python Object Lab', icon: 'visualize' },
      { href: 'itcc45-topics.html', label: 'Topics', icon: 'modules' },
      { href: 'itcc45-practice.html?topic=classes', label: 'Practice', icon: 'problems' },
      { href: 'index.html', label: 'All Subjects', icon: 'grid' },
    ],
  });
  registerCourse({
    id: 'itcc47', code: 'ITCC47', title: 'Data Structures and Algorithms',
    shortTitle: 'Learning Lab', home: 'itcc47.html', accent: 'blue',
    nav: [
      { href: 'itcc47.html', label: 'Start', icon: 'start' },
      { href: 'visualizer.html', label: 'Visualize', icon: 'visualize' },
      { href: 'writer.html', label: 'Algorithm Writer', icon: 'writer' },
      { href: 'tracer.html', label: 'Pseudocode Tracer', icon: 'tracer' },
      { href: 'problems.html', label: 'Modules', icon: 'problems' },
      { href: 'index.html', label: 'All Subjects', icon: 'grid' },
    ],
  });

  return Object.freeze({ SCHEMA_VERSION, registerCourse, registerActivities, registerCurriculum,
    getCourse, listCourses, listActivities, getActivity, getCurriculum, resolveCourse });
})();
