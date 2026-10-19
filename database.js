
const path = require("path");
const Database = require("better-sqlite3");

const dbPath = path.join(__dirname, "insurance.db");
const db = new Database(dbPath);

db.exec(`
    CREATE TABLE IF NOT EXISTS quote_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        insurer_name TEXT NOT NULL,
        age INTEGER,
        cover_amount REAL,
        policy_term INTEGER,
        smoking_status TEXT,
        health_profile TEXT,
        premium_payment_term INTEGER,
        riders TEXT,
        premium_amount REAL,
        premium_frequency TEXT,
        claim_ratio REAL,
        claim_ratio_year TEXT,
        health_answer TEXT,
        source_url TEXT,
        evidence TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS test_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        test_case TEXT NOT NULL,
        input_record_ids TEXT,
        expected_result TEXT NOT NULL,
        actual_result TEXT,
        status TEXT DEFAULT 'Not Run',
        unresolved_item TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
`);

const migrations = [
    ["policy_term", "INTEGER"],
    ["smoking_status", "TEXT"],
    ["health_profile", "TEXT"],
    ["premium_payment_term", "INTEGER"],
    ["riders", "TEXT"]
];

for (const [name, type] of migrations) {
    const columns = db.prepare("PRAGMA table_info(quote_records)").all();

    if (!columns.some(column => column.name === name)) {
        db.exec(`ALTER TABLE quote_records ADD COLUMN ${name} ${type}`);
    }
}

console.log("Insurance database is ready!");
console.log("Database location:", dbPath);

module.exports = db;
