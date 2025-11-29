// Tooltip Component
// MUI TooltipのLeptos実装

use leptos::prelude::*;

#[derive(Clone, PartialEq)]
#[allow(dead_code)] // 将来使用予定のバリアント
pub enum TooltipPlacement {
    Top,
    Bottom,
    Left,
    Right,
}

#[component]
pub fn Tooltip(
    children: Children,
    #[prop(into)] title: String,
    #[prop(optional)] placement: Option<TooltipPlacement>,
    #[prop(optional, into)] class: Option<String>,
) -> impl IntoView {
    let placement = placement.unwrap_or(TooltipPlacement::Top);
    let (show_tooltip, set_show_tooltip) = signal(false);

    // 配置別のクラス
    let placement_class = match placement {
        TooltipPlacement::Top => "bottom-full left-1/2 -translate-x-1/2 mb-2",
        TooltipPlacement::Bottom => "top-full left-1/2 -translate-x-1/2 mt-2",
        TooltipPlacement::Left => "right-full top-1/2 -translate-y-1/2 mr-2",
        TooltipPlacement::Right => "left-full top-1/2 -translate-y-1/2 ml-2",
    };

    let tooltip_class = format!(
        "absolute z-50 px-2 py-1 text-xs text-white bg-grey-900 rounded shadow-lg whitespace-nowrap pointer-events-none transition-opacity {} {}",
        placement_class,
        if show_tooltip.get() { "opacity-100" } else { "opacity-0" }
    );

    view! {
        <div
            class=format!("relative inline-block {}", class.unwrap_or_default())
            on:mouseenter=move |_| set_show_tooltip.set(true)
            on:mouseleave=move |_| set_show_tooltip.set(false)
        >
            {children()}
            <div class=tooltip_class>
                {title}
            </div>
        </div>
    }
}

