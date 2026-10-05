# PIT Pathways

Flowchart builder for UMass Amherst Public Interest Technology pathways, for CS majors.

## Run

```bash
npm install
npm run dev
```

Open http://127.0.0.1:4317

The pathway and course edits save in this browser. Reset in the toolbar restores the starter chart and the course list.

The course list can be filtered by bucket and by a requirement the course fulfills. Pick one or more of each. A course stays in the list when it is in a chosen bucket and covers at least one chosen requirement. Clear removes both filters. Search still applies on top.

## Regenerate courses.json

`data/courses.json` is the course list the app reads. It is generated from `PI_LIST.numbers` in the project root.

```bash
python3 -m pip install -r scripts/requirements.txt
python3 scripts/import_pi_list.py
```

The script reads `PI_LIST.numbers` and writes `data/courses.json`. After regenerating, use Reset in the app to load the new list.
