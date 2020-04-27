CREATE TABLE notes (
  id INTEGER PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
  title TEXT NOT NULL,
  modified TIMESTAMPTZ,
  content TEXT NOT NULL,
  folder INTEGER REFERENCES folders(id) ON DELETE CASCADE NOT NULL
);
