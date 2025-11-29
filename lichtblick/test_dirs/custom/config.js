// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// Custom configuration file for internal use
module.exports = {
  api: {
    baseURL: "https://internal-api.company.com",
    timeout: 10000,
  },
  features: {
    enableCustomFeature: true,
    enableLogging: true,
    enableAnalytics: false,
  },
  ui: {
    theme: "dark",
    showAdvancedOptions: true,
  },
};
