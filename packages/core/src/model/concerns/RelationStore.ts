/**
 * RelationStore
 *
 * Encapsulates storage for loaded relations.
 */

export class RelationStore {
  private readonly relations: Record<string, unknown> = {}

  set(name: string, value: unknown): void {
    this.relations[name] = value
  }

  get(name: string): unknown {
    return this.relations[name]
  }

  has(name: string): boolean {
    return name in this.relations
  }

  all(): Record<string, unknown> {
    return { ...this.relations }
  }
}
