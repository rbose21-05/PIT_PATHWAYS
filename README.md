# PIT Pathways

Flowchart builder for UMass Amherst Public Interest Technology pathways, for CS majors.

## Run

```bash
npm install
npm run dev
```

Open http://127.0.0.1:4317

## Deploy on Vercel

The app is a Next.js static export. Vercel builds it from the GitHub repo, so the site does not depend on GitHub Actions.

Import [rbose21-05/PIT_PATHWAYS](https://github.com/rbose21-05/PIT_PATHWAYS) at [vercel.com/new](https://vercel.com/new/clone?repository-url=https://github.com/rbose21-05/PIT_PATHWAYS). Leave the framework as Next.js and do not set `BASE_PATH`. When GitHub asks which repositories Vercel may access, allow only this repository.

Each visitor’s plans stay in their own browser.

The pathway and course edits save in this browser. Reset in the toolbar restores the starter chart and the course list.

The course list can be filtered by bucket and by a requirement the course fulfills. Two selections in the same group both have to match: a course stays only when it sits in every chosen bucket and covers every chosen requirement. Clear removes the filters. Search still applies on top.

Hover a course in the list or on the chart to see its prerequisites. Adding a course places its box under that bucket and draws an arrow from the bucket. Each plan holds one course per bucket. A course listed under more than one bucket can count for only one: choosing it asks which bucket to use. If that bucket already has a course, replace it in this plan or save the new course as another version. Choose this plan marks the version you want to keep. The top right lists the requirements the open plan satisfies.

The × on a course box removes it. Delete, Backspace, and the Delete button do the same for the selected box. The root and the three buckets stay on the chart.

## Regenerate courses.json

`data/courses.json` is the course list the app reads. It is generated from `PI_LIST.numbers` in the project root.

```bash
python3 -m pip install -r scripts/requirements.txt
python3 scripts/import_pi_list.py
```

The script reads `PI_LIST.numbers` and writes `data/courses.json`. After regenerating, use Reset in the app to load the new list.
