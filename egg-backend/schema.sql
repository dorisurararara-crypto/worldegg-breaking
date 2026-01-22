DROP TABLE IF EXISTS game_snapshots;
DROP TABLE IF EXISTS winners;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS invites;
DROP TABLE IF EXISTS prize_pool;

CREATE TABLE game_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    round INTEGER,
    hp INTEGER,
    stats TEXT, -- JSON format
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE winners (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    round INTEGER,
    email TEXT,
    country TEXT,
    prize TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT,
    details TEXT,
    ip TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE invites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_user TEXT,
    to_user TEXT,
    date TEXT,
    to_ip_hash TEXT,
    to_ua_hash TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(from_user, to_user),
    UNIQUE(from_user, date, to_ip_hash)
);

CREATE TABLE prize_pool (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    image_url TEXT,
    secret_url TEXT,
    link TEXT, -- [New] Coupang Link
    is_used INTEGER DEFAULT 0,
    winner_id TEXT,
    round INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
