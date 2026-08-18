# ITCC47 curriculum governance

`curriculum.public.json` is the reviewed public control plane. `tools/build-curriculum.js` validates it and emits `curriculum.data.js`, a classic-script payload that also works from `file://`. `release-profile.js` is the manually deployed semester profile; completion and viewing never modify it.

All ITCC47 catalogs and direct routes resolve through `ITCC47Curriculum.stateForResource()`. The resolver returns `available`, `current`, `locked`, or `planned`. Unknown mappings fail closed. Writer and blank Tracer are explicitly always available. Instructor preview requires a browser-local capability grant created from the private `.instructor-preview-token`; `?preview=1` alone always fails closed. The private token is gitignored, never cached, and never rendered. Only its SHA-256 verifier ships in `instructor-access.js`. Normal visits ignore stored preview checkpoints, and exiting instructor mode revokes both the capability grant and preview checkpoint.

Locked visualizer and practice routes render requirement metadata before constructing an activity timeline, source panel, statement, or editor. Relocking does not delete versioned practice records or their recoverable earlier drafts.

The public catalog supports tools, activities, and self-paced problems only. Checkpoints and resources declare `reviewStatus`; the build rejects a deployed checkpoint that is a draft or depends on any unreviewed public resource. The deployed version 5 profile currently ends at `m3-linked-foundations`, making linked-list traversal, array-versus-linked comparison, and the two foundation practice problems public while linked-list mutation remains locked. Later modules remain available through explicit instructor preview; Modules 5–8 are draft-only and carry a persistent Draft preview indicator. The retired `lesson.html` entry is a metadata-free compatibility redirect to the relevant module practice bank; no companion content or lesson resources ship.

`context/content-manifest.json` records source authority and quarantine decisions. The syllabus and canonical laboratory Markdown remain provenance inside `context/`; they are not linked, cataloged, downloaded, or cached by the public application. Lecture DOCX files are drafts, the older Midterm material is historical, Auto-Battle is experimental, and the unrelated Vue `currentversion.txt` is quarantined.

The repository has no public student-bundle generator. The former Materials route is a metadata-free compatibility redirect to the practice roadmap, and `student-bundles/` is ignored so legacy local artifacts cannot enter a published tree. The service worker caches only the practice application shell.

Practice records use `itcc47.practice-records:v2`. A content-version change preserves the earlier draft in a recovery disclosure, installs the new starter, and invalidates completion for that problem only.

Focused visualization progress uses `itcc47.visualizer-progress:v1`. It stores only the visualization ID, the last browser-local visit timestamp, and an optional reviewed timestamp recorded when playback reaches the final frame. It is a private navigation aid, not a grade or completion requirement. Instructor-preview activity is excluded.
