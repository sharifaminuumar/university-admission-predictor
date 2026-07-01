from flask import Flask
from .models import db  # Pull the instantiated db instance cleanly from models


def create_app():
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///admissions.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    # Initialize the extension with our application configuration context
    db.init_app(app)

    # Register blueprints safely inside the app context timeline
    from .routes import main as main_blueprint
    app.register_blueprint(main_blueprint)

    return app