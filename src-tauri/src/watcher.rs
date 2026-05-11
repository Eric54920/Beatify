use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::Duration;

use notify::{RecommendedWatcher, RecursiveMode, Watcher};
use parking_lot::Mutex;
use tauri::{AppHandle, Emitter};

use crate::db::Db;
use crate::library;

pub struct LibraryWatcher {
    app: AppHandle,
    db: Arc<Db>,
    watchers: Mutex<HashMap<PathBuf, RecommendedWatcher>>,
}

impl LibraryWatcher {
    pub fn new(app: AppHandle, db: Arc<Db>) -> Self {
        Self {
            app,
            db,
            watchers: Mutex::new(HashMap::new()),
        }
    }

    pub fn watch(&self, path: &str) {
        let buf = PathBuf::from(path);
        if !buf.exists() {
            return;
        }
        let mut g = self.watchers.lock();
        if g.contains_key(&buf) {
            return;
        }
        let app = self.app.clone();
        let db = self.db.clone();
        let path_clone = buf.clone();
        let watcher = match notify::recommended_watcher(move |res: notify::Result<notify::Event>| {
            if let Ok(_event) = res {
                // Debounce by sleeping briefly then rescan the folder.
                let app = app.clone();
                let db = db.clone();
                let path = path_clone.clone();
                std::thread::spawn(move || {
                    std::thread::sleep(Duration::from_millis(800));
                    if let Err(e) = library::scan_folder(&db, &path) {
                        log::warn!("watcher rescan failed: {}", e);
                    }
                    let _ = app.emit("library:changed", ());
                });
            }
        }) {
            Ok(w) => w,
            Err(e) => {
                log::warn!("failed to create watcher: {}", e);
                return;
            }
        };

        let mut watcher = watcher;
        if let Err(e) = watcher.watch(&buf, RecursiveMode::Recursive) {
            log::warn!("watch error: {}", e);
            return;
        }
        g.insert(buf, watcher);
    }

    pub fn unwatch(&self, path: &str) {
        let buf = PathBuf::from(path);
        let mut g = self.watchers.lock();
        if let Some(mut w) = g.remove(&buf) {
            let _ = w.unwatch(Path::new(&buf));
        }
    }
}
