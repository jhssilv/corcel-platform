import pytest
from app.database.models import User
from app.extensions import db

def test_register_user(client, app):
    """Test user registration."""
    response = client.post('/api/register', json={
        "username": "newuser",
        "password": "newpassword"
    })
    assert response.status_code == 201
    assert response.json["msg"] == "User created successfully"

    with app.app_context():
        user = db.session.query(User).filter_by(username="newuser").first()
        assert user is not None
        assert user.check_password("newpassword")

def test_register_duplicate_user(client, auth_client):
    """Test registering a user that already exists."""
    # auth_client fixture already creates 'testuser'
    response = client.post('/api/register', json={
        "username": "testuser",
        "password": "password123"
    })
    assert response.status_code == 400
    assert response.json["error"] == "Username already exists."

def test_login_success(client, app):
    """Test successful login."""
    # Create user first
    with app.app_context():
        user = User(username="loginuser")
        user.set_password("loginpass")
        db.session.add(user)
        db.session.commit()

    response = client.post('/api/login', json={
        "username": "loginuser",
        "password": "loginpass"
    })
    assert response.status_code == 200
    assert response.json["message"] == "Login successful"
    
    # Check if cookie is set
    # Check Set-Cookie header
    cookie_header = response.headers.get("Set-Cookie")
    assert cookie_header is not None
    assert "access_token_cookie" in cookie_header

def test_login_invalid_password(client, app):
    """Test login with invalid password."""
    with app.app_context():
        user = User(username="wrongpassuser")
        user.set_password("correctpass")
        db.session.add(user)
        db.session.commit()

    response = client.post('/api/login', json={
        "username": "wrongpassuser",
        "password": "wrongpass"
    })
    assert response.status_code == 403
    assert response.json["error"] == "Invalid password."

def test_login_nonexistent_user(client):
    """Test login with non-existent user."""
    response = client.post('/api/login', json={
        "username": "ghost",
        "password": "password"
    })
    assert response.status_code == 401
    assert response.json["error"] == "User does not exist."

def test_logout(auth_client):
    """Test logout."""
    response = auth_client.get('/api/logout')
    assert response.status_code == 200
    assert response.json["message"] == "Logout successful"
    
    # Verify cookie is unset/expired
    # Check Set-Cookie header for expiration or empty value
    cookie_header = response.headers.get("Set-Cookie")
    assert cookie_header is not None
    assert "access_token_cookie=;" in cookie_header or "access_token_cookie=" in cookie_header

def test_get_users_protected(client):
    """Test accessing protected route without login."""
    response = client.get('/api/users')
    assert response.status_code == 401

def test_get_users_authenticated(auth_client):
    """Test accessing protected route with login."""
    response = auth_client.get('/api/users')
    assert response.status_code == 200
    assert "usernames" in response.json
    assert "testuser" in response.json["usernames"]
