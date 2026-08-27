import os
from datetime import datetime, timedelta, timezone

from fastapi import FastAPI, HTTPException, Response, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.database import get_connection

from google.auth.transport import requests
from google.oauth2 import id_token

import hashlib
import secrets

from pathlib import Path
from uuid import uuid4
from pathlib import Path
from uuid import uuid4

from fastapi import File, Form, HTTPException, Request, UploadFile
from fastapi.staticfiles import StaticFiles


app = FastAPI()

origins = [
    "http://localhost:5173",
    "localhost:5173"
]


app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


@app.get("/", tags=["root"])
async def read_root() -> dict:
    return {"message": "FastAPI is running!"}

#                                     ---=== AUTH APIS ===---


GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")

@app.post("/auth/google")
async def google_login(data: dict, response: Response):
    credential = data["credential"]

    try:
        user_info = id_token.verify_oauth2_token(
            credential,
            requests.Request(),
            GOOGLE_CLIENT_ID,
        )

        google_id = user_info["sub"]
        email = user_info["email"]
        name = user_info["name"]
        profile_picture = user_info.get("picture", None)

        print("User picture:", profile_picture)  


        with get_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    "INSERT INTO users (google_id, email, name, profile_picture) VALUES (%s, %s, %s, %s) ON CONFLICT (google_id) DO NOTHING RETURNING id",
                    (google_id, email, name, profile_picture),
                )

                result = cursor.fetchone()
                if result is None:
                    cursor.execute(
                        "SELECT id FROM users WHERE google_id = %s",
                        (google_id,),
                    )
                    result = cursor.fetchone()
                user_id = result[0]

                session_token = secrets.token_urlsafe(32)
                token_hash = hashlib.sha256(session_token.encode()).hexdigest()
                expires_at = datetime.now(timezone.utc) + timedelta(days=7)

                cursor.execute(
                    "INSERT INTO sessions (user_id, token_hash, expires_at) VALUES (%s, %s, %s)",
                    (user_id, token_hash, expires_at),
                )

                response.set_cookie(
                    key="session_token",
                    value=session_token,
                    httponly=True,
                    secure=False,  
                    samesite="lax",
                    max_age=7 * 24 * 60 * 60,
                )

                return {"email": email, "name": name, "profile_picture": profile_picture}

    except ValueError:
        raise HTTPException(
            status_code=401,
            detail="Invalid Google credential",
        )

    return {
        "google_id": user_info["sub"],
        "email": user_info["email"],
        "name": user_info["name"],
    }

def get_current_user_id(request: Request) -> int:
    session_token = request.cookies.get("session_token")

    if session_token is None:
        raise HTTPException(
            status_code=401,
            detail="Not authenticated",
        )

    token_hash = hashlib.sha256(session_token.encode()).hexdigest()

    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT user_id
                FROM sessions
                WHERE token_hash = %s
                  AND expires_at > NOW()
                """,
                (token_hash,),
            )

            session = cursor.fetchone()

    if session is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired session",
        )

    return session[0]

@app.get("/auth/me")
async def get_current_user(request: Request):
    user_id = get_current_user_id(request)

    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT id, name, email, profile_picture
                FROM users
                WHERE id = %s
                """,
                (user_id,),
            )

            user = cursor.fetchone()

    return {
        "id": user[0],
        "name": user[1],
        "email": user[2],
        "profile_picture": user[3],
    }
    
#                                  ---=== TRIPS TABLE APIS ===---

# Get all trips
@app.get("/get_trips")
async def get_trips(request: Request):
    user_id = get_current_user_id(request)

    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute("SELECT id, name, image_url FROM trips WHERE user_id = %s", (user_id,))
            trips = cursor.fetchall()

    return [{"id": trip[0], "name": trip[1], "image_url": trip[2]} for trip in trips]

# Get a specific trip by ID
@app.get("/get_trip/{trip_id}")
async def get_trip(trip_id: int, request: Request):
    user_id = get_current_user_id(request)

    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute("SELECT id, name FROM trips WHERE id = %s AND user_id = %s", (trip_id, user_id))
            trip = cursor.fetchone()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    return {"id": trip[0], "name": trip[1]}



UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
async def save_trip_image(image: UploadFile) -> str:
    extension = Path(image.filename or "").suffix.lower()

    if extension not in {".jpg", ".jpeg", ".png", ".webp"}:
        raise HTTPException(
            status_code=400,
            detail="Unsupported image format",
        )

    filename = f"{uuid4()}{extension}"
    image_path = UPLOAD_DIR / filename

    contents = await image.read()
    image_path.write_bytes(contents)

    return f"/uploads/{filename}"

