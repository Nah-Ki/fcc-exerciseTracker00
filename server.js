const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// MongoDB connection
let uri = "mongodb+srv://mohammednaqui-10:mohammednaqui10@cluster0.xc8mfzx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";


mongoose.connect(uri, {

  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Define MongoDB schemas
const { Schema, model } = mongoose;

const userSchema = new Schema({
  username: { type: String, required: true },
  log: [{ type: Schema.Types.ObjectId, ref: "Exercise" }], // Define a reference to Exercise model
});

const exerciseSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  description: String,
  duration: Number,
  date: { type: Date, default: Date.now },
});

// Define MongoDB models
const User = model("User", userSchema);
const Exercise = model("Exercise", exerciseSchema);

// Routes
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

// Create a new user
app.post("/api/users", async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }
    const newUser = await User.create({ username });
    res.json({ username: newUser.username, _id: newUser._id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Get a list of all users
app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find({}, "username _id");
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Add exercise to a user
app.post("/api/users/:_id/exercises", async (req, res) => {
  try {
    const { _id } = req.params;
    const { description, duration, date } = req.body;

    // Create a new exercise
    const exercise = await Exercise.create({
      userId: _id,
      description,
      duration,
      date: date ? new Date(date) : new Date(),
    });

    // Update the user's log with the new exercise ID
    await User.findByIdAndUpdate(
      _id,
      { $push: { log: exercise._id } },
      { new: true }
    );

    // Return the added exercise as the response
    res.json({
      _id: _id,
      username: (await User.findById(_id)).username,
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString(),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Get full exercise log of a user
app.get("/api/users/:_id/logs", async (req, res) => {
  try {
    const { _id } = req.params;
    const { from, to, limit } = req.query;

    // Find the user by ID
    const user = await User.findById(_id).populate("log");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    let log = user.log || [];

    // Apply filters if provided
    if (from) {
      const fromDate = new Date(from);
      log = log.filter((exercise) => new Date(exercise.date) >= fromDate);
    }

    if (to) {
      const toDate = new Date(to);
      log = log.filter((exercise) => new Date(exercise.date) <= toDate);
    }

    // Limit the number of logs if the limit is provided
    if (limit) {
      log = log.slice(0, parseInt(limit, 10));
    }

    // Format the date in the log array to use the dateString format
    log = log.map((exercise) => ({
      description: exercise.description,
      duration: exercise.duration,
      date: new Date(exercise.date).toDateString(),
    }));

    // Return the user object with the formatted log and count property
    res.json({
      _id: user._id,
      username: user.username,
      count: log.length,
      log,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Start server
const PORT = process.env.PORT || 3004;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
