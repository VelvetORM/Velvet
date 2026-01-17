# Velvet ORM

> **"The elegant ORM for TypeScript"**
> Beautiful API, Type safety, Active Record pattern.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)

Velvet is a modern TypeScript ORM that brings an elegant, intuitive API with full type safety to the Node.js ecosystem.

## 🚧 Development Status

**Current Phase:** Phase 1 - MVP Core (In Development)

- ✅ Project structure
- 🚧 Core Model implementation
- 🚧 Query Builder
- 🚧 Database connection manager
- ⏳ Relationships
- 
- ⏳ Advanced features
- ⏳ CLI tools

## ✨ Features

- **Active Record Pattern** - Models know how to persist themselves
- **Fluent API** - Chainable, readable queries
- **Type-Safe** - Full TypeScript inference
- **Zero Config** - Works out of the box
- **Framework Agnostic** - Works with any Node.js app

## 📦 Packages

This is a monorepo containing multiple packages:

- **[@velvet/core](./packages/core)** - Core ORM functionality
- **@velvet/cli** - CLI tools (coming soon)
- **@velvet/postgres** - PostgreSQL adapter (coming soon)
- **@velvet/mysql** - MySQL adapter (coming soon)
- **@velvet/sqlite** - SQLite adapter (coming soon)

## 🚀 Quick Start (Coming Soon)

```typescript
import { Database, Model } from '@velvet/core'

// Configure database
Database.connect({
  client: 'postgres',
  connection: {
    host: 'localhost',
    database: 'myapp'
  }
})

// Define model
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

## 📚 Documentation

Full documentation coming soon. For now, check out the [implementation specification](./VELVET_ORM_IMPLEMENTATION_SPEC.md).

## 🛠️ Development

This project uses pnpm workspaces:

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Build all packages
pnpm build

# Type checking
pnpm typecheck
```

## 📋 Project Structure

```
velvet/
├── packages/
│   ├── core/          # Main ORM package
│   └── cli/           # CLI tools (coming soon)
├── examples/          # Example applications (coming soon)
├── docs/              # Documentation (coming soon)
└── VELVET_ORM_IMPLEMENTATION_SPEC.md
```

## 🤝 Contributing

This project is currently in early development. Contributions will be welcome once we reach a stable v1.0.

## 📄 License

MIT © Velvet ORM Team

## 🎯 Why Velvet?

| Feature | Velvet | Prisma | TypeORM | Drizzle |
|---------|--------|--------|---------|---------|
| Active Record | ✅ | ❌ | ✅ | ❌ |
| Fluent API | ✅ | ⚠️ | ⚠️ | ❌ |
| Type Inference | ✅ | ✅ | ⚠️ | ✅ |
| Relationships | ✅ | ⚠️ Verbose | ⚠️ | Manual |
| Query Scopes | ✅ | ❌ | ❌ | ❌ |
| Mutators/Accessors | ✅ | ❌ | ❌ | ❌ |
| Model Events | ✅ | ❌ | ⚠️ | ❌ |

---

**Built with 💜 by developers who love beautiful APIs**
