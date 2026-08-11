# Ghanaian University Admission Predictor

A full-stack Python web application designed to automatically calculate optimized WASSCE aggregate scores and evaluate eligibility requirements across multiple institutional programs dynamically.

Unlike standard applications that only perform simple CRUD operations, this system handles complex, localized algorithmic evaluation rules—such as mapping out specific core and elective combinations based on programmatic criteria.

---

## System Architecture

The application is structured explicitly using clean architectural patterns to ensure strict **Separation of Concerns**. The backend algorithmic execution engine remains 100% decoupled from the database layers and the delivery mechanisms (Flask), rendering it easily testable.

### Architecture Breakdown:
* **Client Layer (UI):** Modular presentation layout built with a highly responsive CSS grid, modern asynchronous JavaScript fetching, and interactive state controls.
* **Application Delivery (API):** Flask Blueprint serves as the traffic controller, marshaling incoming JSON data directly to the validation framework.
* **Algorithmic Engine:** Pure, deterministic Python functions computing the mathematical permutations required to sort a student's grade points into optimal Best-6 configurations.
* **Data Persistence Layer:** SQLite managed seamlessly via SQLAlchemy ORM, housing pre-loaded institutional requirement blueprints via strict serialized JSON objects.

---

## Data Schema Design

To handle erratic structural requirements (such as specific programs demanding unique subsets of core grades or higher grades for technical fields), a **NoSQL-within-SQL hybrid pattern** was utilized. 

Institutional requirements are maintained as structured declarative dictionaries mapped natively inside a SQLAlchemy text column mapping.

```json
{
  "program_name": "B.Sc. Computer Science",
  "cutoff_aggregate": 14,
  "requirements": {
    "mandatory_cores": [
      {"subject": "Core Mathematics", "minimum_grade": "C6"},
      {"subject": "English Language", "minimum_grade": "C6"},
      {"subject": "Integrated Science", "minimum_grade": "C6"}
    ],
    "mandatory_electives": [
      {"subject": "Elective Mathematics", "minimum_grade": "B3"}
    ],
    "elective_category_pool": "Any",
    "global_minimum_grade": "C6"
  }
}

```

---

## Currently Supported Institutions

University of Ghana (UG), KNUST, University for Development Studies (UDS), University of Professional Studies Accra (UPSA). University of Cape Coast (UCC) is being onboarded next.

---

## Installation & Setup

Follow these steps to run this project locally:

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

3. **Seed the relational database artifacts:**
```bash
python seed_db.py

```

This populates `instance/admissions.db` — the canonical SQLite file, resolved via Flask's instance folder so its location is stable regardless of where you run commands from. It's gitignored and fully disposable; rerun this command any time to reset it.

4. **Fire up the localized web development environment:**
```bash
python run.py

```

The app serves at `http://127.0.0.1:5000`.

---

## For Contributors / AI Assistants

See [`CLAUDE.md`](CLAUDE.md) for architecture notes, developer rules (UTF-8 encoding, no compiled/DB artifacts in git, manual-only commits), and the university-onboarding runbook.

