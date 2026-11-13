# 我们的故事 · 恋爱小站

一个纯前端（HTML + CSS + JS）的恋爱纪念网站，无需后端即可运行，可部署到 GitHub Pages。

## 功能

- 首页封面：动态极光背景 + 爱心花瓣飘落 + 二人昵称 + 在一起天数计时（天/时/分/秒）
- 相遇日记：真实见面记录时间轴，可「添加见面」并附带当天照片（多张）
- 送你的花：记录第一束、第二束……可继续添加
- 有趣的瞬间：日常/有趣照片墙，每张照片可写一条备注、可增删改
- 心情广场：用颜文字打卡当天心情 + 分享有趣的事（可带照片）
- 专属情话库：随机情话
- 爱情匹配度：圆形进度条动画
- 背景音乐：内置轻柔纯音乐（也可换成自己的 mp3）
- 深色/浅色主题切换、移动端适配、专属恋爱 ID 与版权

## 本地运行

直接用浏览器打开 `index.html` 即可。也可以在项目目录起一个本地服务器：

```bash
python -m http.server 8000
# 然后访问 http://localhost:8000
```

## 自定义

- **昵称 / 在一起时间 / 匹配度**：打开网页点右上角 ⚙️ 设置；或直接改 `js/data.js` 里的 `couple`。
- **见面记录 / 花 / 照片 / 情话 / 颜文字**：改 `js/data.js`。
- **自己的背景音乐**：把 mp3 放进项目目录，改 `js/data.js` 里 `couple.musicUrl`。

> 图片放在 `images/` 目录，`js/data.js` 里用相对路径引用。

## 部署到 GitHub Pages

1. 新建一个 GitHub 仓库（如 `love-site`），建议 **Public**（免费账户 Pages 需公开）。
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

3. 打开仓库 **Settings → Pages**，Source 选 **Deploy from a branch**，分支选 `main`，目录选 `/ (root)`，保存。
4. 稍等一分钟，访问 `https://你的用户名.github.io/love-site/` 即可。

> 注意：照片建议压缩到每张几百 KB，避免仓库过大、加载慢。

## 数据说明（重要）

本项目是**纯静态站**，没有后端数据库：

- 「添加见面 / 上传照片 / 发心情」等数据保存在**浏览器本地（localStorage）**，仅当前设备、当前浏览器可见；
- 上传的照片经过前端压缩后以 base64 存于本地，**换设备或清除浏览器数据会丢失**；
- 两人想在不同手机上共享数据，需要接入后端（如 Supabase / Firebase / 自建 API）。如需，可以在此基础上继续改造。
