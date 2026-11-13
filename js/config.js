// ============================================================
// 后端（Supabase）配置 —— 填入后数据存云端，两人可实时共享。
// 留空则自动退回「浏览器本地存储」模式（仅当前设备可见）。
//
// 获取方式：
//   1. 到 https://supabase.com 免费注册并新建项目；
//   2. 项目内左侧 Settings → API；
//   3. 复制 Project URL 填到 url，复制 anon public key 填到 anonKey。
// ============================================================
window.SUPABASE_CONFIG = {
  url: '',      // 例如：https://abcdefgh.supabase.co
  anonKey: ''   // 例如：eyJhbGciOiJIUzI1NiIsInR5cCI6...
};
