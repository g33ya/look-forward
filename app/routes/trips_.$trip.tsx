import { useEffect, useState } from "react";
import { useParams, useLocation, Link } from "react-router";
import { APIProvider } from "@vis.gl/react-google-maps";
import LocationAutocomplete from "../components/LocationAutocomplete";
import calculateDistanceMiles from "../helpers/calculateDistanceMiles";

// Custom Activity type
export default function TripPage() {
  type Tag = {
   id: number;
   name: string;
  };

  type Activity = {
    id: number;
    name: string;
    location: string;
    latitude: number | null;
    longitude: number | null;
    priceRange: string;
    tags: Tag[];
    links: string;
    notes: string;
  };

  // Get trip ID from URL params
  const { trip } = useParams();
  if (!trip) return;
  const tripId = parseInt(trip, 10);

  // Get trip name from location state
  const { state } = useLocation();
  const tripName = state?.tripName || ""; 

  // Load activities for trip
  const [activities, setActivities] = useState<Activity[]>([]);
  useEffect(() => {
      async function loadActivities() {
        const response = await fetch(
          `http://localhost:8000/get_activities/${trip}`,
          { credentials: "include" }
        );
        const existingActivities = await response.json();

        setActivities(existingActivities);
      }
  
    loadActivities();
  }, []);

  
  const [activityTags, setActivityTags] = useState<Tag[]>([]);
  const [tagName, setTagName] = useState("");
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

  useEffect(() => {
    if (!selectedActivity) {
      setActivityTags([]);
      return;
    }

    async function loadTags() {
      const response = await fetch(
        `http://localhost:8000/get_tags/${selectedActivity!.id}`,
        { credentials: "include" }
      );

      if (!response.ok) {
        throw new Error("Failed to load tags");
      }

      const tags = await response.json();
      setActivityTags(tags);
    }

    loadTags();
  }, [selectedActivity]);

  const [userLocation, setUserLocation] = useState<{latitude: number;longitude: number;} | null>(null);
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        console.error("Unable to retrieve location:", error);
      }
    );
  }, []);

  // States for UI and form handling
  const [createActivityForm, setCreateActivityForm] = useState(false);
  const [activityName, setActivityName] = useState("");
  const [activityLocation, setActivityLocation] = useState("");
  const [activityPriceRange, setActivityPriceRange] = useState("");
  const [activityLinks, setActivityLinks] = useState("");
  const [activityNotes, setActivityNotes] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  async function createActivity(event: React.SyntheticEvent<HTMLFormElement, SubmitEvent>) {
    event.preventDefault();

    const response = await fetch(
      "http://localhost:8000/add_activity",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: activityName.trim(),
          location: activityLocation.trim(),
          latitude,
          longitude,
          price_range: activityPriceRange || null,
          links: activityLinks.trim(),
          notes: activityNotes.trim(),
          trip_id: tripId,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Failed to create activity:", error);
      return;
    }

    const activity = await response.json();

    setActivities((currentActivities) => [
      ...currentActivities,
      {
        id: activity.id,
        name: activityName.trim(),
        location: activityLocation.trim(),
        latitude,
        longitude,
        priceRange: activityPriceRange,
        links: activityLinks.trim(),
        notes: activityNotes.trim(),
        tags: [],
      },
    ]);

    setActivityName("");
    setActivityLocation("");
    setActivityPriceRange("");
    setActivityLinks("");
    setActivityNotes("");
    setLatitude(null);
    setLongitude(null);
    setCreateActivityForm(false);
  }

  // Get a specific activity by ID to display UI details
  async function getActivity(id: number) {
    const response = await fetch(
      `http://localhost:8000/get_activity/${id}`
    );

    const activity = await response.json();

    setSelectedActivity({
      ...activity,
      priceRange: activity.price_range,
    });
  }

  async function addTag() {
    if (!selectedActivity || !tagName.trim()) {
      return;
    }

    const response = await fetch("http://localhost:8000/create_tag", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: tagName.trim(),
        activity_id: selectedActivity.id,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to create tag");
    }

    const tag = await response.json();

    setActivityTags((currentTags) =>
      currentTags.some((currentTag) => currentTag.id === tag.id)
        ? currentTags
        : [...currentTags, tag]
    );

    setTagName("");
    
    setActivities((currentActivities) =>
      currentActivities.map((activity) => {
        if (activity.id !== selectedActivity.id) {
          return activity;
        }

        const alreadyHasTag = activity.tags.some(
          (activityTag) => activityTag.id === tag.id
        );

        return {
          ...activity,
          tags: alreadyHasTag
            ? activity.tags
            : [...activity.tags, tag],
        };
      })
    );
  }

  const [maxDistance, setMaxDistance] = useState(300);
  const [selectedPrices, setSelectedPrices] = useState<string[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

  const availableTags = Array.from(
    new Map(
      activities
        .flatMap((activity) => activity.tags)
        .map((tag) => [tag.id, tag])
    ).values()
  );

  const filteredActivities = activities.filter((activity) => {
    const distance =
      userLocation &&
      activity.latitude != null &&
      activity.longitude != null
        ? calculateDistanceMiles(
            userLocation.latitude,
            userLocation.longitude,
            activity.latitude,
            activity.longitude
          )
        : null;

    const matchesDistance =
      distance === null || distance <= maxDistance;

    const matchesPrice =
      selectedPrices.length === 0 ||
      selectedPrices.includes(activity.priceRange);
    
    const matchesTags =
      selectedTagIds.length === 0 ||
      activity.tags.some((tag) =>
        selectedTagIds.includes(tag.id)
      );

    return matchesDistance && matchesPrice && matchesTags;
  });

  return (
    <main className="activities-page min-h-screen px-6 py-12">
      <Link
        to="/trips"
        className="
          mb-8 inline-flex items-center gap-2
          text-sm font-medium text-purple-300
          transition-all duration-200
          hover:-translate-x-1 hover:text-purple-100
        "
      >
        <span aria-hidden="true">←</span>
        to trips
      </Link>

      <section className="mx-auto w-full max-w-6xl">
        <h1 className="mb-2 text-left text-5xl font-bold text-[#efe4e9]">
          {tripName}
        </h1>
        <div className="mb-5 flex items-center gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.25em] text-purple-300">
            Activities
          </h2>

          <div className="h-px flex-1 bg-linear-to-r from-purple-300/50 to-transparent" />
        </div>

        <button
          type="button"
          onClick={() => setCreateActivityForm(true)}
          className="
            group mb-6 inline-flex items-center gap-2
            rounded-full border border-purple-300/30
            bg-purple-300/15 px-4 py-2
            text-sm font-semibold text-purple-100
            shadow-[0_0_18px_rgba(192,132,252,0.18)]
            backdrop-blur-md
            transition-all duration-200
            hover:-translate-y-0.5
            hover:border-purple-200/60
            hover:bg-purple-300/25
            hover:shadow-[0_0_24px_rgba(192,132,252,0.3)]
          "
        >
          <span
            className="
              flex h-6 w-6 items-center justify-center
              rounded-full bg-purple-300/25
              text-lg leading-none
              transition-transform duration-200
              group-hover:rotate-90
            "
          >
            +
          </span>

          Add activity
        </button>

        {createActivityForm && (
          <div
            className="
              fixed inset-0 z-50
              flex items-center justify-center px-4
              bg-[#080b16]/65 backdrop-blur-md
            "
          >
            <form
              onSubmit={createActivity}
              className="
                relative w-full max-w-md overflow-hidden
                rounded-4xl border border-white/20
                bg-white/10 p-8
                text-[#efe4e9]
                shadow-[0_24px_80px_rgba(0,0,0,0.45),0_0_40px_rgba(192,132,252,0.15)]
                backdrop-blur-2xl
                before:pointer-events-none before:absolute
                before:inset-x-8 before:top-0 before:h-px
                before:bg-linear-to-r
                before:from-transparent before:via-white/70
                before:to-transparent
              "
            >
              <button
                type="button"
                onClick={() => setCreateActivityForm(false)}
                aria-label="Close form"
                className="
                  absolute right-5 top-4 z-10
                  flex h-8 w-8 items-center justify-center
                  rounded-full border border-white/10
                  bg-white/10 text-xl text-white/60
                  transition duration-200
                  hover:rotate-90 hover:bg-white/20 hover:text-white
                "
              >
                ×
              </button>

              <div className="mb-8 text-center">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-purple-200/60">
                  New activity
                </p>

                <input
                  type="text"
                  value={activityName}
                  onChange={(event) => setActivityName(event.target.value)}
                  placeholder="Activity name"
                  required
                  autoFocus
                  className="
                    w-full border-b border-white/15
                    bg-transparent pb-3 text-center
                    text-2xl font-bold text-white
                    placeholder:text-white/35
                    outline-none transition
                    focus:border-purple-300/60
                  "
                />
              </div>

              <div className="space-y-5">
                <div className="relative z-50">
                  <label className="mb-2 block text-sm font-medium text-white/65">
                    Location
                  </label>

                  <div
                    className="
                      relative z-50
                      rounded-xl border border-white/15
                      bg-white/8 px-3 py-2
                      shadow-inner backdrop-blur-md
                      transition
                      focus-within:border-purple-300/50
                      focus-within:bg-white/12
                      focus-within:ring-2
                      focus-within:ring-purple-300/10
                    "
                  >
                    <APIProvider
                      apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
                    >
                      <LocationAutocomplete
                        onPlaceSelected={(place) => {
                          setActivityLocation(place.address);
                          setLatitude(place.latitude);
                          setLongitude(place.longitude);
                        }}
                      />
                    </APIProvider>
                  </div>
                </div>

                <div>
                  <p className="mb-2 block text-sm font-medium text-white/65">
                    Price range
                  </p>

                  <div className="flex gap-2">
                    {["$", "$$", "$$$"].map((price) => (
                      <button
                        key={price}
                        type="button"
                        onClick={() => setActivityPriceRange(price)}
                        className={`
                          rounded-full border px-4 py-1.5
                          text-sm font-semibold
                          transition-all duration-200
                          ${
                            activityPriceRange === price
                              ? `
                                border-purple-200/50
                                bg-purple-300/30 text-white
                                shadow-[0_0_14px_rgba(192,132,252,0.25)]
                              `
                              : `
                                border-white/10
                                bg-white/6 text-white/40
                                hover:bg-white/10 hover:text-white/70
                              `
                          }
                        `}
                      >
                        {price}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-white/65">
                    Link
                  </label>

                  <input
                    type="text"
                    value={activityLinks}
                    onChange={(event) => setActivityLinks(event.target.value)}
                    placeholder="Link 1, Link 2, Link 3"
                    className="
                      w-full rounded-xl
                      border border-white/15
                      bg-white/8 px-4 py-2.5
                      text-white placeholder:text-white/30
                      shadow-inner outline-none
                      backdrop-blur-md transition
                      focus:border-purple-300/50
                      focus:bg-white/12
                      focus:ring-2 focus:ring-purple-300/10
                    "
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-white/65">
                    Notes
                  </label>

                  <textarea
                    value={activityNotes}
                    onChange={(event) => setActivityNotes(event.target.value)}
                    placeholder="Anything you want to remember..."
                    rows={3}
                    className="
                      w-full resize-none rounded-xl
                      border border-white/15
                      bg-white/8 px-4 py-2.5
                      text-white placeholder:text-white/30
                      shadow-inner outline-none
                      backdrop-blur-md transition
                      focus:border-purple-300/50
                      focus:bg-white/12
                      focus:ring-2 focus:ring-purple-300/10
                    "
                  />
                </div>
              </div>

              <button
                type="submit"
                className="
                  mt-7 w-full rounded-full
                  border border-purple-200/30
                  bg-purple-300/25 py-2.5
                  font-semibold text-white
                  shadow-[0_0_22px_rgba(192,132,252,0.2)]
                  backdrop-blur-md
                  transition-all duration-200
                  hover:-translate-y-0.5
                  hover:border-purple-200/50
                  hover:bg-purple-300/35
                  hover:shadow-[0_0_30px_rgba(192,132,252,0.35)]
                "
              >
                Create activity
              </button>
            </form>
          </div>
        )}
        <div className="flex items-start gap-8">
          <aside
              className="
                w-56 shrink-0 rounded-3xl
                border border-white/15
                bg-purple-300/20 p-5
                text-[#efe4e9]
                shadow-[0_0_24px_rgba(192,132,252,0.12)]
                backdrop-blur-xl
              "
            >
              <h3 className="mb-5 text-lg font-semibold">Filters</h3>

              <div className="mb-6">
                <label className="mb-2 block text-sm">
                  Distance: {maxDistance} miles
                </label>

                <input
                  type="range"
                  min="1"
                  max="300"
                  value={maxDistance}
                  onChange={(event) => {
                    setMaxDistance(Number(event.target.value));
                  }}
                  className="w-full accent-purple-300"
                />
              </div>

              <div>
                <p className="mb-3 text-sm">Price range</p>

                <div className="flex gap-2">
                  {["$", "$$", "$$$"].map((price) => (
                    <button
                      key={price}
                      type="button"
                      onClick={() => {
                        setSelectedPrices((currentPrices) =>
                          currentPrices.includes(price)
                            ? currentPrices.filter(
                                (currentPrice) => currentPrice !== price
                              )
                            : [...currentPrices, price]
                        );
                      }}
                      className={`
                        rounded-full px-3 py-1
                        text-sm transition duration-300
                        ${
                          selectedPrices.includes(price)
                            ? "bg-purple-300/40 text-white"
                            : "bg-white/10 text-white/60"
                        }
                      `}
                    >
                      {price}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6">
  <p className="mb-3 text-sm">Tags</p>

  <div className="flex flex-wrap gap-2">
    {availableTags.map((tag) => (
      <button
        key={tag.id}
        type="button"
        onClick={() => {
          setSelectedTagIds((currentIds) =>
            currentIds.includes(tag.id)
              ? currentIds.filter((id) => id !== tag.id)
              : [...currentIds, tag.id]
          );
        }}
        className={`
          rounded-full px-3 py-1 text-sm transition
          ${
            selectedTagIds.includes(tag.id)
              ? "bg-purple-300/40 text-white"
              : "bg-white/10 text-white/60 hover:bg-white/20"
          }
        `}
      >
        {tag.name}
      </button>
    ))}
  </div>
</div>
              
            </aside>
          <div className="grid max-h-105 grid-cols-2 gap-5 overflow-y-auto md:grid-cols-4">
            {filteredActivities.map((activity) => {
              const distance =
                userLocation &&
                activity.latitude != null &&
                activity.longitude != null
                  ? calculateDistanceMiles(
                      userLocation.latitude,
                      userLocation.longitude,
                      activity.latitude,
                      activity.longitude
                    )
                  : null;

              return (
                <button
                  key={activity.id}
                  type="button"
                  onClick={() => getActivity(activity.id)}
                  className="
                    relative aspect-square w-44 overflow-hidden
                    rounded-3xl border border-purple-300/30
                    bg-white/40
                  "
                >
                  {distance !== null && (
                    <span
                      className="
                        absolute right-2 top-2 z-10
                        rounded-full border border-white/20
                        bg-[#181c2c]/70 px-3 py-1
                        text-xs text-white backdrop-blur-md
                      "
                    >
                      {distance.toFixed(1)} mi
                    </span>
                  )}

                  <span>{activity.name}</span>
                </button>
              );
            })}
          </div>
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

              <div className="mt-6">
                <p className="mb-2 font-semibold text-purple-950">Tags</p>

                <div className="mb-3 flex flex-wrap gap-2">
                  {activityTags.map((tag) => (
                    <span
                      key={tag.id}
                      className="rounded-full bg-purple-950/15 px-3 py-1 text-sm text-purple-950"
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>

                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    addTag();
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={tagName}
                    onChange={(event) => setTagName(event.target.value)}
                    placeholder="Add a tag"
                    className="
                      flex-1 rounded-full border border-purple-900/20
                      bg-white/30 px-4 py-2
                      text-purple-950 placeholder:text-purple-900/50
                      outline-none
                    "
                  />

                  <button
                    type="submit"
                    className="
                      rounded-full bg-purple-900/70
                      px-4 py-2 text-white
                    "
                  >
                    +
                  </button>
                </form>
              </div>

              <div className="space-y-4 text-purple-950">
                <p>
                  <span className="font-semibold">Location:</span>{" "}

                  {selectedActivity.location ? (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                        selectedActivity.location
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline transition hover:text-purple-600"
                    >
                      {selectedActivity.location}
                    </a>
                  ) : (
                    "No location provided"
                  )}
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