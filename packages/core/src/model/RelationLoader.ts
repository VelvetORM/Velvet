/**
 * RelationLoader
 *
 * Handles eager-loading of relations for models.
 */

import { Model } from '../Model'

type RelationTree = { [key: string]: RelationTree }

export class RelationLoader {
  static async load(models: Model[], relations: string[]): Promise<void> {
    if (models.length === 0 || relations.length === 0) {
      return
    }

    const tree = RelationLoader.buildRelationTree(relations)

    for (const [relationName, nested] of Object.entries(tree)) {
      const first = models[0]
      const relationMethod = (first as unknown as Record<string, unknown>)[relationName]

      if (typeof relationMethod !== 'function') {
        throw new Error(`Relation ${relationName} does not exist on ${first.constructor.name}`)
      }

      const relation = (relationMethod as () => {
        eagerLoadForMany: (items: Model[], name: string) => Promise<void>
      }).call(first)

      await relation.eagerLoadForMany(models, relationName)

      if (Object.keys(nested).length > 0) {
        const relatedModels = RelationLoader.collectRelatedModels(models, relationName)
        await RelationLoader.load(relatedModels, RelationLoader.flattenRelationTree(nested))
      }
    }
  }

  private static buildRelationTree(relations: string[]): RelationTree {
    const tree: RelationTree = {}

    for (const relation of relations) {
      const parts = relation.split('.')
      let current: RelationTree = tree
      for (const part of parts) {
        if (!current[part]) {
          current[part] = {}
        }
        current = current[part]
      }
    }

    return tree
  }

  private static flattenRelationTree(tree: RelationTree): string[] {
    const relations: string[] = []
    for (const key of Object.keys(tree)) {
      const nested = tree[key]
      const nestedKeys = Object.keys(nested)
      if (nestedKeys.length === 0) {
        relations.push(key)
      } else {
        for (const sub of RelationLoader.flattenRelationTree(nested)) {
          relations.push(`${key}.${sub}`)
        }
      }
    }
    return relations
  }

  private static collectRelatedModels(models: Model[], relationName: string): Model[] {
    const related: Model[] = []
    for (const model of models) {
      const value = model.getRelation(relationName)
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item instanceof Model) {
            related.push(item)
          }
        }
      } else if (value instanceof Model) {
        related.push(value)
      }
    }
    return related
  }
}
