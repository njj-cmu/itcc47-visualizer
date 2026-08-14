/* Deterministic Python OOP activities for the guided ITCC45 Object Lab. */
const ITCC45Activities = (() => {
  const SCHEMA_VERSION = 1;
  const CONTENT_VERSION = '2026.09';

  function classModel(id, name, options = {}) {
    return { id, name, bases: [...(options.bases || [])], attributes: [...(options.attributes || [])],
      methods: [...(options.methods || [])], abstractMethods: [...(options.abstractMethods || [])], status: options.status || 'ready' };
  }
  function objectModel(id, classId, label, fields, status = 'ready') { return { id, classId, label, fields: { ...fields }, status }; }
  function frame(spec = {}) {
    return { kind: 'object-model', classes: (spec.classes || []).map((item) => ({ ...item })),
      objects: (spec.objects || []).map((item) => ({ ...item, fields: { ...item.fields } })),
      references: { ...(spec.references || {}) }, active: spec.active ? { ...spec.active, lookupPath: [...(spec.active.lookupPath || [])], callFrame: { ...(spec.active.callFrame || {}) } } : null,
      output: [...(spec.output || [])], annotations: (spec.annotations || []).map((item) => ({ ...item })), notice: spec.notice || '' };
  }
  function event(activityId, index, type, message, currentFrame, source, line, terminal = false, phase = null) {
    return BSITPlayback.timelineEvent({ id: `${activityId}:${index}`, domain: 'python-oop', type, message, frame: currentFrame,
      source: line ? { line, code: source[line - 1] || '' } : null,
      segment: phase ? { id: phase, label: phase === 'attempt' ? 'Attempt' : phase === 'repair' ? 'Repair' : phase } : null,
      terminal });
  }
  function activity(spec) {
    const defaults = Object.freeze({ ...(spec.defaults || {}) });
    const item = {
      id: spec.id, courseId: 'itcc45', contentVersion: CONTENT_VERSION, module: spec.number, topicId: spec.topicId,
      topic: spec.topic, family: 'Python OOP', title: spec.title, subtitle: spec.subtitle,
      context: spec.context, exampleOrder: spec.exampleOrder, learningGoal: spec.learningGoal,
      misconceptionIds: Object.freeze([...(spec.misconceptionIds || [])]),
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
        const events = built.map((row, index) => event(spec.id, index, row.type, row.message, row.frame, source, row.line, index === built.length - 1, row.phase));
        return BSITPlayback.runResult({ events, capabilities: { visualize: true, trace: true, variables: true, operations: false, output: true }, result: { output: events.at(-1)?.frame.output || [] } });
      },
    };
    item.source = Object.freeze(item.sourceFor(defaults));
    return Object.freeze(item);
  }

  const classes = activity({
    id: 'itcc45-classes-blueprint', number: 1, topicId: 'classes', topic: 'Classes',
    context: 'classroom', exampleOrder: 1, learningGoal: 'Read a class as a blueprint and follow self through initialization.', misconceptionIds: ['class-is-not-object', 'self-binds-instance'],
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
    context: 'real-world', exampleOrder: 3, learningGoal: 'Distinguish independent objects from two names for the same object.', misconceptionIds: ['alias-is-not-copy'],
    title: 'Objects: track two library books', subtitle: 'Create separate books, check out one, then give the same object a second reference.',
    blurb: 'Variables hold references to objects. Separate library records keep separate state, while aliases share one record.',
    defaults: { firstTitle: 'Clean Code', secondTitle: 'Python Crash Course', borrower: 'Ana' }, controls: [{ key: 'firstTitle', label: 'First book title', type: 'text', maxLength: 30 }, { key: 'secondTitle', label: 'Second book title', type: 'text', maxLength: 30 }, { key: 'borrower', label: 'Borrower', type: 'text', maxLength: 18 }],
    source: ({ firstTitle, secondTitle, borrower }) => ['class LibraryBook:', '    def __init__(self, title):', '        self.title = title', '        self.borrower = None', '', '    def summary(self):', '        status = self.borrower or "available"', '        return f"{self.title}: {status}"', '', `first = LibraryBook(${JSON.stringify(firstTitle)})`, `second = LibraryBook(${JSON.stringify(secondTitle)})`, 'checked_out = first', `first.borrower = ${JSON.stringify(borrower)}`, 'print(first.summary())', 'print(second.summary())', 'print(checked_out is first)'],
    expectedOutput: ['Clean Code: Ana', 'Python Crash Course: available', 'True'],
    timeline(input) {
      const bookClass = classModel('class:LibraryBook', 'LibraryBook', { methods: ['__init__(self, title)', 'summary(self)'] });
      const first = objectModel('book:1', 'class:LibraryBook', input.firstTitle, { title: input.firstTitle, borrower: null });
      const second = objectModel('book:2', 'class:LibraryBook', input.secondTitle, { title: input.secondTitle, borrower: null });
      return [
        { type: 'ready', line: 1, message: 'The LibraryBook blueprint is ready.', frame: frame({ classes: [bookClass] }) },
        { type: 'instantiate', line: 10, message: `first now refers to book:1 (${input.firstTitle}).`, frame: frame({ classes: [bookClass], objects: [{ ...first, status: 'active' }], references: { first: 'book:1' }, active: { receiverId: 'book:1', method: 'LibraryBook.__init__', lookupPath: ['class:LibraryBook'], callFrame: { self: 'book:1' } } }) },
        { type: 'instantiate', line: 11, message: `second refers to a different object, book:2 (${input.secondTitle}).`, frame: frame({ classes: [bookClass], objects: [first, { ...second, status: 'active' }], references: { first: 'book:1', second: 'book:2' }, active: { receiverId: 'book:2', method: 'LibraryBook.__init__', lookupPath: ['class:LibraryBook'], callFrame: { self: 'book:2' } } }) },
        { type: 'alias', line: 12, message: 'checked_out copies the first reference, not the book object.', frame: frame({ classes: [bookClass], objects: [{ ...first, status: 'active' }, second], references: { first: 'book:1', second: 'book:2', checked_out: 'book:1' }, notice: 'first and checked_out point to the same identity.' }) },
        { type: 'mutate', line: 13, message: `Only book:1 records ${input.borrower}; book:2 stays available.`, frame: frame({ classes: [bookClass], objects: [{ ...first, fields: { ...first.fields, borrower: input.borrower }, status: 'active' }, second], references: { first: 'book:1', second: 'book:2', checked_out: 'book:1' } }) },
        { type: 'output', line: 16, message: 'The records remain independent, and the alias test is true.', frame: frame({ classes: [bookClass], objects: [{ ...first, fields: { ...first.fields, borrower: input.borrower } }, second], references: { first: 'book:1', second: 'book:2', checked_out: 'book:1' }, output: [`${input.firstTitle}: ${input.borrower}`, `${input.secondTitle}: available`, 'True'] }) },
      ];
    },
  });

  const encapsulation = activity({
    id: 'itcc45-encapsulation-property', number: 3, topicId: 'encapsulation', topic: 'Encapsulation',
    context: 'classroom', exampleOrder: 1, learningGoal: 'Use a property to preserve valid object state.', misconceptionIds: ['property-preserves-invariant'],
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
    context: 'real-world', exampleOrder: 2, learningGoal: 'Trace inherited methods, overrides, and super() through lookup.', misconceptionIds: ['lookup-starts-at-runtime-class', 'super-continues-in-base'],
    title: 'Inheritance: calculate an express delivery', subtitle: 'Initialize the Delivery base, inherit label(), and override fee().',
    blurb: 'Single inheritance lets a subclass reuse a base interface while specializing selected behavior.',
    defaults: { trackingId: 'PKG-204', destination: 'Cagayan de Oro', priority: 2 }, controls: [{ key: 'trackingId', label: 'Tracking ID', type: 'text', maxLength: 18 }, { key: 'destination', label: 'Destination', type: 'text', maxLength: 30 }, { key: 'priority', label: 'Priority level', type: 'number', min: 1, max: 5 }],
    source: ({ trackingId, destination, priority }) => ['class Delivery:', '    def __init__(self, tracking_id, destination):', '        self.tracking_id = tracking_id', '        self.destination = destination', '', '    def label(self):', '        return f"{self.tracking_id} -> {self.destination}"', '', '    def fee(self):', '        return 50', '', 'class ExpressDelivery(Delivery):', '    def __init__(self, tracking_id, destination, priority):', '        super().__init__(tracking_id, destination)', '        self.priority = priority', '', '    def fee(self):', '        return 50 + self.priority * 15', '', `delivery = ExpressDelivery(${JSON.stringify(trackingId)}, ${JSON.stringify(destination)}, ${priority})`, 'print(delivery.label())', 'print(delivery.fee())'],
    expectedOutput: ['PKG-204 -> Cagayan de Oro', '80'],
    timeline(input) {
      const base = classModel('class:Delivery', 'Delivery', { methods: ['__init__(self, tracking_id, destination)', 'label(self)', 'fee(self)'] });
      const express = classModel('class:ExpressDelivery', 'ExpressDelivery', { bases: ['class:Delivery'], methods: ['__init__(self, tracking_id, destination, priority)', 'fee(self)'] });
      const delivery = objectModel('delivery:1', 'class:ExpressDelivery', input.trackingId, { tracking_id: input.trackingId, destination: input.destination, priority: input.priority });
      const fee = 50 + input.priority * 15;
      return [
        { type: 'hierarchy', line: 12, message: 'ExpressDelivery declares Delivery as its base class.', frame: frame({ classes: [base, { ...express, status: 'active' }] }) },
        { type: 'instantiate', line: 20, message: 'Create delivery:1 as an ExpressDelivery instance.', frame: frame({ classes: [base, express], objects: [{ ...delivery, fields: {} }], references: { delivery: 'delivery:1' }, active: { receiverId: 'delivery:1', method: 'ExpressDelivery.__init__', lookupPath: ['class:ExpressDelivery'], callFrame: { self: 'delivery:1' } } }) },
        { type: 'super', line: 14, message: 'super() continues initialization in Delivery.', frame: frame({ classes: [base, express], objects: [{ ...delivery, fields: { tracking_id: input.trackingId, destination: input.destination }, status: 'active' }], references: { delivery: 'delivery:1' }, active: { receiverId: 'delivery:1', method: 'Delivery.__init__', lookupPath: ['class:ExpressDelivery', 'class:Delivery'], callFrame: { self: 'delivery:1', tracking_id: input.trackingId, destination: input.destination } } }) },
        { type: 'inherit', line: 21, message: 'label is absent on ExpressDelivery, so lookup continues to Delivery.', frame: frame({ classes: [base, express], objects: [delivery], references: { delivery: 'delivery:1' }, active: { receiverId: 'delivery:1', method: 'Delivery.label', lookupPath: ['class:ExpressDelivery', 'class:Delivery'], callFrame: { self: 'delivery:1' } }, output: [`${input.trackingId} -> ${input.destination}`] }) },
        { type: 'override', line: 22, message: 'fee is found directly on ExpressDelivery.', frame: frame({ classes: [base, express], objects: [delivery], references: { delivery: 'delivery:1' }, active: { receiverId: 'delivery:1', method: 'ExpressDelivery.fee', lookupPath: ['class:ExpressDelivery'], callFrame: { self: 'delivery:1' } }, output: [`${input.trackingId} -> ${input.destination}`, String(fee)] }) },
      ];
    },
  });

  const abstraction = activity({
    id: 'itcc45-abstraction-contract', number: 5, topicId: 'abstraction', topic: 'Class Abstraction',
    context: 'real-world', exampleOrder: 3, learningGoal: 'See how an ABC makes a required behavior enforceable.', misconceptionIds: ['incomplete-abc-cannot-instantiate'],
    title: 'Class abstraction: require a payment contract', subtitle: 'Compare an incomplete bank transfer with an e-wallet that implements pay().',
    blurb: 'Abstraction presents the behavior clients need and hides the implementation choice. ABC makes that contract enforceable.',
    defaults: { wallet: 'GCash', amount: 349.5 }, controls: [{ key: 'wallet', label: 'E-wallet name', type: 'text', maxLength: 18 }, { key: 'amount', label: 'Payment amount', type: 'number', min: 1, max: 10000 }],
    source: ({ wallet, amount }) => ['from abc import ABC, abstractmethod', '', 'class PaymentMethod(ABC):', '    def __init__(self, account):', '        self.account = account', '', '    @abstractmethod', '    def pay(self, amount):', '        pass', '', 'class BankTransfer(PaymentMethod):', '    pass', '', 'class EWallet(PaymentMethod):', '    def pay(self, amount):', '        return f"Paid P{amount:.2f} with {self.account}"', '', 'try:', '    BankTransfer("Savings")', 'except TypeError:', '    print("BankTransfer is incomplete")', '', `print(EWallet(${JSON.stringify(wallet)}).pay(${amount}))`],
    expectedOutput: ['BankTransfer is incomplete', 'Paid P349.50 with GCash'],
    timeline(input) {
      const base = classModel('class:PaymentMethod', 'PaymentMethod', { attributes: ['account'], methods: ['__init__(self, account)'], abstractMethods: ['pay(self, amount)'], status: 'abstract' });
      const bank = classModel('class:BankTransfer', 'BankTransfer', { bases: ['class:PaymentMethod'], status: 'incomplete' });
      const walletClass = classModel('class:EWallet', 'EWallet', { bases: ['class:PaymentMethod'], methods: ['pay(self, amount)'] });
      const wallet = objectModel('wallet:1', 'class:EWallet', input.wallet, { account: input.wallet });
      const paid = `Paid P${Number(input.amount).toFixed(2)} with ${input.wallet}`;
      return [
        { type: 'abstract', line: 7, message: 'PaymentMethod requires every concrete payment class to provide pay.', frame: frame({ classes: [{ ...base, status: 'active' }], notice: 'Callers see the payment contract without depending on its implementation.' }) },
        { type: 'incomplete', line: 11, message: 'BankTransfer inherits the contract but supplies no implementation.', frame: frame({ classes: [base, { ...bank, status: 'active' }] }) },
        { type: 'reject', line: 19, message: 'Python blocks BankTransfer construction with TypeError.', frame: frame({ classes: [base, { ...bank, status: 'rejected' }], notice: 'No BankTransfer object is allocated.' }) },
        { type: 'concrete', line: 15, message: 'EWallet fulfills the contract with pay.', frame: frame({ classes: [base, bank, { ...walletClass, status: 'active' }] }) },
        { type: 'output', line: 23, message: 'EWallet is concrete, so Python creates it and calls pay.', frame: frame({ classes: [base, bank, walletClass], objects: [{ ...wallet, status: 'active' }], references: { payment: 'wallet:1' }, active: { receiverId: 'wallet:1', method: 'EWallet.pay', lookupPath: ['class:EWallet'], callFrame: { self: 'wallet:1', amount: input.amount } }, output: ['BankTransfer is incomplete', paid] }) },
      ];
    },
  });

  const polymorphism = activity({
    id: 'itcc45-polymorphic-dispatch', number: 6, topicId: 'polymorphism', topic: 'Polymorphism',
    context: 'real-world', exampleOrder: 2, learningGoal: 'Follow the same method call to different runtime implementations.', misconceptionIds: ['runtime-dispatch'],
    title: 'Polymorphism: send one alert two ways', subtitle: 'Loop over email and SMS channels and let each object implement send().',
    blurb: 'Polymorphism replaces type-switching with a shared interface and runtime method dispatch.',
    defaults: { email: 'ana@example.com', phone: '09171234567', message: 'Class starts at 9 AM' }, controls: [{ key: 'email', label: 'Email address', type: 'text', maxLength: 36 }, { key: 'phone', label: 'Phone number', type: 'text', maxLength: 18 }, { key: 'message', label: 'Alert message', type: 'text', maxLength: 40 }],
    source: ({ email, phone, message }) => ['class EmailNotification:', '    def __init__(self, recipient):', '        self.recipient = recipient', '', '    def send(self, message):', '        return f"Email to {self.recipient}: {message}"', '', 'class SmsNotification:', '    def __init__(self, recipient):', '        self.recipient = recipient', '', '    def send(self, message):', '        return f"SMS to {self.recipient}: {message}"', '', `channels = [EmailNotification(${JSON.stringify(email)}),`, `            SmsNotification(${JSON.stringify(phone)})]`, `message = ${JSON.stringify(message)}`, 'for channel in channels:', '    print(channel.send(message))'],
    expectedOutput: ['Email to ana@example.com: Class starts at 9 AM', 'SMS to 09171234567: Class starts at 9 AM'],
    timeline(input) {
      const emailClass = classModel('class:EmailNotification', 'EmailNotification', { methods: ['__init__(self, recipient)', 'send(self, message)'] });
      const smsClass = classModel('class:SmsNotification', 'SmsNotification', { methods: ['__init__(self, recipient)', 'send(self, message)'] });
      const email = objectModel('notification:email', 'class:EmailNotification', 'Email channel', { recipient: input.email });
      const sms = objectModel('notification:sms', 'class:SmsNotification', 'SMS channel', { recipient: input.phone });
      const emailOutput = `Email to ${input.email}: ${input.message}`;
      const smsOutput = `SMS to ${input.phone}: ${input.message}`;
      const shared = { classes: [emailClass, smsClass], objects: [email, sms], references: { channels_0: 'notification:email', channels_1: 'notification:sms' } };
      return [
        { type: 'collection', line: 15, message: 'One list holds email and SMS channel objects.', frame: frame(shared) },
        { type: 'bind', line: 18, message: 'The first iteration binds channel to the email object.', frame: frame({ ...shared, references: { ...shared.references, channel: 'notification:email' }, objects: [{ ...email, status: 'active' }, sms] }) },
        { type: 'dispatch', line: 19, message: 'Lookup starts at EmailNotification and selects its send method.', frame: frame({ ...shared, references: { ...shared.references, channel: 'notification:email' }, active: { receiverId: 'notification:email', method: 'EmailNotification.send', lookupPath: ['class:EmailNotification'], callFrame: { self: 'notification:email', message: input.message } }, output: [emailOutput] }) },
        { type: 'bind', line: 18, message: 'The second iteration binds the same variable to the SMS object.', frame: frame({ ...shared, references: { ...shared.references, channel: 'notification:sms' }, objects: [email, { ...sms, status: 'active' }], output: [emailOutput] }) },
        { type: 'dispatch', line: 19, message: 'The same call now selects SmsNotification.send.', frame: frame({ ...shared, references: { ...shared.references, channel: 'notification:sms' }, active: { receiverId: 'notification:sms', method: 'SmsNotification.send', lookupPath: ['class:SmsNotification'], callFrame: { self: 'notification:sms', message: input.message } }, output: [emailOutput, smsOutput] }) },
      ];
    },
  });

  const classShadowing = activity({
    id: 'itcc45-classes-instance-shadowing', number: 1, topicId: 'classes', topic: 'Classes',
    context: 'classroom', exampleOrder: 2, learningGoal: 'Separate a class default from an instance attribute that shadows it.', misconceptionIds: ['class-instance-shadowing'],
    title: 'Classes: one section overrides the shared room', subtitle: 'Compare a class default with an attribute stored on just one CourseSection.',
    blurb: 'Attribute lookup checks the instance before the class. Assigning through one object can shadow a class default without changing it for other objects.',
    defaults: { firstCode: 'OOP101', secondCode: 'WEB101', defaultRoom: 'Lab 2', overrideRoom: 'Lab 5' },
    controls: [{ key: 'firstCode', label: 'First section', type: 'text', maxLength: 16 }, { key: 'secondCode', label: 'Second section', type: 'text', maxLength: 16 }, { key: 'defaultRoom', label: 'Class default room', type: 'text', maxLength: 18 }, { key: 'overrideRoom', label: 'First section room', type: 'text', maxLength: 18 }],
    source: ({ firstCode, secondCode, defaultRoom, overrideRoom }) => ['class CourseSection:', `    room = ${JSON.stringify(defaultRoom)}`, '', '    def __init__(self, code):', '        self.code = code', '', '    def location(self):', '        return f"{self.code}: {self.room}"', '', `oop = CourseSection(${JSON.stringify(firstCode)})`, `web = CourseSection(${JSON.stringify(secondCode)})`, `oop.room = ${JSON.stringify(overrideRoom)}`, 'print(oop.location())', 'print(web.location())', 'print(CourseSection.room)'],
    expectedOutput: ['OOP101: Lab 5', 'WEB101: Lab 2', 'Lab 2'],
    timeline(input) {
      const cls = classModel('class:CourseSection', 'CourseSection', { attributes: [`room = ${JSON.stringify(input.defaultRoom)} (class)`], methods: ['__init__(self, code)', 'location(self)'] });
      const first = objectModel('section:oop', 'class:CourseSection', input.firstCode, { code: input.firstCode });
      const second = objectModel('section:web', 'class:CourseSection', input.secondCode, { code: input.secondCode });
      const shared = { classes: [cls], references: { oop: 'section:oop', web: 'section:web' } };
      return [
        { type: 'class-attribute', line: 2, message: `${input.defaultRoom} belongs to CourseSection itself.`, frame: frame({ classes: [{ ...cls, status: 'active' }], annotations: [{ label: 'Owner', value: 'CourseSection.room' }] }) },
        { type: 'instantiate', line: 11, message: 'Create two objects; neither has its own room attribute yet.', frame: frame({ ...shared, objects: [first, second], notice: 'Both location() calls currently fall through to the class default.' }) },
        { type: 'shadow', line: 12, message: `Store room only on ${input.firstCode}; this shadows the class value for that object.`, frame: frame({ ...shared, objects: [{ ...first, fields: { ...first.fields, room: input.overrideRoom }, status: 'active' }, second], annotations: [{ label: 'Instance lookup', value: `oop.room = ${input.overrideRoom}` }, { label: 'Class fallback', value: `web.room = ${input.defaultRoom}` }] }) },
        { type: 'output', line: 15, message: 'The second object and the class still use the original default.', frame: frame({ ...shared, objects: [{ ...first, fields: { ...first.fields, room: input.overrideRoom } }, second], output: [`${input.firstCode}: ${input.overrideRoom}`, `${input.secondCode}: ${input.defaultRoom}`, input.defaultRoom] }) },
      ];
    },
  });

  const classSharedMutable = activity({
    id: 'itcc45-classes-shared-mutable', number: 1, topicId: 'classes', topic: 'Classes',
    context: 'real-world', exampleOrder: 3, learningGoal: 'Recognize and repair an accidentally shared mutable class attribute.', misconceptionIds: ['mutable-class-attribute-shared'],
    title: 'Classes: repair a cart shared by every shopper', subtitle: 'Watch a class-level list leak between carts, then move it into __init__.',
    blurb: 'A mutable class attribute is one shared object. Per-instance collections normally belong in __init__ so each instance receives its own list.',
    defaults: { item: 'Notebook' }, controls: [{ key: 'item', label: 'Item to add', type: 'text', maxLength: 24 }],
    source: ({ item }) => ['class SharedCart:', '    items = []', '', '    def add(self, item):', '        self.items.append(item)', '', 'first = SharedCart()', 'second = SharedCart()', `first.add(${JSON.stringify(item)})`, 'print(f"shared second: {\', \'.join(second.items) or \'empty\'}")', '', 'class ShoppingCart:', '    def __init__(self):', '        self.items = []', '', '    def add(self, item):', '        self.items.append(item)', '', 'fixed_first = ShoppingCart()', 'fixed_second = ShoppingCart()', `fixed_first.add(${JSON.stringify(item)})`, 'print(f"fixed second: {\', \'.join(fixed_second.items) or \'empty\'}")'],
    expectedOutput: ['shared second: Notebook', 'fixed second: empty'],
    timeline(input) {
      const broken = classModel('class:SharedCart', 'SharedCart', { attributes: ['items = [] (shared)'], methods: ['add(self, item)'] });
      const repaired = classModel('class:ShoppingCart', 'ShoppingCart', { methods: ['__init__(self)', 'add(self, item)'] });
      return [
        { type: 'attempt', phase: 'attempt', line: 2, message: 'The list is created once on SharedCart, not once per object.', frame: frame({ classes: [{ ...broken, status: 'active' }], annotations: [{ label: 'Shared owner', value: 'SharedCart.items' }] }) },
        { type: 'leak', phase: 'attempt', line: 10, message: `Adding ${input.item} through first is visible through second.`, frame: frame({ classes: [broken], objects: [objectModel('cart:first', 'class:SharedCart', 'first cart', {}), objectModel('cart:second', 'class:SharedCart', 'second cart', {})], references: { first: 'cart:first', second: 'cart:second' }, output: [`shared second: ${input.item}`], notice: 'Both objects resolve self.items to the same class-level list.' }) },
        { type: 'repair', phase: 'repair', line: 14, message: '__init__ now allocates a fresh list for each ShoppingCart.', frame: frame({ classes: [broken, { ...repaired, status: 'active' }], annotations: [{ label: 'Per-instance owner', value: 'self.items' }] }) },
        { type: 'independent', phase: 'repair', line: 22, message: 'The repaired second cart remains empty.', frame: frame({ classes: [broken, repaired], objects: [objectModel('fixed:first', 'class:ShoppingCart', 'fixed first', { items: [input.item] }), objectModel('fixed:second', 'class:ShoppingCart', 'fixed second', { items: [] })], references: { fixed_first: 'fixed:first', fixed_second: 'fixed:second' }, annotations: [{ label: 'Per-instance owner', value: 'self.items' }], output: [`shared second: ${input.item}`, 'fixed second: empty'], notice: 'The same operation now affects only its receiver.' }) },
      ];
    },
  });

  const objectIndependentState = activity({
    id: 'itcc45-objects-independent-state', number: 2, topicId: 'objects', topic: 'Objects',
    context: 'classroom', exampleOrder: 1, learningGoal: 'Follow two instances of one class as their states diverge.', misconceptionIds: ['instances-own-state'],
    title: 'Objects: two lab computers keep separate sessions', subtitle: 'Log in on one computer and verify that the other object remains available.',
    blurb: 'Objects created from the same class share behavior, not their instance fields. A method changes the receiver bound to self.',
    defaults: { firstLabel: 'PC-01', secondLabel: 'PC-02', user: 'Ana' }, controls: [{ key: 'firstLabel', label: 'First computer', type: 'text', maxLength: 14 }, { key: 'secondLabel', label: 'Second computer', type: 'text', maxLength: 14 }, { key: 'user', label: 'User', type: 'text', maxLength: 18 }],
    source: ({ firstLabel, secondLabel, user }) => ['class LabComputer:', '    def __init__(self, label):', '        self.label = label', '        self.user = None', '', '    def log_in(self, user):', '        self.user = user', '', '    def status(self):', '        return self.user or "available"', '', `first = LabComputer(${JSON.stringify(firstLabel)})`, `second = LabComputer(${JSON.stringify(secondLabel)})`, `first.log_in(${JSON.stringify(user)})`, 'print(f"{first.label}: {first.status()}")', 'print(f"{second.label}: {second.status()}")'],
    expectedOutput: ['PC-01: Ana', 'PC-02: available'],
    timeline(input) {
      const cls = classModel('class:LabComputer', 'LabComputer', { methods: ['__init__(self, label)', 'log_in(self, user)', 'status(self)'] });
      const first = objectModel('computer:1', 'class:LabComputer', input.firstLabel, { label: input.firstLabel, user: null });
      const second = objectModel('computer:2', 'class:LabComputer', input.secondLabel, { label: input.secondLabel, user: null });
      const refs = { first: 'computer:1', second: 'computer:2' };
      return [
        { type: 'instantiate', line: 13, message: 'Two constructor calls allocate two identities.', frame: frame({ classes: [cls], objects: [first, second], references: refs, annotations: [{ label: 'Identity count', value: '2 objects' }] }) },
        { type: 'call', line: 14, message: `self is computer:1, so only ${input.firstLabel} stores ${input.user}.`, frame: frame({ classes: [cls], objects: [{ ...first, fields: { ...first.fields, user: input.user }, status: 'active' }, second], references: refs, active: { receiverId: 'computer:1', method: 'LabComputer.log_in', lookupPath: ['class:LabComputer'], callFrame: { self: 'computer:1', user: input.user } } }) },
        { type: 'output', line: 16, message: `${input.secondLabel} retains its own available state.`, frame: frame({ classes: [cls], objects: [{ ...first, fields: { ...first.fields, user: input.user } }, second], references: refs, output: [`${input.firstLabel}: ${input.user}`, `${input.secondLabel}: available`] }) },
      ];
    },
  });

  const objectIdentity = activity({
    id: 'itcc45-objects-identity-alias', number: 2, topicId: 'objects', topic: 'Objects',
    context: 'textbook', exampleOrder: 2, learningGoal: 'Separate equal field values, object identity, and reference aliasing.', misconceptionIds: ['equal-state-not-same-identity'],
    title: 'Objects: equal points are not the same object', subtitle: 'Compare two matching Point instances with an alias of the first.',
    blurb: 'Two objects may contain equal state while having different identities. Assignment copies a reference; it does not recreate the object.',
    defaults: { x: 2, y: 3 }, controls: [{ key: 'x', label: 'x coordinate', type: 'number', min: -20, max: 20 }, { key: 'y', label: 'y coordinate', type: 'number', min: -20, max: 20 }],
    source: ({ x, y }) => ['class Point:', '    def __init__(self, x, y):', '        self.x = x', '        self.y = y', '', '    def same_position(self, other):', '        return self.x == other.x and self.y == other.y', '', `first = Point(${x}, ${y})`, `second = Point(${x}, ${y})`, 'alias = first', 'print(first.same_position(second))', 'print(first is second)', 'print(alias is first)'],
    expectedOutput: ['True', 'False', 'True'],
    timeline(input) {
      const cls = classModel('class:Point', 'Point', { methods: ['__init__(self, x, y)', 'same_position(self, other)'] });
      const first = objectModel('point:1', 'class:Point', 'first point', { x: input.x, y: input.y });
      const second = objectModel('point:2', 'class:Point', 'second point', { x: input.x, y: input.y });
      return [
        { type: 'instantiate', line: 10, message: 'Matching constructor values still allocate two objects.', frame: frame({ classes: [cls], objects: [first, second], references: { first: 'point:1', second: 'point:2' }, annotations: [{ label: 'State comparison', value: 'equal' }, { label: 'Identity comparison', value: 'different' }] }) },
        { type: 'alias', line: 11, message: 'alias receives the reference already stored in first.', frame: frame({ classes: [cls], objects: [{ ...first, status: 'active' }, second], references: { first: 'point:1', second: 'point:2', alias: 'point:1' }, notice: 'first and alias name one identity; second names another.' }) },
        { type: 'output', line: 14, message: 'Value equality and identity answer different questions.', frame: frame({ classes: [cls], objects: [first, second], references: { first: 'point:1', second: 'point:2', alias: 'point:1' }, output: ['True', 'False', 'True'] }) },
      ];
    },
  });

  const encapsulationRecursiveSetter = activity({
    id: 'itcc45-encapsulation-recursive-setter', number: 3, topicId: 'encapsulation', topic: 'Encapsulation',
    context: 'textbook', exampleOrder: 2, learningGoal: 'Diagnose a property setter that calls itself and repair it with a backing attribute.', misconceptionIds: ['recursive-property-setter'],
    title: 'Encapsulation: repair a recursive temperature setter', subtitle: 'Catch the self-assignment loop, then store the value in _celsius.',
    blurb: 'A setter must write to a different backing attribute. Assigning to the property from inside its own setter invokes the same setter again.',
    defaults: { temperature: 24 }, controls: [{ key: 'temperature', label: 'Temperature', type: 'number', min: -50, max: 100 }],
    source: ({ temperature }) => ['class BrokenTemperature:', '    def __init__(self, value):', '        self.celsius = value', '', '    @property', '    def celsius(self):', '        return self._celsius', '', '    @celsius.setter', '    def celsius(self, value):', '        self.celsius = value', '', 'try:', `    BrokenTemperature(${temperature})`, 'except RecursionError:', '    print("recursive setter rejected")', '', 'class Temperature:', '    def __init__(self, value):', '        self.celsius = value', '', '    @property', '    def celsius(self):', '        return self._celsius', '', '    @celsius.setter', '    def celsius(self, value):', '        self._celsius = value', '', `fixed = Temperature(${temperature})`, 'print(f"stored: {fixed.celsius}")'],
    expectedOutput: ['recursive setter rejected', 'stored: 24'],
    timeline(input) {
      const broken = classModel('class:BrokenTemperature', 'BrokenTemperature', { attributes: ['_celsius (expected backing field)'], methods: ['celsius (property)', 'celsius (setter)'] });
      const fixed = classModel('class:Temperature', 'Temperature', { attributes: ['_celsius (backing field)'], methods: ['celsius (property)', 'celsius (setter)'] });
      return [
        { type: 'attempt', phase: 'attempt', line: 11, message: 'self.celsius invokes the same setter again instead of storing data.', frame: frame({ classes: [{ ...broken, status: 'active' }], annotations: [{ label: 'Call cycle', value: 'setter -> setter -> setter' }] }) },
        { type: 'reject', phase: 'attempt', line: 16, message: 'Python raises RecursionError before an object can finish initialization.', frame: frame({ classes: [{ ...broken, status: 'rejected' }], output: ['recursive setter rejected'], notice: 'Expected error: no BrokenTemperature instance is retained.' }) },
        { type: 'repair', phase: 'repair', line: 28, message: 'The repaired setter writes to _celsius, a different attribute.', frame: frame({ classes: [broken, { ...fixed, status: 'active' }], annotations: [{ label: 'Public interface', value: 'celsius' }, { label: 'Backing state', value: '_celsius' }] }) },
        { type: 'output', phase: 'repair', line: 31, message: `The property now returns the stored value ${input.temperature}.`, frame: frame({ classes: [broken, fixed], objects: [objectModel('temperature:1', 'class:Temperature', 'fixed temperature', { _celsius: input.temperature }, 'active')], references: { fixed: 'temperature:1' }, output: ['recursive setter rejected', `stored: ${input.temperature}`] }) },
      ];
    },
  });

  const encapsulationPrivacy = activity({
    id: 'itcc45-encapsulation-python-privacy', number: 3, topicId: 'encapsulation', topic: 'Encapsulation',
    context: 'real-world', exampleOrder: 3, learningGoal: 'Interpret underscore conventions and Python name-mangling without mistaking them for security.', misconceptionIds: ['python-privacy-is-convention', 'name-mangling-not-security'],
    title: 'Encapsulation: inspect a student portal token', subtitle: 'Compare a protected-by-convention name with a name-mangled token.',
    blurb: 'A leading underscore asks callers not to depend on an attribute. Two leading underscores trigger name-mangling, which prevents accidental clashes but is not access control.',
    defaults: { displayName: 'Ana', token: '482913' }, controls: [{ key: 'displayName', label: 'Display name', type: 'text', maxLength: 18 }, { key: 'token', label: 'Demo token', type: 'text', maxLength: 12 }],
    source: ({ displayName, token }) => ['class StudentPortal:', '    def __init__(self, display_name, token):', '        self._display_name = display_name', '        self.__token = token', '', '    def masked_token(self):', '        return "*" * max(0, len(self.__token) - 2) + self.__token[-2:]', '', `portal = StudentPortal(${JSON.stringify(displayName)}, ${JSON.stringify(token)})`, 'print(portal._display_name)', 'print(portal.masked_token())', 'print(hasattr(portal, "__token"))', 'print(hasattr(portal, "_StudentPortal__token"))'],
    expectedOutput: ['Ana', '****13', 'False', 'True'],
    timeline(input) {
      const mangled = '_StudentPortal__token';
      const masked = '*'.repeat(Math.max(0, input.token.length - 2)) + input.token.slice(-2);
      const cls = classModel('class:StudentPortal', 'StudentPortal', { attributes: ['_display_name (convention)', '__token (name-mangled)'], methods: ['masked_token(self)'] });
      const portal = objectModel('portal:1', 'class:StudentPortal', input.displayName, { _display_name: input.displayName, [mangled]: input.token });
      return [
        { type: 'convention', line: 3, message: '_display_name remains directly accessible; the underscore communicates intended use.', frame: frame({ classes: [{ ...cls, status: 'active' }], annotations: [{ label: 'Convention', value: '_name means internal use' }] }) },
        { type: 'mangle', line: 4, message: `Python stores __token under the generated name ${mangled}.`, frame: frame({ classes: [cls], objects: [{ ...portal, status: 'active' }], references: { portal: 'portal:1' }, annotations: [{ label: 'Source spelling', value: '__token' }, { label: 'Stored spelling', value: mangled }] }) },
        { type: 'interface', line: 11, message: 'Callers use masked_token() instead of depending on the storage name.', frame: frame({ classes: [cls], objects: [portal], references: { portal: 'portal:1' }, active: { receiverId: 'portal:1', method: 'StudentPortal.masked_token', lookupPath: ['class:StudentPortal'], callFrame: { self: 'portal:1' } }, output: [input.displayName, masked] }) },
        { type: 'output', line: 13, message: 'Name-mangling changes lookup spelling, but does not make the value secret.', frame: frame({ classes: [cls], objects: [portal], references: { portal: 'portal:1' }, output: [input.displayName, masked, 'False', 'True'], notice: 'Use real authorization and secret storage for security; underscores are an API design convention.' }) },
      ];
    },
  });

  const inheritanceCampusRoles = activity({
    id: 'itcc45-inheritance-campus-roles', number: 4, topicId: 'inheritance', topic: 'Inheritance',
    context: 'classroom', exampleOrder: 1, learningGoal: 'Read one base class with two specialized subclasses and trace inherited behavior.', misconceptionIds: ['subclass-is-a-base', 'inherited-method-keeps-self'],
    title: 'Inheritance: connect campus roles to Person', subtitle: 'Reuse introduce() while Student and Instructor provide their own role summaries.',
    blurb: 'A subclass is also an instance of its base type. Inherited methods still receive the actual Student or Instructor object as self.',
    defaults: { studentName: 'Ana', instructorName: 'Mia', program: 'BSIT', subject: 'OOP' }, controls: [{ key: 'studentName', label: 'Student', type: 'text', maxLength: 18 }, { key: 'instructorName', label: 'Instructor', type: 'text', maxLength: 18 }, { key: 'program', label: 'Program', type: 'text', maxLength: 16 }, { key: 'subject', label: 'Subject', type: 'text', maxLength: 16 }],
    source: ({ studentName, instructorName, program, subject }) => ['class Person:', '    def __init__(self, name):', '        self.name = name', '', '    def introduce(self):', '        return f"{self.name} is on campus"', '', 'class Student(Person):', '    def role(self):', '        return f"{self.name} studies {self.program}"', '', 'class Instructor(Person):', '    def role(self):', '        return f"{self.name} teaches {self.subject}"', '', `student = Student(${JSON.stringify(studentName)})`, `student.program = ${JSON.stringify(program)}`, `instructor = Instructor(${JSON.stringify(instructorName)})`, `instructor.subject = ${JSON.stringify(subject)}`, 'print(student.introduce())', 'print(student.role())', 'print(instructor.role())'],
    expectedOutput: ['Ana is on campus', 'Ana studies BSIT', 'Mia teaches OOP'],
    timeline(input) {
      const person = classModel('class:Person', 'Person', { methods: ['__init__(self, name)', 'introduce(self)'] });
      const studentClass = classModel('class:Student', 'Student', { bases: ['class:Person'], methods: ['role(self)'] });
      const instructorClass = classModel('class:Instructor', 'Instructor', { bases: ['class:Person'], methods: ['role(self)'] });
      const student = objectModel('student:1', 'class:Student', input.studentName, { name: input.studentName, program: input.program });
      const instructor = objectModel('instructor:1', 'class:Instructor', input.instructorName, { name: input.instructorName, subject: input.subject });
      const common = { classes: [person, studentClass, instructorClass], objects: [student, instructor], references: { student: 'student:1', instructor: 'instructor:1' } };
      return [
        { type: 'hierarchy', line: 12, message: 'Student and Instructor both declare Person as their base.', frame: frame({ classes: [person, { ...studentClass, status: 'active' }, { ...instructorClass, status: 'active' }] }) },
        { type: 'instantiate', line: 18, message: 'Each subclass instance contains the inherited name state plus its role-specific state.', frame: frame(common) },
        { type: 'inherit', line: 20, message: 'introduce is absent on Student, so lookup continues to Person.', frame: frame({ ...common, active: { receiverId: 'student:1', method: 'Person.introduce', lookupPath: ['class:Student', 'class:Person'], callFrame: { self: 'student:1' } }, output: [`${input.studentName} is on campus`] }) },
        { type: 'specialize', line: 22, message: 'Each role() call resolves on the receiver\'s own subclass.', frame: frame({ ...common, active: { receiverId: 'instructor:1', method: 'Instructor.role', lookupPath: ['class:Instructor'], callFrame: { self: 'instructor:1' } }, output: [`${input.studentName} is on campus`, `${input.studentName} studies ${input.program}`, `${input.instructorName} teaches ${input.subject}`] }) },
      ];
    },
  });

  const inheritanceMissingSuper = activity({
    id: 'itcc45-inheritance-missing-super', number: 4, topicId: 'inheritance', topic: 'Inheritance',
    context: 'real-world', exampleOrder: 3, learningGoal: 'Diagnose missing base initialization and repair it with super().', misconceptionIds: ['override-does-not-run-base-automatically'],
    title: 'Inheritance: repair an intern missing base state', subtitle: 'See why overriding __init__ skips Employee.__init__ until super() is called.',
    blurb: 'Defining a subclass constructor replaces the inherited constructor. Python does not automatically run the base initializer; the subclass must deliberately continue with super().',
    defaults: { name: 'Ana', hours: 120 }, controls: [{ key: 'name', label: 'Intern name', type: 'text', maxLength: 18 }, { key: 'hours', label: 'Training hours', type: 'number', min: 1, max: 500 }],
    source: ({ name, hours }) => ['class Employee:', '    def __init__(self, name):', '        self.name = name', '', '    def summary(self):', '        return f"{self.name}: {self.hours} hours"', '', 'class Intern(Employee):', '    def __init__(self, name, hours):', '        self.hours = hours', '', 'try:', `    print(Intern(${JSON.stringify(name)}, ${hours}).summary())`, 'except AttributeError:', '    print("missing base state")', '', 'class FixedIntern(Employee):', '    def __init__(self, name, hours):', '        super().__init__(name)', '        self.hours = hours', '', `print(FixedIntern(${JSON.stringify(name)}, ${hours}).summary())`],
    expectedOutput: ['missing base state', 'Ana: 120 hours'],
    timeline(input) {
      const employee = classModel('class:Employee', 'Employee', { methods: ['__init__(self, name)', 'summary(self)'] });
      const broken = classModel('class:Intern', 'Intern', { bases: ['class:Employee'], methods: ['__init__(self, name, hours)'] });
      const fixed = classModel('class:FixedIntern', 'FixedIntern', { bases: ['class:Employee'], methods: ['__init__(self, name, hours)'] });
      return [
        { type: 'attempt', phase: 'attempt', line: 10, message: 'Intern.__init__ stores hours but never creates the inherited name state.', frame: frame({ classes: [employee, { ...broken, status: 'active' }], objects: [objectModel('intern:broken', 'class:Intern', 'incomplete intern', { hours: input.hours }, 'rejected')], annotations: [{ label: 'Missing field', value: 'name' }] }) },
        { type: 'reject', phase: 'attempt', line: 15, message: 'Employee.summary reads self.name and raises AttributeError.', frame: frame({ classes: [employee, { ...broken, status: 'rejected' }], output: ['missing base state'], notice: 'Inheritance makes summary available; it does not guarantee the state summary expects.' }) },
        { type: 'super', phase: 'repair', line: 19, message: 'super().__init__ continues initialization in Employee using the same object.', frame: frame({ classes: [employee, broken, { ...fixed, status: 'active' }], objects: [objectModel('intern:fixed', 'class:FixedIntern', input.name, { name: input.name }, 'active')], references: { fixed: 'intern:fixed' }, active: { receiverId: 'intern:fixed', method: 'Employee.__init__', lookupPath: ['class:FixedIntern', 'class:Employee'], callFrame: { self: 'intern:fixed', name: input.name } } }) },
        { type: 'output', phase: 'repair', line: 22, message: 'The repaired object now contains both base and subclass state.', frame: frame({ classes: [employee, broken, fixed], objects: [objectModel('intern:fixed', 'class:FixedIntern', input.name, { name: input.name, hours: input.hours })], references: { fixed: 'intern:fixed' }, output: ['missing base state', `${input.name}: ${input.hours} hours`] }) },
      ];
    },
  });

  const abstractionHiddenDetails = activity({
    id: 'itcc45-abstraction-hidden-details', number: 5, topicId: 'abstraction', topic: 'Class Abstraction',
    context: 'classroom', exampleOrder: 1, learningGoal: 'Recognize abstraction before introducing abstract base classes.', misconceptionIds: ['abstraction-not-only-abc'],
    title: 'Class abstraction: export a report through one method', subtitle: 'Use export() without making the caller manage CSV formatting steps.',
    blurb: 'Abstraction begins by presenting a small useful interface and hiding implementation choices. An ABC is one enforcement tool, not the definition of abstraction itself.',
    defaults: { name: 'Ana', score: 91 }, controls: [{ key: 'name', label: 'Student name', type: 'text', maxLength: 18 }, { key: 'score', label: 'Score', type: 'number', min: 0, max: 100 }],
    source: ({ name, score }) => ['class ReportService:', '    def export(self, records):', '        lines = ["name,score"]', '        for record in records:', '            lines.append(f"{record[\'name\']},{record[\'score\']}")', '        return "\\n".join(lines)', '', 'service = ReportService()', `report = service.export([{"name": ${JSON.stringify(name)}, "score": ${score}}])`, 'print(report)'],
    expectedOutput: ['name,score', 'Ana,91'],
    timeline(input) {
      const cls = classModel('class:ReportService', 'ReportService', { methods: ['export(self, records)'] });
      const service = objectModel('service:1', 'class:ReportService', 'report service', {});
      return [
        { type: 'interface', line: 2, message: 'The caller needs one public operation: export(records).', frame: frame({ classes: [{ ...cls, status: 'active' }], annotations: [{ label: 'Public interface', value: 'export(records)' }] }) },
        { type: 'call', line: 9, message: 'The caller supplies records without coordinating headers, rows, or newline joining.', frame: frame({ classes: [cls], objects: [{ ...service, status: 'active' }], references: { service: 'service:1' }, active: { receiverId: 'service:1', method: 'ReportService.export', lookupPath: ['class:ReportService'], callFrame: { self: 'service:1', records: 1 } }, annotations: [{ label: 'Hidden steps', value: 'header + row + join' }] }) },
        { type: 'output', line: 10, message: 'The implementation details produce the promised report value.', frame: frame({ classes: [cls], objects: [service], references: { service: 'service:1' }, output: ['name,score', `${input.name},${input.score}`], notice: 'No ABC is required for this first layer of abstraction.' }) },
      ];
    },
  });

  const abstractionShape = activity({
    id: 'itcc45-abstraction-shape-contract', number: 5, topicId: 'abstraction', topic: 'Class Abstraction',
    context: 'textbook', exampleOrder: 2, learningGoal: 'Connect an abstract method contract to a concrete subclass implementation.', misconceptionIds: ['abstract-method-requires-implementation'],
    title: 'Class abstraction: make Shape require area()', subtitle: 'Declare a mathematical contract, then fulfill it with Rectangle.',
    blurb: 'An abstract base class can name behavior that all concrete shapes must provide while leaving each formula to the subclass.',
    defaults: { width: 4, height: 3 }, controls: [{ key: 'width', label: 'Width', type: 'number', min: 1, max: 30 }, { key: 'height', label: 'Height', type: 'number', min: 1, max: 30 }],
    source: ({ width, height }) => ['from abc import ABC, abstractmethod', '', 'class Shape(ABC):', '    @abstractmethod', '    def area(self):', '        pass', '', 'class Rectangle(Shape):', '    def __init__(self, width, height):', '        self.width = width', '        self.height = height', '', '    def area(self):', '        return self.width * self.height', '', `shape = Rectangle(${width}, ${height})`, 'print(f"area: {shape.area()}")'],
    expectedOutput: ['area: 12'],
    timeline(input) {
      const base = classModel('class:Shape', 'Shape', { abstractMethods: ['area(self)'], status: 'abstract' });
      const rectangle = classModel('class:Rectangle', 'Rectangle', { bases: ['class:Shape'], methods: ['__init__(self, width, height)', 'area(self)'] });
      const object = objectModel('shape:1', 'class:Rectangle', 'rectangle', { width: input.width, height: input.height });
      return [
        { type: 'abstract', line: 5, message: 'Shape states the area() requirement without choosing a formula.', frame: frame({ classes: [{ ...base, status: 'active' }], annotations: [{ label: 'Contract', value: 'area() must exist' }] }) },
        { type: 'concrete', line: 13, message: 'Rectangle supplies the missing formula and becomes concrete.', frame: frame({ classes: [base, { ...rectangle, status: 'active' }] }) },
        { type: 'instantiate', line: 16, message: 'Python can instantiate Rectangle because no abstract requirement remains.', frame: frame({ classes: [base, rectangle], objects: [{ ...object, status: 'active' }], references: { shape: 'shape:1' } }) },
        { type: 'output', line: 17, message: 'The caller relies on area(), while Rectangle owns the calculation.', frame: frame({ classes: [base, rectangle], objects: [object], references: { shape: 'shape:1' }, active: { receiverId: 'shape:1', method: 'Rectangle.area', lookupPath: ['class:Rectangle'], callFrame: { self: 'shape:1' } }, output: [`area: ${input.width * input.height}`] }) },
      ];
    },
  });

  const polymorphismClassroomRoles = activity({
    id: 'itcc45-polymorphism-classroom-roles', number: 6, topicId: 'polymorphism', topic: 'Polymorphism',
    context: 'classroom', exampleOrder: 1, learningGoal: 'See one loop dispatch the same message to different classroom roles.', misconceptionIds: ['same-call-different-method'],
    title: 'Polymorphism: ask each classroom role to introduce itself', subtitle: 'Bind one variable to Student and Instructor objects in turn.',
    blurb: 'A polymorphic call is selected from the object currently bound to the receiver variable, not from the variable name or list position.',
    defaults: { student: 'Ana', instructor: 'Mia' }, controls: [{ key: 'student', label: 'Student', type: 'text', maxLength: 18 }, { key: 'instructor', label: 'Instructor', type: 'text', maxLength: 18 }],
    source: ({ student, instructor }) => ['class Student:', '    def __init__(self, name):', '        self.name = name', '', '    def introduce(self):', '        return f"Student {self.name}"', '', 'class Instructor:', '    def __init__(self, name):', '        self.name = name', '', '    def introduce(self):', '        return f"Instructor {self.name}"', '', `roles = [Student(${JSON.stringify(student)}), Instructor(${JSON.stringify(instructor)})]`, 'for role in roles:', '    print(role.introduce())'],
    expectedOutput: ['Student Ana', 'Instructor Mia'],
    timeline(input) {
      const studentClass = classModel('class:Student', 'Student', { methods: ['__init__(self, name)', 'introduce(self)'] });
      const instructorClass = classModel('class:Instructor', 'Instructor', { methods: ['__init__(self, name)', 'introduce(self)'] });
      const student = objectModel('role:student', 'class:Student', input.student, { name: input.student });
      const instructor = objectModel('role:instructor', 'class:Instructor', input.instructor, { name: input.instructor });
      const shared = { classes: [studentClass, instructorClass], objects: [student, instructor], references: { roles_0: 'role:student', roles_1: 'role:instructor' } };
      return [
        { type: 'collection', line: 15, message: 'One list stores objects from two unrelated classes with a common method name.', frame: frame(shared) },
        { type: 'dispatch', line: 17, message: 'role names the Student object, so Student.introduce runs.', frame: frame({ ...shared, references: { ...shared.references, role: 'role:student' }, active: { receiverId: 'role:student', method: 'Student.introduce', lookupPath: ['class:Student'], callFrame: { self: 'role:student' } }, output: [`Student ${input.student}`] }) },
        { type: 'dispatch', line: 17, message: 'The same source line now resolves Instructor.introduce.', frame: frame({ ...shared, references: { ...shared.references, role: 'role:instructor' }, active: { receiverId: 'role:instructor', method: 'Instructor.introduce', lookupPath: ['class:Instructor'], callFrame: { self: 'role:instructor' } }, output: [`Student ${input.student}`, `Instructor ${input.instructor}`] }) },
      ];
    },
  });

  const polymorphismTypeSwitch = activity({
    id: 'itcc45-polymorphism-type-switch', number: 6, topicId: 'polymorphism', topic: 'Polymorphism',
    context: 'textbook', exampleOrder: 3, learningGoal: 'Replace a growing type switch with receiver-based method dispatch.', misconceptionIds: ['type-switch-is-not-polymorphism'],
    title: 'Polymorphism: replace a delivery type switch', subtitle: 'Compare branching on labels with asking each delivery object for fee().',
    blurb: 'A type switch centralizes knowledge of every case. Polymorphism moves each rule beside its class so the caller can make one stable method call.',
    defaults: { weight: 2 }, controls: [{ key: 'weight', label: 'Package weight', type: 'number', min: 1, max: 20 }],
    source: ({ weight }) => ['def shipping_fee(kind, weight):', '    if kind == "standard":', '        return weight * 20', '    if kind == "express":', '        return 50 + weight * 15', '', `print(f"switch: {shipping_fee('express', ${weight})}")`, '', 'class StandardDelivery:', '    def __init__(self, weight):', '        self.weight = weight', '', '    def fee(self):', '        return self.weight * 20', '', 'class ExpressDelivery:', '    def __init__(self, weight):', '        self.weight = weight', '', '    def fee(self):', '        return 50 + self.weight * 15', '', `deliveries = [StandardDelivery(${weight}), ExpressDelivery(${weight})]`, 'for delivery in deliveries:', '    print(f"polymorphic: {delivery.fee()}")'],
    expectedOutput: ['switch: 80', 'polymorphic: 40', 'polymorphic: 80'],
    timeline(input) {
      const standardFee = input.weight * 20;
      const expressFee = 50 + input.weight * 15;
      const standardClass = classModel('class:StandardDelivery', 'StandardDelivery', { methods: ['__init__(self, weight)', 'fee(self)'] });
      const expressClass = classModel('class:ExpressDelivery', 'ExpressDelivery', { methods: ['__init__(self, weight)', 'fee(self)'] });
      const standard = objectModel('delivery:standard', 'class:StandardDelivery', 'standard', { weight: input.weight });
      const express = objectModel('delivery:express', 'class:ExpressDelivery', 'express', { weight: input.weight });
      const shared = { classes: [standardClass, expressClass], objects: [standard, express], references: { deliveries_0: 'delivery:standard', deliveries_1: 'delivery:express' } };
      return [
        { type: 'attempt', phase: 'attempt', line: 4, message: 'The function asks which label it received before choosing a rule.', frame: frame({ annotations: [{ label: 'Decision owner', value: 'shipping_fee' }, { label: 'Branch', value: 'kind == express' }], output: [`switch: ${expressFee}`], notice: 'Every new delivery kind would require editing this switch.' }) },
        { type: 'repair', phase: 'repair', line: 20, message: 'Each delivery class now owns its fee rule.', frame: frame({ classes: [{ ...standardClass, status: 'active' }, { ...expressClass, status: 'active' }], annotations: [{ label: 'Stable caller', value: 'delivery.fee()' }] }) },
        { type: 'dispatch', phase: 'repair', line: 25, message: 'The shared call resolves StandardDelivery.fee for the first object.', frame: frame({ ...shared, references: { ...shared.references, delivery: 'delivery:standard' }, active: { receiverId: 'delivery:standard', method: 'StandardDelivery.fee', lookupPath: ['class:StandardDelivery'], callFrame: { self: 'delivery:standard' } }, output: [`switch: ${expressFee}`, `polymorphic: ${standardFee}`] }) },
        { type: 'dispatch', phase: 'repair', line: 25, message: 'The same call resolves ExpressDelivery.fee for the second object.', frame: frame({ ...shared, references: { ...shared.references, delivery: 'delivery:express' }, active: { receiverId: 'delivery:express', method: 'ExpressDelivery.fee', lookupPath: ['class:ExpressDelivery'], callFrame: { self: 'delivery:express' } }, output: [`switch: ${expressFee}`, `polymorphic: ${standardFee}`, `polymorphic: ${expressFee}`] }) },
      ];
    },
  });

  const activities = Object.freeze([
    classes, classShadowing, classSharedMutable,
    objectIndependentState, objectIdentity, objects,
    encapsulation, encapsulationRecursiveSetter, encapsulationPrivacy,
    inheritanceCampusRoles, inheritance, inheritanceMissingSuper,
    abstractionHiddenDetails, abstractionShape, abstraction,
    polymorphismClassroomRoles, polymorphism, polymorphismTypeSwitch,
  ]);
  function list() { return Object.freeze([...activities]); }
  function forTopic(topicId) { return Object.freeze(activities.filter((item) => item.topicId === topicId)); }
  function get(id) { return activities.find((item) => item.id === id) || activities[0]; }
  const api = Object.freeze({ SCHEMA_VERSION, CONTENT_VERSION, list, forTopic, get });
  if (typeof BSITLearningLab !== 'undefined') BSITLearningLab.registerActivities('itcc45', api);
  return api;
})();
