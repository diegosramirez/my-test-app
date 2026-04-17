import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import app from './server.js';
import countries from './data/countries.js';

describe('Express Backend Server', () => {
  let server;

  beforeAll(() => {
    // Start server for testing
    server = app.listen(0); // Use port 0 for random available port
  });

  afterAll(() => {
    if (server) {
      server.close();
    }
  });

  describe('AC: Countries list retrieval', () => {
    it('should return JSON array of all countries with required fields and 200 status', async () => {
      const startTime = Date.now();

      const response = await request(app)
        .get('/api/countries')
        .expect(200);

      const responseTime = Date.now() - startTime;

      // Verify response structure
      expect(response.body).toHaveProperty('countries');
      expect(response.body).toHaveProperty('count');
      expect(response.body).toHaveProperty('response_time');

      // Verify all countries returned
      expect(response.body.countries).toHaveLength(countries.length);
      expect(response.body.count).toBe(countries.length);

      // Verify each country has required fields
      response.body.countries.forEach(country => {
        expect(country).toHaveProperty('id');
        expect(country).toHaveProperty('name');
        expect(country).toHaveProperty('capital');
        expect(country).toHaveProperty('population');
        expect(country).toHaveProperty('flagUrl');

        // Verify data types
        expect(typeof country.id).toBe('string');
        expect(typeof country.name).toBe('string');
        expect(typeof country.capital).toBe('string');
        expect(typeof country.population).toBe('number');
        expect(typeof country.flagUrl).toBe('string');

        // Verify flag URL format
        expect(country.flagUrl).toMatch(/^\/flags\/.*\.png$/);
      });

      // Verify response includes expected countries
      const argCountry = response.body.countries.find(c => c.id === 'arg');
      expect(argCountry).toBeDefined();
      expect(argCountry.name).toBe('Argentina');
    });
  });

  describe('AC: Valid country detail', () => {
    it('should return single country JSON object with 200 status for valid ID', async () => {
      const response = await request(app)
        .get('/api/countries/arg')
        .expect(200);

      expect(response.body).toHaveProperty('country');
      expect(response.body).toHaveProperty('response_time');

      const country = response.body.country;
      expect(country.id).toBe('arg');
      expect(country.name).toBe('Argentina');
      expect(country.capital).toBe('Buenos Aires');
      expect(country.population).toBe(45376763);
      expect(country.flagUrl).toBe('/flags/argentina.png');
    });

    it('should handle case-insensitive country ID lookup', async () => {
      const response = await request(app)
        .get('/api/countries/ARG')
        .expect(200);

      expect(response.body.country.id).toBe('arg');
      expect(response.body.country.name).toBe('Argentina');
    });

    it('should work for all valid country IDs', async () => {
      // Test a few different countries
      const testIds = ['bra', 'usa', 'can', 'mex', 'eng'];

      for (const id of testIds) {
        const response = await request(app)
          .get(`/api/countries/${id}`)
          .expect(200);

        expect(response.body.country.id).toBe(id);
        expect(response.body.country.name).toBeTruthy();
      }
    });
  });

  describe('AC: Invalid country handling', () => {
    it('should return 404 status with JSON error message "Country not found" for invalid ID', async () => {
      const response = await request(app)
        .get('/api/countries/invalid-id')
        .expect(404);

      expect(response.body).toEqual({
        error: 'Country not found',
        code: 404
      });
    });

    it('should return 404 for non-existent country codes', async () => {
      const invalidIds = ['xyz', 'zzz', 'notfound', '123'];

      for (const id of invalidIds) {
        const response = await request(app)
          .get(`/api/countries/${id}`)
          .expect(404);

        expect(response.body.error).toBe('Country not found');
        expect(response.body.code).toBe(404);
      }
    });
  });

  describe('AC: CORS configuration', () => {
    it('should include proper CORS headers for frontend access', async () => {
      const response = await request(app)
        .get('/api/countries')
        .set('Origin', 'http://localhost:4200')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    it('should handle preflight OPTIONS requests', async () => {
      const response = await request(app)
        .options('/api/countries')
        .set('Origin', 'http://localhost:4200')
        .set('Access-Control-Request-Method', 'GET')
        .expect(204);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-methods']).toContain('GET');
    });

    it('should allow requests from localhost:4200', async () => {
      const response = await request(app)
        .get('/api/countries/arg')
        .set('Origin', 'http://localhost:4200')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeTruthy();
    });
  });

  describe('AC: Response performance', () => {
    it('should respond within 200ms for country list requests', async () => {
      const startTime = Date.now();

      const response = await request(app)
        .get('/api/countries')
        .expect(200);

      const responseTime = Date.now() - startTime;

      // Verify response time is under 200ms
      expect(responseTime).toBeLessThan(200);

      // Also check the response includes timing
      expect(response.body.response_time).toBeDefined();
      expect(typeof response.body.response_time).toBe('number');
    });

    it('should respond within 200ms for country detail requests', async () => {
      const startTime = Date.now();

      const response = await request(app)
        .get('/api/countries/arg')
        .expect(200);

      const responseTime = Date.now() - startTime;

      expect(responseTime).toBeLessThan(200);
      expect(response.body.response_time).toBeDefined();
    });

    it('should maintain performance under multiple concurrent requests', async () => {
      const promises = [];

      // Make 10 concurrent requests
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app)
            .get('/api/countries')
            .expect(200)
        );
      }

      const responses = await Promise.all(promises);

      responses.forEach(response => {
        expect(response.body.response_time).toBeLessThan(200);
      });
    });
  });

  describe('AC: Flag image accessibility', () => {
    it('should serve flag images from /flags/ endpoint', async () => {
      // Test static file serving for existing flag
      await request(app)
        .get('/flags/argentina.png')
        .expect(200);
    });

    it('should return 404 for non-existent flag images', async () => {
      await request(app)
        .get('/flags/nonexistent.png')
        .expect(404);
    });

    it('should serve flag images with correct content type', async () => {
      const response = await request(app)
        .get('/flags/argentina.png')
        .expect(200);

      expect(response.type).toMatch(/image/);
    });

    it('should provide consistent flag URLs in country data', () => {
      countries.forEach(country => {
        expect(country.flagUrl).toMatch(/^\/flags\/.*\.png$/);
      });
    });
  });

  describe('AC: Malformed request handling', () => {
    it('should return 400 status with descriptive error for special characters', async () => {
      const response = await request(app)
        .get('/api/countries/@@invalid@@')
        .expect(400);

      expect(response.body.error).toBe('Country ID contains invalid characters');
      expect(response.body.code).toBe(400);
    });

    it('should return 400 status for extremely long strings', async () => {
      const longId = 'a'.repeat(100); // 100 character string

      const response = await request(app)
        .get(`/api/countries/${longId}`)
        .expect(400);

      expect(response.body.error).toBe('Country ID is too long');
      expect(response.body.code).toBe(400);
    });

    it('should handle various malformed ID patterns', async () => {
      const malformedIds = [
        '!@#$%',
        'space here',
        'with&ampersand',
        'with%20encoding',
        '../../etc/passwd',
        '<script>alert("xss")</script>'
      ];

      for (const id of malformedIds) {
        const response = await request(app)
          .get(`/api/countries/${encodeURIComponent(id)}`)
          .expect(400);

        expect(response.body.code).toBe(400);
        expect(response.body.error).toBeTruthy();
      }
    });

    it('should validate empty or null IDs', async () => {
      // Test empty string (though this would hit the list endpoint)
      await request(app)
        .get('/api/countries/')
        .expect(200); // This hits the list endpoint

      // Test with actual empty parameter requires special handling
      const response = await request(app)
        .get('/api/countries/ ')
        .expect(400);

      expect(response.body.code).toBe(400);
    });
  });

  describe('Health Check and Error Handling', () => {
    it('should provide health check endpoint', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('OK');
      expect(response.body.timestamp).toBeTruthy();
    });

    it('should handle 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/nonexistent/route')
        .expect(404);

      expect(response.body.error).toBe('Route not found');
      expect(response.body.code).toBe(404);
    });

    it('should handle global error cases gracefully', async () => {
      // This is harder to test without mocking, but we can verify the structure
      // The global error handler should return structured JSON
      const response = await request(app)
        .post('/api/countries') // Unsupported method
        .expect(404); // This will hit the route not found handler

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('code');
    });
  });

  describe('Tracking and Analytics', () => {
    it('should log analytics events for countries list requests', async () => {
      const consoleSpy = vi.spyOn(console, 'log');

      await request(app)
        .get('/api/countries')
        .expect(200);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/api_countries_list_requested.*response_time.*status_code=200/)
      );

      consoleSpy.mockRestore();
    });

    it('should log analytics events for country detail requests', async () => {
      const consoleSpy = vi.spyOn(console, 'log');

      await request(app)
        .get('/api/countries/arg')
        .expect(200);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/api_country_detail_requested.*country_id=arg.*response_time.*status_code=200/)
      );

      consoleSpy.mockRestore();
    });

    it('should log error analytics for invalid country requests', async () => {
      const consoleSpy = vi.spyOn(console, 'log');

      await request(app)
        .get('/api/countries/invalid')
        .expect(404);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/api_error_occurred.*endpoint=\/api\/countries\/invalid.*error_type=not_found.*status_code=404/)
      );

      consoleSpy.mockRestore();
    });
  });
});