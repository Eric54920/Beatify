import { createI18n } from 'vue-i18n';

// 导入语言包
import en from '@/locales/en.json';
import zh from '@/locales/zh.json';

// 设置语言类型，这里使用 Record<string, string> 来支持动态键值对
type MessageSchema = typeof en;

// 创建 i18n 实例
const i18n = createI18n<[MessageSchema], 'en' | 'zh'>({
  legacy: false, // 使用 Composition API
  locale: 'en',  // 默认语言
  fallbackLocale: 'en', // 回退语言
  globalInjection: true, // 全局模式，允许使用 $t
  messages: {
    en,
    zh
  }
});

export default i18n;
