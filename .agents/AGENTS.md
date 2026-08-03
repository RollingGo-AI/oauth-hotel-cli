# AGENTS.md

RollingGo 酒店 CLI（国内版）— `@rollinggo/hotel`，命令名 `rgh`。TypeScript ESM + commander，无测试、无 lint。代码注释和用户输出均为中文，保持此风格。

## 与全球版互为镜像

仓库 `oauth-hotel-cli-overseas`（`@rollinggo/hotel-global` / `rgg`）是本项目的镜像，目录结构与流程一一对应。改动通常需同步到另一侧：

| | 国内（本项目） | 全球版 |
|---|---|---|
| OAuth 回调 | `/skill/oauth/callback` | `/global-skill/oauth/callback` |
| MCP 默认 | `https://mcp.rollinggo.cn/mcp` | `https://mcp.rollinggo.ai/mcp` |
| 授权页默认 | `https://api.rollinggo.cn/oauth2/authorize` | `https://api.rollinggo.ai/oauth2/authorize` |
| CLIENT_ID 默认 | `rollinggoskill` | `rollinggoglobal` |
| 全局配置目录 | `~/.hotel-cli/` | `~/.hotel-global-cli/` |
| 默认国家/币种 | CN / CNY | US / USD |
| 分支 | `master` | `main` |
| `book` 命令 | 必填 `--email` | 用 `--customer-request`，无 email |

## 结构

- `src/index.ts` — commander 入口，所有命令定义与参数组装（`findEnvUpwards` 的 .env 加载顺序在这里）
- `src/auth.ts` — PKCE OAuth 登录：生成 code_verifier(32B base64url) + session_id，POST `/skill/oauth/init` 换 state，构建授权 URL 并走 `/s/shorten` 短链，然后每 2s 轮询 `/skill/oauth/token?session_id=...`（最多 150 次≈5 分钟），成功后写 token 文件
- `src/api.ts` — 所有 MCP 请求走 `Authorization: Bearer`，未登录直接抛错；先读 `loadToken()`
- `src/constants.ts` — 全部端点/默认值/`TOKEN_PATH`（`~/.hotel-cli/token.json`）；改配置改这里
- `src/version-check.ts` — 启动时查 npm registry 提示更新（失败静默）

## 环境变量（.env 查找优先级：系统 > CWD 向上 > 脚本目录向上[Skill 目录] > 全局家目录）

`MCP_BASE_URL`、`OAUTH_SERVER_URL`（默认 `https://rollinggo.store` 中转）、`OAUTH_AUTHORIZE_URL`、`CLIENT_ID`。默认值硬编码在 `constants.ts`。`init` 命令把配置写入 `~/.hotel-cli/.env`。

## 命令

- `npm run build` — `tsc`（输出 `dist/`，ESM）
- `npm run dev` — **注意**：是 `node --watch dist/index.js`，先 `npm run build` 才能跑
- `npm start` — `node dist/index.js`
- 本地验证：`npm run build && node dist/index.js --help`

## 发布（GitHub Actions 自动完成，勿手动 publish）

1. 提交（仓库历史用 `fix:`/`feat:` 风格，版本号如 `1.2.18` 的裸提交也常见）
2. `npm version patch|minor|major`（自动更新 package.json 并打 `v*` tag）
3. `git push origin master --follow-tags`
4. `.github/workflows/release.yml` 在 tag 上自动 npm publish + 用 Bun 编译 `rgh-*` 四平台二进制并发布 GitHub Release

`dist/` 与 `.env` 均在 .gitignore 中，不提交。
