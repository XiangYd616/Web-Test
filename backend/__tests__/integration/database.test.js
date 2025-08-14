const { Pool } = require('pg');
const { setupTestDB, cleanupTestDB, getTestDB } = require('../helpers/database');

describe('Database Integration Tests', () => {
  let db;

  beforeAll(async () => {
    await setupTestDB();
    db = getTestDB();
  });

  afterAll(async () => {
    await cleanupTestDB();
  });

  describe('Test Records', () => {
    it('should create and retrieve test records', async () => {
      const testData = {
        id: 'test-123',
        type: 'api',
        name: 'Database Test',
        url: 'https://example.com',
        config: { method: 'GET' },
        status: 'pending'
      };

      // Insert test record
      const insertQuery = `
        INSERT INTO tests (id, type, name, url, config, status, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING *
      `;

      const insertResult = await db.query(insertQuery, [
        testData.id,
        testData.type,
        testData.name,
        testData.url,
        JSON.stringify(testData.config),
        testData.status
      ]);

      expect(insertResult.rows).toHaveLength(1);
      expect(insertResult.rows[0].id).toBe(testData.id);

      // Retrieve test record
      const selectQuery = 'SELECT * FROM tests WHERE id = $1';
      const selectResult = await db.query(selectQuery, [testData.id]);

      expect(selectResult.rows).toHaveLength(1);
      expect(selectResult.rows[0].type).toBe(testData.type);
      expect(selectResult.rows[0].name).toBe(testData.name);
    });

    it('should update test status', async () => {
      const testId = 'test-update-123';

      // Insert initial record
      await db.query(
        'INSERT INTO tests (id, type, name, status, created_at) VALUES ($1, $2, $3, $4, NOW())',
        [testId, 'api', 'Update Test', 'pending']
      );

      // Update status
      const updateQuery = `
        UPDATE tests
        SET status = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `;

      const updateResult = await db.query(updateQuery, ['running', testId]);

      expect(updateResult.rows).toHaveLength(1);
      expect(updateResult.rows[0].status).toBe('running');
      expect(updateResult.rows[0].updated_at).toBeTruthy();
    });

    it('should store and retrieve test results', async () => {
      const testId = 'test-results-123';
      const results = {
        score: 85,
        details: 'Test completed successfully',
        metrics: {
          responseTime: 250,
          statusCode: 200
        }
      };

      // Insert test with results
      await db.query(
        `INSERT INTO tests (id, type, name, status, results, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [testId, 'api', 'Results Test', 'completed', JSON.stringify(results)]
      );

      // Retrieve and verify results
      const selectResult = await db.query(
        'SELECT results FROM tests WHERE id = $1',
        [testId]
      );

      expect(selectResult.rows).toHaveLength(1);
      const retrievedResults = selectResult.rows[0].results;
      expect(retrievedResults.score).toBe(results.score);
      expect(retrievedResults.details).toBe(results.details);
    });
  });

  describe('Config Templates', () => {
    it('should create and retrieve config templates', async () => {
      const template = {
        id: 'template-123',
        name: 'API Template',
        test_type: 'api',
        config: { baseUrl: 'https://api.example.com' },
        description: 'Test template'
      };

      // Insert template
      const insertQuery = `
        INSERT INTO config_templates (id, name, test_type, config, description, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING *
      `;

      const insertResult = await db.query(insertQuery, [
        template.id,
        template.name,
        template.test_type,
        JSON.stringify(template.config),
        template.description
      ]);

      expect(insertResult.rows).toHaveLength(1);

      // Retrieve templates by type
      const selectQuery = 'SELECT * FROM config_templates WHERE test_type = $1';
      const selectResult = await db.query(selectQuery, [template.test_type]);

      expect(selectResult.rows.length).toBeGreaterThan(0);
      const retrievedTemplate = selectResult.rows.find(t => t.id === template.id);
      expect(retrievedTemplate).toBeTruthy();
      expect(retrievedTemplate.name).toBe(template.name);
    });
  });

  describe('Test History Queries', () => {
    beforeEach(async () => {
      // Clean up existing test data
      await db.query('DELETE FROM tests WHERE id LIKE $1', ['history-test-%']);

      // Insert test history data
      const testData = [
        { id: 'history-test-1', type: 'api', name: 'API Test 1', status: 'completed' },
        { id: 'history-test-2', type: 'security', name: 'Security Test 1', status: 'completed' },
        { id: 'history-test-3', type: 'api', name: 'API Test 2', status: 'failed' },
        { id: 'history-test-4', type: 'stress', name: 'Stress Test 1', status: 'completed' }
      ];

      for (const test of testData) {
        await db.query(
          'INSERT INTO tests (id, type, name, status, created_at) VALUES ($1, $2, $3, $4, NOW())',
          [test.id, test.type, test.name, test.status]
        );
      }
    });

    it('should get paginated test history', async () => {
      const query = `
        SELECT * FROM tests
        WHERE id LIKE 'history-test-%'
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
      `;

      const result = await db.query(query, [2, 0]);

      expect(result.rows).toHaveLength(2);
    });

    it('should filter tests by type', async () => {
      const query = `
        SELECT * FROM tests
        WHERE id LIKE 'history-test-%' AND type = $1
        ORDER BY created_at DESC
      `;

      const result = await db.query(query, ['api']);

      expect(result.rows).toHaveLength(2);
      expect(result.rows.every(row => row.type === 'api')).toBe(true);
    });

    it('should filter tests by status', async () => {
      const query = `
        SELECT * FROM tests
        WHERE id LIKE 'history-test-%' AND status = $1
        ORDER BY created_at DESC
      `;

      const result = await db.query(query, ['completed']);

      expect(result.rows).toHaveLength(3);
      expect(result.rows.every(row => row.status === 'completed')).toBe(true);
    });

    it('should get test count for pagination', async () => {
      const query = `
        SELECT COUNT(*) as total
        FROM tests
        WHERE id LIKE 'history-test-%'
      `;

      const result = await db.query(query);

      expect(parseInt(result.rows[0].total)).toBe(4);
    });
  });

  describe('Database Performance', () => {
    it('should handle concurrent inserts', async () => {
      const promises = [];

      for (let i = 0; i < 10; i++) {
        const promise = db.query(
          'INSERT INTO tests (id, type, name, status, created_at) VALUES ($1, $2, $3, $4, NOW())',
          [`concurrent-test-${i}`, 'api', `Concurrent Test ${i}`, 'pending']
        );
        promises.push(promise);
      }

      await Promise.all(promises);

      // Verify all records were inserted
      const result = await db.query(
        'SELECT COUNT(*) as count FROM tests WHERE id LIKE $1',
        ['concurrent-test-%']
      );

      expect(parseInt(result.rows[0].count)).toBe(10);
    });

    it('should handle large result sets efficiently', async () => {
      // Insert many records
      const batchSize = 100;
      const values = [];
      const params = [];

      for (let i = 0; i < batchSize; i++) {
        values.push(`($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4}, NOW())`);
        params.push(`batch-test-${i}`, 'api', `Batch Test ${i}`, 'completed');
      }

      const insertQuery = `
        INSERT INTO tests (id, type, name, status, created_at)
        VALUES ${values.join(', ')}
      `;

      const startTime = Date.now();
      await db.query(insertQuery, params);
      const insertTime = Date.now() - startTime;

      expect(insertTime).toBeLessThan(1000); // Should complete within 1 second

      // Query large result set
      const selectStart = Date.now();
      const result = await db.query(
        'SELECT * FROM tests WHERE id LIKE $1 ORDER BY created_at DESC',
        ['batch-test-%']
      );
      const selectTime = Date.now() - selectStart;

      expect(result.rows).toHaveLength(batchSize);
      expect(selectTime).toBeLessThan(500); // Should complete within 500ms
    });
  });
});
