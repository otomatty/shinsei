use leptos::task::spawn_local;
use leptos::{ev::SubmitEvent, prelude::*};
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

use crate::components::{
    Button, ButtonVariant, ButtonColor, ButtonSize,
    TextField, TextFieldVariant,
    Select, SelectVariant, SelectOption,
    Checkbox,
    Switch, SwitchColor,
    Alert, AlertSeverity,
    Tooltip, TooltipPlacement,
    // Dialog, DialogTitle, DialogContent, DialogActions,
    Typography, TypographyVariant, TypographyColor,
};

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = ["window", "__TAURI__", "core"])]
    async fn invoke(cmd: &str, args: JsValue) -> JsValue;
}

#[derive(Serialize, Deserialize)]
struct GreetArgs<'a> {
    name: &'a str,
}

#[component]
pub fn App() -> impl IntoView {
    let (name, set_name) = signal(String::new());
    let (greet_msg, set_greet_msg) = signal(String::new());
    
    // 新しいコンポーネント用の状態
    let (select_value, set_select_value) = signal(Some("option1".to_string()));
    let (checkbox_checked, set_checkbox_checked) = signal(false);
    let (switch_checked, set_switch_checked) = signal(false);
    let (alert_open, set_alert_open) = signal(true);
    // let (dialog_open, set_dialog_open) = signal(false); // Dialogコンポーネントは一時的に無効化

    let update_name = move |ev| {
        let v = event_target_value(&ev);
        set_name.set(v);
    };

    let greet = move |ev: SubmitEvent| {
        ev.prevent_default();
        spawn_local(async move {
            let name = name.get_untracked();
            if name.is_empty() {
                return;
            }

            let args = serde_wasm_bindgen::to_value(&GreetArgs { name: &name }).unwrap();
            // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
            let new_msg = invoke("greet", args).await.as_string().unwrap();
            set_greet_msg.set(new_msg);
        });
    };

    view! {
        <main class="min-h-screen bg-gradient-to-br from-background-default to-background-paper p-8">
            <div class="max-w-4xl mx-auto">
                <h1 class="text-4xl font-bold text-text-primary mb-8 text-center">
                    "Welcome to Tauri + Leptos + Tailwind CSS"
                </h1>

                <div class="flex justify-center gap-8 mb-8">
                    <a 
                        href="https://tauri.app" 
                        target="_blank"
                        class="logo tauri transition-transform hover:scale-110"
                    >
                        <img src="public/tauri.svg" class="h-24 w-24" alt="Tauri logo"/>
                    </a>
                    <a 
                        href="https://docs.rs/leptos/" 
                        target="_blank"
                        class="logo leptos transition-transform hover:scale-110"
                    >
                        <img src="public/leptos.svg" class="h-24 w-24" alt="Leptos logo"/>
                </a>
            </div>

                <p class="text-center text-text-secondary mb-8">
                    "Click on the Tauri and Leptos logos to learn more."
                </p>

                <div class="bg-background-paper rounded-lg p-6 shadow-lg mb-6">
                    <form class="flex flex-col gap-4" on:submit=greet>
                        <div class="flex gap-2">
                <input
                    id="greet-input"
                    placeholder="Enter a name..."
                    on:input=update_name
                                class="flex-1 px-4 py-2 rounded-md border border-grey-600 bg-background-default text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                            <button 
                                type="submit"
                                class="px-6 py-2 bg-primary-500 text-white rounded-md font-medium hover:bg-primary-600 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-background-paper"
                            >
                                "Greet"
                            </button>
                        </div>
            </form>
                </div>

                <div class="bg-background-paper rounded-lg p-6 shadow-lg">
                    <p class="text-text-primary text-lg">
                        { move || {
                            let msg = greet_msg.get();
                            if msg.is_empty() {
                                "Enter a name above and click Greet to test Tauri commands.".to_string()
                            } else {
                                msg
                            }
                        }}
                    </p>
                </div>

                // UIコンポーネントデモセクション
                <div class="mt-8 space-y-8">
                    <div class="bg-background-paper rounded-lg p-6 shadow-lg">
                        <Typography variant=TypographyVariant::H4 color=TypographyColor::Primary class="mb-4">
                            "UI Components Demo"
                        </Typography>
                        
                        <div class="space-y-4">
                            <div>
                                <Typography variant=TypographyVariant::Subtitle1 class="mb-2">
                                    "Button Variants"
                                </Typography>
                                <div class="flex flex-wrap gap-2">
                                    <Button variant=ButtonVariant::Contained color=ButtonColor::Primary>
                                        "Contained Primary"
                                    </Button>
                                    <Button variant=ButtonVariant::Outlined color=ButtonColor::Primary>
                                        "Outlined Primary"
                                    </Button>
                                    <Button variant=ButtonVariant::Text color=ButtonColor::Primary>
                                        "Text Primary"
                                    </Button>
                                    <Button variant=ButtonVariant::Contained color=ButtonColor::Success>
                                        "Success"
                                    </Button>
                                    <Button variant=ButtonVariant::Contained color=ButtonColor::Warning>
                                        "Warning"
                                    </Button>
                                    <Button variant=ButtonVariant::Contained color=ButtonColor::Error>
                                        "Error"
                                    </Button>
                                </div>
                            </div>

                            <div>
                                <Typography variant=TypographyVariant::Subtitle1 class="mb-2">
                                    "Button Sizes"
                                </Typography>
                                <div class="flex flex-wrap items-center gap-2">
                                    <Button size=ButtonSize::Small> "Small" </Button>
                                    <Button size=ButtonSize::Medium> "Medium" </Button>
                                    <Button size=ButtonSize::Large> "Large" </Button>
                                </div>
                            </div>

                            <div>
                                <Typography variant=TypographyVariant::Subtitle1 class="mb-2">
                                    "TextField"
                                </Typography>
                                <div class="space-y-2">
                                    <TextField
                                        label="Outlined TextField"
                                        value=name
                                        set_value=set_name
                                        variant=TextFieldVariant::Outlined
                                        placeholder="Enter text..."
                                    />
                                </div>
                            </div>

                            <div>
                                <Typography variant=TypographyVariant::Subtitle1 class="mb-2">
                                    "Select"
                                </Typography>
                                <div class="space-y-2">
                                    <Select
                                        value=select_value
                                        set_value=set_select_value
                                        label="Select Option"
                                    >
                                        <SelectOption value="option1".to_string()>"Option 1"</SelectOption>
                                        <SelectOption value="option2".to_string()>"Option 2"</SelectOption>
                                        <SelectOption value="option3".to_string()>"Option 3"</SelectOption>
                                    </Select>
                                </div>
                            </div>

                            <div>
                                <Typography variant=TypographyVariant::Subtitle1 class="mb-2">
                                    "Checkbox & Switch"
                                </Typography>
                                <div class="space-y-2">
                                    <Checkbox
                                        checked=checkbox_checked
                                        set_checked=set_checkbox_checked
                                        label="Checkbox Label"
                                    />
                                    <Switch
                                        checked=switch_checked
                                        set_checked=set_switch_checked
                                        label="Switch Label"
                                        color=SwitchColor::Primary
                                    />
                                </div>
                            </div>

                            <div>
                                <Typography variant=TypographyVariant::Subtitle1 class="mb-2">
                                    "Alert"
                                </Typography>
                                <div class="space-y-2">
                                    <Show when=move || alert_open.get()>
                                        <Alert
                                            severity=AlertSeverity::Success
                                            title="Success"
                                        >
                                            "This is a success alert message."
                                        </Alert>
                                    </Show>
                                    <Alert severity=AlertSeverity::Error title="Error">
                                        "This is an error alert message."
                                    </Alert>
                                    <Alert severity=AlertSeverity::Warning title="Warning">
                                        "This is a warning alert message."
                                    </Alert>
                                    <Alert severity=AlertSeverity::Info title="Info">
                                        "This is an info alert message."
                                    </Alert>
                                </div>
                            </div>

                            <div>
                                <Typography variant=TypographyVariant::Subtitle1 class="mb-2">
                                    "Tooltip"
                                </Typography>
                                <div class="space-y-2">
                                    <Tooltip title="This is a tooltip">
                                        <Button>
                                            "Hover me"
                                        </Button>
                                    </Tooltip>
                                </div>
                            </div>

                            // Dialogコンポーネントは一時的に無効化
                            // <div>
                            //     <Typography variant=TypographyVariant::Subtitle1 class="mb-2">
                            //         "Dialog"
                            //     </Typography>
                            //     ...
                            // </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    }
}
