import os

from flask import Flask
from .models import db  # Pull the instantiated db instance cleanly from models


def create_app():
    app = Flask(__name__, instance_relative_config=True)

    # instance/ is the canonical home for the SQLite file, resolved as an absolute
    # path so the location is stable no matter what directory the app is launched from
    os.makedirs(app.instance_path, exist_ok=True)
    db_path = os.path.join(app.instance_path, 'admissions.db')
    app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    # Initialize the extension with our application configuration context
    db.init_app(app)

    # Register blueprints safely inside the app context timeline
    from .routes import main as main_blueprint
    app.register_blueprint(main_blueprint)

    return app