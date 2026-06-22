import os
from flask import Flask
from .models import db


def create_app():
    app = Flask(__name__)

    # This finds the absolute path to your root project folder
    basedir = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))

    # This tells Flask exactly where admissions.db is, with zero ambiguity
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'admissions.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    db.init_app(app)

    # Register our web routes
    from .routes import main
    app.register_blueprint(main)

    return app