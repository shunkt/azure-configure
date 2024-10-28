// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod azure;
use azure::{
    account::Subscription,
    auth::Auth,
    webapp::{read_config_file, AppserviceEnvVar, Webapp},
};
use log::trace;
use serde::{Deserialize, Serialize};
use std::{collections::HashMap, env};
use tauri::{AppHandle, Manager, State};
use tauri_plugin_log::{Target, TargetKind};
use tokio::sync::Mutex;

// create the error type that represents all errors possible in our program
#[derive(Debug, thiserror::Error)]
enum Error {
    #[error(transparent)]
    Io(#[from] anyhow::Error),
}

// we must manually implement serde::Serialize
impl serde::Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::ser::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}

#[derive(Serialize, Deserialize, PartialEq, Eq, Debug, Clone)]
#[serde(rename_all = "camelCase")]
struct Env {
    name: String,
    value: Option<String>,
    is_expected: bool,
}

impl Ord for Env {
    fn cmp(&self, other: &Self) -> std::cmp::Ordering {
        self.name.cmp(&other.name)
    }
}
impl PartialOrd for Env {
    fn partial_cmp(&self, other: &Self) -> Option<std::cmp::Ordering> {
        Some(self.cmp(other))
    }
}
impl Env {
    fn new(name: String, value: Option<String>, is_expected: bool) -> Self {
        Self {
            name,
            value,
            is_expected,
        }
    }
}

#[tauri::command]
async fn list_subscriptions<'a>(state: State<'a, Mutex<Auth>>) -> Result<Vec<Subscription>, Error> {
    let mut state = state.lock().await;
    let result = Subscription::list(&state.get_valid_bearer()?).await?;
    trace!("call list_subscription: {:#?}", result);
    Ok(result)
}

#[tauri::command]
async fn list_webapps<'a>(
    state: State<'a, Mutex<Auth>>,
    subscription: &'a str,
) -> Result<Vec<Webapp>, Error> {
    let mut state = state.lock().await;
    let result = Webapp::list(&state.get_valid_bearer()?, subscription).await?;
    trace!("call list_webapps: {:#?}", result);
    Ok(result)
}

#[tauri::command]
async fn get_appservice_envs<'a>(
    app: AppHandle,
    state: State<'a, Mutex<Auth>>,
    webapp: Webapp,
) -> Result<Vec<Env>, Error> {
    trace!(
        "call get_service_envs; subscription: {:?}, resource_group: {}, name: {}",
        webapp.subscription,
        webapp.resource_group,
        webapp.name
    );
    let mut ret = HashMap::<String, Env>::new();
    let mut config_file = app.path().app_data_dir().unwrap();
    config_file.push("default.json");
    let default_config = read_config_file(&config_file);
    if let Ok(vs) = default_config {
        for v in vs.iter() {
            ret.insert(v.name.clone(), Env::new(v.name.clone(), None, true));
        }
    }

    let mut state = state.lock().await;
    let config = webapp.list_config(&state.get_valid_bearer()?).await?;
    for v in config.iter() {
        if let Some(_) = ret.get(&v.name) {
            ret.insert(
                v.name.clone(),
                Env::new(v.name.clone(), Some(v.value.clone()), true),
            );
        } else {
            ret.insert(
                v.name.clone(),
                Env::new(v.name.clone(), Some(v.value.clone()), false),
            );
        }
    }
    let mut ret_vec = Vec::<Env>::new();
    for (_, value) in ret.into_iter() {
        ret_vec.push(value);
    }
    ret_vec.sort();
    Ok(ret_vec)
}

#[tauri::command]
async fn replace_appservice_envs<'a>(
    state: State<'a, Mutex<Auth>>,
    webapp: Webapp,
    envs: Vec<Env>,
) -> Result<(), Error> {
    trace!("call replace_appservice_env");

    let mut state = state.lock().await;
    webapp
        .update_config(
            &state.get_valid_bearer()?,
            &envs
                .iter()
                .filter(|env| env.value.is_some())
                .map(|env| AppserviceEnvVar {
                    name: env.name.clone(),
                    value: if let Some(v) = &env.value {
                        v.to_string()
                    } else {
                        "".to_string()
                    },
                })
                .collect::<Vec<AppserviceEnvVar>>(),
        )
        .await?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let _ = fix_path_env::fix();
    let auth = Auth::get_access_token().ok().unwrap_or(Auth::default());
    env::set_var("RUST_LOG", "info");
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(Mutex::new(auth))
        .plugin(
            tauri_plugin_log::Builder::default()
                .targets([
                    Target::new(TargetKind::LogDir {
                        file_name: Some("access.log".to_string()),
                    }),
                    Target::new(TargetKind::Stdout),
                    Target::new(TargetKind::Webview),
                ])
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            list_subscriptions,
            list_webapps,
            get_appservice_envs,
            replace_appservice_envs,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
