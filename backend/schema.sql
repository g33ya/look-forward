DROP TABLE trips CASCADE;
DROP TABLE activities CASCADE;

CREATE TABLE trips (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL
);

CREATE TABLE activities (
    id SERIAL PRIMARY KEY,
    trip_id INT REFERENCES trips(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    price_range VARCHAR(255) CHECK (price_range IN ('$', '$$', '$$$')),
    links VARCHAR(2048),
    notes TEXT
)