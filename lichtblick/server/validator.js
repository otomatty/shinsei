// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

/**
 * Data validation functions for marketplace assets
 */

import { extensionSchema, extensionVersionSchema, layoutSchema } from "./schemas.js";

/**
 * Validation error class
 */
export class ValidationError {
  constructor(path, field, message) {
    this.path = path;
    this.field = field;
    this.message = message;
  }

  toString() {
    return `[${this.path}] ${this.field}: ${this.message}`;
  }
}

/**
 * Check if value matches expected type
 */
function checkType(value, expectedType) {
  if (expectedType.includes("|")) {
    const types = expectedType.split("|");
    return types.some((type) => {
      if (type === "null") {
        return value === null;
      }
      if (type === "array") {
        return Array.isArray(value);
      }
      return typeof value === type;
    });
  }

  if (expectedType === "array") {
    return Array.isArray(value);
  }

  if (expectedType === "null") {
    return value === null;
  }

  return typeof value === expectedType;
}

/**
 * Validate object against schema
 */
function validateObject(obj, schema, path = "root") {
  const errors = [];

  // Check required fields
  for (const [field, rules] of Object.entries(schema)) {
    if (rules.required && !(field in obj)) {
      errors.push(new ValidationError(path, field, `Required field is missing`));
      continue;
    }

    if (field in obj) {
      const value = obj[field];
      if (!checkType(value, rules.type)) {
        errors.push(
          new ValidationError(
            path,
            field,
            `Expected type "${rules.type}" but got "${Array.isArray(value) ? "array" : typeof value}"`,
          ),
        );
      }
    }
  }

  return errors;
}

/**
 * Validate extension data
 */
export function validateExtension(extension, index) {
  const errors = [];
  const path = `extensions[${index}]`;

  // Validate main extension object
  errors.push(...validateObject(extension, extensionSchema, path));

  // Validate versions object
  if (extension.versions && typeof extension.versions === "object") {
    const versionKeys = Object.keys(extension.versions);

    if (versionKeys.length === 0) {
      errors.push(
        new ValidationError(path, "versions", "Versions object must contain at least one version"),
      );
    }

    // Validate each version
    for (const [versionKey, versionData] of Object.entries(extension.versions)) {
      const versionPath = `${path}.versions.${versionKey}`;
      errors.push(...validateObject(versionData, extensionVersionSchema, versionPath));

      // Check if version key matches version value
      if (versionData.version && versionData.version !== versionKey) {
        errors.push(
          new ValidationError(
            versionPath,
            "version",
            `Version key "${versionKey}" does not match version value "${versionData.version}"`,
          ),
        );
      }
    }
  }

  return errors;
}

/**
 * Validate layout data
 */
export function validateLayout(layout, index) {
  const path = `layouts[${index}]`;
  return validateObject(layout, layoutSchema, path);
}

/**
 * Validate extensions array
 */
export function validateExtensions(extensions) {
  const errors = [];

  if (!Array.isArray(extensions)) {
    errors.push(new ValidationError("root", "extensions", "Extensions must be an array"));
    return errors;
  }

  const ids = new Set();
  extensions.forEach((extension, index) => {
    // Check for duplicate IDs
    if (extension.id) {
      if (ids.has(extension.id)) {
        errors.push(
          new ValidationError(
            `extensions[${index}]`,
            "id",
            `Duplicate extension ID: ${extension.id}`,
          ),
        );
      }
      ids.add(extension.id);
    }

    errors.push(...validateExtension(extension, index));
  });

  return errors;
}

/**
 * Validate layouts array
 */
export function validateLayouts(layouts) {
  const errors = [];

  if (!Array.isArray(layouts)) {
    errors.push(new ValidationError("root", "layouts", "Layouts must be an array"));
    return errors;
  }

  const ids = new Set();
  layouts.forEach((layout, index) => {
    // Check for duplicate IDs
    if (layout.id) {
      if (ids.has(layout.id)) {
        errors.push(
          new ValidationError(`layouts[${index}]`, "id", `Duplicate layout ID: ${layout.id}`),
        );
      }
      ids.add(layout.id);
    }

    errors.push(...validateLayout(layout, index));
  });

  return errors;
}
