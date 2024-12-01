import { useSharedStore } from "@/stores/useShareStore"
import { Song } from "@/schema/schema"

/**
 * 格式化时长，将秒转为分
 */
export const formatTime = (time: number) => {
    return `${time / 60 | 0}:${(time % 60).toString().padStart(2, '0')}`
}

/**
 * 格式化文件大小
 */
export const formatSize = (size: number) => {
    return (size / 1024 / 1024).toFixed(1)
}

/**
 * 添加到历史记录，最多保存50个
 */
export const addToHistory = (song: Song) => {
    const store = useSharedStore();

    // 获取现有历史记录
    const existingList = JSON.parse(localStorage.getItem('historyList') || '[]');

    // 查找是否已有该歌曲，若存在则移除
    const updatedList = existingList.filter((item: Song) => item.id !== song.id);

    // 添加新歌曲到末尾
    updatedList.push(song);

    // 确保历史记录不超过50个，超过则移除最旧的
    if (updatedList.length > 50) {
        updatedList.shift();
    }

    // 更新本地存储
    localStorage.setItem('historyList', JSON.stringify(updatedList));

    // 更新状态
    store.isHistoryUpdated = true;
};

/**
 * 插播
 */ 
export const insertPlay = (song: Song, store: ReturnType<typeof useSharedStore>) => {
    store.insertMusicId = song.id;
    store.setCurrentMusic(song)
}

/**
 * 从历史记录列表播放歌曲 
 */
export const playFromHistoryList = (song: Song, store: ReturnType<typeof useSharedStore>) => {
    insertPlay(song, store)
}

/**
 * 从手动添加的列表中播放歌曲，并将列表中之前的歌曲移除
 */ 
export const playFromManuallyAddedList = (song: Song, store: ReturnType<typeof useSharedStore>) => {
    insertPlay(song, store);
    addToHistory(song);

    // 找到这首歌曲及之前的歌曲，并移除
    let newManuallyAddedList: Song[] = [];
    let songFound = false;

    let manuallyAddedList = JSON.parse(localStorage.getItem('manuallyAddedList') || '[]');
    for (const value of manuallyAddedList) {
        if (songFound) {
            newManuallyAddedList.push(value);
        } else if (value.id === song.id) {
            songFound = true;
        }
    }

    localStorage.setItem('manuallyAddedList', JSON.stringify(newManuallyAddedList));
    store.manuallyAddedListUpdated = true;
}