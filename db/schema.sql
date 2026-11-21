-- Photo Wall database schema. The app also creates this automatically on first use.
create table if not exists pins (
  id           uuid primary key default gen_random_uuid(),
  owner        text not null,               -- hashed user id (never the email)
  author_name  text not null default '',
  author_image text,
  title        text not null,
  description  text not null default '',
  category     text not null,
  image_url    text not null,
  blob_path    text not null unique,
  width        integer,
  height       integer,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists pins_created_at_idx on pins (created_at desc);
create index if not exists pins_owner_idx on pins (owner);

-- Likes on pins (sample pins use ids like "sample/priya-gown.webp").
create table if not exists likes (
  pin_id     text not null,
  uid        text not null,
  created_at timestamptz not null default now(),
  primary key (pin_id, uid)
);

-- Follows: target is "u:<user hash>" for members or "s:<id>" for sample characters.
create table if not exists follows (
  target     text not null,
  uid        text not null,
  created_at timestamptz not null default now(),
  primary key (target, uid)
);
create index if not exists follows_uid_idx on follows (uid);
