require("dotenv").config();
const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Test DB Connection
async function testDatabaseConnection() {
  const connection = await pool.getConnection();
  console.log("Connected successfully! to the Database");
  connection.release();
}

testDatabaseConnection();
module.exports = pool;
