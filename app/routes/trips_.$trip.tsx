import { useState } from "react";
import { useParams } from "react-router";


export default function TripPage() {
  const { trip } = useParams();
    type Activity = {
    id: number;
    name: string;
    location: string;
    priceRange: string;
    links: string;
    notes: string;
  };

  const [activities, setActivities] = useState<Activity[]>([]);

  const [createActivityForm, setCreateActivityForm] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [activityName, setActivityName] = useState("");
  const [activityLocation, setActivityLocation] = useState("");
  const [activityPriceRange, setActivityPriceRange] = useState("");
  const [activityLinks, setActivityLinks] = useState("");
  const [activityNotes, setActivityNotes] = useState("");

  function createActivity() {
    setActivities([
      ...activities,
      {
        id: Date.now(),
        name: activityName.trim(),
        location: activityLocation.trim(),
        priceRange: activityPriceRange.trim(),
        links: activityLinks.trim(),
        notes: activityNotes.trim(),
      },
    ]);
    setActivityName("");
    setActivityLocation("");
    setActivityPriceRange("");
    setActivityLinks("");
    setActivityNotes("");
    setCreateActivityForm(false);
  }

  return (
    <main className="min-h-screen px-6 py-12">
      <h1 className="mb-10 text-center text-5xl font-bold text-purple-700">
        {trip?.split("-").join(" ")}
      </h1>

      <section className="mx-auto max-w-3xl">
        <h2 className="mb-5 text-2xl font-semibold text-purple-900">
          Activities
        </h2>

        <button
          type="button"
          onClick={() => setCreateActivityForm(true)}
          className="mb-5 rounded-full bg-purple-600 px-5 py-2 text-white hover:bg-purple-700"
        >
          + Create event
        </button>

        {createActivityForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <form
              onSubmit={createActivity}
              className="relative w-full max-w-md rounded-3xl bg-[#c9bddc] p-8 shadow-xl"
            >
              <button
                type="button"
                onClick={() => setCreateActivityForm(false)}
                className="absolute right-5 top-4 text-xl text-purple-900"
              >
                ×
              </button>

              <div className="mx-auto mb-4 h-28 w-28 rounded-3xl bg-gray-200" />

              <input
                type="text"
                value={activityName}
                onChange={(event) => setActivityName(event.target.value)}
                placeholder="Activity name"
                className="mb-8 w-full bg-transparent text-center text-2xl font-bold text-purple-950 placeholder:text-purple-900/60 focus:outline-none"
                required
                autoFocus
              />

              <div className="space-y-4">
                <label className="flex items-center gap-3">
                  <span className="w-28 text-purple-950">Location:</span>
                  <input
                    type="text"
                    value={activityLocation}
                    onChange={(event) => setActivityLocation(event.target.value)}
                    className="flex-1 rounded-lg bg-white/50 px-3 py-2 outline-none"
                  />
                </label>

                <label className="flex items-center gap-3">
                  <span className="w-28 text-purple-950">Price range:</span>
                  <input
                    type="text"
                    value={activityPriceRange}
                    onChange={(event) =>
                      setActivityPriceRange(event.target.value)
                    }
                    className="flex-1 rounded-lg bg-white/50 px-3 py-2 outline-none"
                  />
                </label>

                <label className="flex items-center gap-3">
                  <span className="w-28 text-purple-950">Links:</span>
                  <input
                    type="text"
                    value={activityLinks}
                    onChange={(event) => setActivityLinks(event.target.value)}
                    className="flex-1 rounded-lg bg-white/50 px-3 py-2 outline-none"
                  />
                </label>

                <label className="flex items-start gap-3">
                  <span className="w-28 pt-2 text-purple-950">Notes:</span>
                  <textarea
                    value={activityNotes}
                    onChange={(event) => setActivityNotes(event.target.value)}
                    rows={3}
                    className="flex-1 rounded-lg bg-white/50 px-3 py-2 outline-none"
                  />
                </label>
              </div>

              <button
                type="submit"
                className="mt-6 w-full rounded-full bg-purple-600 py-2 text-white hover:bg-purple-700"
              >
                Create activity
              </button>
            </form>
          </div>
        )}

        <div className="grid max-h-105 grid-cols-2 gap-5 overflow-y-auto md:grid-cols-4">
          {activities.map((activity) => (
            <button
              key={activity.id}
              type="button"
              onClick={() => setSelectedActivity(activity)}
              className="flex aspect-square flex-col justify-center rounded-3xl bg-gray-300/70 p-4 text-left text-purple-900 transition hover:bg-gray-300"
            >
              <h3 className="text-lg font-semibold">{activity.name}</h3>

              {activity.location && (
                <p className="mt-2 text-sm">{activity.location}</p>
              )}

              {activity.priceRange && (
                <p className="text-sm">{activity.priceRange}</p>
              )}
            </button>
          ))}
        </div>

        {selectedActivity && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="relative w-full max-w-md rounded-3xl bg-[#c9bddc] p-8 shadow-xl">
              <button
                type="button"
                onClick={() => setSelectedActivity(null)}
                className="absolute right-5 top-4 text-xl text-purple-900"
              >
                ×
              </button>

              <div className="mx-auto mb-4 h-28 w-28 rounded-3xl bg-gray-200" />

              <h2 className="mb-8 text-center text-2xl font-bold text-purple-950">
                {selectedActivity.name}
              </h2>

              <div className="space-y-4 text-purple-950">
                <p>
                  <span className="font-semibold">Location:</span>{" "}
                  {selectedActivity.location}
                </p>

                <p>
                  <span className="font-semibold">Price range:</span>{" "}
                  {selectedActivity.priceRange}
                </p>

                <p>
                  <span className="font-semibold">Links:</span>{" "}
                  {selectedActivity.links}
                </p>

                <p>
                  <span className="font-semibold">Notes:</span>{" "}
                  {selectedActivity.notes}
                </p>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}