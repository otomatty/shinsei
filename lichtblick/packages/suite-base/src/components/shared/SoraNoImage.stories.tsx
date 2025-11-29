// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { Meta, StoryObj } from "@storybook/react";

import NoImage from "@lichtblick/suite-base/components/shared/SoraNoImage";

export default {
  title: "components/NoImage",
  component: NoImage,
  parameters: {
    colorScheme: "both-column",
  },
} as Meta<typeof NoImage>;

type Story = StoryObj<typeof NoImage>;

export const Default: Story = {
  args: {},
};

export const WithAltText: Story = {
  args: {
    alt: "Screenshot of the application interface",
    showAltText: true,
  },
};

export const WithLongAltText: Story = {
  args: {
    alt: "This is a very long alternative text that describes the image in detail. The image shows a complex visualization with multiple data points and interactive elements.",
    showAltText: true,
  },
};

export const WithoutAltText: Story = {
  args: {
    showAltText: false,
  },
};

export const InContainer: Story = {
  render: () => (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "20px" }}>
      <h2>Example Document</h2>
      <p>This is an example of how the NoImage component appears within a document:</p>
      <NoImage alt="Example diagram" showAltText={true} />
      <p>The image placeholder maintains the document flow and provides clear feedback to users.</p>
    </div>
  ),
};
