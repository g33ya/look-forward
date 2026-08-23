from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.database import get_connection


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


#                                  ---=== TRIPS TABLE APIS ===---

# Get all trips
@app.get("/get_trips")
async def get_trips():
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute("SELECT id, name FROM trips")
            trips = cursor.fetchall()

    return [{"id": trip[0], "name": trip[1]} for trip in trips]

# Get a specific trip by ID
@app.get("/get_trip/{trip_id}")
async def get_trip(trip_id: int):
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute("SELECT id, name FROM trips WHERE id = %s", (trip_id,))
            trip = cursor.fetchone()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    return {"id": trip[0], "name": trip[1]}

# Add a new trip
@app.post("/add_trip")
async def add_trip(trip: dict):
    name = trip["name"]

    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO trips (name) VALUES (%s) RETURNING id",
                (name,),
            )
            trip_id = cursor.fetchone()[0]
    return {"id": trip_id, "name": name}



#                               ---=== ACTIVITIES TABLE APIS ===---

# All activities for a specific trip 
@app.get("/get_activities/{trip_id}")
async def get_activities(trip_id: int):
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute("SELECT id, name FROM activities WHERE trip_id = %s", (trip_id,))
            activities = cursor.fetchall()

    return [{"id": activity[0], "name": activity[1]} for activity in activities]

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
    price_range = activity.get("price_range", None)
    links = activity.get("links", None)
    notes = activity.get("notes", None)

    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                "INSERT INTO activities (name, location, price_range, links, notes, trip_id) VALUES (%s, %s, %s, %s, %s, %s) RETURNING id",
                (name, location, price_range, links, notes, trip_id),
            )
            activity_id = cursor.fetchone()[0]
    return {"id": activity_id, "name": name, "trip_id": trip_id}