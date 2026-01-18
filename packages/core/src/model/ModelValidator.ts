/**
 * ModelValidator
 *
 * Encapsulates validation rule resolution and enforcement.
 */

import type { ValidationRules } from '../support/InputValidator'
import { InputValidator } from '../support/InputValidator'

export class ModelValidator {
  private readonly rulesProvider: () => ValidationRules

  constructor(rulesProvider: () => ValidationRules) {
    this.rulesProvider = rulesProvider
  }

  validate(attributes: Record<string, unknown>, requireAll: boolean): void {
    const rules = this.rulesProvider()
    if (Object.keys(rules).length === 0) {
      return
    }

    const effectiveRules = requireAll
      ? rules
      : this.getValidationRulesFor(attributes, rules)

    if (Object.keys(effectiveRules).length === 0) {
      return
    }

    InputValidator.validateOrThrow(attributes, effectiveRules)
  }

  private getValidationRulesFor(
    attributes: Record<string, unknown>,
    rules: ValidationRules
  ): ValidationRules {
    const filtered: ValidationRules = {}
    for (const key of Object.keys(attributes)) {
      if (rules[key]) {
        filtered[key] = rules[key]
      }
    }
    return filtered
  }
}
