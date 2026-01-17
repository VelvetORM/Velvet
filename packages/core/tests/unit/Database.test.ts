/**
 * Database Connection Manager Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Database } from '../../src/Database'
import { ConnectionManager } from '../../src/connection/ConnectionManager'
import { ConnectionException } from '../../src/exceptions'

describe('Database', () => {
  afterEach(async () => {
    await Database.disconnectAll()
  })

  describe('Connection Management', () => {
    it('should connect to SQLite in-memory database', async () => {
      await Database.connect({
        client: 'sqlite',
        connection: {
          filename: ':memory:'
        }
      })

      expect(Database.hasConnection('default')).toBe(true)
      expect(Database.connection().isConnected()).toBe(true)
    })

    it('should support multiple named connections', async () => {
      await Database.connect(
        {
          client: 'sqlite',
          connection: { filename: ':memory:' }
        },
        'connection1'
      )

      await Database.connect(
        {
          client: 'sqlite',
          connection: { filename: ':memory:' }
        },
        'connection2'
      )

      expect(Database.hasConnection('connection1')).toBe(true)
      expect(Database.hasConnection('connection2')).toBe(true)
      expect(Database.getConnectionNames()).toHaveLength(2)
    })

    it('should throw error when accessing non-existent connection', () => {
      expect(() => Database.connection('nonexistent')).toThrow(ConnectionException)
      expect(() => Database.connection('nonexistent')).toThrow(/not found/)
    })

    it('should disconnect from database', async () => {
      await Database.connect({
        client: 'sqlite',
        connection: { filename: ':memory:' }
      })

      await Database.disconnect()

      expect(Database.hasConnection('default')).toBe(false)
    })

    it('should disconnect from all databases', async () => {
      await Database.connect(
        { client: 'sqlite', connection: { filename: ':memory:' } },
        'conn1'
      )
      await Database.connect(
        { client: 'sqlite', connection: { filename: ':memory:' } },
        'conn2'
      )

      await Database.disconnectAll()

      expect(Database.getConnectionNames()).toHaveLength(0)
    })
  })

  describe('Query Execution', () => {
    beforeEach(async () => {
      await Database.connect({
        client: 'sqlite',
        connection: { filename: ':memory:' }
      })

      // Create test table
      await Database.raw(`
        CREATE TABLE users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT NOT NULL,
          active INTEGER DEFAULT 1
        )
      `)
    })

    it('should execute INSERT query', async () => {
      const id = await Database.insert(
        'INSERT INTO users (name, email) VALUES (?, ?)',
        ['John Doe', 'john@example.com']
      )

      expect(id).toBeGreaterThan(0)
    })

    it('should execute SELECT query', async () => {
      await Database.insert(
        'INSERT INTO users (name, email) VALUES (?, ?)',
        ['John Doe', 'john@example.com']
      )

      const users = await Database.select('SELECT * FROM users')

      expect(users).toHaveLength(1)
      expect(users[0].name).toBe('John Doe')
      expect(users[0].email).toBe('john@example.com')
    })

    it('should execute UPDATE query', async () => {
      const id = await Database.insert(
        'INSERT INTO users (name, email) VALUES (?, ?)',
        ['John Doe', 'john@example.com']
      )

      const affected = await Database.update(
        'UPDATE users SET name = ? WHERE id = ?',
        ['Jane Doe', id]
      )

      expect(affected).toBe(1)

      const users = await Database.select('SELECT * FROM users WHERE id = ?', [id])
      expect(users[0].name).toBe('Jane Doe')
    })

    it('should execute DELETE query', async () => {
      const id = await Database.insert(
        'INSERT INTO users (name, email) VALUES (?, ?)',
        ['John Doe', 'john@example.com']
      )

      const deleted = await Database.delete('DELETE FROM users WHERE id = ?', [id])

      expect(deleted).toBe(1)

      const users = await Database.select('SELECT * FROM users')
      expect(users).toHaveLength(0)
    })

    it('should handle query parameters', async () => {
      await Database.insert(
        'INSERT INTO users (name, email, active) VALUES (?, ?, ?)',
        ['John Doe', 'john@example.com', 1]
      )
      await Database.insert(
        'INSERT INTO users (name, email, active) VALUES (?, ?, ?)',
        ['Jane Doe', 'jane@example.com', 0]
      )

      const activeUsers = await Database.select(
        'SELECT * FROM users WHERE active = ?',
        [1]
      )

      expect(activeUsers).toHaveLength(1)
      expect(activeUsers[0].name).toBe('John Doe')
    })
  })

  describe('Transactions', () => {
    beforeEach(async () => {
      await Database.connect({
        client: 'sqlite',
        connection: { filename: ':memory:' }
      })

      await Database.raw(`
        CREATE TABLE users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL
        )
      `)
    })

    it('should commit transaction on success', async () => {
      const result = await Database.transaction(async () => {
        const id1 = await Database.insert('INSERT INTO users (name) VALUES (?)', ['User 1'])
        const id2 = await Database.insert('INSERT INTO users (name) VALUES (?)', ['User 2'])
        return { id1, id2 }
      })

      expect(result.id1).toBeGreaterThan(0)
      expect(result.id2).toBeGreaterThan(0)

      const users = await Database.select('SELECT * FROM users')
      expect(users).toHaveLength(2)
    })

    it('should rollback transaction on error', async () => {
      try {
        await Database.transaction(async () => {
          await Database.insert('INSERT INTO users (name) VALUES (?)', ['User 1'])
          throw new Error('Something went wrong')
        })
      } catch (error: any) {
        expect(error.message).toBe('Something went wrong')
      }

      const users = await Database.select('SELECT * FROM users')
      expect(users).toHaveLength(0)
    })

    it('should handle manual transaction control', async () => {
      await Database.beginTransaction()

      await Database.insert('INSERT INTO users (name) VALUES (?)', ['User 1'])
      await Database.insert('INSERT INTO users (name) VALUES (?)', ['User 2'])

      await Database.commit()

      const users = await Database.select('SELECT * FROM users')
      expect(users).toHaveLength(2)
    })

    it('should handle manual rollback', async () => {
      await Database.beginTransaction()

      await Database.insert('INSERT INTO users (name) VALUES (?)', ['User 1'])
      await Database.rollback()

      const users = await Database.select('SELECT * FROM users')
      expect(users).toHaveLength(0)
    })
  })
})
