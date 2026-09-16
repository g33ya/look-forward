CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    google_id TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    profile_picture TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE trips (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    image_url TEXT
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE activities (
    id SERIAL PRIMARY KEY,
    trip_id INT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    price_range VARCHAR(255) CHECK (price_range IN ('$', '$$', '$$$')),
    links VARCHAR(2048),
    notes TEXT
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tags (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    UNIQUE (user_id, name) -- constraint to ensure no duplicate tags for a user
);

CREATE TABLE activity_tags (
    activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (activity_id, tag_id) -- composite primary key to ensure no duplicate tags in an activity
    /* example :)
        activity_id     tag_id
        ----------      -------
        1               4
        1               10
        2               1
        2               4

        activity 1 has two tags 4/10
        activity 2 has two tags 1/4
        both activity 1/2 share tag 4
    */
);
