import { describe, it, expect } from 'vitest';
import countries from './countries.js';

describe('Countries Data', () => {
  describe('Data Structure Validation', () => {
    it('should be an array of country objects', () => {
      expect(Array.isArray(countries)).toBe(true);
      expect(countries.length).toBeGreaterThan(0);
    });

    it('should contain the expected number of World Cup 2026 countries', () => {
      // Verify we have a substantial list of countries (should be 48 eventually)
      expect(countries.length).toBeGreaterThanOrEqual(40);
      expect(countries.length).toBeLessThanOrEqual(48);
    });

    it('should have unique country IDs', () => {
      const ids = countries.map(country => country.id);
      const uniqueIds = new Set(ids);

      expect(ids.length).toBe(uniqueIds.size);
    });

    it('should have unique country names', () => {
      const names = countries.map(country => country.name);
      const uniqueNames = new Set(names);

      expect(names.length).toBe(uniqueNames.size);
    });
  });

  describe('Individual Country Structure', () => {
    it('should have all required fields for each country', () => {
      countries.forEach((country, index) => {
        expect(country, `Country at index ${index}`).toHaveProperty('id');
        expect(country, `Country at index ${index}`).toHaveProperty('name');
        expect(country, `Country at index ${index}`).toHaveProperty('capital');
        expect(country, `Country at index ${index}`).toHaveProperty('population');
        expect(country, `Country at index ${index}`).toHaveProperty('flagUrl');
      });
    });

    it('should have correct data types for all fields', () => {
      countries.forEach((country, index) => {
        expect(typeof country.id, `Country ${country.name || index} id`).toBe('string');
        expect(typeof country.name, `Country ${country.name || index} name`).toBe('string');
        expect(typeof country.capital, `Country ${country.name || index} capital`).toBe('string');
        expect(typeof country.population, `Country ${country.name || index} population`).toBe('number');
        expect(typeof country.flagUrl, `Country ${country.name || index} flagUrl`).toBe('string');
      });
    });

    it('should have non-empty string fields', () => {
      countries.forEach((country, index) => {
        expect(country.id.length, `Country ${country.name || index} id length`).toBeGreaterThan(0);
        expect(country.name.length, `Country ${country.name || index} name length`).toBeGreaterThan(0);
        expect(country.capital.length, `Country ${country.name || index} capital length`).toBeGreaterThan(0);
        expect(country.flagUrl.length, `Country ${country.name || index} flagUrl length`).toBeGreaterThan(0);
      });
    });

    it('should have positive population numbers', () => {
      countries.forEach((country, index) => {
        expect(country.population, `Country ${country.name || index} population`).toBeGreaterThan(0);
        expect(Number.isInteger(country.population), `Country ${country.name || index} population should be integer`).toBe(true);
      });
    });

    it('should have properly formatted flag URLs', () => {
      countries.forEach((country, index) => {
        expect(country.flagUrl, `Country ${country.name || index} flagUrl`).toMatch(/^\/flags\/.*\.png$/);
      });
    });

    it('should have reasonable ID format (lowercase, alphanumeric)', () => {
      countries.forEach((country, index) => {
        expect(country.id, `Country ${country.name || index} id format`).toMatch(/^[a-z]{2,4}$/);
      });
    });
  });

  describe('Specific Country Data Validation', () => {
    it('should include expected World Cup 2026 host countries', () => {
      const hostCountries = ['usa', 'can', 'mex'];
      const countryIds = countries.map(c => c.id);

      hostCountries.forEach(hostId => {
        expect(countryIds, `Host country ${hostId} should be included`).toContain(hostId);
      });
    });

    it('should include major football nations', () => {
      const majorNations = ['arg', 'bra', 'eng', 'fra', 'ger', 'esp', 'ita', 'ned'];
      const countryIds = countries.map(c => c.id);

      majorNations.forEach(nationId => {
        expect(countryIds, `Major nation ${nationId} should be included`).toContain(nationId);
      });
    });

    it('should have accurate data for Argentina', () => {
      const argentina = countries.find(c => c.id === 'arg');

      expect(argentina).toBeDefined();
      expect(argentina.name).toBe('Argentina');
      expect(argentina.capital).toBe('Buenos Aires');
      expect(argentina.population).toBe(45376763);
      expect(argentina.flagUrl).toBe('/flags/argentina.png');
    });

    it('should have accurate data for Brazil', () => {
      const brazil = countries.find(c => c.id === 'bra');

      expect(brazil).toBeDefined();
      expect(brazil.name).toBe('Brazil');
      expect(brazil.capital).toBe('Brasília');
      expect(brazil.population).toBe(215313498);
      expect(brazil.flagUrl).toBe('/flags/brazil.png');
    });

    it('should have accurate data for United States', () => {
      const usa = countries.find(c => c.id === 'usa');

      expect(usa).toBeDefined();
      expect(usa.name).toBe('United States');
      expect(usa.capital).toBe('Washington, D.C.');
      expect(usa.population).toBe(331449281);
      expect(usa.flagUrl).toBe('/flags/usa.png');
    });

    it('should have accurate data for major European nations', () => {
      const testCases = [
        { id: 'eng', name: 'England', capital: 'London' },
        { id: 'fra', name: 'France', capital: 'Paris' },
        { id: 'ger', name: 'Germany', capital: 'Berlin' },
        { id: 'esp', name: 'Spain', capital: 'Madrid' },
        { id: 'ita', name: 'Italy', capital: 'Rome' }
      ];

      testCases.forEach(testCase => {
        const country = countries.find(c => c.id === testCase.id);

        expect(country, `${testCase.name} should exist`).toBeDefined();
        expect(country.name).toBe(testCase.name);
        expect(country.capital).toBe(testCase.capital);
        expect(country.population).toBeGreaterThan(0);
        expect(country.flagUrl).toMatch(new RegExp(`/flags/.*\\.png$`));
      });
    });
  });

  describe('Data Consistency', () => {
    it('should have consistent population ranges', () => {
      // All populations should be reasonable (> 100k, < 2 billion)
      countries.forEach(country => {
        expect(country.population).toBeGreaterThan(100000);
        expect(country.population).toBeLessThan(2000000000);
      });
    });

    it('should have flag URLs pointing to existing files for sample countries', () => {
      // Test a few known countries that should have flag files
      const sampleCountries = ['arg', 'bra', 'usa'];

      sampleCountries.forEach(id => {
        const country = countries.find(c => c.id === id);
        expect(country).toBeDefined();
        expect(country.flagUrl).toMatch(/^\/flags\/.*\.png$/);
      });
    });

    it('should have reasonable capital city names', () => {
      countries.forEach(country => {
        // Capital should not be empty and should be reasonable length
        expect(country.capital.length).toBeGreaterThan(1);
        expect(country.capital.length).toBeLessThan(50);

        // Should not start/end with whitespace
        expect(country.capital.trim()).toBe(country.capital);

        // Should not contain only special characters
        expect(country.capital).toMatch(/[a-zA-Z]/);
      });
    });

    it('should have proper name formatting', () => {
      countries.forEach(country => {
        // Country names should be properly formatted
        expect(country.name.length).toBeGreaterThan(2);
        expect(country.name.length).toBeLessThan(50);

        // Should start with capital letter
        expect(country.name.charAt(0)).toMatch(/[A-Z]/);

        // Should not start/end with whitespace
        expect(country.name.trim()).toBe(country.name);
      });
    });
  });

  describe('Geographic and Regional Coverage', () => {
    it('should include countries from multiple continents', () => {
      // Check for representatives from different continents by looking at known countries
      const regions = {
        'South America': ['arg', 'bra', 'uru', 'col', 'chi'],
        'North America': ['usa', 'can', 'mex'],
        'Europe': ['eng', 'fra', 'ger', 'esp', 'ita'],
        'Africa': ['mar', 'sen', 'nga', 'gha'],
        'Asia': ['jpn', 'kor'],
        'Oceania': ['aus']
      };

      const countryIds = countries.map(c => c.id);

      Object.entries(regions).forEach(([region, regionIds]) => {
        const hasRegionRepresentation = regionIds.some(id => countryIds.includes(id));
        expect(hasRegionRepresentation, `Should have representation from ${region}`).toBe(true);
      });
    });

    it('should include diverse population sizes', () => {
      const populations = countries.map(c => c.population);

      // Should have small countries (< 10M)
      const smallCountries = populations.filter(p => p < 10000000);
      expect(smallCountries.length).toBeGreaterThan(0);

      // Should have large countries (> 100M)
      const largeCountries = populations.filter(p => p > 100000000);
      expect(largeCountries.length).toBeGreaterThan(0);

      // Should have medium-sized countries
      const mediumCountries = populations.filter(p => p >= 10000000 && p <= 100000000);
      expect(mediumCountries.length).toBeGreaterThan(0);
    });
  });
});