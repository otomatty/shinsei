// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

export type MainParams = Record<string, never>;

export async function main(
  _getParams: () => Promise<MainParams> = async () => ({}),
): Promise<void> {
  // アプリ初期化: 互換性チェックとメインコンテンツのレンダリングを行います
}
