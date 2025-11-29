// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { Meta, StoryObj } from "@storybook/react";

import TextContent from "@lichtblick/suite-base/components/TextContent";

export default {
  title: "components/TextContent",
  component: TextContent,
  parameters: {
    colorScheme: "both-column",
  },
} as Meta<typeof TextContent>;

type Story = StoryObj<typeof TextContent>;

const markdownWithImages = `
# Markdown with Images

## Valid Image

Here's a valid image from a public source:

![Valid Image](https://via.placeholder.com/400x200.png?text=Valid+Image)

## Invalid Image

This image will fail to load and show the NoImage placeholder:

![Broken Image](https://invalid-url-that-does-not-exist.com/image.png)

## Multiple Images

![Image 1](https://via.placeholder.com/300x150.png?text=Image+1)
![Broken Image 2](https://broken-url.com/image2.png)
![Image 3](https://via.placeholder.com/300x150.png?text=Image+3)

## Mixed Content

Some text before the image.

![Another Broken Image](https://another-invalid-url.com/test.jpg)

And some text after the image.
`;

const complexMarkdown = `
# Complete Markdown Example

## Headings and Text

This document demonstrates all markdown features including **bold text**, *italic text*, and \`inline code\`.

## Lists

- Item 1
- Item 2
  - Nested item
  - Another nested item
- Item 3

## Code Block

\`\`\`typescript
function example() {
  console.log("Hello, world!");
}
\`\`\`

## Images

### Valid Image
![Placeholder Image](https://via.placeholder.com/600x300.png?text=Valid+Placeholder)

### Invalid Image (shows NoImage component)
![Broken Image](https://this-url-does-not-exist.example.com/image.png)

## Blockquote

> This is a blockquote with some important information.
> It can span multiple lines.

## Table

| Feature | Status |
|---------|--------|
| Images  | ✓      |
| Tables  | ✓      |
| Code    | ✓      |

## Links

Visit [our website](https://lichtblick.org) for more information.
`;

export const WithValidAndInvalidImages: Story = {
  render: () => <TextContent>{markdownWithImages}</TextContent>,
};

export const CompleteExample: Story = {
  render: () => <TextContent>{complexMarkdown}</TextContent>,
};

export const OnlyInvalidImage: Story = {
  render: () => (
    <TextContent>
      {`# Image Error Handling\n\nThis image will fail to load:\n\n![Failed to load](https://non-existent-domain-12345.com/image.png)`}
    </TextContent>
  ),
};

export const MultipleInvalidImages: Story = {
  render: () => (
    <TextContent>
      {`# Multiple Failed Images\n\n![Image 1](https://broken1.com/1.png)\n\n![Image 2](https://broken2.com/2.png)\n\n![Image 3](https://broken3.com/3.png)`}
    </TextContent>
  ),
};

export const ImageWithLongAltText: Story = {
  render: () => (
    <TextContent>
      {`# Image with Long Alt Text\n\n![This is a very long alternative text that describes a complex diagram showing the architecture of a distributed system with multiple microservices, load balancers, and databases. The diagram illustrates how data flows through the system and how different components interact with each other.](https://invalid-url.com/diagram.png)`}
    </TextContent>
  ),
};
