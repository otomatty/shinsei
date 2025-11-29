// Button Component
// MUI ButtonのLeptos実装

use leptos::prelude::*;

#[derive(Clone, PartialEq)]
pub enum ButtonVariant {
    Contained,
    Outlined,
    Text,
}

#[derive(Clone, PartialEq)]
#[allow(dead_code)] // 将来使用予定のバリアント
pub enum ButtonColor {
    Primary,
    Secondary,
    Success,
    Warning,
    Error,
    Info,
    Inherit,
}

#[derive(Clone, PartialEq)]
pub enum ButtonSize {
    Small,
    Medium,
    Large,
}

#[component]
pub fn Button(
    children: Children,
    #[prop(optional)] variant: Option<ButtonVariant>,
    #[prop(optional)] color: Option<ButtonColor>,
    #[prop(optional)] size: Option<ButtonSize>,
    #[prop(optional)] disabled: Option<bool>,
    #[prop(optional)] full_width: Option<bool>,
    #[prop(optional)] on_click: Option<Callback<()>>,
    #[prop(optional, into)] class: Option<String>,
) -> impl IntoView {
    let variant = variant.unwrap_or(ButtonVariant::Contained);
    let color = color.unwrap_or(ButtonColor::Primary);
    let size = size.unwrap_or(ButtonSize::Medium);
    let disabled = disabled.unwrap_or(false);
    let full_width = full_width.unwrap_or(false);

    // ベースクラス
    let mut base_classes = vec![
        "inline-flex".to_string(),
        "items-center".to_string(),
        "justify-center".to_string(),
        "font-medium".to_string(),
        "rounded-md".to_string(),
        "transition-colors".to_string(),
        "focus:outline-none".to_string(),
        "focus:ring-2".to_string(),
        "focus:ring-offset-2".to_string(),
        "disabled:opacity-50".to_string(),
        "disabled:cursor-not-allowed".to_string(),
    ];

    // サイズクラス
    match size {
        ButtonSize::Small => {
            base_classes.push("px-3".to_string());
            base_classes.push("py-1.5".to_string());
            base_classes.push("text-sm".to_string());
        }
        ButtonSize::Medium => {
            base_classes.push("px-4".to_string());
            base_classes.push("py-2".to_string());
            base_classes.push("text-base".to_string());
        }
        ButtonSize::Large => {
            base_classes.push("px-6".to_string());
            base_classes.push("py-3".to_string());
            base_classes.push("text-lg".to_string());
        }
    }

    // 幅クラス
    if full_width {
        base_classes.push("w-full".to_string());
    }

    // バリアントとカラーの組み合わせ
    let variant_color_classes = match (&variant, &color) {
        (ButtonVariant::Contained, ButtonColor::Primary) => {
            "bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-500".to_string()
        }
        (ButtonVariant::Contained, ButtonColor::Secondary) => {
            "bg-secondary-DEFAULT text-white hover:bg-secondary-DEFAULT/90 focus:ring-secondary-DEFAULT".to_string()
        }
        (ButtonVariant::Contained, ButtonColor::Success) => {
            "bg-success-500 text-white hover:bg-success-600 focus:ring-success-500".to_string()
        }
        (ButtonVariant::Contained, ButtonColor::Warning) => {
            "bg-warning-500 text-white hover:bg-warning-600 focus:ring-warning-500".to_string()
        }
        (ButtonVariant::Contained, ButtonColor::Error) => {
            "bg-error-500 text-white hover:bg-error-600 focus:ring-error-500".to_string()
        }
        (ButtonVariant::Contained, ButtonColor::Info) => {
            "bg-info-500 text-white hover:bg-info-600 focus:ring-info-500".to_string()
        }
        (ButtonVariant::Contained, ButtonColor::Inherit) => {
            "bg-background-paper text-text-primary hover:bg-background-menu focus:ring-primary-500".to_string()
        }
        (ButtonVariant::Outlined, ButtonColor::Primary) => {
            "border-2 border-primary-500 text-primary-500 bg-transparent hover:bg-primary-500/10 focus:ring-primary-500".to_string()
        }
        (ButtonVariant::Outlined, ButtonColor::Secondary) => {
            "border-2 border-secondary-DEFAULT text-secondary-DEFAULT bg-transparent hover:bg-secondary-DEFAULT/10 focus:ring-secondary-DEFAULT".to_string()
        }
        (ButtonVariant::Outlined, ButtonColor::Success) => {
            "border-2 border-success-500 text-success-500 bg-transparent hover:bg-success-500/10 focus:ring-success-500".to_string()
        }
        (ButtonVariant::Outlined, ButtonColor::Warning) => {
            "border-2 border-warning-500 text-warning-500 bg-transparent hover:bg-warning-500/10 focus:ring-warning-500".to_string()
        }
        (ButtonVariant::Outlined, ButtonColor::Error) => {
            "border-2 border-error-500 text-error-500 bg-transparent hover:bg-error-500/10 focus:ring-error-500".to_string()
        }
        (ButtonVariant::Outlined, ButtonColor::Info) => {
            "border-2 border-info-500 text-info-500 bg-transparent hover:bg-info-500/10 focus:ring-info-500".to_string()
        }
        (ButtonVariant::Outlined, ButtonColor::Inherit) => {
            "border-2 border-grey-600 text-text-primary bg-transparent hover:bg-background-menu focus:ring-primary-500".to_string()
        }
        (ButtonVariant::Text, ButtonColor::Primary) => {
            "text-primary-500 bg-transparent hover:bg-primary-500/10 focus:ring-primary-500".to_string()
        }
        (ButtonVariant::Text, ButtonColor::Secondary) => {
            "text-secondary-DEFAULT bg-transparent hover:bg-secondary-DEFAULT/10 focus:ring-secondary-DEFAULT".to_string()
        }
        (ButtonVariant::Text, ButtonColor::Success) => {
            "text-success-500 bg-transparent hover:bg-success-500/10 focus:ring-success-500".to_string()
        }
        (ButtonVariant::Text, ButtonColor::Warning) => {
            "text-warning-500 bg-transparent hover:bg-warning-500/10 focus:ring-warning-500".to_string()
        }
        (ButtonVariant::Text, ButtonColor::Error) => {
            "text-error-500 bg-transparent hover:bg-error-500/10 focus:ring-error-500".to_string()
        }
        (ButtonVariant::Text, ButtonColor::Info) => {
            "text-info-500 bg-transparent hover:bg-info-500/10 focus:ring-info-500".to_string()
        }
        (ButtonVariant::Text, ButtonColor::Inherit) => {
            "text-text-primary bg-transparent hover:bg-background-menu focus:ring-primary-500".to_string()
        }
    };

    base_classes.push(variant_color_classes);

    // カスタムクラスの追加
    if let Some(custom_class) = class {
        base_classes.push(custom_class);
    }

    let class_string = base_classes.join(" ");

    view! {
        <button
            type="button"
            class=class_string
            disabled=disabled
            // クリックハンドラーは後で実装
        >
            {children()}
        </button>
    }
}

