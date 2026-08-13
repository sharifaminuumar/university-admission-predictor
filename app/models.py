from flask_sqlalchemy import SQLAlchemy
import json

# Instantiate db here to prevent circular import loops across modules
db = SQLAlchemy()

class University(db.Model):
    __tablename__ = 'university'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    short_code = db.Column(db.String(20), nullable=False, unique=True)

    # Ghanaian administrative region the institution sits in, used by the
    # frontend's region filter. "Unspecified" only if a data file omits it.
    region = db.Column(db.String(60), nullable=False, default="Unspecified")

    # Relationship: One university has many programs
    programs = db.relationship('Program', backref='university_data', lazy=True, cascade="all, delete-orphan")


class Program(db.Model):
    __tablename__ = 'program'

    id = db.Column(db.Integer, primary_key=True)
    university_id = db.Column(db.Integer, db.ForeignKey('university.id'), nullable=False)
    name = db.Column(db.String(200), nullable=False)
    cutoff_aggregate = db.Column(db.Integer, nullable=False)
    program_type = db.Column(db.String(50), default="Regular")

    # Provenance of cutoff_aggregate:
    #   "published"       - a real per-programme cut-off read from the university
    #   "general_ceiling" - the university's site-wide minimum entry aggregate, used
    #                       because no per-programme cut-off is published anywhere
    #   "unverified"      - older seed data predating this field
    # The UI must distinguish these: a general_ceiling match means "meets the minimum
    # entry bar", NOT "would likely be admitted".
    cutoff_source = db.Column(db.String(30), default="unverified", nullable=False)

    # Serialized JSON string string requirements column field mapping
    _requirements = db.Column('requirements', db.Text, nullable=False)

    @property
    def requirements(self):
        """Getter: Automatically converts the text back to a Python dictionary."""
        return json.loads(self._requirements)

    @requirements.setter
    def requirements(self, value):
        """Setter: Automatically converts a Python dictionary to text for the database."""
        self._requirements = json.dumps(value)