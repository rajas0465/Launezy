const express = require("express");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const nodemailer = require("nodemailer");

const app = express();
const server = http.createServer(app);
app.use(bodyParser.json());

// Store connected admin sockets
const connectedAdmins = {};
// Setup WebSocket server
const io = new Server(server, {
    cors: {
        origin: "*", // Replace with your frontend's URL
    },
});

// WebSocket authentication
io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
        return next(new Error("Authentication error"));
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return next(new Error("Invalid token"));
        }
        socket.user = decoded; // Attach decoded JWT payload to the socket
        next();
    });
});

// Handle WebSocket connections
io.on("connection", (socket) => {
    const user = socket.user;

    if (user.role === "admin") {
        connectedAdmins[user.id] = socket.id; // Map admin ID to socket ID
        console.log(`Admin ${user.id} connected with socket ID: ${socket.id}`);
    }

    socket.on("disconnect", () => {
        if (user.role === "admin") {
            delete connectedAdmins[user.id];
            console.log(`Admin ${user.id} disconnected`);
        }
    });
});

// Function to emit alerts to admins
const emitAlertToAdmins = (adminId, alert) => {
    if (connectedAdmins[adminId]) {
        io.to(connectedAdmins[adminId]).emit("newAlert", alert);
    }
};

app.use(
  cors({
    origin: '*', // Allow only your frontend's origin
    methods: ['GET', 'POST', 'PUT', 'DELETE','PATCH'], // Allowed HTTP methods
    allowedHeaders: ['Authorization', 'Content-Type'], // Headers your frontend sends
  })
);

app.get('/testingCors', (req, res) => {
    res.json({ message: 'CORS working!' });
  });

app.options('*', cors()); // Enable preflight requests for all routes

//app.use(cors()); // Enable CORS for all routes
app.use(express.json({ limit: '10mb' })); // Set a request size limit
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // For form submissions


  
//app.use(cors());

// Connect to SQLite database
const db = new sqlite3.Database("./database.db");

// Secret key for JWT
const JWT_SECRET = "08231bc51616dd2bebd0b1616adcbe7785e7b56e8dc28ac38ce238141ac4c5f15825cd66eb46f853159723218f87d7ef205fe216f67940e524a1b297520d7f01";

// Middleware for protected routes
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers["authorization"]; 
    console.log("Auth Header");
    console.log(authHeader);// lowercase "authorization"
    const token = authHeader && authHeader.split(" ")[1];
    console.log(token)
    if (!token) return res.status(401).send("Access token required");
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.error("Token verification failed:", err.message);
            return res.status(403).send("Invalid Token");
        }
        req.user = user;
        next();
    });
};

