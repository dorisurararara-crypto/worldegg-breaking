DROP TABLE IF EXISTS game_snapshots;
DROP TABLE IF EXISTS winners;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS invites;

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
    prize TEXT, -- 상품명 추가
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);