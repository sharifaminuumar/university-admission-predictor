import json
import os

from app import create_app, db

# The single place to register a school: (short_code, display name, region, data filename).
# short_code must be UPPERCASE — /api/programs/<uni_code> matches on the uppercased code.
# The region here is authoritative (knust.json historically had no metadata header);
# a data file's own "region" key is cross-checked against it during seeding.
UNIVERSITIES = [
    ("UG", "University of Ghana", "Greater Accra", "ug.json"),
    ("KNUST", "Kwame Nkrumah University of Science and Technology", "Ashanti", "knust.json"),
    ("UDS", "University for Development Studies", "Northern", "uds.json"),
    ("UPSA", "University of Professional Studies, Accra", "Greater Accra", "upsa.json"),
    ("UCC", "University of Cape Coast", "Central", "ucc.json"),
    ("UEW", "University of Education, Winneba", "Central", "uew.json"),
    ("UHAS", "University of Health and Allied Sciences", "Volta", "uhas.json"),
    ("UMAT", "University of Mines and Technology", "Western", "umat.json"),
    ("UENR", "University of Energy and Natural Resources", "Bono", "uenr.json"),
    ("AAMUSTED", "Akenten Appiah-Menka University of Skills Training and Entrepreneurial Development", "Ashanti", "aamusted.json"),
    ("ATU", "Accra Technical University", "Greater Accra", "atu.json"),
    ("GCTU", "Ghana Communication Technology University", "Greater Accra", "gctu.json"),
    ("ASHESI", "Ashesi University", "Eastern", "ashesi.json"),
    ("VVU", "Valley View University", "Greater Accra", "vvu.json"),
    ("TTU", "Takoradi Technical University", "Western", "ttu.json"),
    ("KSTU", "Kumasi Technical University", "Ashanti", "kstu.json"),
    ("HTU", "Ho Technical University", "Volta", "htu.json"),
    ("CKT-UTAS", "C. K. Tedam University of Technology and Applied Sciences", "Upper East", "ckt-utas.json"),
    ("SDD-UBIDS", "Simon Diedong Dombo University of Business and Integrated Development Studies", "Upper West", "sdd-ubids.json"),
    ("CUG", "Catholic University of Ghana", "Bono", "cug.json"),
]

# Resolved from this file's location, not the working directory, so seeding behaves
# the same whether run locally or from Render's build step.
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')


def load_data_file(filename):
    """Returns (programs, declared_region) from a data file, or (None, None) if absent.

    Files are either {"university_name": ..., "region": ..., "programs": [...]} or a
    bare [...] array, so both shapes are accepted. A bare array declares no region.
    """
    path = os.path.join(DATA_DIR, filename)
    if not os.path.exists(path):
        return None, None

    with open(path, 'r', encoding='utf-8') as f:
        payload = json.load(f)

    if isinstance(payload, dict):
        return payload.get('programs', []), payload.get('region')
    return payload, None


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

    region_mismatches = []

    for short_code, name, region, filename in UNIVERSITIES:
        programs, declared_region = load_data_file(filename)

        if programs is None:
            missing_files.append(filename)
            print(f"  !  {short_code:<9} skipped — data/{filename} not found.")
            continue

        # Catch drift between the registry above and the data file's own region key.
        if declared_region and declared_region != region:
            region_mismatches.append(f"{short_code}: registry='{region}' vs {filename}='{declared_region}'")

        university = University(name=name, short_code=short_code, region=region)
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
        print(f"  +  {short_code:<9} {region:<15} seeded {len(programs):>4} programmes.")

    db.session.commit()

    print(f"\nSeeding complete: {seeded_universities} universities, {seeded_programs} programmes.")
    if missing_files:
        print(f"Missing data files ({len(missing_files)}): {', '.join(missing_files)}")
    if region_mismatches:
        print(f"\n!! Region mismatches ({len(region_mismatches)}) — registry wins, please reconcile:")
        for mismatch in region_mismatches:
            print(f"   - {mismatch}")
