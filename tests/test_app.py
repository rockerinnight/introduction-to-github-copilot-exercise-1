import copy
import pytest
from starlette.testclient import TestClient
import app as app_module
from app import app

client = TestClient(app, follow_redirects=True)

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

ORIGINAL_ACTIVITIES = copy.deepcopy(app_module.activities)


@pytest.fixture(autouse=True)
def reset_activities():
    """Restore the shared activities dict to its original state before each test."""
    app_module.activities.clear()
    app_module.activities.update(copy.deepcopy(ORIGINAL_ACTIVITIES))
    yield
    app_module.activities.clear()
    app_module.activities.update(copy.deepcopy(ORIGINAL_ACTIVITIES))


# ---------------------------------------------------------------------------
# GET /
# ---------------------------------------------------------------------------

def test_redirect_root():
    # Arrange
    # (no setup needed — default app state is sufficient)

    # Act
    response = client.get("/")

    # Assert
    assert response.status_code == 200
    assert response.url.path == "/static/index.html"


# ---------------------------------------------------------------------------
# GET /activities
# ---------------------------------------------------------------------------

EXPECTED_ACTIVITIES = [
    "Chess Club",
    "Programming Class",
    "Gym Class",
    "Basketball Team",
    "Tennis Club",
    "Drama Club",
    "Art Studio",
    "Debate Team",
    "Science Club",
]


def test_get_activities_returns_all():
    # Arrange
    # (no setup needed — default app state contains all 9 activities)

    # Act
    response = client.get("/activities")

    # Assert
    assert response.status_code == 200
    data = response.json()
    for name in EXPECTED_ACTIVITIES:
        assert name in data


def test_get_activities_have_required_fields():
    # Arrange
    required_fields = {"description", "schedule", "max_participants", "participants"}

    # Act
    response = client.get("/activities")

    # Assert
    assert response.status_code == 200
    for name, details in response.json().items():
        assert required_fields <= details.keys(), f"{name} is missing required fields"


# ---------------------------------------------------------------------------
# POST /activities/{activity_name}/signup
# ---------------------------------------------------------------------------

def test_signup_happy_path():
    # Arrange
    activity_name = "Chess Club"
    email = "newstudent@mergington.edu"

    # Act
    response = client.post(f"/activities/{activity_name}/signup?email={email}")

    # Assert
    assert response.status_code == 200
    assert email in app_module.activities[activity_name]["participants"]
    assert f"Signed up {email}" in response.json()["message"]


def test_signup_already_registered():
    # Arrange
    activity_name = "Chess Club"
    email = "michael@mergington.edu"  # already in default data

    # Act
    response = client.post(f"/activities/{activity_name}/signup?email={email}")

    # Assert
    assert response.status_code == 400
    assert response.json()["detail"] == "Student already signed up"


def test_signup_activity_full():
    # Arrange — fill Chess Club (max 12) up to capacity
    activity_name = "Chess Club"
    activity = app_module.activities[activity_name]
    while len(activity["participants"]) < activity["max_participants"]:
        activity["participants"].append(f"filler{len(activity['participants'])}@mergington.edu")

    # Act
    response = client.post(f"/activities/{activity_name}/signup?email=overflow@mergington.edu")

    # Assert
    assert response.status_code == 400
    assert response.json()["detail"] == "Activity is full"


def test_signup_unknown_activity():
    # Arrange
    activity_name = "Nonexistent Activity"
    email = "student@mergington.edu"

    # Act
    response = client.post(f"/activities/{activity_name}/signup?email={email}")

    # Assert
    assert response.status_code == 404
    assert response.json()["detail"] == "Activity not found"


# ---------------------------------------------------------------------------
# DELETE /activities/{activity_name}/unregister
# ---------------------------------------------------------------------------

def test_unregister_happy_path():
    # Arrange
    activity_name = "Chess Club"
    email = "michael@mergington.edu"  # present in default data

    # Act
    response = client.delete(f"/activities/{activity_name}/unregister?email={email}")

    # Assert
    assert response.status_code == 200
    assert email not in app_module.activities[activity_name]["participants"]
    assert f"Unregistered {email}" in response.json()["message"]


def test_unregister_not_enrolled():
    # Arrange
    activity_name = "Chess Club"
    email = "notamember@mergington.edu"

    # Act
    response = client.delete(f"/activities/{activity_name}/unregister?email={email}")

    # Assert
    assert response.status_code == 404
    assert response.json()["detail"] == "Student not signed up for this activity"


def test_unregister_unknown_activity():
    # Arrange
    activity_name = "Nonexistent Activity"
    email = "student@mergington.edu"

    # Act
    response = client.delete(f"/activities/{activity_name}/unregister?email={email}")

    # Assert
    assert response.status_code == 404
    assert response.json()["detail"] == "Activity not found"
