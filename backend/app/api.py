from fastapi import FastAPI
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

@app.get("/get_trips")
async def get_trips():
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute("SELECT id, name FROM trips")
            trips = cursor.fetchall()

    return [{"id": trip[0], "name": trip[1]} for trip in trips]

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