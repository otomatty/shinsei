#!/usr/bin/env node
// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

/**
 * CLI tool for validating marketplace data
 *
 * Usage:
 *   node validate.js                    # Validate all files
 *   node validate.js extensions         # Validate extensions only
 *   node validate.js layouts            # Validate layouts only
 *   node validate.js --help             # Show help
 */

import { readFile } from "fs/promises";
import { join } from "path";
import { fileURLToPath } from "url";
import { validateExtensions, validateLayouts } from "./validator.js";

const currentDir = fileURLToPath(new URL(".", import.meta.url));
const EXTENSIONS_FILE = join(currentDir, "assets/extensions/extensions.json");
const LAYOUTS_FILE = join(currentDir, "assets/layouts/layouts.json");

// ANSI color codes
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
};

/**
 * Print colored message
 */
function print(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Print help message
 */
function printHelp() {
  print("\n📋 Marketplace Data Validator", "bold");
  print("================================\n");
  print("Usage:", "cyan");
  print("  npm run validate              # Validate all files");
  print("  npm run validate extensions   # Validate extensions only");
  print("  npm run validate layouts      # Validate layouts only");
  print("  npm run validate -- --help    # Show this help\n");
  print("Options:", "cyan");
  print("  --help, -h                    # Show help message\n");
}

/**
 * Load and parse JSON file
 */
async function loadJsonFile(filePath, name) {
  try {
    const content = await readFile(filePath, "utf-8");
    const data = JSON.parse(content);
    print(`✓ Loaded ${name} (${filePath})`, "green");
    return data;
  } catch (error) {
    print(`✗ Failed to load ${name}:`, "red");
    if (error.code === "ENOENT") {
      print(`  File not found: ${filePath}`, "red");
    } else if (error instanceof SyntaxError) {
      print(`  Invalid JSON: ${error.message}`, "red");
    } else {
      print(`  ${error.message}`, "red");
    }
    return null;
  }
}

/**
 * Print validation results
 */
function printValidationResults(name, errors) {
  if (errors.length === 0) {
    print(`\n✓ ${name} validation passed!`, "green");
    return true;
  }

  print(`\n✗ ${name} validation failed with ${errors.length} error(s):`, "red");
  errors.forEach((error) => {
    print(`  • ${error.toString()}`, "yellow");
  });
  return false;
}

/**
 * Validate extensions
 */
async function validateExtensionsFile() {
  print("\n🔍 Validating Extensions...", "blue");

  const data = await loadJsonFile(EXTENSIONS_FILE, "extensions.json");
  if (!data) {
    return false;
  }

  print(`Found ${data.length} extension(s)`, "cyan");

  const errors = validateExtensions(data);
  return printValidationResults("Extensions", errors);
}

/**
 * Validate layouts
 */
async function validateLayoutsFile() {
  print("\n🔍 Validating Layouts...", "blue");

  const data = await loadJsonFile(LAYOUTS_FILE, "layouts.json");
  if (!data) {
    return false;
  }

  print(`Found ${data.length} layout(s)`, "cyan");

  const errors = validateLayouts(data);
  return printValidationResults("Layouts", errors);
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);

  // Show help
  if (args.includes("--help") || args.includes("-h")) {
    printHelp();
    process.exit(0);
  }

  const target = args[0];

  print("\n" + "=".repeat(50), "bold");
  print("  Marketplace Data Validator", "bold");
  print("=".repeat(50) + "\n", "bold");

  let success = true;

  try {
    if (!target || target === "all") {
      // Validate all files
      const extensionsOk = await validateExtensionsFile();
      const layoutsOk = await validateLayoutsFile();
      success = extensionsOk && layoutsOk;
    } else if (target === "extensions") {
      // Validate extensions only
      success = await validateExtensionsFile();
    } else if (target === "layouts") {
      // Validate layouts only
      success = await validateLayoutsFile();
    } else {
      print(`Unknown target: ${target}`, "red");
      print('Use "extensions", "layouts", or omit for all', "yellow");
      success = false;
    }

    // Print summary
    print("\n" + "=".repeat(50), "bold");
    if (success) {
      print("  ✓ All validations passed!", "green");
    } else {
      print("  ✗ Validation failed", "red");
    }
    print("=".repeat(50) + "\n", "bold");

    process.exit(success ? 0 : 1);
  } catch (error) {
    print(`\n✗ Unexpected error: ${error.message}`, "red");
    console.error(error);
    process.exit(1);
  }
}

// Run main function
main();
