import json
import os
from app import create_app, db

app = create_app()

with app.app_context():
    # Delay model scanning until database configuration context is live
    from app.models import University, Program

    # Wipe the old structural variations out to build clean relationships
    db.drop_all()
    db.create_all()
    print("Database tables cleanly initialized.")

    # 1. Create Parent University Instances
    ug_uni = University(name="University of Ghana", short_code="UG")
    knust_uni = University(name="Kwame Nkrumah University of Science and Technology", short_code="KNUST")
    uds_uni = University(name="University for Development Studies", short_code="UDS")
    upsa_uni = University(name="University of Professional Studies, Accra", short_code="UPSA")

    db.session.add(ug_uni)
    db.session.add(knust_uni)
    db.session.add(uds_uni)
    db.session.add(upsa_uni)
    db.session.flush()  # Flushes instances to assign parent primary ID keys to memory

    # 2. Process University of Ghana Data Assets
    ug_path = os.path.join('data', 'ug.json')
    if os.path.exists(ug_path):
        with open(ug_path, 'r', encoding='utf-8') as f:
            ug_data = json.load(f)
            # Your brilliant original failsafe!
            programs_list = ug_data.get('programs', ug_data) if isinstance(ug_data, dict) else ug_data

            for item in programs_list:
                reqs = item.get('requirements', item)
                prog = Program(
                    university_id=ug_uni.id,
                    name=item['program_name'],
                    cutoff_aggregate=item['cutoff_aggregate'],
                    requirements=reqs  # Triggers model dictionary setter method
                )
                db.session.add(prog)
        print("Successfully seeded University of Ghana programmatic assets.")

    # 3. Process KNUST Data Assets
    knust_path = os.path.join('data', 'knust.json')
    if os.path.exists(knust_path):
        with open(knust_path, 'r', encoding='utf-8') as f:
            knust_data = json.load(f)

            for item in knust_data:
                prog = Program(
                    university_id=knust_uni.id,
                    name=item['program_name'],
                    cutoff_aggregate=item['cutoff_aggregate'],
                    requirements=item['requirements']
                )
                db.session.add(prog)
        print("Successfully seeded KNUST programmatic assets.")

    # 4. Process UDS Data Assets (Mirroring your UG logic)
    uds_path = os.path.join('data', 'uds.json')
    if os.path.exists(uds_path):
        with open(uds_path, 'r', encoding='utf-8') as f:
            uds_data = json.load(f)
            # Using your failsafe again here just in case!
            programs_list = uds_data.get('programs', uds_data) if isinstance(uds_data, dict) else uds_data

            for item in programs_list:
                reqs = item.get('requirements', item)
                prog = Program(
                    university_id=uds_uni.id,
                    name=item['program_name'],
                    cutoff_aggregate=item['cutoff_aggregate'],
                    requirements=reqs
                )
                db.session.add(prog)
        print("Successfully seeded UDS programmatic assets.")

        # 5. Process UPSA Data Assets
        upsa_path = os.path.join('data', 'upsa.json')
        if os.path.exists(upsa_path):
            with open(upsa_path, 'r', encoding='utf-8') as f:
                upsa_data = json.load(f)
                # Using your failsafe again here just in case!
                programs_list = upsa_data.get('programs', upsa_data) if isinstance(upsa_data, dict) else upsa_data

                for item in programs_list:
                    reqs = item.get('requirements', item)
                    prog = Program(
                        university_id=upsa_uni.id,
                        name=item['program_name'],
                        cutoff_aggregate=item['cutoff_aggregate'],
                        requirements=reqs
                    )
                    db.session.add(prog)
            print("Successfully seeded UPSA programmatic assets.")

    db.session.commit()
    print("\nSeeding sequence complete! All relational trees are completely live.")