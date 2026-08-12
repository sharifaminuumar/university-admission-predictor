# EduPredict Ghana — University Admission Predictor

A full-stack Python web application that calculates a student's optimised WASSCE **Best-6 aggregate** and evaluates it against the published entry requirements of Ghanaian universities — across **10 institutions and 644 programmes**.

Unlike standard applications that only perform simple CRUD operations, this system handles complex, localised algorithmic evaluation rules: per-programme core and elective combinations, subject-specific minimum grades, "any three of these four subjects" pools, and a third-core selection rule that changes depending on whether a programme is science-track.

---

## Features

**Two modes**, switchable from tabs at the top of the main card:

* **Check Eligibility** — enter your core and elective grades, pick a target institution, and get every programme you qualify for, with your computed aggregate against each cut-off. Results have a live search box for filtering by programme name.
* **Browse Programmes** — no grades required. Pick an institution to browse its full catalogue with each programme's cut-off, required core subjects, required electives, and elective pool. Also live-searchable, so you can type "Computer Science" and immediately see what it demands.

**Cut-off transparency.** Every programme card carries a badge showing how much its cut-off can be trusted (see [Data honesty](#data-honesty) below) — this matters more than it sounds, because most Ghanaian universities do not publish per-programme cut-offs at all.

**Light and dark themes**, following your OS preference by default and remembering an explicit choice. All colours resolve through CSS custom properties, so switching themes swaps variables rather than restyling markup.

---

## Currently Supported Institutions

| Institution | Code | Programmes | Cut-off provenance |
|---|---|---:|---|
| University of Ghana | `UG` | 47 | unverified |
| KNUST | `KNUST` | 109 | unverified |
| University for Development Studies | `UDS` | 22 | unverified |
| University of Professional Studies, Accra | `UPSA` | 17 | unverified |
| University of Cape Coast | `UCC` | 133 | 114 published, 19 ceiling |
| University of Education, Winneba | `UEW` | 142 | 1 published, 141 ceiling |
| University of Health and Allied Sciences | `UHAS` | 22 | 22 published |
| University of Mines and Technology | `UMAT` | 33 | ceiling only |
| University of Energy and Natural Resources | `UENR` | 37 | ceiling only |
| Akenten Appiah-Menka University (AAMUSTED) | `AAMUSTED` | 82 | ceiling only |
| **Total** | | **644** | |

---

## Data honesty

**Only about 21% of seeded programmes have a real published per-programme cut-off.** This is a limitation of the source data, not of the app, and the interface is built to be explicit about it rather than hide it.

Each programme carries a `cutoff_source`, surfaced as a badge on its card:

| Badge | Meaning | Count |
|---|---|---:|
| **Competitive cut-off** | A real per-programme cut-off published by the university. | 137 |
| **General entry ceiling** | The university publishes no cut-off for this programme, so its site-wide minimum entry aggregate (usually 36) is shown instead. Clearing it means you **meet the minimum entry requirement — not that you would be admitted.** The true departmental cut-off is likely lower and more competitive. | 312 |
| **Unverified cut-off** | Older seed data that predates our sourcing records and has not been traced to an official publication. | 195 |

UMaT, UENR and AAMUSTED publish no per-programme cut-offs anywhere on their sites — UMaT's and UENR's own pages concede that competitive departmental cut-offs exist but are unpublished. Third-party aggregator sites do list per-course numbers; they are unsourced and contradict each other, so **none were used**. Where a university's requirements were ambiguous, the data deliberately errs toward a false negative over a false positive.

Per-school sourcing methodology, inferred requirements and known gaps are documented in `data/<code>_notes.md` (kept locally, not committed).

**This tool is a guide, not an admission decision.** Several programmes additionally require entrance examinations or interviews that a grade-based predictor cannot model.

---

## System Architecture

The application is structured to ensure strict **Separation of Concerns**. The algorithmic engine remains fully decoupled from the database and from Flask, so it stays independently testable.

```
run.py                    entrypoint (app = create_app())
seed_db.py                loads data/*.json into the DB; one tuple per school
app/
  __init__.py             app factory; instance-relative SQLite URI
  models.py               SQLAlchemy ORM: University, Program
  routes.py               Blueprint: / , /api/predict (POST), /api/programs/<code> (GET)
  eligibility_engine.py   pure functions — no Flask, no DB imports
  templates/index.html    single-page UI (Tailwind via CDN)
  static/main.js          builds the form, calls the API, renders results
data/*.json               one file per university
instance/admissions.db    canonical SQLite file (gitignored, regenerated by seed_db.py)
```

* **Client Layer (UI):** responsive grid layout, asynchronous fetch, client-side filtering with no server round-trip per keystroke.
* **Application Delivery (API):** a Flask Blueprint marshals incoming JSON into the validation framework.
* **Algorithmic Engine:** deterministic Python functions computing the Best-6 aggregate. The third core subject is chosen **per programme** — science-track programmes always use Integrated Science, others take the better of Integrated Science and Social Studies.
* **Data Persistence:** SQLite via SQLAlchemy, holding institutional requirement blueprints as serialised JSON.

### API

| Endpoint | Method | Purpose |
|---|---|---|
| `/` | GET | Serves the single-page UI. |
| `/api/predict` | POST | Takes a grade payload, returns every qualifying programme with the student's aggregate and each cut-off. |
| `/api/programs/<uni_code>` | GET | Returns the full catalogue for one university (codes are case-insensitive; unknown codes return 404). |

---

## Data Schema Design

To handle irregular requirement structures, a **NoSQL-within-SQL hybrid pattern** is used: requirements are declarative dictionaries stored in a SQLAlchemy text column, so a programme can carry any requirement shape without a schema migration.

```json
{
  "program_name": "B.Sc. Computer Science",
  "cutoff_aggregate": 14,
  "cutoff_source": "published",
  "type": "Regular",
  "requirements": {
    "mandatory_cores": [
      {"subject": "Core Mathematics", "minimum_grade": "C6"},
      {"subject": "English Language", "minimum_grade": "C6"},
      {"subject": "Integrated Science", "minimum_grade": "C6"}
    ],
    "mandatory_electives": [
      {"subject": "Elective Mathematics", "minimum_grade": "B3"}
    ],
    "elective_category_pool": "Sciences",
    "global_minimum_grade": "C6"
  }
}
```

| Field | Purpose |
|---|---|
| `cutoff_source` | `published`, `general_ceiling`, or `unverified` — drives the transparency badge. |
| `type` | `Regular` or `Diploma`, so diplomas are not presented as degrees. |
| `mandatory_cores` / `mandatory_electives` | Subjects that are individually compulsory. |
| `elective_category_pool` | `Sciences` forces Integrated Science as the third core; anything else takes the better of Integrated Science and Social Studies. |

### Flexible elective pools

Some programmes name no individually compulsory elective — UHAS Medicine asks for *"any three of Chemistry, Biology, Physics and Elective Mathematics"*, and UMaT engineering programmes accept *"Chemistry **or** Applied Electricity **or** Electronics"* as a substitutable third subject. Neither is expressible with `mandatory_electives` alone, so requirements may carry an optional `elective_options` block:

```json
"elective_options": {
  "subjects": ["Chemistry", "Biology", "Physics", "Elective Mathematics"],
  "minimum_required": 3,
  "minimum_grade": "C6"
}
```

The student must pass at least `minimum_required` subjects from that pool. Without it, a General Arts student with straight A1s was reported as qualifying for Medicine.

---

## Installation & Setup

1. **Clone the repository:**
```bash
git clone https://github.com/sharifaminuumar/university-admission-predictor.git
cd university-admission-predictor
```

2. **Create a virtual environment and install dependencies:**
```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

3. **Seed the database:**
```bash
python seed_db.py
```

This populates `instance/admissions.db` — the canonical SQLite file, resolved via Flask's instance folder so its location is stable regardless of where you run commands from. It is gitignored and fully disposable; rerun this command any time to reset it.

4. **Run the development server:**
```bash
python run.py
```

The app serves at `http://127.0.0.1:5000`.

---

## Deployment

Deployed to **Render** as a Python web service, configured declaratively by `render.yaml` at the project root and served by **gunicorn** rather than the Flask development server.

Render's filesystem is ephemeral, so `instance/admissions.db` is treated as a **build artifact, not stored state**: `seed_db.py` runs during the build phase, baking the seeded database into the deploy image and regenerating it from `data/*.json` on every deploy. This means `data/*.json` is the single source of truth in production — to change what is live, edit the JSON and redeploy, never mutate the deployed database.

---

## Adding a University

1. Add `data/<code>.json` (and a `data/<code>_notes.md` documenting your sourcing).
2. Add one tuple to the `UNIVERSITIES` list in `seed_db.py`.
3. Add one entry to the `UNIVERSITIES` constant in `app/static/main.js` — the single source of truth for both dropdowns and the results header.

Short codes must be UPPERCASE in both places. Any subject named in `mandatory_electives` or `elective_options.subjects` **must** also exist in `electivesList` in `main.js`, or students can never select it and that programme becomes permanently unreachable.

---

## For Contributors / AI Assistants

See [`CLAUDE.md`](CLAUDE.md) for architecture notes, the theming token system, developer rules (UTF-8 encoding, no compiled or database artifacts in git, manual-only commits), and the full university-onboarding runbook.
