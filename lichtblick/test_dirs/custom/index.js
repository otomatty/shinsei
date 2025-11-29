// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

const axios = require("axios");
const _ = require("lodash");
const React = require("react");

console.log("Hello from CUSTOM version!");

function processData(data) {
  return _.map(data, (item) => ({
    ...item,
    processed: true,
    timestamp: Date.now(),
  }));
}

async function fetchData(url) {
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error("Error fetching data:", error);
    return null;
  }
}

module.exports = { processData, fetchData };
