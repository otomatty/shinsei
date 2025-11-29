// Typography Component
// MUI TypographyのLeptos実装

use leptos::prelude::*;

#[derive(Clone, PartialEq)]
#[allow(dead_code)] // 将来使用予定のバリアント
pub enum TypographyVariant {
    H1,
    H2,
    H3,
    H4,
    H5,
    H6,
    Subtitle1,
    Subtitle2,
    Body1,
    Body2,
    Caption,
    Overline,
}

#[derive(Clone, PartialEq)]
#[allow(dead_code)] // 将来使用予定のバリアント
pub enum TypographyColor {
    Primary,
    Secondary,
    Error,
    Warning,
    Success,
    Info,
    Inherit,
}

#[component]
pub fn Typography(
    children: Children,
    #[prop(optional)] variant: Option<TypographyVariant>,
    #[prop(optional)] color: Option<TypographyColor>,
    #[prop(optional, into)] class: Option<String>,
) -> impl IntoView {
    let variant = variant.unwrap_or(TypographyVariant::Body1);
    let color = color.unwrap_or(TypographyColor::Inherit);

    // バリアント別のクラス
    let variant_class = match variant {
        TypographyVariant::H1 => "text-4xl font-bold",
        TypographyVariant::H2 => "text-3xl font-bold",
        TypographyVariant::H3 => "text-2xl font-semibold",
        TypographyVariant::H4 => "text-xl font-semibold",
        TypographyVariant::H5 => "text-lg font-medium",
        TypographyVariant::H6 => "text-base font-medium",
        TypographyVariant::Subtitle1 => "text-base font-medium",
        TypographyVariant::Subtitle2 => "text-sm font-medium",
        TypographyVariant::Body1 => "text-base",
        TypographyVariant::Body2 => "text-sm",
        TypographyVariant::Caption => "text-xs",
        TypographyVariant::Overline => "text-xs uppercase tracking-wider",
    };

    // カラー別のクラス
    let color_class = match color {
        TypographyColor::Primary => "text-primary-500",
        TypographyColor::Secondary => "text-text-secondary",
        TypographyColor::Error => "text-error-500",
        TypographyColor::Warning => "text-warning-500",
        TypographyColor::Success => "text-success-500",
        TypographyColor::Info => "text-info-500",
        TypographyColor::Inherit => "text-text-primary",
    };

    let class_string = format!(
        "{} {} {}",
        variant_class,
        color_class,
        class.unwrap_or_default()
    );

    // Leptosでは動的タグが難しいため、pタグで統一
    view! {
        <p class=class_string>
            {children()}
        </p>
    }
}

// より簡単な実装（直接タグを使用）
// 現在未使用だが、将来の拡張用に保持
#[allow(dead_code)]
#[component]
pub fn TypographySimple(
    children: Children,
    #[prop(optional)] variant: Option<TypographyVariant>,
    #[prop(optional)] color: Option<TypographyColor>,
    #[prop(optional)] class: Option<String>,
) -> impl IntoView {
    let variant = variant.unwrap_or(TypographyVariant::Body1);
    let color = color.unwrap_or(TypographyColor::Inherit);

    let variant_class = match variant {
        TypographyVariant::H1 => "text-4xl font-bold",
        TypographyVariant::H2 => "text-3xl font-bold",
        TypographyVariant::H3 => "text-2xl font-semibold",
        TypographyVariant::H4 => "text-xl font-semibold",
        TypographyVariant::H5 => "text-lg font-medium",
        TypographyVariant::H6 => "text-base font-medium",
        TypographyVariant::Subtitle1 => "text-base font-medium",
        TypographyVariant::Subtitle2 => "text-sm font-medium",
        TypographyVariant::Body1 => "text-base",
        TypographyVariant::Body2 => "text-sm",
        TypographyVariant::Caption => "text-xs",
        TypographyVariant::Overline => "text-xs uppercase tracking-wider",
    };

    let color_class = match color {
        TypographyColor::Primary => "text-primary-500",
        TypographyColor::Secondary => "text-text-secondary",
        TypographyColor::Error => "text-error-500",
        TypographyColor::Warning => "text-warning-500",
        TypographyColor::Success => "text-success-500",
        TypographyColor::Info => "text-info-500",
        TypographyColor::Inherit => "text-text-primary",
    };

    let class_string = format!(
        "{} {} {}",
        variant_class,
        color_class,
        class.unwrap_or_default()
    );

    view! {
        <p class=class_string>
            {children()}
        </p>
    }
}

