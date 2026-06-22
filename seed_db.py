import os
import json
from app.models import db, University, Program
from flask import Flask

# Find the absolute path to the root directory
basedir = os.path.abspath(os.path.dirname(__file__))

app = Flask(__name__)
# Force the database to be created EXACTLY in this root directory
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'admissions.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

DATA_DIR = os.path.join(basedir, 'data') # Make the data path absolute too

def seed_database():
    with app.app_context():
        print(f"Creating database at: {os.path.join(basedir, 'admissions.db')}")
        db.drop_all()
        db.create_all()

        # ... (keep the rest of your seed_database loop exactly the same)
        for filename in os.listdir(DATA_DIR):
            if filename.endswith('.json'):
                filepath = os.path.join(DATA_DIR, filename)

                with open(filepath, 'r') as file:
                    data = json.load(file)

                    # 1. Create the University
                    uni = University(
                        name=data['university_name'],
                        short_code=data['short_code']
                    )
                    db.session.add(uni)
                    db.session.flush()  # Gets the university ID without fully committing yet

                    print(f"Loading {len(data['programs'])} programs for {uni.short_code}...")

                    # 2. Create the Programs
                    for prog_data in data['programs']:
                        program = Program(
                            university_id=uni.id,
                            name=prog_data['program_name'],
                            cutoff_aggregate=prog_data['cutoff_aggregate'],
                            program_type=prog_data.get('type', 'Regular'),
                            requirements=prog_data['requirements']  # The setter we wrote handles the JSON conversion!
                        )
                        db.session.add(program)

        # Save everything to the database
        db.session.commit()
        print("Database seeding complete! 🚀")


if __name__ == '__main__':
    seed_database()