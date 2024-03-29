const dotenv = require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const morgan = require("morgan");
const pool = require("./DB/DB");
const { v4: uuidv4 } = require("uuid");
const app = express();

app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS.split(","),
  })
);
// Parse incoming request JSON data
app.use(express.json());
app.use(express.static("public"));
// Views setup
app.set("view engine", "ejs");
app.use(morgan("combined"));

app.get("/", (req, res) => {
  res.render("index");
});

// Payment endpoint
app.post("/api/payment", async (req, res) => {
  try {
    const paymentData = {
      tx_ref: Date.now().toString(),
      amount: 1500,
      currency: "NGN",
      redirect_url: "https://atbu.edu.ng/web/front",
      meta: {
        consumer_id: 23,
        consumer_mac: "92a3-912ba-1192a",
      },
      customer: {
        email: req.body.email,
        phonenumber: req.body.mobile,
        name: req.body.fullname,
      },
      customizations: {
        title: "ID Card Request",
        logo: "https://atbu.edu.ng/public/assets/images/atbu_logo.png",
        description: "ID Card Processing Fee",
      },
    };

    const response = await axios.post(
      "https://api.flutterwave.com/v3/payments",
      paymentData,
      {
        headers: {
          Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
        },
      }
    );

    res.status(200).send(response.data);
  } catch (err) {
    console.log(err.response);
    res.status(500).send({
      status: "error",
      message: "Payment failed",
    });
  }
});

// Save data endpoint

app.post("/api/save-data", (req, res) => {
  try {
    // Extract the student information from the request body
    const {
      fullname,
      email,
      mobile,
      reg_number,
      faculty,
      department,
      courses,
    } = req.body;

    // Generate a UUID for the student
    const id = uuidv4();

    // Perform the database query to insert the student information
    const insertQuery =
      "INSERT INTO idcard_requests (id, fullname, email, mobile, reg_number, faculty, department, courses) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";

    pool
      .execute(insertQuery, [
        id,
        fullname,
        email,
        mobile,
        reg_number,
        faculty,
        department,
        courses,
      ])
      .then((results) => {
        console.log("Student information saved successfully");
        return res.json({
          status: "success",
          message: "Student information saved successfully",
        });
      })
      .catch((error) => {
        console.error("Error executing database query:", error);
        return res.status(500).json({
          status: "error",
          message: "Failed to save the student information",
        });
      });
  } catch (error) {
    console.error("Error saving student information:", error);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while saving the student information",
    });
  }
});

app.post("/api/process-payment", async (req, res) => {
  try {
    const {
      fullname,
      email,
      mobile,
      reg_number,
      faculty,
      department,
      courses,
    } = req.body;

    // Generate UUIDv4 for the ID
    const id = uuidv4();

    // Set the necessary payment data
    const paymentData = {
      tx_ref: Date.now().toString(),
      amount: 1500,
      currency: "NGN",
      redirect_url: "https://atbu.edu.ng/web/front",
      meta: {
        consumer_id: 23,
        consumer_mac: "92a3-912ba-1192a",
      },
      customer: {
        email: email,
        phonenumber: mobile,
        name: fullname,
      },
      customizations: {
        title: "ID Card Request",
        logo: "https://atbu.edu.ng/public/assets/images/atbu_logo.png",
        description: "ID Card Processing Fee",
      },
    };

    // Make the payment request to Flutterwave
    const response = await axios.post(
      "https://api.flutterwave.com/v3/payments",
      paymentData,
      {
        headers: {
          Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
        },
      }
    );

    if (response.data.status === "success") {
      const insertStudentQuery =
        "INSERT INTO idcard_requests (id, fullname, email, mobile, reg_number, faculty, department, courses) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
      await pool.query(insertStudentQuery, [
        id,
        fullname,
        email,
        mobile,
        reg_number,
        faculty,
        department,
        courses,
      ]);
      console.log(response);
      return res.status(200).send(response.data);
    }

    // Save student data to the database
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      status: "error",
      message: "Payment and data saving failed",
    });
  }
});

app.get("/api/idcard-requests", async (req, res) => {
  try {
    // Fetch all ID card requests from the database
    const idCardRequests = await pool.query("SELECT * FROM idcard_requests");

    // Send the ID card requests as a response
    console.log(idCardRequests[0]);

    return res.json(idCardRequests[0]);
  } catch (error) {
    console.error("Error fetching ID card requests:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("*", (req, res) => {
  res.render("404");
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
