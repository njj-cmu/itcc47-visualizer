# ITCC47 curriculum governance

`curriculum.public.json` is the reviewed public control plane. `tools/build-curriculum.js` validates it and emits `curriculum.data.js`, a classic-script payload that also works from `file://`. `release-profile.js` is the manually deployed semester profile; completion and viewing never modify it.

All ITCC47 catalogs and direct routes resolve through `ITCC47Curriculum.stateForResource()`. The resolver returns `available`, `current`, `locked`, or `planned`. Unknown mappings fail closed. Writer and blank Tracer are explicitly always available. Instructor preview is opt-in through `?preview=1`, stores only a version-matched checkpoint under `itcc47.release-preview:v1`, and is ignored on normal visits.

Locked visualizer and practice routes render requirement metadata before constructing an activity timeline, source panel, statement, or editor. Relocking does not delete versioned practice records or their recoverable earlier drafts.

The public catalog supports lessons, tools, activities, and self-paced problems only. Checkpoints and resources declare `reviewStatus`; the build rejects a deployed checkpoint that is a draft or depends on any unreviewed public resource. The deployed version 2 profile currently ends at `m4-queue-deque`. Modules 5â€“8 remain draft-only instructor previews and carry a persistent Draft preview indicator.

`context/content-manifest.json` records source authority and quarantine decisions. The syllabus and canonical laboratory Markdown remain provenance inside `context/`; they are not linked, cataloged, downloaded, or cached by the public application. Lecture DOCX files are drafts, the older Midterm material is historical, Auto-Battle is experimental, and the unrelated Vue `currentversion.txt` is quarantined.

The normal build does not generate student bundles. The former Materials route is a metadata-free redirect to the practice roadmap, and `student-bundles/` is ignored so legacy local artifacts cannot enter a published tree. The service worker caches only the practice application shell.

Practice records use `itcc47.practice-records:v2`. A content-version change preserves the earlier draft in a recovery disclosure, installs the new starter, and invalidates completion for that problem only.
