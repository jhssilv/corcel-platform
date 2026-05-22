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
    assert response.json["error"] == "Access forbidden: Admins only"
    assert response.json["code"] == "AUTH_FORBIDDEN"

def test_get_users_data_unauthenticated(client):
    """Test getting users data without authentication."""
    response = client.get('/api/users/data')
    assert response.status_code == 401
    assert response.json["error"] == "Not authenticated"
    assert response.json["code"] == "AUTH_NOT_AUTHENTICATED"


def test_set_user_status_deactivates_user(admin_client, app):
    """Test explicitly setting a user as inactive."""
    with app.app_context():
        user = User(username="activeuser", is_active=True, is_admin=False)
        user.set_password("pass")
        db.session.add(user)
        db.session.commit()

    response = admin_client.patch('/api/users/activeuser/status', json={"is_active": False})

    assert response.status_code == 200
    assert response.json["message"] == "User deactivated successfully."

    with app.app_context():
        user = db.session.query(User).filter_by(username="activeuser").first()
        assert user is not None
        assert user.is_active is False


def test_set_user_status_activates_user(admin_client, app):
    """Test explicitly setting a user as active."""
    with app.app_context():
        user = User(username="inactiveuser", is_active=False, is_admin=False)
        user.set_password("pass")
        db.session.add(user)
        db.session.commit()

    response = admin_client.patch('/api/users/inactiveuser/status', json={"is_active": True})

    assert response.status_code == 200
    assert response.json["message"] == "User activated successfully."

    with app.app_context():
        user = db.session.query(User).filter_by(username="inactiveuser").first()
        assert user is not None
        assert user.is_active is True


def test_set_user_role_grants_admin(admin_client, app):
    """Test explicitly granting admin privileges."""
    with app.app_context():
        user = User(username="regularuser", is_active=True, is_admin=False)
        user.set_password("pass")
        db.session.add(user)
        db.session.commit()

    response = admin_client.patch('/api/users/regularuser/role', json={"is_admin": True})

    assert response.status_code == 200
    assert response.json["message"] == "User granted admin privileges."

    with app.app_context():
        user = db.session.query(User).filter_by(username="regularuser").first()
        assert user is not None
        assert user.is_admin is True


def test_set_user_role_blocks_last_admin_revoke(admin_client):
    """Test that the last admin cannot be demoted."""
    response = admin_client.patch('/api/users/adminuser/role', json={"is_admin": False})

    assert response.status_code == 400
    assert response.json["error"] == "Cannot revoke admin privileges from the last admin user."
    assert response.json["code"] == "BUSINESS_RULE_VIOLATION"
