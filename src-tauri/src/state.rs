use std::path::PathBuf;
use std::sync::Arc;

use tauri::{AppHandle, Manager};

use crate::audio::AudioEngine;
use crate::db::Db;
use crate::error::AppResult;
use crate::watcher::LibraryWatcher;

pub struct AppState {
    pub db: Arc<Db>,
    pub audio: Arc<AudioEngine>,
    pub watcher: Arc<LibraryWatcher>,
    pub covers_dir: PathBuf,
    #[allow(dead_code)]
    pub app: AppHandle,
}

impl AppState {
    pub fn initialize(app: AppHandle) -> AppResult<Self> {
        let data_dir: PathBuf = app
            .path()
            .app_data_dir()
            .map_err(|e| crate::error::AppError::Other(e.to_string()))?;
        std::fs::create_dir_all(&data_dir).ok();
        let covers_dir = data_dir.join("covers");
        std::fs::create_dir_all(&covers_dir).ok();
        let db_path = data_dir.join("beatify.sqlite");
        let db = Arc::new(Db::open(&db_path)?);
        let audio = Arc::new(AudioEngine::new(app.clone())?);
        let watcher = Arc::new(LibraryWatcher::new(app.clone(), db.clone()));

        // Watch any existing folders.
        if let Ok(folders) = db.list_folders() {
            for f in folders {
                watcher.watch(&f.path);
            }
        }

        Ok(Self {
            db,
            audio,
            watcher,
            covers_dir,
            app,
        })
    }
}
