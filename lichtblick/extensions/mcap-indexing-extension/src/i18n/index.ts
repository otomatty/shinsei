/**
 * @fileoverview 国際化システム
 * MCAP Indexing Tool 拡張機能の多言語対応
 */

// 英語（デフォルト）
import * as en from "./en";
import * as ja from "./ja";

/**
 * サポートされている言語
 */
export type SupportedLanguage = "en" | "ja";

/**
 * 翻訳リソース
 */
export const translations = {
  en,
  ja,
} as const;

/**
 * 翻訳キー（英語版から自動生成）
 */
export type TranslationKeys = typeof en;

/**
 * デフォルト言語
 */
export const DEFAULT_LANGUAGE: SupportedLanguage = "en";

/**
 * ブラウザ言語の検出と適切な言語の選択
 */
export function detectLanguage(): SupportedLanguage {
  // Lichtblick の言語設定を優先
  if (typeof window !== "undefined") {
    try {
      // LocalStorage から Lichtblick の言語設定を取得
      const lichtblickLang = localStorage.getItem("i18nextLng");
      if (lichtblickLang && isValidLanguage(lichtblickLang)) {
        return lichtblickLang as SupportedLanguage;
      }
    } catch {
      // LocalStorage アクセスエラーは無視
    }
  }

  // ブラウザ言語をフォールバック
  const browserLang = typeof navigator !== "undefined" ? navigator.language : DEFAULT_LANGUAGE;
  const langCode = browserLang.split("-")[0] as SupportedLanguage;

  return isValidLanguage(langCode) ? langCode : DEFAULT_LANGUAGE;
}

/**
 * 有効な言語コードかチェック
 */
function isValidLanguage(lang: string): lang is SupportedLanguage {
  return lang === "en" || lang === "ja";
}

/**
 * 翻訳の取得
 */
export function getTranslation(language: SupportedLanguage = detectLanguage()) {
  return translations[language];
}
