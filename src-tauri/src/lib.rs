mod audio;
mod commands;
mod db;
mod error;
mod library;
mod lyrics;
mod metadata;
mod model;
mod state;
mod watcher;
mod webdav;

use state::AppState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info")).init();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let state = AppState::initialize(app.handle().clone())?;
            app.manage(state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::list_tracks,
            commands::add_local_folder,
            commands::add_remote_track,
            commands::remove_folder,
            commands::list_folders,
            commands::rescan_library,
            commands::list_remote_sources,
            commands::add_webdav_source,
            commands::remove_remote_source,
            commands::sync_remote_source,
            commands::sync_all_remote_sources,
            commands::play_track,
            commands::play_pause,
            commands::resume,
            commands::pause,
            commands::stop_playback,
            commands::next_track,
            commands::previous_track,
            commands::seek,
            commands::set_volume,
            commands::get_player_state,
            commands::get_queue,
            commands::set_queue,
            commands::add_to_queue,
            commands::clear_queue,
            commands::get_history,
            commands::clear_history,
            commands::update_track_metadata,
            commands::get_cover_art,
            commands::get_lyrics,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
