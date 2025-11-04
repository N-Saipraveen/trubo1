/**
 * Type Mapper Tests
 */

import {
  sqlToMongoType,
  mongoToSqlType,
  normalizeSqlType,
  inferDatabaseType,
} from '../utils/typeMapper';

describe('Type Mapper', () => {
  describe('sqlToMongoType', () => {
    it('should convert SQL INT to MongoDB number', () => {
      expect(sqlToMongoType('INT')).toBe('number');
      expect(sqlToMongoType('INTEGER')).toBe('number');
    });

    it('should convert SQL VARCHAR to MongoDB string', () => {
      expect(sqlToMongoType('VARCHAR')).toBe('string');
      expect(sqlToMongoType('VARCHAR(255)')).toBe('string');
    });

    it('should convert SQL TIMESTAMP to MongoDB timestamp', () => {
      expect(sqlToMongoType('TIMESTAMP')).toBe('timestamp');
      expect(sqlToMongoType('DATETIME')).toBe('date');
    });

    it('should handle unknown types', () => {
      expect(sqlToMongoType('UNKNOWN_TYPE')).toBe('string');
    });
  });

  describe('mongoToSqlType', () => {
    it('should convert MongoDB string to SQL VARCHAR', () => {
      expect(mongoToSqlType('string')).toBe('VARCHAR(255)');
    });

    it('should convert MongoDB number to SQL INTEGER', () => {
      expect(mongoToSqlType('number')).toBe('INTEGER');
    });

    it('should convert MongoDB objectId to SQL VARCHAR', () => {
      expect(mongoToSqlType('objectId')).toBe('VARCHAR(24)');
    });
  });

  describe('normalizeSqlType', () => {
    it('should remove size specifications', () => {
      expect(normalizeSqlType('VARCHAR(255)')).toBe('VARCHAR');
      expect(normalizeSqlType('DECIMAL(10,2)')).toBe('DECIMAL');
    });

    it('should convert to uppercase', () => {
      expect(normalizeSqlType('varchar')).toBe('VARCHAR');
    });
  });

  describe('inferDatabaseType', () => {
    it('should detect SQL schema', () => {
      const sql = 'CREATE TABLE users (id INT PRIMARY KEY)';
      expect(inferDatabaseType(sql)).toBe('sql');
    });

    it('should detect NoSQL schema', () => {
      const nosql = { collections: [{ name: 'users', fields: [] }] };
      expect(inferDatabaseType(nosql)).toBe('nosql');
    });

    it('should detect JSON data', () => {
      const json = [{ id: 1, name: 'Test' }];
      expect(inferDatabaseType(json)).toBe('json');
    });
  });
});
