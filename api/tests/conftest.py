import pytest
import os
from app.extensions import db
from app.database.models import User, Base

# Set environment variables BEFORE any imports of app modules
os.environ['DATABASE_URL'] = 'sqlite:///:memory:'
os.environ['TESTING'] = 'True'

from app.app import create_app

@pytest.fixture
def app():
    """Create and configure a new app instance for each test."""
    app = create_app()
    app.config.update({
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",  # Use in-memory SQLite
        "JWT_SECRET_KEY": "test-secret",
        "WTF_CSRF_ENABLED": False,  # Disable CSRF for testing if used
        "JWT_COOKIE_CSRF_PROTECT": False, # Disable JWT CSRF for testing
        "CELERY_BROKER_URL": "memory://",
        "CELERY_RESULT_BACKEND": "memory://"
    })

    with app.app_context():
        # Create tables for models defined with Base
        Base.metadata.create_all(bind=db.engine)
        yield app
        db.session.remove()
        # Try to drop tables gracefully, ignoring errors
        try:
            Base.metadata.drop_all(bind=db.engine)
        except Exception:
            pass  # Ignore teardown errors

@pytest.fixture
def client(app):
    """A test client for the app."""
    return app.test_client()

@pytest.fixture
def runner(app):
    """A test runner for the app's CLI commands."""
    return app.test_cli_runner()

@pytest.fixture
def auth_client(client):
    """A helper to create a user and log them in, returning the client with cookies."""
    # Create a user
    with client.application.app_context():
        user = User(username="testuser")
        user.set_password("password123")
        db.session.add(user)
        db.session.commit()

    # Login
    response = client.post('/api/login', json={
        "username": "testuser",
        "password": "password123"
    })
    
    # The client now has the cookies set
    return client

@pytest.fixture
def admin_client(client):
    """A helper to create an admin user and log them in."""
    # Create an admin user
    with client.application.app_context():
        user = User(username="adminuser", is_admin=True)
        user.set_password("adminpass")
        db.session.add(user)
        db.session.commit()

    # Login
    client.post('/api/login', json={
        "username": "adminuser",
        "password": "adminpass"
    })
    
    return client
