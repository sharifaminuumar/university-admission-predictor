from flask_sqlalchemy import SQLAlchemy
import json

db = SQLAlchemy()


class University(db.Model):
    __tablename__ = 'university'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    short_code = db.Column(db.String(20), nullable=False, unique=True)

    # Relationship: One university has many programs
    programs = db.relationship('Program', backref='university', lazy=True, cascade="all, delete-orphan")


class Program(db.Model):
    __tablename__ = 'program'

    id = db.Column(db.Integer, primary_key=True)
    university_id = db.Column(db.Integer, db.ForeignKey('university.id'), nullable=False)
    name = db.Column(db.String(200), nullable=False)
    cutoff_aggregate = db.Column(db.Integer, nullable=False)
    program_type = db.Column(db.String(50), default="Regular")

    # We store the complex nested requirements here as a serialized JSON string
    _requirements = db.Column('requirements', db.Text, nullable=False)

    @property
    def requirements(self):
        """Getter: Automatically converts the text back to a Python dictionary."""
        return json.loads(self._requirements)

    @requirements.setter
    def requirements(self, value):
        """Setter: Automatically converts a Python dictionary to text for the database."""
        self._requirements = json.dumps(value)