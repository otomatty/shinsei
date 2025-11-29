// TextField Component
// MUI TextFieldのLeptos実装

use leptos::prelude::*;

#[derive(Clone, PartialEq)]
#[allow(dead_code)] // 将来使用予定のバリアント
pub enum TextFieldVariant {
    Outlined,
    Filled,
    Standard,
}

#[component]
pub fn TextField(
    #[prop(optional, into)] label: Option<String>,
    value: ReadSignal<String>,
    set_value: WriteSignal<String>,
    #[prop(optional)] variant: Option<TextFieldVariant>,
    #[prop(optional, into)] placeholder: Option<String>,
    #[prop(optional)] disabled: Option<bool>,
    #[prop(optional)] error: Option<bool>,
    #[prop(optional)] helper_text: Option<String>,
    #[prop(optional, into)] class: Option<String>,
) -> impl IntoView {
    let variant = variant.unwrap_or(TextFieldVariant::Outlined);
    let disabled = disabled.unwrap_or(false);
    let error = error.unwrap_or(false);

    // ベースクラス
    let mut base_classes = vec![
        "w-full".to_string(),
        "px-3".to_string(),
        "py-2".to_string(),
        "rounded-md".to_string(),
        "bg-background-default".to_string(),
        "text-text-primary".to_string(),
        "placeholder:text-text-secondary".to_string(),
        "transition-colors".to_string(),
        "focus:outline-none".to_string(),
        "focus:ring-2".to_string(),
        "disabled:opacity-50".to_string(),
        "disabled:cursor-not-allowed".to_string(),
    ];

    // バリアント別のクラス
    match variant {
        TextFieldVariant::Outlined => {
            base_classes.push("border".to_string());
            if error {
                base_classes.push("border-error-500".to_string());
                base_classes.push("focus:border-error-500".to_string());
                base_classes.push("focus:ring-error-500".to_string());
            } else {
                base_classes.push("border-grey-600".to_string());
                base_classes.push("focus:border-primary-500".to_string());
                base_classes.push("focus:ring-primary-500".to_string());
            }
        }
        TextFieldVariant::Filled => {
            base_classes.push("border-0".to_string());
            base_classes.push("bg-background-paper".to_string());
            if error {
                base_classes.push("focus:ring-error-500".to_string());
            } else {
                base_classes.push("focus:ring-primary-500".to_string());
            }
        }
        TextFieldVariant::Standard => {
            base_classes.push("border-0".to_string());
            base_classes.push("border-b-2".to_string());
            if error {
                base_classes.push("border-error-500".to_string());
                base_classes.push("focus:border-error-500".to_string());
                base_classes.push("focus:ring-error-500".to_string());
            } else {
                base_classes.push("border-grey-600".to_string());
                base_classes.push("focus:border-primary-500".to_string());
                base_classes.push("focus:ring-primary-500".to_string());
            }
        }
    }

    // カスタムクラスの追加
    if let Some(custom_class) = class.clone() {
        base_classes.push(custom_class);
    }

    let input_class = base_classes.join(" ");

    view! {
        <div class="flex flex-col gap-1">
            {label.map(|l| {
                view! {
                    <label class="text-sm font-medium text-text-primary">
                        {l}
                    </label>
                }
            })}
            <input
                type="text"
                class=input_class
                prop:value=value
                placeholder=placeholder
                disabled=disabled
                on:input=move |ev| {
                    set_value.set(event_target_value(&ev));
                }
            />
            {helper_text.map(|text| {
                let helper_class = if error {
                    "text-sm text-error-500"
                } else {
                    "text-sm text-text-secondary"
                };
                view! {
                    <span class=helper_class>
                        {text}
                    </span>
                }
            })}
        </div>
    }
}

