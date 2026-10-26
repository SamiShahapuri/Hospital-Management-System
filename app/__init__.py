import os

from flask import Flask

from . import assignments, auth, db


def create_app(test_config=None):
    app = Flask(__name__)
    app.config.from_mapping(
        SECRET_KEY=os.environ.get("SECRET_KEY", "dev-only-change-me"),
        DATABASE=os.path.join(app.instance_path, "hms.sqlite"),
        DEV_LOGIN=True,
    )
    if test_config:
        app.config.update(test_config)

    os.makedirs(app.instance_path, exist_ok=True)
    db.init_app(app)
    app.register_blueprint(auth.bp)
    app.register_blueprint(assignments.bp)

    @app.get("/")
    def home():
        from flask import redirect, url_for
        return redirect(url_for("assignments.index"))

    return app
