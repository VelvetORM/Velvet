declare module 'better-sqlite3' {
  export interface DatabaseConstructorOptions {
    readonly?: boolean
    fileMustExist?: boolean
    timeout?: number
    verbose?: (message: string) => void
  }

  export interface RunResult {
    changes: number
    lastInsertRowid: number | bigint
  }

  export interface Statement<TRow = Record<string, unknown>> {
    all(...params: unknown[]): TRow[]
    get(...params: unknown[]): TRow | undefined
    run(...params: unknown[]): RunResult
  }

  export interface Database {
    prepare<TRow = Record<string, unknown>>(sql: string): Statement<TRow>
    pragma(source: string): unknown
    close(): void
  }

  interface DatabaseConstructor {
    new (filename: string, options?: DatabaseConstructorOptions): Database
    (filename: string, options?: DatabaseConstructorOptions): Database
  }

  const Database: DatabaseConstructor
  export default Database
}
