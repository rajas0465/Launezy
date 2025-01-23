const sqlite3 = require("sqlite3").verbose();

// Open SQLite database
const db = new sqlite3.Database("./laundry_service.db");

// Initialize Tables
db.serialize(() => {
    // Create Users Table
    db.run(`CREATE TABLE IF NOT EXISTS Users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        phone TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        address TEXT
    )`);

    // Create Shops Table
    db.run(`CREATE TABLE IF NOT EXISTS Shops (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        location TEXT NOT NULL,
        ratings REAL DEFAULT 0.0,
        services TEXT NOT NULL, -- JSON string of available services
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // Create Orders Table
    db.run(`CREATE TABLE IF NOT EXISTS Orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        shop_id INTEGER NOT NULL,
        items TEXT NOT NULL, -- JSON string of selected items
        status TEXT DEFAULT 'Pending', -- Order status (e.g., Pending, Completed)
        total_amount REAL NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES Users (id),
        FOREIGN KEY (shop_id) REFERENCES Shops (id)
    )`);

    // Create Payments Table
    db.run(`CREATE TABLE IF NOT EXISTS Payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        payment_status TEXT NOT NULL CHECK (payment_status IN ('Success', 'Failed')),
        payment_method TEXT NOT NULL,
        amount REAL NOT NULL,
        payment_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES Orders (id)
    )`);

    console.log("Tables initialized successfully.");
});

// Close the database connection
db.close();
