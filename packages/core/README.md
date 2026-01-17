# @velvet/core

Core ORM functionality for Velvet - The elegant TypeScript ORM with full type safety.

## Installation

```bash
npm install @velvet/core
# or
pnpm add @velvet/core
# or
yarn add @velvet/core
```

## Quick Start

```typescript
import { Database, Model } from '@velvet/core'

// Configure database connection
Database.connect({
  client: 'postgres',
  connection: {
    host: 'localhost',
    database: 'myapp',
    user: 'postgres',
    password: 'secret'
  }
})

// Define a model
class User extends Model {
  static table = 'users'
}

// Use it!
const user = await User.create({
  name: 'John Doe',
  email: 'john@example.com'
})

const users = await User.where('active', true).get()
```

## Features

- **Active Record Pattern** - Models know how to persist themselves
- **Fluent Query Builder** - Chainable, readable queries
- **Full Type Safety** - TypeScript inference throughout
- **Automatic Timestamps** - Handles `created_at` and `updated_at`
- **Attribute Casting** - Automatic type conversions
- **Mutators & Accessors** - Transform attributes on get/set
- **Model Events** - Hooks for creating, created, updating, etc.

## Documentation

Full documentation available at [velvetorm.github.io](https://velvetorm.github.io) (coming soon)

## License

MIT
