import { useEffect, useState, useCallback } from "react";
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

  // Get trip name from location state (which stores the Link object's info)
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
  }, [trip]);

  
  const [activityTags, setActivityTags] = useState<Tag[]>([]);
  const [tagName, setTagName] = useState("");
  const [showTagInput, setShowTagInput] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [editActivity, setEditActivity] = useState<Activity | null>(null);

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
      const tags = await response.json();
      setActivityTags(tags);
    }
    loadTags();
  }, [selectedActivity]);

  // Get user's current location for distance calculations
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

  // States for activity creation form
  type ActivityForm = {
    name: string;
    location: string;
    priceRange: string;
    links: string;
    notes: string;
    latitude: number | null;
    longitude: number | null;
  };
  const [createActivityForm, setCreateActivityForm] = useState(false);

  const [activity, setActivity] = useState<ActivityForm>({
    name: "",
    location: "",
    priceRange: "",
    links: "",
    notes: "",
    latitude: null,
    longitude: null,
  });

  async function createActivity( event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault()

    const response = await fetch("http://localhost:8000/add_activity", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: activity.name.trim(),
        location: activity.location.trim(),
        latitude: activity.latitude,
        longitude: activity.longitude,
        price_range: activity.priceRange || null,
        links: activity.links.trim(),
        notes: activity.notes.trim(),
        trip_id: tripId,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Failed to create activity:", error);
      return;
    }

    const createdActivity = await response.json();

    setCreateActivityForm(false);

    setActivities((currentActivities) => [
      ...currentActivities,
      {
        id: createdActivity.id,
        name: activity.name.trim(),
        location: activity.location.trim(),
        latitude: activity.latitude,
        longitude: activity.longitude,
        priceRange: activity.priceRange,
        links: activity.links.trim(),
        notes: activity.notes.trim(),
        tags: [],
      },
    ]);

    setActivity({
      name: "",
      location: "",
      priceRange: "",
      links: "",
      notes: "",
      latitude: null,
      longitude: null,
    });
  }

  // Get a specific activity by ID to display UI details
  async function getActivity(id: number) {
    const response = await fetch(
      `http://localhost:8000/get_activity/${id}`
    );

    const activity = await response.json();

    setSelectedActivity({
      ...activity,
      priceRange: activity.price_range, // backend stores priceRange as price_range

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
      currentTags.some((currentTag) => currentTag.id === tag.id) // prevents duplicates
        ? currentTags
        : [...currentTags, tag]
    );

    setTagName("");
    
    // Update the activity's tags in the activities state
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

  // Edit an activity
  async function updateActivity(event: React.SubmitEvent<HTMLFormElement>) {
  event.preventDefault();

  if (!editActivity) {
    return;
  }

  const response = await fetch(
    `http://localhost:8000/activities/${editActivity.id}`,
    {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: editActivity.name.trim(),
        location: editActivity.location.trim(),
        latitude: editActivity.latitude,
        longitude: editActivity.longitude,
        price_range: editActivity.priceRange || null,
        links: editActivity.links.trim(),
        notes: editActivity.notes.trim(),
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error("Failed to update activity:", error);
    return;
  }

  setActivities((currentActivities) =>
    currentActivities.map((activity) =>
      activity.id === editActivity.id
        ? {
            ...activity,
            ...editActivity,
          }
        : activity
    )
  );

  setSelectedActivity(editActivity);
  setEditActivity(null);
}

  // Filter states
  const [maxDistance, setMaxDistance] = useState(300);
  const [selectedPrices, setSelectedPrices] = useState<string[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

  const availableTags = Array.from(
    new Map(
      activities
        .flatMap((activity) => activity.tags) // combine all activity tag arrays into one
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
        <h1 className="mb-10 text-left text-5xl font-bold text-[#efe4e9]">
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
                  value={activity.name}
                  onChange={(event) => setActivity({ ...activity, name: event.target.value })}
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
                          setActivity({ ...activity, location: place.address, latitude: place.latitude, longitude: place.longitude });
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
                        onClick={() => setActivity({...activity, priceRange: price})}
                        className={`
                          rounded-full border px-4 py-1.5
                          text-sm font-semibold
                          transition-all duration-200
                          ${
                            activity.priceRange === price
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
                    value={activity.links}
                    onChange={(event) => setActivity({...activity, links: event.target.value})}
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
                    value={activity.notes}
                    onChange={(event) => setActivity({...activity, notes: event.target.value})}
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
                      ~{distance.toFixed(1)} mi
                    </span>
                  )}

                  <span>{activity.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {selectedActivity && (
          <div
            className="
              fixed inset-0 z-50 flex items-center justify-center
              bg-[#0d1020]/70 px-4 backdrop-blur-sm
            "
            onClick={() => setSelectedActivity(null)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="activity-title"
              onClick={(event) => event.stopPropagation()}
              className="
                relative max-h-[90vh] w-full max-w-lg overflow-y-auto
                rounded-[2rem] border border-purple-300/20
                bg-[#25283d]/85 p-8
                text-purple-100
                shadow-[0_0_50px_rgba(168,85,247,0.22)]
                backdrop-blur-2xl
              "
            >
              <button
                type="button"
                aria-label="Close activity"
                onClick={() => setSelectedActivity(null)}
                className="
                  absolute right-5 top-4 text-2xl text-purple-300/70
                  transition hover:scale-110 hover:text-white
                "
              >
                ×
              </button>

              <button
                type="button"
                aria-label="Edit activity"
                onClick={() => {
                  setEditActivity({
                    ...selectedActivity,
                    tags: activityTags,
                  });

                  setSelectedActivity(null);
                }}
                className="
                  absolute right-14 top-4
                  text-xl text-purple-300/70
                  transition
                  hover:scale-110 hover:text-white
                "
              >
                ✎
              </button>

              <div
                className="
                  mx-auto mb-5 h-28 w-28
                  rounded-3xl border border-purple-300/20
                  bg-gradient-to-br from-purple-300/30 to-purple-900/30
                  shadow-[0_0_24px_rgba(192,132,252,0.18)]
                "
              />

              <h2
                id="activity-title"
                className="mb-7 text-center text-3xl font-bold text-white"
              >
                {selectedActivity.name}
              </h2>

              <div className="mb-7">
                <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-purple-300">
                  Tags
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  {activityTags.map((tag) => (
                    <span
                      key={tag.id}
                      className="
                        rounded-full border border-purple-300/20
                        bg-purple-300/15 px-3 py-1
                        text-sm text-purple-100
                      "
                    >
                      {tag.name}
                    </span>
                  ))}

                  {!showTagInput && (
                    <button
                      type="button"
                      aria-label="Create a tag"
                      onClick={() => setShowTagInput(true)}
                      className="
                        flex h-7 w-7 items-center justify-center
                        rounded-full border border-dashed border-purple-300/40
                        bg-white/5 text-lg leading-none text-purple-300
                        transition
                        hover:scale-105 hover:border-purple-300
                        hover:bg-purple-300/15 hover:text-white
                      "
                    >
                      +
                    </button>
                  )}
                </div>

                {showTagInput && (
                  <form
                    onSubmit={async (event) => {
                      event.preventDefault();

                      if (!tagName.trim()) {
                        return;
                      }

                      await addTag();
                      setShowTagInput(false);
                    }}
                    className="mt-3 flex gap-2"
                  >
                    <input
                      type="text"
                      value={tagName}
                      onChange={(event) => setTagName(event.target.value)}
                      placeholder="Tag name"
                      autoFocus
                      className="
                        min-w-0 flex-1 rounded-full
                        border border-purple-300/20 bg-white/10
                        px-4 py-2 text-sm text-purple-100
                        placeholder:text-purple-200/40
                        outline-none transition
                        focus:border-purple-300/50
                        focus:ring-2 focus:ring-purple-400/20
                      "
                    />

                    <button
                      type="submit"
                      className="
                        rounded-full bg-purple-500/70
                        px-4 py-2 text-sm font-medium text-white
                        transition hover:bg-purple-500
                      "
                    >
                      Add
                    </button>

                    <button
                      type="button"
                      aria-label="Cancel creating tag"
                      onClick={() => {
                        setTagName("");
                        setShowTagInput(false);
                      }}
                      className="
                        rounded-full px-3 py-2
                        text-sm text-purple-200/60
                        transition hover:text-white
                      "
                    >
                      Cancel
                    </button>
                  </form>
                )}
              </div>

              <div
                className="
                  space-y-4 rounded-2xl
                  border border-white/10 bg-white/5 p-5
                  text-sm text-purple-100/85
                "
              >
                <div>
                  <p className="mb-1 font-semibold text-purple-300">Location</p>

                  {selectedActivity.location ? (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                        selectedActivity.location
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="
                        underline decoration-purple-300/50
                        underline-offset-4 transition
                        hover:text-white hover:decoration-purple-300
                      "
                    >
                      {selectedActivity.location}
                    </a>
                  ) : (
                    <p className="text-purple-200/50">No location provided</p>
                  )}
                </div>

                <div>
                  <p className="mb-1 font-semibold text-purple-300">Price range</p>
                  <p>{selectedActivity.priceRange || "Not provided"}</p>
                </div>

                <div>
                  <p className="mb-1 font-semibold text-purple-300">Links</p>
                  <p className="break-words">
                    {selectedActivity.links || "No links provided"}
                  </p>
                </div>

                <div>
                  <p className="mb-1 font-semibold text-purple-300">Notes</p>
                  <p className="whitespace-pre-wrap">
                    {selectedActivity.notes || "No notes provided"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {editActivity && (
          <div
            className="
              fixed inset-0 z-50 flex items-center justify-center
              bg-[#0d1020]/85 px-4
            "
            onClick={() => setEditActivity(null)}
          >
            <form
              onSubmit={updateActivity}
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="edit-activity-title"
              className="
                relative max-h-[90vh] w-full max-w-lg overflow-y-auto
                rounded-[2rem] border border-purple-300/20
                bg-[#25283d]/85 p-8
                text-purple-100
                shadow-[0_0_50px_rgba(168,85,247,0.22)]
                backdrop-blur-none
              "
            >
              <button
                type="button"
                aria-label="Cancel editing"
                onClick={() => setEditActivity(null)}
                className="
                  absolute right-5 top-4
                  text-2xl text-purple-300/70
                  transition hover:scale-110 hover:text-white
                "
              >
                ×
              </button>

              <div
                className="
                  mx-auto mb-5 h-28 w-28
                  rounded-3xl border border-purple-300/20
                  bg-gradient-to-br from-purple-300/30 to-purple-900/30
                  shadow-[0_0_24px_rgba(192,132,252,0.18)]
                "
              />

              <div className="mb-7 text-center">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-purple-300/60">
                  Edit activity
                </p>

                <input
                  id="edit-activity-title"
                  type="text"
                  required
                  autoFocus
                  value={editActivity.name}
                  onChange={(event) =>
                    setEditActivity({
                      ...editActivity,
                      name: event.target.value,
                    })
                  }
                  className="
                    w-full border-b border-white/15
                    bg-transparent pb-3 text-center
                    text-3xl font-bold text-white
                    outline-none transition
                    focus:border-purple-300/60
                  "
                />
              </div>

              <div
                className="
                  space-y-5 rounded-2xl
                  border border-white/10 bg-white/5 p-5
                "
              >
                <div>
                  <label className="mb-2 block text-sm font-semibold text-purple-300">
                    Location
                  </label>

                  {editActivity.location && (
                    <p className="mb-2 text-xs text-purple-100/60">
                      Current: {editActivity.location}
                    </p>
                  )}

                  <div
                    className="
                      rounded-xl border border-white/15
                      bg-white/8 px-3 py-2
                      transition
                      focus-within:border-purple-300/50
                      focus-within:ring-2 focus-within:ring-purple-300/10
                    "
                  >
                    <APIProvider
                      apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
                    >
                      <LocationAutocomplete
                        onPlaceSelected={(place) =>
                          setEditActivity((currentActivity) =>
                            currentActivity
                              ? {
                                  ...currentActivity,
                                  location: place.address,
                                  latitude: place.latitude,
                                  longitude: place.longitude,
                                }
                              : null
                          )
                        }
                      />
                    </APIProvider>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-sm font-semibold text-purple-300">
                    Price range
                  </p>

                  <div className="flex gap-2">
                    {["$", "$$", "$$$"].map((price) => (
                      <button
                        key={price}
                        type="button"
                        onClick={() =>
                          setEditActivity({
                            ...editActivity,
                            priceRange: price,
                          })
                        }
                        className={`
                          rounded-full border px-4 py-1.5
                          text-sm font-semibold transition
                          ${
                            editActivity.priceRange === price
                              ? `
                                border-purple-200/50
                                bg-purple-300/30 text-white
                                shadow-[0_0_14px_rgba(192,132,252,0.25)]
                              `
                              : `
                                border-white/10
                                bg-white/5 text-white/40
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
                  <label className="mb-2 block text-sm font-semibold text-purple-300">
                    Links
                  </label>

                  <input
                    type="text"
                    value={editActivity.links ?? ""}
                    onChange={(event) =>
                      setEditActivity({
                        ...editActivity,
                        links: event.target.value,
                      })
                    }
                    placeholder="Link 1, Link 2, Link 3"
                    className="
                      w-full rounded-xl border border-white/15
                      bg-white/8 px-4 py-2.5 text-purple-100
                      placeholder:text-purple-200/30
                      outline-none transition
                      focus:border-purple-300/50
                      focus:ring-2 focus:ring-purple-300/10
                    "
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-purple-300">
                    Notes
                  </label>

                  <textarea
                    value={editActivity.notes ?? ""}
                    onChange={(event) =>
                      setEditActivity({
                        ...editActivity,
                        notes: event.target.value,
                      })
                    }
                    placeholder="Anything you want to remember..."
                    rows={4}
                    className="
                      w-full resize-none rounded-xl
                      border border-white/15 bg-white/8
                      px-4 py-2.5 text-purple-100
                      placeholder:text-purple-200/30
                      outline-none transition
                      focus:border-purple-300/50
                      focus:ring-2 focus:ring-purple-300/10
                    "
                  />
                </div>
              </div>

              <div className="mt-7 flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditActivity(null)}
                  className="
                    flex-1 rounded-full border border-white/15
                    bg-white/5 py-2.5
                    font-medium text-purple-100/70
                    transition hover:bg-white/10 hover:text-white
                  "
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="
                    flex-1 rounded-full
                    border border-purple-200/30
                    bg-purple-300/25 py-2.5
                    font-semibold text-white
                    shadow-[0_0_22px_rgba(192,132,252,0.2)]
                    transition-all
                    hover:-translate-y-0.5
                    hover:bg-purple-300/35
                    hover:shadow-[0_0_30px_rgba(192,132,252,0.35)]
                  "
                >
                  Save changes
                </button>
              </div>
            </form>
          </div>
        )}
      </section>
    </main>
  );
}