import { useEffect, useState } from "react";
import { Link } from "react-router";

type Activity = {
  id: number;
  name: string;
  location: string;
  priceRange: string;
  links: string;
  notes: string;
};

type Trip = {
  id: number;
  name: string;
  activities?: Activity[];
};

export default function Trips() {
  const [trips, setTrips] = useState<Trip[]>([]);

  useEffect(() => {
    async function loadTrips() {
      const response = await fetch("http://localhost:8000/get_trips");
      const existingTrips = await response.json();

      setTrips(existingTrips);
    }

  loadTrips();
  }, []);

  const [showForm, setShowForm] = useState(false);
  const [tripName, setTripName] = useState("");

  async function asyncCreateTrip(tripName: string) {
    const response = await fetch("http://localhost:8000/add_trip", {
      method: "POST",
      headers: {
          "Content-Type": "application/json"
      },
      body: JSON.stringify({ name: tripName.trim() })
    });
    const trip = await response.json();
    console.log(trip);
    
    setTrips([
      ...trips,
      {
        id: trip.id,
        name: trip.name,
      },
    ]);

    setTripName("");
    setShowForm(false);
  }

  return (
    <main className="min-h-screen px-6 py-12">
      <h1 className="mb-10 text-center text-5xl font-bold text-purple-700">
        look forward
      </h1>

      <section className="mx-auto max-w-3xl">
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="mb-5 rounded-full bg-purple-600 px-5 py-2 text-white"
        >
          +
        </button>

        {showForm && (
          <form onSubmit={() => asyncCreateTrip(tripName)} className="mb-5 flex gap-2">
            <input
              type="text"
              value={tripName}
              onChange={(event) => setTripName(event.target.value)}
              placeholder="Trip name"
              autoFocus
              className="rounded-lg bg-white px-4 py-2"
            />

            <button
              type="submit"
              className="rounded-lg bg-purple-600 px-4 py-2 text-white"
            >
              Create
            </button>

            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg px-4 py-2"
            >
              Cancel
            </button>
          </form>
        )}

        <div className="grid max-h-80 grid-cols-2 gap-5 overflow-y-auto md:grid-cols-4">
          {trips.map((trip) => (
            <Link
              key={trip.id}
              to={`/trips/${trip.id}`}
              className="flex aspect-square items-center justify-center rounded-3xl bg-white/50"
            >
                {trip.name}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}