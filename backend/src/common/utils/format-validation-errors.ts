import { ValidationError } from 'class-validator';

/**
 * Flattens class-validator's ValidationError tree into a simple { field: message } map,
 * taking the first constraint message per field (including nested properties as dot paths).
 */
export function formatValidationErrors(
  errors: ValidationError[],
  parentPath = '',
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const error of errors) {
    const path = parentPath ? `${parentPath}.${error.property}` : error.property;

    if (error.constraints) {
      const firstMessage = Object.values(error.constraints)[0];
      if (firstMessage && !result[path]) {
        result[path] = firstMessage;
      }
    }

    if (error.children && error.children.length > 0) {
      Object.assign(result, formatValidationErrors(error.children, path));
    }
  }

  return result;
}
