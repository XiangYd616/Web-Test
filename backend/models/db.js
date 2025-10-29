/**
 * Database adapter module for tests
 * Provides a simple interface that wraps the database config
 */

const database = require('../config/database');

// Initialize database pool when module is loaded in test environment
if (process.env.NODE_ENV === 'test') {
  // Create the pool immediately
  try {
    database.createPool();
  } catch (error) {
    console.error('Failed to create database pool:', error.message);
  }
}

/**
 * Execute a query
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<Object>} Query result
 */
const query = async (text, params = []) => {
  return await database.query(text, params);
};

/**
 * Get a client from the pool
 * @returns {Promise<Object>} Database client
 */
const getClient = async () => {
  const pool = database.getPool();
  return await pool.connect();
};

/**
 * End all database connections
 * @returns {Promise<void>}
 */
const end = async () => {
  const pool = database.getPool();
  await pool.end();
};

module.exports = {
  query,
  getClient,
  end
};

