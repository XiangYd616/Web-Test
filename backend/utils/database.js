/**
 * Database Connection Manager
 * Enhanced database connection management with pooling, health checks, and monitoring
 */

const { Pool } = require('pg');
const EventEmitter = require('events');

class DatabaseConnectionManager extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.pool = null;
    this.isConnected = false;
    this.healthCheckInterval = null;
    this.retryCount = 0;
    this.maxRetries = config.retryAttempts || 5;
    this.retryDelay = config.retryDelay || 1000;
  }

  /**
   * Initialize the database connection
   */
  async initialize() {
    try {
      await this.connect();
      this.startHealthChecks();
      this.emit('connected', {
        timestamp: new Date().toISOString(),
        database: this.config.database,
        host: this.config.host,
        port: this.config.port
      });
    } catch (error) {
      this.emit('connectionError', { error, timestamp: new Date().toISOString() });
      throw error;
    }
  }

  /**
   * Create database connection pool
   */
  async connect() {
    if (this.pool) {
      return this.pool;
    }

    this.pool = new Pool(this.config);

    // Setup pool event listeners
    this.pool.on('error', (err, client) => {
      console.error('Unexpected error on idle client', err);
      this.emit('connectionError', { error: err, timestamp: new Date().toISOString() });
      this.isConnected = false;
    });

    this.pool.on('connect', (client) => {
      this.isConnected = true;
      // Set session parameters
      client.query(`
        SET search_path TO public;
        SET timezone TO 'UTC';
        SET statement_timeout TO '${this.config.statement_timeout || 30000}ms';
      `).catch(err => {
        console.error('Failed to set session parameters:', err);
      });
    });

    // Test the connection
    const client = await this.pool.connect();
    await client.query('SELECT NOW()');
    client.release();

    this.isConnected = true;
    this.retryCount = 0;

    return this.pool;
  }

  /**
   * Execute a database query
   */
  async query(text, params = [], options = {}) {
    if (!this.pool) {
      throw new Error('Database not connected');
    }

    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;

      if (process.env.NODE_ENV === 'development' && options.logQuery !== false) {
        console.log('Query executed:', {
          text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
          duration: `${duration}ms`,
          rows: result.rowCount
        });
      }

      return result;
    } catch (error) {
      console.error('Query error:', {
        text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        error: error.message,
        params: params.length > 0 ? '[params]' : '[]'
      });
      throw error;
    }
  }

  /**
   * Execute a transaction
   */
  async transaction(callback) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Start health checks
   */
  startHealthChecks() {
    if (this.healthCheckInterval) {
      return;
    }

    const interval = this.config.healthCheckInterval || 30000;
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.healthCheck();
        this.emit('healthCheck', { 
          status: 'healthy', 
          timestamp: new Date().toISOString() 
        });
      } catch (error) {
        this.emit('healthCheck', { 
          status: 'unhealthy', 
          error: error.message, 
          timestamp: new Date().toISOString() 
        });
        
        // Attempt to reconnect if health check fails
        if (!this.isConnected && this.retryCount < this.maxRetries) {
          this.attemptReconnect();
        }
      }
    }, interval);
  }

  /**
   * Perform health check
   */
  async healthCheck() {
    if (!this.pool) {
      throw new Error('Database not connected');
    }

    const client = await this.pool.connect();
    try {
      const result = await client.query('SELECT 1');
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  /**
   * Attempt to reconnect
   */
  async attemptReconnect() {
    this.retryCount++;
    console.log(`Attempting to reconnect... (${this.retryCount}/${this.maxRetries})`);

    try {
      await new Promise(resolve => setTimeout(resolve, this.retryDelay * this.retryCount));
      
      if (this.pool) {
        await this.pool.end();
        this.pool = null;
      }

      await this.connect();
      
      this.emit('reconnected', {
        timestamp: new Date().toISOString(),
        retryCount: this.retryCount
      });
      
      console.log('Reconnection successful');
      this.retryCount = 0;
    } catch (error) {
      console.error(`Reconnection attempt ${this.retryCount} failed:`, error.message);
      
      if (this.retryCount >= this.maxRetries) {
        console.error('Max reconnection attempts reached');
        this.emit('maxRetriesReached', { error, timestamp: new Date().toISOString() });
      }
    }
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      pool: this.pool ? {
        totalCount: this.pool.totalCount,
        idleCount: this.pool.idleCount,
        waitingCount: this.pool.waitingCount
      } : null,
      retryCount: this.retryCount,
      maxRetries: this.maxRetries,
      config: {
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
        max: this.config.max,
        min: this.config.min
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Close database connection
   */
  async close() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }

    this.isConnected = false;
    console.log('Database connection closed');
  }

  /**
   * Get pool statistics
   */
  getPoolStats() {
    if (!this.pool) {
      return null;
    }

    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount
    };
  }
}

module.exports = DatabaseConnectionManager;
