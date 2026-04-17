import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import countriesRouter from './countries.js';
import countries from '../data/countries.js';

describe('Countries Routes', () => {
  let app;

  beforeEach(() => {
    // Create fresh Express app for each test
    app = express();
    app.use(express.json());
    app.use('/api/countries', countriesRouter);
  });

  describe('GET /api/countries', () => {
    it('should return all countries with correct structure', async () => {
      const response = await request(app)
        .get('/api/countries')
        .expect(200);

      expect(response.body).toHaveProperty('countries');
      expect(response.body).toHaveProperty('count');
      expect(response.body).toHaveProperty('response_time');

      expect(response.body.countries).toHaveLength(countries.length);
      expect(response.body.count).toBe(countries.length);

      // Verify first country structure
      const firstCountry = response.body.countries[0];
      expect(firstCountry).toHaveProperty('id');
      expect(firstCountry).toHaveProperty('name');
      expect(firstCountry).toHaveProperty('capital');
      expect(firstCountry).toHaveProperty('population');
      expect(firstCountry).toHaveProperty('flagUrl');
    });

    it('should return countries in expected order', async () => {
      const response = await request(app)
        .get('/api/countries')
        .expect(200);

      // Should match the order in the countries data file
      expect(response.body.countries[0].id).toBe('arg');
      expect(response.body.countries[1].id).toBe('bra');
      expect(response.body.countries[2].id).toBe('usa');
    });

    it('should include response time metadata', async () => {
      const response = await request(app)
        .get('/api/countries')
        .expect(200);

      expect(response.body.response_time).toBeDefined();
      expect(typeof response.body.response_time).toBe('number');
      expect(response.body.response_time).toBeGreaterThanOrEqual(0);
    });

    it('should log analytics event for list requests', async () => {
      const consoleSpy = vi.spyOn(console, 'log');

      await request(app)
        .get('/api/countries')
        .expect(200);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/api_countries_list_requested/)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('GET /api/countries/:id - Valid IDs', () => {
    it('should return single country for valid ID', async () => {
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

    it('should handle case-insensitive lookups', async () => {
      const testCases = [
        { input: 'ARG', expected: 'arg' },
        { input: 'bra', expected: 'bra' },
        { input: 'USA', expected: 'usa' },
        { input: 'FrA', expected: 'fra' }
      ];

      for (const testCase of testCases) {
        const response = await request(app)
          .get(`/api/countries/${testCase.input}`)
          .expect(200);

        expect(response.body.country.id).toBe(testCase.expected);
      }
    });

    it('should return different countries correctly', async () => {
      const testCountries = [
        { id: 'bra', name: 'Brazil', capital: 'Brasília' },
        { id: 'usa', name: 'United States', capital: 'Washington, D.C.' },
        { id: 'can', name: 'Canada', capital: 'Ottawa' },
        { id: 'mex', name: 'Mexico', capital: 'Mexico City' }
      ];

      for (const expectedCountry of testCountries) {
        const response = await request(app)
          .get(`/api/countries/${expectedCountry.id}`)
          .expect(200);

        const country = response.body.country;
        expect(country.id).toBe(expectedCountry.id);
        expect(country.name).toBe(expectedCountry.name);
        expect(country.capital).toBe(expectedCountry.capital);
      }
    });

    it('should include response time for successful requests', async () => {
      const response = await request(app)
        .get('/api/countries/arg')
        .expect(200);

      expect(response.body.response_time).toBeDefined();
      expect(typeof response.body.response_time).toBe('number');
      expect(response.body.response_time).toBeGreaterThanOrEqual(0);
    });

    it('should log analytics for successful detail requests', async () => {
      const consoleSpy = vi.spyOn(console, 'log');

      await request(app)
        .get('/api/countries/arg')
        .expect(200);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/api_country_detail_requested.*country_id=arg.*status_code=200/)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('GET /api/countries/:id - Invalid IDs (404 Cases)', () => {
    it('should return 404 for non-existent country ID', async () => {
      const response = await request(app)
        .get('/api/countries/invalid-id')
        .expect(404);

      expect(response.body).toEqual({
        error: 'Country not found',
        code: 404
      });
    });

    it('should return 404 for multiple invalid IDs', async () => {
      const invalidIds = ['xyz', 'notfound', 'fake', 'test123', 'zzz'];

      for (const invalidId of invalidIds) {
        const response = await request(app)
          .get(`/api/countries/${invalidId}`)
          .expect(404);

        expect(response.body.error).toBe('Country not found');
        expect(response.body.code).toBe(404);
      }
    });

    it('should log analytics for 404 errors', async () => {
      const consoleSpy = vi.spyOn(console, 'log');

      await request(app)
        .get('/api/countries/invalid')
        .expect(404);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/api_country_detail_requested.*country_id=invalid.*status_code=404/)
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/api_error_occurred.*endpoint=\/api\/countries\/invalid.*error_type=not_found.*status_code=404/)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('GET /api/countries/:id - Malformed IDs (400 Cases)', () => {
    it('should return 400 for IDs with special characters', async () => {
      const malformedIds = [
        '@@invalid@@',
        'test!',
        'id@domain.com',
        'id#hash',
        'id$money',
        'id%percent'
      ];

      for (const malformedId of malformedIds) {
        const response = await request(app)
          .get(`/api/countries/${malformedId}`)
          .expect(400);

        expect(response.body.error).toBe('Country ID contains invalid characters');
        expect(response.body.code).toBe(400);
      }
    });

    it('should return 400 for extremely long IDs', async () => {
      const longId = 'a'.repeat(100); // 100 characters

      const response = await request(app)
        .get(`/api/countries/${longId}`)
        .expect(400);

      expect(response.body.error).toBe('Country ID is too long');
      expect(response.body.code).toBe(400);
    });

    it('should handle edge cases in validation', async () => {
      const edgeCases = [
        { id: ' ', error: 'Country ID contains invalid characters' },
        { id: '../../etc', error: 'Country ID contains invalid characters' },
        { id: 'space here', error: 'Country ID contains invalid characters' },
        { id: 'with\ttab', error: 'Country ID contains invalid characters' },
        { id: 'with\nnewline', error: 'Country ID contains invalid characters' }
      ];

      for (const testCase of edgeCases) {
        const response = await request(app)
          .get(`/api/countries/${testCase.id}`)
          .expect(400);

        expect(response.body.error).toBe(testCase.error);
        expect(response.body.code).toBe(400);
      }
    });

    it('should allow valid characters in IDs', async () => {
      // These should pass validation but return 404 (not found)
      const validFormats = ['abc123', 'test-id', 'test_id', 'ID123'];

      for (const validFormat of validFormats) {
        const response = await request(app)
          .get(`/api/countries/${validFormat}`)
          .expect(404); // 404 because they don't exist, not 400 for malformed

        expect(response.body.error).toBe('Country not found');
      }
    });

    it('should log analytics for validation errors', async () => {
      const consoleSpy = vi.spyOn(console, 'log');

      await request(app)
        .get('/api/countries/@@invalid@@')
        .expect(400);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/api_country_detail_requested.*country_id=@@invalid@@.*status_code=400/)
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/api_error_occurred.*endpoint=\/api\/countries\/@@invalid@@.*error_type=validation.*status_code=400/)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Input Validation through API', () => {
    it('should validate correct ID formats through endpoint behavior', async () => {
      const validFormats = ['arg', 'bra', 'usa', 'test123', 'id-with-dash', 'id_with_underscore'];

      for (const validFormat of validFormats) {
        const response = await request(app)
          .get(`/api/countries/${validFormat}`);

        // Should either return 200 (found) or 404 (not found), but NOT 400 (validation error)
        expect([200, 404]).toContain(response.status);

        if (response.status === 400) {
          // If it's 400, something is wrong with our validation logic
          console.error(`Unexpected 400 for valid format: ${validFormat}`, response.body);
        }
      }
    });

    it('should reject invalid ID formats through endpoint behavior', async () => {
      const invalidFormats = ['test@', 'id!', 'id#hash', 'id with space', 'id\ttab'];

      for (const invalidFormat of invalidFormats) {
        const response = await request(app)
          .get(`/api/countries/${invalidFormat}`)
          .expect(400);

        expect(response.body.error).toBe('Country ID contains invalid characters');
      }
    });

    it('should reject extremely long IDs through endpoint behavior', async () => {
      const longId = 'a'.repeat(100);

      const response = await request(app)
        .get(`/api/countries/${longId}`)
        .expect(400);

      expect(response.body.error).toBe('Country ID is too long');
    });
  });

  describe('Error Handling', () => {
    it('should handle unexpected errors gracefully', async () => {
      // Mock the countries data to throw an error
      const originalFind = Array.prototype.find;
      const consoleSpy = vi.spyOn(console, 'error');

      Array.prototype.find = vi.fn(() => {
        throw new Error('Database error');
      });

      const response = await request(app)
        .get('/api/countries/arg')
        .expect(500);

      expect(response.body).toEqual({
        error: 'Internal Server Error',
        code: 500
      });

      expect(consoleSpy).toHaveBeenCalled();

      // Restore original methods
      Array.prototype.find = originalFind;
      consoleSpy.mockRestore();
    });
  });
});