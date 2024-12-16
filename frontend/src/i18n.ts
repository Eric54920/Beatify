import { createI18n } from 'vue-i18n';

// 导入语言包
import en from '@/locales/en.json';
import zh from '@/locales/zh.json';

// 设置语言类型，这里使用 Record<string, string> 来支持动态键值对
type MessageSchema = typeof en;

export const language = [
  { "title": "English", "key": "en" },
  { "title": "简体中文", "key": "zh" }
]

export const lang = localStorage.getItem('user-lang') || 'en'  // 默认语言

/**
 * 设置语言
 */
export const setUserLanguage = (lang: string) => {
  localStorage.setItem('user-lang', lang); // 存储到 localStorage
  i18n.global.locale = lang;
}

// 创建 i18n 实例
const i18n = createI18n<[MessageSchema], string>({
  legacy: false, // 使用 Composition API
  locale: lang,
  fallbackLocale: 'en', // 回退语言
  globalInjection: true, // 全局模式，允许使用 $t
  messages: {
    en,
    zh
  }
});

export default i18n;
