const sqlite3 = require("sqlite3").verbose();

// Open SQLite database
const db = new sqlite3.Database("./database.db");

// Initialize Tables
db.serialize(() => {
    // Create Users Table
    db.run(`CREATE TABLE IF NOT EXISTS Users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('user', 'admin')),
        location_area INTEGER,
        FOREIGN KEY (location_area) REFERENCES Geographical_Areas (id)
    )`);

    // Create Reports Table
    db.run(`CREATE TABLE IF NOT EXISTS Reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        image_url TEXT NOT NULL,
        description TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        severity_level TEXT NOT NULL,
        status TEXT DEFAULT 'Pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES Users (id)
    )`);

    // Create Admin_Alerts Table
    db.run(`CREATE TABLE IF NOT EXISTS Admin_Alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        admin_id INTEGER NOT NULL,
        report_id INTEGER NOT NULL,
        alert_status TEXT DEFAULT 'Unread',
        alert_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (admin_id) REFERENCES Users (id),
        FOREIGN KEY (report_id) REFERENCES Reports (id)
    )`);

    // Create Geographical_Areas Table
    db.run(`CREATE TABLE IF NOT EXISTS Geographical_Areas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        radius REAL NOT NULL
    )`);

    console.log("Tables initialized successfully.");
});

// Close the database connection
db.close();
