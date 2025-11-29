// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

/**
 * Data validation schemas for marketplace assets
 */

/**
 * Extension version schema
 */
export const extensionVersionSchema = {
  version: { type: "string", required: true },
  publishedDate: { type: "string", required: true },
  sha256sum: { type: "string", required: true },
  foxe: { type: "string", required: true },
};

/**
 * Extension item schema
 * Note: displayName is obtained from the .foxe file's package.json
 * keywords can be provided from server as fallback or supplement
 */
export const extensionSchema = {
  id: { type: "string", required: true },
  name: { type: "string", required: true },
  publisher: { type: "string", required: true },
  description: { type: "string", required: true },
  homepage: { type: "string", required: false },
  license: { type: "string", required: false },
  keywords: { type: "array", required: false },
  thumbnail: { type: "string|null", required: false },
  namespace: { type: "string", required: true },
  readme: { type: "string", required: false },
  changelog: { type: "string", required: false },
  versions: { type: "object", required: true },
};

/**
 * Layout item schema
 */
export const layoutSchema = {
  id: { type: "string", required: true },
  name: { type: "string", required: true },
  publisher: { type: "string", required: true },
  description: { type: "string", required: true },
  keywords: { type: "array", required: false },
  thumbnail: { type: "string|null", required: false },
  layout: { type: "string", required: true },
};

/**
 * Schema definitions map
 */
export const schemas = {
  extension: extensionSchema,
  extensionVersion: extensionVersionSchema,
  layout: layoutSchema,
};
