# 我们的故事 · 恋爱小站

一个恋爱纪念网站：前端纯静态（HTML + CSS + JS），**可选接入 Supabase 后端**实现两人数据云端共享。

## 功能

- 首页封面：动态极光背景 + 爱心花瓣飘落 + 二人昵称 + 在一起天数计时（天/时/分/秒）
- 相遇日记：真实见面记录时间轴，可「添加见面」并附带当天照片（多张）
- 送你的花：记录第一束、第二束……可继续添加
- 有趣的瞬间：日常/有趣照片墙，每张可写一条备注、可增删改
- 心情广场：用颜文字打卡心情 + 分享有趣的事（可带照片）
- 专属情话库、爱情匹配度动画、背景音乐、深/浅色主题、专属恋爱 ID、版权
- 移动端适配、玻璃拟态 + 渐变标题等视觉

## 本地运行

直接用浏览器打开 `index.html` 即可；或在项目目录起本地服务器：

```bash
python -m http.server 8000
# 访问 http://localhost:8000
```

## 自定义

- 昵称 / 在一起时间 / 匹配度：打开网页点右上角 ⚙️ 设置；或改 `js/data.js` 的 `couple`
- 见面记录 / 花 / 照片 / 情话 / 颜文字：改 `js/data.js`
- 自己的背景音乐：把 mp3 放进项目目录，改 `js/data.js` 里 `couple.musicUrl`

## 接入后端（两人共享数据，可选）

默认是「本地存储」模式：数据只存在当前浏览器。接入 Supabase 后，两个人各自的手机都能看到对方发的见面、照片、心情。

### 1. 创建 Supabase 项目（免费）

1. 打开 https://supabase.com 注册/登录，点 **New project**；
2. 填项目名（如 `love-site`）、设数据库密码、选一个就近区域，创建；
3. 进入项目 → 左侧 **SQL Editor** → **New query**；
4. 把本仓库 `sql/schema.sql` 的**全部内容**粘贴进去，点 **Run**（建表 + 开放读写权限）。

### 2. 填入密钥

1. 项目左侧 **Settings → API**；
2. 复制 **Project URL** 和 **anon public key**；
3. 打开本仓库 `js/config.js`，填到 `url` 和 `anonKey`：

```js
window.SUPABASE_CONFIG = {
  url: 'https://你的项目.supabase.co',
  anonKey: 'eyJhbGciOi...'
};
```

填好后刷新页面，数据即自动切换到云端共享；**留空则退回本地模式**。

### 3. 说明

- 数据表：`site_settings`（设置）、`meetings`（见面）、`bouquets`（花）、`gallery`（瞬间）、`moments`（心情动态）。
- 上传的照片会压缩后以 base64 存进数据库（免费额度 500MB，日常够用）。
- 当前为**匿名开放读写**（方便两人免登录使用）；若担心被陌生人访问，可后续加一个简单访问密码。

## 部署到 GitHub Pages

1. 在 GitHub 新建仓库（如 `love-site`，免费账户建议 **Public**）。
2. 本地推送：

```bash
cd love-site
git init
git add .
git commit -m "init: 我们的故事恋爱小站"
git branch -M main
git remote add origin https://github.com/你的用户名/love-site.git
git push -u origin main
```

3. 打开仓库 **Settings → Pages**：Source 选 **Deploy from a branch**，分支 `main`、目录 `/ (root)`，保存。
4. 访问 `https://你的用户名.github.io/love-site/`。
5. 部署后，`js/config.js` 里的 Supabase 密钥会公开（anon key 本来就是公开的），正常使用即可。
