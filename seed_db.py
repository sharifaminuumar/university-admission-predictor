import json
import os

from app import create_app, db

# The single place to register a school: (short_code, display name, data filename).
# short_code must be UPPERCASE — /api/programs/<uni_code> matches on the uppercased code.
UNIVERSITIES = [
    ("UG", "University of Ghana", "ug.json"),
    ("KNUST", "Kwame Nkrumah University of Science and Technology", "knust.json"),
    ("UDS", "University for Development Studies", "uds.json"),
    ("UPSA", "University of Professional Studies, Accra", "upsa.json"),
    ("UCC", "University of Cape Coast", "ucc.json"),
    ("UEW", "University of Education, Winneba", "uew.json"),
    ("UHAS", "University of Health and Allied Sciences", "uhas.json"),
    ("UMAT", "University of Mines and Technology", "umat.json"),
    ("UENR", "University of Energy and Natural Resources", "uenr.json"),
    ("AAMUSTED", "Akenten Appiah-Menka University of Skills Training and Entrepreneurial Development", "aamusted.json"),
]

# Resolved from this file's location, not the working directory, so seeding behaves
# the same whether run locally or from Render's build step.
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')


def load_programs(filename):
    """Returns the program list from a data file, or None if the file is absent.

    Files are either {"university_name": ..., "programs": [...]} or a bare
    [...] array (knust.json), so both shapes are accepted.
    """
    path = os.path.join(DATA_DIR, filename)
    if not os.path.exists(path):
        return None

    with open(path, 'r', encoding='utf-8') as f:
        payload = json.load(f)

    return payload.get('programs', payload) if isinstance(payload, dict) else payload


app = create_app()

with app.app_context():
    # Delay model scanning until database configuration context is live
    from app.models import University, Program

    # Wipe the old structural variations out to build clean relationships
    db.drop_all()
    db.create_all()
    print("Database tables cleanly initialized.\n")

    seeded_universities = 0
    seeded_programs = 0
    missing_files = []

    for short_code, name, filename in UNIVERSITIES:
        programs = load_programs(filename)

        if programs is None:
            missing_files.append(filename)
            print(f"  !  {short_code:<9} skipped — data/{filename} not found.")
            continue

        university = University(name=name, short_code=short_code)
        db.session.add(university)
        db.session.flush()  # assigns the parent primary key before adding children

        for item in programs:
            db.session.add(Program(
                university_id=university.id,
                name=item['program_name'],
                cutoff_aggregate=item['cutoff_aggregate'],
                program_type=item.get('type', 'Regular'),
                # Files seeded before this field existed carry no cutoff_source; they
                # are recorded as "unverified" rather than being claimed as published.
                cutoff_source=item.get('cutoff_source', 'unverified'),
                requirements=item.get('requirements', item)  # triggers the model's dict setter
            ))

        seeded_universities += 1
        seeded_programs += len(programs)
        print(f"  +  {short_code:<9} seeded {len(programs):>4} programmes.")

    db.session.commit()

    print(f"\nSeeding complete: {seeded_universities} universities, {seeded_programs} programmes.")
    if missing_files:
        print(f"Missing data files ({len(missing_files)}): {', '.join(missing_files)}")
