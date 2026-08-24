import { useEffect, useState } from "react";
import { Link } from "react-router";
import TripsDock from "../components/TripsDock"
import {  VscAdd, VscArchive, VscFileMedia, VscCheck } from "react-icons/vsc";

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
  image_url: string | null
  activities?: Activity[];
};

export default function Trips() {
  const [trips, setTrips] = useState<Trip[]>([]);

  useEffect(() => {
    async function loadTrips() {
      const response = await fetch("http://localhost:8000/get_trips", { credentials: "include" });
      const existingTrips = await response.json();

      setTrips(existingTrips);
    }

  loadTrips();
  }, []);

  const [userName, setUserName] = useState("");
  useEffect(() => {
    async function getUserName() {
      const response = await fetch("http://localhost:8000/auth/me", { credentials: "include" });
      const user = await response.json();

      setUserName(user["name"].split(" ")[0])
    }
  getUserName()
  }, []);

  const [showForm, setShowForm] = useState(false);
  const [tripName, setTripName] = useState("");
  const [tripImage, setTripImage] = useState<File | null>(null);

  async function asyncCreateTrip(tripName: string) {
    const formData = new FormData();
    formData.append("name", tripName);

    if (tripImage) {
      formData.append("image", tripImage);
    }
    const response = await fetch("http://localhost:8000/add_trip", {
      method: "POST",
      credentials: "include",
      body: formData
    });
    const trip = await response.json();
    
    setTrips([
      ...trips,
      {
        id: trip.id,
        name: trip.name,
        image_url: trip.image_url
      },
    ]);

    setTripName("");
    setTripImage(null);
    setShowForm(false);
  }

  const items = [
      { icon: <VscAdd size={15} />, label: 'create trip', onClick: () => setShowForm(true) },
      { icon: <VscArchive size={18}/>, label: 'view archive', onClick: () => alert('not implemented yet :3') },
  ];

  return (
    <main className="trips-page flex min-h-screen flex-col items-center justify-center pb-30">
      <h1 className="fixed top-20 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap text-center text-5xl font-bold text-[#efe4e9]">
        {userName}'s trips
      </h1>

      <section className="mx-auto max-w-3xl">
        

        <div className="trips-scroll relative left-1/2 grid max-h-110 w-max -translate-x-1/2 grid-cols-2 gap-12 overflow-y-auto pt-6 pl-6 pr-6 md:grid-cols-4 mt-22">          
          {trips.map((trip) => (
            <Link
              key={trip.id}
              to={`/trips/${trip.id}`}
              state={{ tripName: trip.name }}
              className="
                trip-card relative flex aspect-square w-44
                items-center justify-center overflow-hidden
                rounded-3xl border border-purple-300/30
                bg-white/40
                transition-[border-color,box-shadow] duration-300
              "
            >
              {trip.image_url ? (
                <>
                  <img
                    src={`http://localhost:8000${trip.image_url}`}
                    alt={trip.name}
                    className="absolute inset-0 h-full w-full object-cover"
                  />

                  <span
                    className="
                      trip-card-title absolute inset-0
                      flex items-center justify-center
                      bg-[#181c2c]/70 text-[#efe4e9]
                      opacity-0 transition-opacity duration-300
                    "
                  >
                    {trip.name}
                  </span>
                </>
              ) : (
                <span className="px-4 text-center text-[#efe4e9]">
                  {trip.name}
                </span>
              )}
            </Link>
          ))}
        </div>
        <div className="fixed bottom-20 left-1/2 z-20 -translate-x-1/2">
          {showForm && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                asyncCreateTrip(tripName);
              }}
              className="
                absolute bottom-full left-1/2 mb-4
                w-72 -translate-x-1/2 rounded-3xl
                border border-white/20
                bg-linear-to-br from-purple-300/40 via-purple-400/25 to-pink-300/20
                p-4 backdrop-blur-2xl
                shadow-[0_8px_32px_rgba(0,0,0,0.25),0_0_24px_rgba(192,132,252,0.2)]
              "
            >
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={tripName}
                  onChange={(event) => setTripName(event.target.value)}
                  placeholder="Trip name"
                  required={true}
                  autoFocus
                  className="
                    min-w-0 flex-1 rounded-full
                    bg-[#181c2c]/50 px-4 py-2
                    text-white placeholder:text-white/70
                    outline-none
                  "
                />

                <label
                  className="
                    flex h-10 w-10 shrink-0 cursor-pointer
                    items-center justify-center
                    rounded-full bg-[#181c2c]/40
                    text-white
                  "
                  aria-label="Add trip image"
                >
                  {tripImage ? (
                    <VscCheck size={18} className="text-purple-200" />
                  ) : (
                    <VscFileMedia size={18} />
                  )}

                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      setTripImage(event.target.files?.[0] ?? null);
                    }}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <button
                  type="submit"
                  className="
                    create-hover flex-1 rounded-full bg-white/35
                    px-4 py-2 text-white
                  "
                >
                  Create
                </button>

                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="
                    rounded-full px-4 py-2
                    text-[#181c2c]
                    transition hover:bg-white/20
                  "
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <TripsDock
            items={items}
            panelHeight={68}
            baseItemSize={50}
            magnification={70}
          />
        </div>
      </section>
    </main>
  );
}