import { toSnakeCase, toCamelCase, mapKeysToSnakeCase, mapKeysToCamelCase } from './case-transform.util';

describe('case-transform.util', () => {
  describe('toSnakeCase', () => {
    it('converts camelCase to snake_case', () => {
      expect(toSnakeCase('passwordConfirmation')).toBe('password_confirmation');
    });
    it('leaves already snake_case unchanged', () => {
      expect(toSnakeCase('password')).toBe('password');
    });
    it('handles multiple uppercase letters', () => {
      expect(toSnakeCase('userId')).toBe('user_id');
    });
  });

  describe('toCamelCase', () => {
    it('converts snake_case to camelCase', () => {
      expect(toCamelCase('password_confirmation')).toBe('passwordConfirmation');
    });
    it('leaves already camelCase unchanged', () => {
      expect(toCamelCase('password')).toBe('password');
    });
    it('handles multiple underscores', () => {
      expect(toCamelCase('user_id')).toBe('userId');
    });
  });

  describe('mapKeysToSnakeCase', () => {
    it('maps all keys to snake_case', () => {
      const result = mapKeysToSnakeCase({
        email: 'test@example.com',
        password: 'pass',
        passwordConfirmation: 'pass',
      });
      expect(result).toEqual({
        email: 'test@example.com',
        password: 'pass',
        password_confirmation: 'pass',
      });
    });

    it('handles empty object', () => {
      expect(mapKeysToSnakeCase({})).toEqual({});
    });
  });

  describe('mapKeysToCamelCase', () => {
    it('maps all keys to camelCase', () => {
      const result = mapKeysToCamelCase({
        user_id: '123',
        step: 1,
      });
      expect(result).toEqual({ userId: '123', step: 1 });
    });
  });
});
