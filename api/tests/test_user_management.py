import pytest
from app.database.models import User
from app.extensions import db

def test_get_users_data_admin(admin_client, app):
    """Test getting users data as admin."""
    # Create some users
    with app.app_context():
        user1 = User(username="user1", is_active=True, is_admin=False)
        user1.set_password("pass")
        user2 = User(username="user2", is_active=False, is_admin=False)
        user2.set_password("pass")
        db.session.add(user1)
        db.session.add(user2)
        db.session.commit()

    response = admin_client.get('/api/users/data')
    assert response.status_code == 200
    data = response.json
    assert "usersData" in data
    assert isinstance(data["usersData"], list)
    
    usernames = [u["username"] for u in data["usersData"]]
    assert "user1" in usernames
    assert "user2" in usernames
    # assert "admin" in usernames # admin_client creates an admin user

def test_get_users_data_non_admin(auth_client):
    """Test getting users data as non-admin."""
    response = auth_client.get('/api/users/data')
    assert response.status_code == 403 # Assuming admin_required returns 403 or 401

def test_get_users_data_unauthenticated(client):
    """Test getting users data without authentication."""
    response = client.get('/api/users/data')
    assert response.status_code == 401
