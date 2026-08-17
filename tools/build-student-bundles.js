/* Deterministic, allowlisted student bundles. No instructor/private/reference path can enter. */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const PACKAGE = path.join(ROOT, 'context', 'ITCC47-Laboratory-Package');
const OUTPUT = path.join(ROOT, 'student-bundles');
const curriculum = JSON.parse(fs.readFileSync(path.join(ROOT, 'curriculum.public.json'), 'utf8'));
const profileSource = fs.readFileSync(path.join(ROOT, 'release-profile.js'), 'utf8');
const currentId = /currentCheckpointId:\s*'([^']+)'/.exec(profileSource)?.[1];
const current = curriculum.checkpoints.find((item) => item.id === currentId);
if (!current) throw new Error('Release profile checkpoint is invalid.');

const languageFolders = { Python: 'Python', Java: 'Java', 'C++': 'CPP' };
const banned = /(?:instructor|reference.solution|private|practical.examination|hidden)/i;

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) { crc ^= byte; for (let i = 0; i < 8; i += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1)); }
  return (crc ^ 0xffffffff) >>> 0;
}
function u16(value) { const out = Buffer.alloc(2); out.writeUInt16LE(value); return out; }
function u32(value) { const out = Buffer.alloc(4); out.writeUInt32LE(value >>> 0); return out; }
function zip(entries) {
  const local = []; const central = []; let offset = 0;
  entries.sort((a,b) => a.name.localeCompare(b.name)).forEach(({ name, data }) => {
    const filename = Buffer.from(name.replace(/\\/g, '/')); const body = Buffer.isBuffer(data) ? data : Buffer.from(data);
    const crc = crc32(body); const dosTime = 0; const dosDate = (46 << 9) | (1 << 5) | 1;
    const header = Buffer.concat([u32(0x04034b50),u16(20),u16(0),u16(0),u16(dosTime),u16(dosDate),u32(crc),u32(body.length),u32(body.length),u16(filename.length),u16(0),filename]);
    local.push(header,body);
    central.push(Buffer.concat([u32(0x02014b50),u16(20),u16(20),u16(0),u16(0),u16(dosTime),u16(dosDate),u32(crc),u32(body.length),u32(body.length),u16(filename.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(offset),filename]));
    offset += header.length + body.length;
  });
  const centralBody = Buffer.concat(central); const end = Buffer.concat([u32(0x06054b50),u16(0),u16(0),u16(entries.length),u16(entries.length),u32(centralBody.length),u32(offset),u16(0)]);
  return Buffer.concat([...local,centralBody,end]);
}
function filesUnder(directory, prefix) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name)).flatMap((entry) => {
    const full = path.join(directory,entry.name); const name = `${prefix}/${entry.name}`;
    return entry.isDirectory() ? filesUnder(full,name) : [{ name, data: fs.readFileSync(full), source: full }];
  });
}
function addFile(entries, source, name) { if (!fs.existsSync(source)) throw new Error(`Missing approved bundle asset: ${source}`); entries.push({ name, data: fs.readFileSync(source), source }); }

fs.mkdirSync(OUTPUT,{recursive:true});
const built = [];
curriculum.resources.filter((resource) => resource.kind === 'lab').forEach((lab) => {
  const checkpoint = curriculum.checkpoints.find((item) => item.id === lab.checkpointId);
  if (!checkpoint || checkpoint.order > current.order) return;
  lab.languages.forEach((language) => {
    const languageFolder = languageFolders[language]; const entries = [];
    const moduleNumber = /M(\d{2})/.exec(lab.id)?.[1];
    const handoutDirectory = path.join(PACKAGE,'01-Student-Laboratory-Handouts',`Module-${moduleNumber}`);
    const handout = fs.readdirSync(handoutDirectory).find((name) => name.startsWith(lab.id) && name.endsWith('.md'));
    addFile(entries,path.join(handoutDirectory,handout),'HANDOUT.md');
    entries.push(...filesUnder(path.join(PACKAGE,'04-Starter-Code',languageFolder,lab.id),'starter'));
    entries.push(...filesUnder(path.join(PACKAGE,'06-Test-Data','Public',lab.id),'public-cases'));
    addFile(entries,path.join(PACKAGE,'tools','run_cases.py'),'tools/run_cases.py');
    entries.push({ name:'README.txt',data:`ITCC47 ${lab.id} — ${lab.title}\nLanguage: ${language}\n\n1. Read HANDOUT.md.\n2. Complete the file in starter/.\n3. Run the public cases with: python tools/run_cases.py --help\n\nChecks are local practice evidence, not an authoritative grade.\n` });
    if (entries.some((entry) => banned.test(entry.name) || (entry.source && banned.test(path.relative(PACKAGE,entry.source))))) throw new Error(`Leakage scan rejected ${lab.id} ${language}`);
    const filename = `${lab.id}-${languageFolder}.zip`; const bytes = zip(entries); fs.writeFileSync(path.join(OUTPUT,filename),bytes);
    built.push({ resourceId:lab.id,language,filename:`student-bundles/${filename}`,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,files:entries.map((entry)=>entry.name) });
  });
});
const manifest = { schemaVersion:1,profileId:/profileId:\s*'([^']+)'/.exec(profileSource)?.[1],profileVersion:Number(/profileVersion:\s*(\d+)/.exec(profileSource)?.[1]),currentCheckpointId:currentId,bundles:built };
fs.writeFileSync(path.join(OUTPUT,'manifest.json'),`${JSON.stringify(manifest,null,2)}\n`);
fs.writeFileSync(path.join(ROOT,'student-bundles.data.js'),`const ITCC47_STUDENT_BUNDLES = Object.freeze(${JSON.stringify(manifest,null,2)});\n`);
console.log(`Built ${built.length} deterministic student bundles through ${currentId}.`);