app.post("/register", async (req, res) => {
    const { name, email, password, role, location_area } = req.body;
console.log(req.body);
    try {
        // Hash the user's password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert the user into the database
        db.run(
            `INSERT INTO Users (name, email, password, role, location_area) VALUES (?, ?, ?, ?, ?)`,
            [name, email, hashedPassword, role, location_area],
            function (err) {
                if (err) {
                    console.error("Error creating user:", err);
                    return res.status(500).json({ error: "Error creating user" });
                }

                // Generate a JWT token for the new user
                const token = jwt.sign(
                    { id: this.lastID, email, role }, // Payload
                    JWT_SECRET,                      // Secret key
                    { expiresIn: "1h" }              // Token expiration
                );

                // Respond with user ID, role, and token
                res.status(201).json({
                    id: this.lastID,
                    email,
                    role,
                    token,
                    message: "User created successfully",
                });
            }
        );
    } catch (error) {
        console.error("Error during registration:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
app.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log(email);
        // Validate input
        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }

        // Find user by email
        db.get("SELECT * FROM Users WHERE email = ?", [email], async (err, user) => {
            if (err) {
                console.error("Database error:", err.message);
                return res.status(500).json({ error: "Internal server error" });
            }

            if (!user) {
                return res.status(404).json({ error: "User not found" });
            }

            // Verify password
            const validPassword = await bcrypt.compare(password, user.password);
            if (!validPassword) {
                return res.status(403).json({ error: "Invalid credentials" });
            }

            // Generate JWT
            const token = jwt.sign(
                { id: user.id, role: user.role }, // Payload
                JWT_SECRET,                      // Secret key
                { expiresIn: "1h" }              // Token expiration
            );

            // Return token, user ID, and role
            res.status(200).json({
                token,
                userId: user.id,
                role: user.role,
                message: "Login successful",
            });
        });
    } catch (error) {
        console.error("Unexpected error in /login:", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
});

const haversineDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the Earth in kilometers
    const toRad = (angle) => (Math.PI / 180) * angle;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
};

// Define the email-sending function
async function sendNotificationEmail(adminEmail, subject, message) {
    const transporter = nodemailer.createTransport({
      service: "gmail", // Use any email service (e.g., Gmail, Outlook, etc.)
      auth: {
        user: "rajas0465@gmail.com", // Replace with your email
        pass: "uacc tcky wwvn avqr", // Replace with your app-specific password
      },
    });
  
    const mailOptions = {
      from: "rajas0465@gmail.com", // Replace with your email
      to: adminEmail,
      subject: subject,
      text: message,
    };
  
    try {
      await transporter.sendMail(mailOptions);
      console.log(`Notification email sent to ${adminEmail}`);
    } catch (error) {
      console.error("Error sending email:", error.message);
    }
  }
  


app.post("/reports", async (req, res) => {
    // const userId = req.user.id;
     //console.log(userId)
    // console.log(req.body);
     try {
         const { user_id, image_url, description, latitude, longitude, severity_level } = req.body;
 
         // Validate input
         if (!user_id || !image_url || !description || !latitude || !longitude || !severity_level) {
             return res.status(400).json({ error: "All fields are required" });
         }
 
         // Insert the report into the database
         const insertReport = `INSERT INTO Reports (user_id, image_url, description, latitude, longitude, severity_level, status) 
                               VALUES (?, ?, ?, ?, ?, ?, 'Pending')`;
 
         db.run(insertReport, [user_id, image_url, description, latitude, longitude, severity_level], function (err) {
             if (err) {
                 console.error("Error inserting report:", err.message);
                 return res.status(500).json({ error: "Error submitting report" });
             }
 
             const report_id = this.lastID;
 
             try {
                 // Find nearby admins based on geolocation
                 const selectAdmins = `SELECT u.id AS admin_id, u.email, ga.latitude, ga.longitude, ga.radius
                                       FROM Users u
                                       JOIN Geographical_Areas ga ON u.location_area = ga.id
                                       WHERE u.role = 'admin'`;
 
                 db.all(selectAdmins, (err, admins) => {
                     if (err) {
                         console.error("Error fetching admins:", err.message);
                         return res.status(500).json({ error: "Error finding admins" });
                     }
 
                     const alerts = [];
 
                     try {
                         admins.forEach((admin) => {
                             const distance = haversineDistance(
                                 latitude,
                                 longitude,
                                 admin.latitude,
                                 admin.longitude
                             );
 
                             if (distance <= admin.radius) {
                                 alerts.push({ admin_id: admin.admin_id, report_id });
 
                                 db.run(
                                     `INSERT INTO Admin_Alerts (admin_id, report_id, alert_status) 
                                      VALUES (?, ?, 'Unread')`,
                                     [admin.admin_id, report_id],
                                     (err) => {
                                         if (err) {
                                             console.error("Error inserting admin alert:", err.message);
                                         }
                                     }
                                 );

                                        // Send email notification to the admin
                                        const emailSubject = "New Report Alert";
                                        const emailMessage = `Hello Admin,

                            A new report has been submitted near your area:
                            - Report ID: ${report_id}
                            - Description: ${description}
                            - Severity Level: ${severity_level}
                            - Location: Latitude ${latitude}, Longitude ${longitude}

                            Please log in to the system to view more details.

                            Thank you!`;

                            sendNotificationEmail(admin.email, emailSubject, emailMessage);
 
                                 //emitAlertToAdmins(admin.admin_id, alert); // Emit alert
                             }
                         });
 
                         res.status(201).json({
                             report_id,
                             message: "Report submitted and alerts sent to nearby admins",
                             alerts,
                         });
                     } catch (error) {
                         console.error("Error processing admins:", error.message);
                         return res.status(500).json({ error: "Error processing admin alerts" });
                     }
                 });
             } catch (error) {
                 console.error("Error finding nearby admins:", error.message);
                 return res.status(500).json({ error: "Error finding nearby admins" });
             }
         });
     } catch (error) {
         console.error("Unexpected error in /reports:", error.message);
         res.status(500).json({ error: "Internal Server Error" });
     }
 });
 



app.get("/my-reports", authenticateToken, (req, res) => {
    const userId = req.user.id;
    console.log(userId); 
    db.all("SELECT * FROM Reports WHERE user_id = ?", [userId], (err, rows) => {
        if (err) return res.status(500).send("Error fetching reports");
        res.status(200).json(rows);
    });
});


app.get("/admin-alerts", authenticateToken, async (req, res) => {
    try {
        // Ensure the user has the "admin" role
        if (req.user.role !== "admin") {
            return res.status(403).json({ error: "Access Denied" });
        }

        const adminId = req.user.id;

        // Fetch all alerts (both "Unread" and "Read") for the admin
        db.all(
            `SELECT a.id AS alert_id, a.report_id, a.alert_status, a.alert_timestamp, 
                    r.image_url, r.description, r.latitude, r.longitude, r.severity_level, r.status AS report_status 
             FROM Admin_Alerts a
             JOIN Reports r ON a.report_id = r.id
             WHERE a.admin_id = ?
             ORDER BY a.alert_status DESC, a.alert_timestamp DESC`, // Order: "Unread" first, then by timestamp
            [adminId],
            (err, rows) => {
                if (err) {
                    console.error("Error fetching admin alerts:", err.message);
                    return res.status(500).json({ error: "Error fetching alerts" });
                }
                console.log(rows);
                // Return the alerts in a structured JSON response
                res.status(200).json({
                    alerts: rows,
                    message: rows.length > 0 ? "Alerts fetched successfully" : "No alerts found",
                });
            }
        );
    } catch (error) {
        console.error("Unexpected error in /admin-alerts:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
});



app.get("/admin-alerts-get-locations", authenticateToken, async (req, res) => {
    try {
        // Ensure the user has the "admin" role
        if (req.user.role !== "admin") {
            return res.status(403).json({ error: "Access Denied" });
        }

        const adminId = req.user.id;

        // Fetch all alerts (both "Unread" and "Read") for the admin
        db.all(
            `SELECT a.id AS alert_id, a.report_id, a.alert_status, a.alert_timestamp, 
                    r.description, r.latitude, r.longitude, r.severity_level, r.status AS report_status 
             FROM Admin_Alerts a
             JOIN Reports r ON a.report_id = r.id
             WHERE a.admin_id = ?
             ORDER BY a.alert_status DESC, a.alert_timestamp DESC`, // Order: "Unread" first, then by timestamp
            [adminId],
            (err, rows) => {
                if (err) {
                    console.error("Error fetching admin alerts:", err.message);
                    return res.status(500).json({ error: "Error fetching alerts" });
                }
                console.log(rows);
                // Return the alerts in a structured JSON response
                res.status(200).json({
                    alerts: rows,
                    message: rows.length > 0 ? "Alerts fetched successfully" : "No alerts found",
                });
            }
        );
    } catch (error) {
        console.error("Unexpected error in /admin-alerts:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
});


app.get("/alerts/:admin_id", (req, res) => {
    const admin_id = req.params.admin_id;

    db.all(
        `SELECT a.id AS alert_id, r.* 
         FROM Admin_Alerts a
         JOIN Reports r ON a.report_id = r.id
         WHERE a.admin_id = ? AND a.alert_status = 'Unread'`,
        [admin_id],
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: "Error fetching alerts" });
            }
            res.status(200).json(rows);
        }
    );
});


app.patch("/alerts/:alert_id", (req, res) => {
    const alert_id = req.params.alert_id;
    const { alert_status } = req.body;

    db.run(
        `UPDATE Admin_Alerts SET alert_status = ? WHERE id = ?`,
        [alert_status, alert_id],
        function (err) {
            if (err) {
                return res.status(500).json({ error: "Error updating alert status" });
            }
            res.status(200).json({ message: "Alert status updated successfully" });
        }
    );
});


// Route to Create a New Geographical Area
app.post("/geographical-areas", (req, res) => {
    const { name, latitude, longitude, radius } = req.body;
  
    // Validate input
    if (!name || latitude == null || longitude == null || radius == null) {
      return res.status(400).json({ error: "All fields (name, latitude, longitude, radius) are required." });
    }
  
    // Insert into the database
    const query = `
      INSERT INTO Geographical_Areas (name, latitude, longitude, radius)
      VALUES (?, ?, ?, ?)
    `;
  
    db.run(query, [name, latitude, longitude, radius], function (err) {
      if (err) {
        console.error("Error inserting geographical area:", err.message);
        return res.status(500).json({ error: "Failed to create geographical area." });
      }
  
      res.status(201).json({
        id: this.lastID, // ID of the newly created record
        name,
        latitude,
        longitude,
        radius,
        message: "Geographical area created successfully."
      });
    });
  });
  

  app.get("/user/:userId/location", (req, res) => {
    const userId = req.params.userId;

    db.get(
        `SELECT g.id, g.name, g.latitude, g.longitude, g.radius 
         FROM Users u 
         JOIN Geographical_Areas g ON u.location_area = g.id 
         WHERE u.id = ?`,
        [userId],
        (err, row) => {
            if (err) {
                console.error("Error fetching user location:", err.message);
                return res.status(500).json({ error: "Error fetching user location" });
            }

            if (!row) {
                return res.status(404).json({ error: "User or location not found" });
            }

            res.status(200).json(row);
        }
    );
});



server.listen(3000, () => console.log("Server running on port 3000"));