# Add a new trip
@app.post("/add_trip")
async def add_trip(request: Request, name: str = Form(...), image: UploadFile | None = File(None)):
    user_id = get_current_user_id(request)
    image_url = await save_trip_image(image) if image else None

    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO trips (user_id, name, image_url) VALUES (%s, %s, %s) RETURNING id",
                (user_id, name, image_url),
            )
            trip_id = cursor.fetchone()[0]
    return {"id": trip_id, "name": name, "image_url": image_url}


#                               ---=== ACTIVITIES TABLE APIS ===---

# All activities for a specific trip 
@app.get("/get_activities/{trip_id}")
async def get_activities(trip_id: int, request: Request):
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute("SELECT id, name, latitude, longitude, price_range FROM activities WHERE trip_id = %s", (trip_id,))
            activities = cursor.fetchall()

    return [{"id": activity[0], "name": activity[1], "latitude": activity[2], "longitude": activity[3], "priceRange": activity[4], "tags": await get_tags(activity[0], request)} for activity in activities]

# Fields of specific activity
@app.get("/get_activity/{activity_id}")
async def get_activity(activity_id: int):
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute("SELECT id, name, location, price_range, links, notes FROM activities WHERE id = %s", (activity_id,))
            activity = cursor.fetchone()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    return {"id": activity[0], "name": activity[1], "location": activity[2], "price_range": activity[3], "links": activity[4], "notes": activity[5]}

# Add a new activity to a specific trip
@app.post("/add_activity")
async def add_activity(activity: dict):
    trip_id = activity["trip_id"]
    name = activity["name"]
    location = activity.get("location", None)
    latitude = activity.get("latitude", None)
    longitude = activity.get("longitude", None)
    price_range = activity.get("price_range", None)
    links = activity.get("links", None)
    notes = activity.get("notes", None)

    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO activities (name, location, latitude, longitude, price_range, links, notes, trip_id) VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING id",
                (name, location, latitude, longitude, price_range, links, notes, trip_id),
            )
            activity_id = cursor.fetchone()[0]
    return {"id": activity_id, "name": name, "trip_id": trip_id}

# Get all of a user's tags
@app.get("/get_tags")
async def get_tags(request: Request):
    user_id = get_current_user_id(request)

    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT id, name
                FROM tags
                WHERE user_id = %s
                ORDER BY name
                """,
                (user_id,),
            )

            tags = cursor.fetchall()

    return [
        {"id": tag[0], "name": tag[1]}
        for tag in tags
    ]

# Get tags for a specific activity
@app.get("/get_tags/{activity_id}")
async def get_tags(activity_id: int, request: Request):
    user_id = get_current_user_id(request)

    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT tags.id, tags.name
                FROM tags
                JOIN activity_tags
                    ON tags.id = activity_tags.tag_id
                JOIN activities
                    ON activities.id = activity_tags.activity_id
                JOIN trips
                    ON trips.id = activities.trip_id
                WHERE activity_tags.activity_id = %s
                  AND tags.user_id = %s
                  AND trips.user_id = %s
                ORDER BY tags.name
                """,
                (activity_id, user_id, user_id),
            )

            tags = cursor.fetchall()

    return [
        {"id": tag[0], "name": tag[1]}
        for tag in tags
    ]

# Create tag
@app.post("/create_tag")
async def create_tag(request: Request, data: dict):
    user_id = get_current_user_id(request)

    tag_name = data["name"]
    activity_id = data["activity_id"]

    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT activities.id
                FROM activities
                JOIN trips ON activities.trip_id = trips.id
                WHERE activities.id = %s
                  AND trips.user_id = %s
                """,
                (activity_id, user_id),
            )

            if cursor.fetchone() is None:
                raise HTTPException(
                    status_code=404,
                    detail="Activity not found",
                )

            cursor.execute(
                """
                INSERT INTO tags (user_id, name)
                VALUES (%s, %s)
                ON CONFLICT (user_id, name)
                DO UPDATE SET name = EXCLUDED.name
                RETURNING id
                """,
                (user_id, tag_name),
            )

            tag_id = cursor.fetchone()[0]

            cursor.execute(
                """
                INSERT INTO activity_tags (activity_id, tag_id)
                VALUES (%s, %s)
                ON CONFLICT (activity_id, tag_id) DO NOTHING
                """,
                (activity_id, tag_id),
            )

    return {
        "id": tag_id,
        "name": tag_name,
        "activity_id": activity_id,
    }