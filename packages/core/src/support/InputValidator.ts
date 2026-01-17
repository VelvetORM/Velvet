/**
 * Input Validator
 *
 * Validates user input and model attributes to prevent invalid data.
 */

import { QueryException } from '../exceptions'

/**
 * Validation rules for model attributes
 */
export interface ValidationRule {
  /**
   * Field is required
   */
  required?: boolean

  /**
   * Expected type
   */
  type?: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'date'

  /**
   * Minimum value (for numbers) or length (for strings)
   */
  min?: number

  /**
   * Maximum value (for numbers) or length (for strings)
   */
  max?: number

  /**
   * Regular expression pattern (for strings)
   */
  pattern?: RegExp

  /**
   * Allowed values (enum)
   */
  enum?: any[]

  /**
   * Custom validation function
   */
  validate?: (value: any) => boolean | string
}

/**
 * Validation rules for a model
 */
export type ValidationRules = Record<string, ValidationRule>

/**
 * Validation error details
 */
export interface ValidationError {
  field: string
  message: string
  rule: string
  value?: any
}

/**
 * Input Validator
 *
 * Validates data before it's stored in the database
 *
 * @example
 * ```typescript
 * const rules: ValidationRules = {
 *   email: {
 *     required: true,
 *     type: 'string',
 *     pattern: /^[^@]+@[^@]+\.[^@]+$/
 *   },
 *   age: {
 *     type: 'number',
 *     min: 0,
 *     max: 120
 *   }
 * }
 *
 * InputValidator.validate({ email: 'test@example.com', age: 25 }, rules)
 * ```
 */
export class InputValidator {
  /**
   * Validate data against rules
   *
   * @param data - Data to validate
   * @param rules - Validation rules
   * @returns Array of validation errors (empty if valid)
   */
  static validate(data: Record<string, any>, rules: ValidationRules): ValidationError[] {
    const errors: ValidationError[] = []

    // Check required fields
    for (const [field, rule] of Object.entries(rules)) {
      if (rule.required && (data[field] === undefined || data[field] === null)) {
        errors.push({
          field,
          message: `Field "${field}" is required`,
          rule: 'required'
        })
      }
    }

    // Validate each field
    for (const [field, value] of Object.entries(data)) {
      const rule = rules[field]

      // Skip if no rule defined
      if (!rule) {
        continue
      }

      // Skip if value is null/undefined and not required
      if ((value === null || value === undefined) && !rule.required) {
        continue
      }

      // Type validation
      if (rule.type) {
        const typeError = this.validateType(field, value, rule.type)
        if (typeError) {
          errors.push(typeError)
          continue // Skip other validations if type is wrong
        }
      }

      // Min/Max validation
      if (rule.min !== undefined) {
        const minError = this.validateMin(field, value, rule.min, rule.type)
        if (minError) errors.push(minError)
      }

      if (rule.max !== undefined) {
        const maxError = this.validateMax(field, value, rule.max, rule.type)
        if (maxError) errors.push(maxError)
      }

      // Pattern validation (for strings)
      if (rule.pattern && typeof value === 'string') {
        if (!rule.pattern.test(value)) {
          errors.push({
            field,
            message: `Field "${field}" does not match required pattern`,
            rule: 'pattern',
            value
          })
        }
      }

      // Enum validation
      if (rule.enum && !rule.enum.includes(value)) {
        errors.push({
          field,
          message: `Field "${field}" must be one of: ${rule.enum.join(', ')}`,
          rule: 'enum',
          value
        })
      }

      // Custom validation
      if (rule.validate) {
        const result = rule.validate(value)
        if (result !== true) {
          errors.push({
            field,
            message: typeof result === 'string' ? result : `Field "${field}" is invalid`,
            rule: 'custom',
            value
          })
        }
      }
    }

    return errors
  }

  /**
   * Validate and throw if invalid
   *
   * @param data - Data to validate
   * @param rules - Validation rules
   * @throws {QueryException} If validation fails
   */
  static validateOrThrow(data: Record<string, any>, rules: ValidationRules): void {
    const errors = this.validate(data, rules)

    if (errors.length > 0) {
      const messages = errors.map((e) => `${e.field}: ${e.message}`).join('; ')

      throw new QueryException(
        `Validation failed: ${messages}`,
        undefined,
        undefined,
        'VALIDATION_FAILED',
        { errors }
      )
    }
  }

  /**
   * Validate type
   */
  private static validateType(
    field: string,
    value: any,
    expectedType: string
  ): ValidationError | null {
    let actualType: string

    if (value === null) {
      actualType = 'null'
    } else if (Array.isArray(value)) {
      actualType = 'array'
    } else if (value instanceof Date) {
      actualType = 'date'
    } else {
      actualType = typeof value
    }

    if (actualType !== expectedType) {
      return {
        field,
        message: `Field "${field}" must be of type ${expectedType}, got ${actualType}`,
        rule: 'type',
        value
      }
    }

    return null
  }

  /**
   * Validate minimum value/length
   */
  private static validateMin(
    field: string,
    value: any,
    min: number,
    type?: string
  ): ValidationError | null {
    if (type === 'string' && typeof value === 'string') {
      if (value.length < min) {
        return {
          field,
          message: `Field "${field}" must be at least ${min} characters long`,
          rule: 'min',
          value
        }
      }
    } else if (type === 'number' && typeof value === 'number') {
      if (value < min) {
        return {
          field,
          message: `Field "${field}" must be at least ${min}`,
          rule: 'min',
          value
        }
      }
    } else if (Array.isArray(value)) {
      if (value.length < min) {
        return {
          field,
          message: `Field "${field}" must have at least ${min} items`,
          rule: 'min',
          value
        }
      }
    }

    return null
  }

  /**
   * Validate maximum value/length
   */
  private static validateMax(
    field: string,
    value: any,
    max: number,
    type?: string
  ): ValidationError | null {
    if (type === 'string' && typeof value === 'string') {
      if (value.length > max) {
        return {
          field,
          message: `Field "${field}" must be at most ${max} characters long`,
          rule: 'max',
          value
        }
      }
    } else if (type === 'number' && typeof value === 'number') {
      if (value > max) {
        return {
          field,
          message: `Field "${field}" must be at most ${max}`,
          rule: 'max',
          value
        }
      }
    } else if (Array.isArray(value)) {
      if (value.length > max) {
        return {
          field,
          message: `Field "${field}" must have at most ${max} items`,
          rule: 'max',
          value
        }
      }
    }

    return null
  }

  /**
   * Common email validation rule
   */
  static email(): ValidationRule {
    return {
      type: 'string',
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    }
  }

  /**
   * Common URL validation rule
   */
  static url(): ValidationRule {
    return {
      type: 'string',
      pattern: /^https?:\/\/.+/
    }
  }

  /**
   * Common UUID validation rule
   */
  static uuid(): ValidationRule {
    return {
      type: 'string',
      pattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    }
  }
}
