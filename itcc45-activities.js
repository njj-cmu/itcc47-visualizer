/* Deterministic Python OOP activities for the guided ITCC45 Object Lab. */
const ITCC45Activities = (() => {
  const SCHEMA_VERSION = 1;
  const CONTENT_VERSION = '2026.08';

  function classModel(id, name, options = {}) {
    return { id, name, bases: [...(options.bases || [])], attributes: [...(options.attributes || [])],
      methods: [...(options.methods || [])], abstractMethods: [...(options.abstractMethods || [])], status: options.status || 'ready' };
  }
  function objectModel(id, classId, label, fields, status = 'ready') { return { id, classId, label, fields: { ...fields }, status }; }
  function frame(spec = {}) {
    return { kind: 'object-model', classes: (spec.classes || []).map((item) => ({ ...item })),
      objects: (spec.objects || []).map((item) => ({ ...item, fields: { ...item.fields } })),
      references: { ...(spec.references || {}) }, active: spec.active ? { ...spec.active, lookupPath: [...(spec.active.lookupPath || [])], callFrame: { ...(spec.active.callFrame || {}) } } : null,
      output: [...(spec.output || [])], notice: spec.notice || '' };
  }
  function event(activityId, index, type, message, currentFrame, source, line, terminal = false) {
    return BSITPlayback.timelineEvent({ id: `${activityId}:${index}`, domain: 'python-oop', type, message, frame: currentFrame,
      source: line ? { line, code: source[line - 1] || '' } : null, terminal });
  }
  function activity(spec) {
    const defaults = Object.freeze({ ...(spec.defaults || {}) });
    const item = {
      id: spec.id, courseId: 'itcc45', contentVersion: CONTENT_VERSION, module: spec.number, topicId: spec.topicId,
      topic: spec.topic, family: 'Python OOP', title: spec.title, subtitle: spec.subtitle,
      engine: 'guided-python', renderer: 'object-model', language: 'python',
      evidenceViews: Object.freeze(['steps', 'objects', 'calls', 'output']),
      views: Object.freeze(['visualize', 'code', 'steps', 'objects', 'calls', 'output']), metrics: Object.freeze([]),
      input: Object.freeze({ kind: 'object-model', defaults, controls: Object.freeze([...(spec.controls || [])]) }),
      complexity: null, blurb: spec.blurb, expectedOutput: spec.expectedOutput,
      sourceFor(options = {}) { return Object.freeze(spec.source({ ...defaults, ...options })); },
      run(options = {}) {
        const input = { ...defaults, ...options };
        const source = spec.source(input);
        const built = spec.timeline(input, source);
        const events = built.map((row, index) => event(spec.id, index, row.type, row.message, row.frame, source, row.line, index === built.length - 1));
        return BSITPlayback.runResult({ events, capabilities: { visualize: true, trace: true, variables: true, operations: false, output: true }, result: { output: events.at(-1)?.frame.output || [] } });
      },
    };
    item.source = Object.freeze(item.sourceFor(defaults));
    return Object.freeze(item);
  }

  const classes = activity({
    id: 'itcc45-classes-blueprint', number: 1, topicId: 'classes', topic: 'Classes',
    title: 'Classes: turn a blueprint into an instance', subtitle: 'Watch Python create a class, store shared behavior, and initialize one Student.',
    blurb: 'A class groups the data and behavior that describe a type. Each instance receives its own attributes through self.',
    defaults: { name: 'Ana', program: 'BSIT' }, controls: [{ key: 'name', label: 'Student name', type: 'text', maxLength: 18 }, { key: 'program', label: 'Program', type: 'text', maxLength: 16 }],
    source: ({ name, program }) => ['class Student:', '    school = "CMU"', '', '    def __init__(self, name, program):', '        self.name = name', '        self.program = program', '', '    def describe(self):', '        return f"{self.name} studies {self.program}"', '', `student = Student(${JSON.stringify(name)}, ${JSON.stringify(program)})`, 'print(Student.school)', 'print(student.describe())'],
    expectedOutput: ['CMU', 'Ana studies BSIT'],
    timeline(input, source) {
      const studentClass = classModel('class:Student', 'Student', { attributes: ['school = "CMU"'], methods: ['__init__(self, name, program)', 'describe(self)'] });
      const student = objectModel('student:1', 'class:Student', input.name, { name: input.name, program: input.program });
      return [
        { type: 'define-class', line: 1, message: 'Create the Student class blueprint.', frame: frame({ classes: [{ ...studentClass, methods: [] }] }) },
        { type: 'class-attribute', line: 2, message: 'Store school on the class, shared by every Student.', frame: frame({ classes: [{ ...studentClass, methods: [], status: 'active' }] }) },
        { type: 'define-methods', line: 8, message: 'Attach __init__ and describe to the class.', frame: frame({ classes: [{ ...studentClass, status: 'active' }] }) },
        { type: 'instantiate', line: 11, message: `Allocate student:1 and bind it to student.`, frame: frame({ classes: [studentClass], objects: [{ ...student, fields: {} }], references: { student: 'student:1' }, active: { receiverId: 'student:1', method: 'Student.__init__', lookupPath: ['class:Student'], callFrame: { self: 'student:1', name: input.name, program: input.program } } }) },
        { type: 'initialize', line: 6, message: `Store ${input.name} and ${input.program} on this instance.`, frame: frame({ classes: [studentClass], objects: [{ ...student, status: 'active' }], references: { student: 'student:1' }, active: { receiverId: 'student:1', method: 'Student.__init__', lookupPath: ['class:Student'], callFrame: { self: 'student:1' } } }) },
        { type: 'output', line: 13, message: `Call describe with student:1 as self.`, frame: frame({ classes: [studentClass], objects: [student], references: { student: 'student:1' }, active: { receiverId: 'student:1', method: 'Student.describe', lookupPath: ['class:Student'], callFrame: { self: 'student:1' } }, output: ['CMU', `${input.name} studies ${input.program}`] }) },
      ];
    },
  });

  const objects = activity({
    id: 'itcc45-object-state', number: 2, topicId: 'objects', topic: 'Objects',
    title: 'Objects: independent state and references', subtitle: 'Create two Students, change one, then add a second name for the same object.',
    blurb: 'Variables hold references to objects. Separate instances keep separate state, while aliases share one object.',
    defaults: { firstName: 'Ana', secondName: 'Ben', program: 'BSIT' }, controls: [{ key: 'firstName', label: 'Student 1 name', type: 'text', maxLength: 18 }, { key: 'secondName', label: 'Student 2 name', type: 'text', maxLength: 18 }, { key: 'program', label: 'Program', type: 'text', maxLength: 16 }],
    source: ({ firstName, secondName, program }) => ['class Student:', '    def __init__(self, name, program):', '        self.name = name', '        self.program = program', '', '    def describe(self):', '        return f"{self.name}: {self.program}"', '', `first = Student(${JSON.stringify(firstName)}, ${JSON.stringify(program)})`, `second = Student(${JSON.stringify(secondName)}, ${JSON.stringify(program)})`, 'also_first = first', 'first.program = "BSIT-OOP"', 'print(first.describe())', 'print(second.describe())', 'print(also_first is first)'],
    expectedOutput: ['Ana: BSIT-OOP', 'Ben: BSIT', 'True'],
    timeline(input) {
      const studentClass = classModel('class:Student', 'Student', { methods: ['__init__(self, name, program)', 'describe(self)'] });
      const first = objectModel('student:1', 'class:Student', input.firstName, { name: input.firstName, program: input.program });
      const second = objectModel('student:2', 'class:Student', input.secondName, { name: input.secondName, program: input.program });
      return [
        { type: 'ready', line: 1, message: 'The Student blueprint is ready.', frame: frame({ classes: [studentClass] }) },
        { type: 'instantiate', line: 9, message: `first now refers to student:1 (${input.firstName}).`, frame: frame({ classes: [studentClass], objects: [{ ...first, status: 'active' }], references: { first: 'student:1' }, active: { receiverId: 'student:1', method: 'Student.__init__', lookupPath: ['class:Student'], callFrame: { self: 'student:1' } } }) },
        { type: 'instantiate', line: 10, message: `second refers to a different object, student:2 (${input.secondName}).`, frame: frame({ classes: [studentClass], objects: [first, { ...second, status: 'active' }], references: { first: 'student:1', second: 'student:2' }, active: { receiverId: 'student:2', method: 'Student.__init__', lookupPath: ['class:Student'], callFrame: { self: 'student:2' } } }) },
        { type: 'alias', line: 11, message: 'also_first copies the reference, not the object.', frame: frame({ classes: [studentClass], objects: [{ ...first, status: 'active' }, second], references: { first: 'student:1', second: 'student:2', also_first: 'student:1' }, notice: 'first and also_first point to the same identity.' }) },
        { type: 'mutate', line: 12, message: 'Only student:1 changes; student:2 keeps its original state.', frame: frame({ classes: [studentClass], objects: [{ ...first, fields: { ...first.fields, program: 'BSIT-OOP' }, status: 'active' }, second], references: { first: 'student:1', second: 'student:2', also_first: 'student:1' } }) },
        { type: 'output', line: 15, message: 'The two objects remain independent, and the alias test is true.', frame: frame({ classes: [studentClass], objects: [{ ...first, fields: { ...first.fields, program: 'BSIT-OOP' } }, second], references: { first: 'student:1', second: 'student:2', also_first: 'student:1' }, output: [`${input.firstName}: BSIT-OOP`, `${input.secondName}: ${input.program}`, 'True'] }) },
      ];
    },
  });

  const encapsulation = activity({
    id: 'itcc45-encapsulation-property', number: 3, topicId: 'encapsulation', topic: 'Encapsulation',
    title: 'Encapsulation: protect a valid score', subtitle: 'Send a value through a property and watch the invariant accept or reject it.',
    blurb: 'Python uses interfaces and conventions rather than absolute privacy. A property can keep internal state valid.',
    defaults: { startingScore: 88, proposedScore: 120 }, controls: [{ key: 'startingScore', label: 'Starting score', type: 'number', min: 0, max: 100 }, { key: 'proposedScore', label: 'Proposed score', type: 'number', min: -20, max: 140 }],
    source: ({ startingScore, proposedScore }) => ['class GradeRecord:', '    def __init__(self, score):', '        self.score = score', '', '    @property', '    def score(self):', '        return self._score', '', '    @score.setter', '    def score(self, value):', '        if not 0 <= value <= 100:', '            raise ValueError("score must be 0..100")', '        self._score = value', '', `record = GradeRecord(${startingScore})`, 'try:', `    record.score = ${proposedScore}`, 'except ValueError as error:', '    print(f"rejected: {error}")', 'print(record.score)'],
    expectedOutput: ['rejected: score must be 0..100', '88'],
    timeline(input) {
      const cls = classModel('class:GradeRecord', 'GradeRecord', { attributes: ['_score (internal)'], methods: ['score (property)', 'score (setter)'] });
      const record = objectModel('record:1', 'class:GradeRecord', 'Grade record', { _score: input.startingScore });
      const valid = input.proposedScore >= 0 && input.proposedScore <= 100;
      const finalScore = valid ? input.proposedScore : input.startingScore;
      const output = valid ? [String(finalScore)] : ['rejected: score must be 0..100', String(finalScore)];
      return [
        { type: 'define-class', line: 1, message: 'GradeRecord exposes score while keeping _score internal.', frame: frame({ classes: [cls] }) },
        { type: 'initialize', line: 15, message: `The constructor sends ${input.startingScore} through the same setter.`, frame: frame({ classes: [cls], objects: [{ ...record, status: 'active' }], references: { record: 'record:1' }, active: { receiverId: 'record:1', method: 'GradeRecord.score.setter', lookupPath: ['class:GradeRecord'], callFrame: { self: 'record:1', value: input.startingScore } } }) },
        { type: 'propose', line: 17, message: `Ask the property to store ${input.proposedScore}.`, frame: frame({ classes: [cls], objects: [record], references: { record: 'record:1' }, active: { receiverId: 'record:1', method: 'GradeRecord.score.setter', lookupPath: ['class:GradeRecord'], callFrame: { self: 'record:1', value: input.proposedScore } } }) },
        valid
          ? { type: 'accept', line: 13, message: `${input.proposedScore} satisfies the 0–100 invariant, so _score changes.`, frame: frame({ classes: [cls], objects: [{ ...record, fields: { _score: finalScore }, status: 'active' }], references: { record: 'record:1' }, notice: 'The public property accepted the value.' }) }
          : { type: 'reject', line: 12, message: `${input.proposedScore} is rejected before _score can change.`, frame: frame({ classes: [cls], objects: [{ ...record, status: 'rejected' }], references: { record: 'record:1' }, notice: 'Invariant preserved: _score is unchanged.' }) },
        { type: 'output', line: 20, message: `Reading score returns the valid internal value ${finalScore}.`, frame: frame({ classes: [cls], objects: [{ ...record, fields: { _score: finalScore } }], references: { record: 'record:1' }, output }) },
      ];
    },
  });

  const inheritance = activity({
    id: 'itcc45-inheritance-lookup', number: 4, topicId: 'inheritance', topic: 'Inheritance',
    title: 'Inheritance: follow reuse and override lookup', subtitle: 'Initialize the Person part, inherit introduce(), and override role_summary().',
    blurb: 'Single inheritance lets a subclass reuse a base interface while specializing selected behavior.',
    defaults: { name: 'Ana', program: 'BSIT' }, controls: [{ key: 'name', label: 'Student name', type: 'text', maxLength: 18 }, { key: 'program', label: 'Program', type: 'text', maxLength: 16 }],
    source: ({ name, program }) => ['class Person:', '    def __init__(self, name):', '        self.name = name', '', '    def introduce(self):', '        return f"I am {self.name}."', '', 'class Student(Person):', '    def __init__(self, name, program):', '        super().__init__(name)', '        self.program = program', '', '    def role_summary(self):', '        return f"{self.name} studies {self.program}"', '', `student = Student(${JSON.stringify(name)}, ${JSON.stringify(program)})`, 'print(student.introduce())', 'print(student.role_summary())'],
    expectedOutput: ['I am Ana.', 'Ana studies BSIT'],
    timeline(input) {
      const person = classModel('class:Person', 'Person', { methods: ['__init__(self, name)', 'introduce(self)'] });
      const studentClass = classModel('class:Student', 'Student', { bases: ['class:Person'], methods: ['__init__(self, name, program)', 'role_summary(self)'] });
      const student = objectModel('student:1', 'class:Student', input.name, { name: input.name, program: input.program });
      return [
        { type: 'hierarchy', line: 8, message: 'Student declares Person as its base class.', frame: frame({ classes: [person, { ...studentClass, status: 'active' }] }) },
        { type: 'instantiate', line: 16, message: 'Create student:1 as a Student instance.', frame: frame({ classes: [person, studentClass], objects: [{ ...student, fields: {} }], references: { student: 'student:1' }, active: { receiverId: 'student:1', method: 'Student.__init__', lookupPath: ['class:Student'], callFrame: { self: 'student:1' } } }) },
        { type: 'super', line: 10, message: 'super() continues initialization in Person.', frame: frame({ classes: [person, studentClass], objects: [{ ...student, fields: { name: input.name }, status: 'active' }], references: { student: 'student:1' }, active: { receiverId: 'student:1', method: 'Person.__init__', lookupPath: ['class:Student', 'class:Person'], callFrame: { self: 'student:1', name: input.name } } }) },
        { type: 'inherit', line: 17, message: 'introduce is absent on Student, so lookup continues to Person.', frame: frame({ classes: [person, studentClass], objects: [student], references: { student: 'student:1' }, active: { receiverId: 'student:1', method: 'Person.introduce', lookupPath: ['class:Student', 'class:Person'], callFrame: { self: 'student:1' } }, output: [`I am ${input.name}.`] }) },
        { type: 'override', line: 18, message: 'role_summary is found directly on Student.', frame: frame({ classes: [person, studentClass], objects: [student], references: { student: 'student:1' }, active: { receiverId: 'student:1', method: 'Student.role_summary', lookupPath: ['class:Student'], callFrame: { self: 'student:1' } }, output: [`I am ${input.name}.`, `${input.name} studies ${input.program}`] }) },
      ];
    },
  });

  const abstraction = activity({
    id: 'itcc45-abstraction-contract', number: 5, topicId: 'abstraction', topic: 'Class Abstraction',
    title: 'Class abstraction: enforce a shared contract', subtitle: 'Compare an incomplete subclass with one that implements the required behavior.',
    blurb: 'Abstraction presents the behavior clients need and hides the implementation choice. ABC makes that contract enforceable.',
    defaults: { name: 'Ana' }, controls: [{ key: 'name', label: 'Student name', type: 'text', maxLength: 18 }],
    source: ({ name }) => ['from abc import ABC, abstractmethod', '', 'class CampusMember(ABC):', '    def __init__(self, name):', '        self.name = name', '', '    @abstractmethod', '    def role_summary(self):', '        pass', '', 'class Visitor(CampusMember):', '    pass', '', 'class Student(CampusMember):', '    def role_summary(self):', '        return f"{self.name} is a student"', '', 'try:', '    Visitor("Mia")', 'except TypeError:', '    print("Visitor is incomplete")', '', `print(Student(${JSON.stringify(name)}).role_summary())`],
    expectedOutput: ['Visitor is incomplete', 'Ana is a student'],
    timeline(input) {
      const base = classModel('class:CampusMember', 'CampusMember', { attributes: ['name'], methods: ['__init__(self, name)'], abstractMethods: ['role_summary(self)'], status: 'abstract' });
      const visitor = classModel('class:Visitor', 'Visitor', { bases: ['class:CampusMember'], status: 'incomplete' });
      const studentClass = classModel('class:Student', 'Student', { bases: ['class:CampusMember'], methods: ['role_summary(self)'] });
      const student = objectModel('student:1', 'class:Student', input.name, { name: input.name });
      return [
        { type: 'abstract', line: 7, message: 'CampusMember requires every concrete subclass to provide role_summary.', frame: frame({ classes: [{ ...base, status: 'active' }], notice: 'The public contract is visible; implementation details remain open.' }) },
        { type: 'incomplete', line: 11, message: 'Visitor inherits the contract but supplies no implementation.', frame: frame({ classes: [base, { ...visitor, status: 'active' }] }) },
        { type: 'reject', line: 19, message: 'Python blocks Visitor construction with TypeError.', frame: frame({ classes: [base, { ...visitor, status: 'rejected' }], notice: 'No Visitor object is allocated.' }) },
        { type: 'concrete', line: 15, message: 'Student fulfills the contract with role_summary.', frame: frame({ classes: [base, visitor, { ...studentClass, status: 'active' }] }) },
        { type: 'output', line: 23, message: 'Student is concrete, so Python creates it and dispatches the method.', frame: frame({ classes: [base, visitor, studentClass], objects: [{ ...student, status: 'active' }], references: { temporary: 'student:1' }, active: { receiverId: 'student:1', method: 'Student.role_summary', lookupPath: ['class:Student'], callFrame: { self: 'student:1' } }, output: ['Visitor is incomplete', `${input.name} is a student`] }) },
      ];
    },
  });

  const polymorphism = activity({
    id: 'itcc45-polymorphic-dispatch', number: 6, topicId: 'polymorphism', topic: 'Polymorphism',
    title: 'Polymorphism: one call, different behavior', subtitle: 'Loop over campus members and let each runtime class choose role_summary().',
    blurb: 'Polymorphism replaces type-switching with a shared interface and runtime method dispatch.',
    defaults: { studentName: 'Ana', instructorName: 'Dr. Cruz' }, controls: [{ key: 'studentName', label: 'Student name', type: 'text', maxLength: 18 }, { key: 'instructorName', label: 'Instructor name', type: 'text', maxLength: 18 }],
    source: ({ studentName, instructorName }) => ['from abc import ABC, abstractmethod', '', 'class CampusMember(ABC):', '    def __init__(self, name):', '        self.name = name', '', '    @abstractmethod', '    def role_summary(self):', '        pass', '', 'class Student(CampusMember):', '    def role_summary(self):', '        return f"{self.name} studies BSIT"', '', 'class Instructor(CampusMember):', '    def role_summary(self):', '        return f"{self.name} teaches Python"', '', `members = [Student(${JSON.stringify(studentName)}), Instructor(${JSON.stringify(instructorName)})]`, 'for member in members:', '    print(member.role_summary())'],
    expectedOutput: ['Ana studies BSIT', 'Dr. Cruz teaches Python'],
    timeline(input) {
      const base = classModel('class:CampusMember', 'CampusMember', { abstractMethods: ['role_summary(self)'], status: 'abstract' });
      const studentClass = classModel('class:Student', 'Student', { bases: ['class:CampusMember'], methods: ['role_summary(self)'] });
      const instructorClass = classModel('class:Instructor', 'Instructor', { bases: ['class:CampusMember'], methods: ['role_summary(self)'] });
      const student = objectModel('student:1', 'class:Student', input.studentName, { name: input.studentName });
      const instructor = objectModel('instructor:1', 'class:Instructor', input.instructorName, { name: input.instructorName });
      const shared = { classes: [base, studentClass, instructorClass], objects: [student, instructor], references: { members_0: 'student:1', members_1: 'instructor:1' } };
      return [
        { type: 'collection', line: 19, message: 'One list holds objects from two different concrete classes.', frame: frame(shared) },
        { type: 'bind', line: 20, message: 'The first iteration binds member to student:1.', frame: frame({ ...shared, references: { ...shared.references, member: 'student:1' }, objects: [{ ...student, status: 'active' }, instructor] }) },
        { type: 'dispatch', line: 21, message: 'Lookup starts at Student and selects Student.role_summary.', frame: frame({ ...shared, references: { ...shared.references, member: 'student:1' }, active: { receiverId: 'student:1', method: 'Student.role_summary', lookupPath: ['class:Student'], callFrame: { self: 'student:1' } }, output: [`${input.studentName} studies BSIT`] }) },
        { type: 'bind', line: 20, message: 'The second iteration binds the same variable to instructor:1.', frame: frame({ ...shared, references: { ...shared.references, member: 'instructor:1' }, objects: [student, { ...instructor, status: 'active' }], output: [`${input.studentName} studies BSIT`] }) },
        { type: 'dispatch', line: 21, message: 'The same call now selects Instructor.role_summary.', frame: frame({ ...shared, references: { ...shared.references, member: 'instructor:1' }, active: { receiverId: 'instructor:1', method: 'Instructor.role_summary', lookupPath: ['class:Instructor'], callFrame: { self: 'instructor:1' } }, output: [`${input.studentName} studies BSIT`, `${input.instructorName} teaches Python`] }) },
      ];
    },
  });

  const activities = Object.freeze([classes, objects, encapsulation, inheritance, abstraction, polymorphism]);
  function list() { return Object.freeze([...activities]); }
  function get(id) { return activities.find((item) => item.id === id) || activities[0]; }
  const api = Object.freeze({ SCHEMA_VERSION, CONTENT_VERSION, list, get });
  if (typeof BSITLearningLab !== 'undefined') BSITLearningLab.registerActivities('itcc45', api);
  return api;
})();
