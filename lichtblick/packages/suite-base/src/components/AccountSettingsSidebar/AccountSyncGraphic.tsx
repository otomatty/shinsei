// SPDX-FileCopyrightText: Copyright (C) 2023-2025 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

/**
 * AccountSyncGraphicコンポーネントのProps型定義
 * @interface Props
 * @property {number} [width] - SVGの幅（オプショナル）
 */
type Props = {
  width?: number;
};

/**
 * アカウント同期を視覚的に表現するSVGグラフィックコンポーネント
 *
 * 機能概要:
 * - デバイス間でのデータ同期を象徴するグラフィック
 * - 2つのデバイス（左下と右上）とそれらを結ぶ同期線を表示
 * - 地球儀風の円形パターンで全体的な接続性を表現
 * - currentColorを使用してテーマカラーに対応
 *
 * 視覚的要素:
 * - 中央の地球儀風の円形グリッド
 * - 左下のデバイス（ノートパソコン風）
 * - 右上のデバイス（デスクトップ風）
 * - デバイス間を結ぶ同期曲線
 * - 装飾的な点群による接続性の表現
 *
 * @param props - コンポーネントのプロパティ
 * @returns アカウント同期グラフィックのSVG
 */
export default function AccountSyncGraphic(props: Props): React.JSX.Element {
  const { width } = props;

  return (
    <svg width={width} viewBox="0 0 256 256">
      {/* 地球儀風の同期パターン（ストローク描画） */}
      <g stroke="currentColor">
        {/* 左側の経度線 */}
        <path
          d="M122.63,54.19C103,70.22,90,97.21,90,128c0,22.77,7.08,43.54,18.73,59.3"
          fill="none"
          strokeLinecap="round"
          strokeWidth="4.5"
        />

        {/* 右側の経度線 */}
        <path
          d="M133.32,201.82C153,185.8,166,158.81,166,128c0-22.35-6.82-42.78-18.09-58.43"
          fill="none"
          strokeLinecap="round"
          strokeWidth="4.5"
        />

        {/* 下側の緯度線 */}
        <path
          d="M181,170.16a101.44,101.44,0,0,0-53-14.45,102.52,102.52,0,0,0-47.9,11.56"
          fill="none"
          strokeLinecap="round"
          strokeWidth="4.5"
        />

        {/* 上側の緯度線 */}
        <path
          d="M76,87.42a101.64,101.64,0,0,0,52,13.87,102.12,102.12,0,0,0,49.85-12.63"
          fill="none"
          strokeLinecap="round"
          strokeWidth="4.5"
        />

        {/* 中央の垂直軸 */}
        <path d="M128,54V202" fill="none" strokeWidth="4.5" />

        {/* 外側の軌道パス */}
        <path
          d="M192,165.16A74,74,0,0,0,93,62.78,40,40,0,0,1,62.78,93,74,74,0,0,0,164.44,192.4,40,40,0,0,1,192,165.16Z"
          fill="none"
          strokeWidth="4.5"
        />
      </g>

      {/* 接続性を表現する装飾的な点群（塗りつぶし） */}
      <g fill="currentColor">
        {/* 上部の点群 */}
        <circle cx="119.46" cy="30.37" r="3" />
        <circle cx="102.64" cy="33.34" r="3" />
        <circle cx="33.34" cy="102.64" r="3" />
        <circle cx="30.37" cy="119.46" r="3" />
        <circle cx="30.37" cy="136.54" r="3" />
        <circle cx="33.34" cy="153.36" r="3" />
        <circle cx="39.18" cy="169.42" r="3" />
        <circle cx="47.72" cy="184.21" r="3" />
        <circle cx="58.7" cy="197.3" r="3" />
        <circle cx="71.79" cy="208.28" r="3" />
        <circle cx="86.58" cy="216.82" r="3" />

        {/* 下部の点群 */}
        <circle cx="102.64" cy="222.66" r="3" />
        <circle cx="119.46" cy="225.63" r="3" />
        <circle cx="136.54" cy="225.63" r="3" />
        <circle cx="153.36" cy="222.66" r="3" />
        <circle cx="222.66" cy="153.36" r="3" />
        <circle cx="225.63" cy="136.54" r="3" />
        <circle cx="225.63" cy="119.46" r="3" />
        <circle cx="222.66" cy="102.64" r="3" />
        <circle cx="216.82" cy="86.58" r="3" />
        <circle cx="208.28" cy="71.79" r="3" />
        <circle cx="197.3" cy="58.7" r="3" />
        <circle cx="184.21" cy="47.72" r="3" />
        <circle cx="169.42" cy="39.18" r="3" />
        <circle cx="153.36" cy="33.34" r="3" />
        <circle cx="136.54" cy="30.37" r="3" />
      </g>

      {/* 左下のデバイス（ノートパソコン風） */}
      <g stroke="currentColor">
        {/* デバイス接続線 */}
        <path
          d="M28.89,85.13l7.72-12.2a8,8,0,0,1,6.51-3.35H64.88a8,8,0,0,1,6.51,3.35l7.72,12.2"
          fill="none"
          strokeWidth="4.5"
        />

        {/* デバイス本体（画面部分） */}
        <rect x="40" y="29.18" width="28" height="28" rx="7" fill="none" strokeWidth="4.5" />

        {/* デバイスの接続範囲 */}
        <circle cx="54" cy="54" r="40" fill="none" strokeWidth="4.5" />
      </g>

      {/* 右上のデバイス（デスクトップ風） */}
      <g stroke="currentColor">
        {/* デバイス接続線 */}
        <path
          d="M177.71,234.79l7.72-12.2a8,8,0,0,1,6.51-3.35H213.7a8,8,0,0,1,6.51,3.35l7.71,12.2"
          fill="none"
          strokeWidth="4.5"
        />

        {/* デバイス本体（画面部分） */}
        <rect x="188.82" y="178.84" width="28" height="28" rx="7" fill="none" strokeWidth="4.5" />

        {/* デバイスの接続範囲 */}
        <circle cx="202.82" cy="203.66" r="40" fill="none" strokeWidth="4.5" />
      </g>
    </svg>
  );
}
