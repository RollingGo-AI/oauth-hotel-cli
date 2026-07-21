# @rollinggo/hotel

RollingGo 酒店 CLI 工具，支持 OAuth 登录和完整的酒店预订流程。

## 安装

```bash
# 直接使用（推荐）
npx @rollinggo/hotel@latest login

# 全局安装
npm install -g @rollinggo/hotel
rgh login
```

## 配置

CLI 工具会自动从以下几个位置查找并加载 `.env` 配置文件（优先级从高到低）：

1. **系统环境变量**（最高优先级）
2. **当前工作目录（CWD）**：控制台当前路径及其逐级往上的父目录。
3. **CLI 执行脚本所在的物理目录**（**最推荐 Skill 开发者使用**）：CLI 安装目录及其上级目录。
4. **全局家目录**：`~/.hotel-cli/.env`。

### 推荐放置位置：

* **场景 A：作为 AI Agent Skill 使用（推荐）**
  直接把 `.env` 文件放在你的 **Skill 根目录**下（即包含 `SKILL.md` 的那个文件夹）。这样，Skill 移植、复制给他人时，配置会自动跟随，不需要重新配置。
  
* **场景 B：作为全局命令行工具直接使用**
  如果你是在全局通过 `rgh` 使用它，建议将 `.env` 放在**全局配置目录**中：
  * **macOS / Linux**: `~/.hotel-cli/.env`
  * **Windows**: `C:\Users\<你的用户名>\.hotel-cli\.env`

* **场景 C：本地源码开发**
  直接放置在 CLI 工程的根目录下。

### `.env` 配置文件模板：

```env
# MCP 业务接口地址
MCP_BASE_URL=https://mcp.rollinggo.cn/mcp

# OAuth 中转服务器地址
OAUTH_SERVER_URL=https://rollinggo.store

# OAuth 授权页面地址
OAUTH_AUTHORIZE_URL=https://api.rollinggo.cn/oauth2/authorize

# OAuth Client ID
CLIENT_ID=rollinggo-skill
```

## 命令

### 认证

```bash
rgh login      # OAuth 登录
rgh logout     # 退出登录
rgh whoami     # 查看登录状态
```

### 酒店工具

```bash
# 获取搜索标签
rgh hotel-tags

# 搜索酒店
rgh search-hotels \
  --origin-query "杭州西湖附近酒店" \
  --place "西湖" \
  --place-type "景点" \
  --check-in-date 2026-06-10 \
  --size 5

# 酒店详情
rgh hotel-detail \
  --hotel-id 1109562 \
  --check-in-date 2026-06-10 \
  --check-out-date 2026-06-11

# 价格确认
rgh price-confirm \
  --hotel-id 1109562 \
  --rate-plan-id "xxx" \
  --rooms 1 \
  --check-in-date 2026-06-10 \
  --check-out-date 2026-06-11 \
  --adults 2

# 创建订单
rgh book \
  --reference-no "xxx" \
  --first-name "Shan" \
  --last-name "Zhang" \
  --email "test@example.com"

# 查询订单
rgh orders
```

## 参数说明

### search-hotels

| 参数 | 必填 | 说明 |
|------|------|------|
| `--origin-query` | ✅ | 用户原始查询语句 |
| `--place` | ✅ | 地点名称 |
| `--place-type` | ✅ | 地点类型：城市/机场/景点/火车站/地铁站/酒店/区/县/详细地址 |
| `--check-in-date` | ❌ | 入住日期 YYYY-MM-DD |
| `--stay-nights` | ❌ | 入住晚数 |
| `--adult-count` | ❌ | 每间房成人数 |
| `--star-ratings` | ❌ | 星级范围，如 4.5,5.0 |
| `--size` | ❌ | 返回数量，默认 5 |

### hotel-detail

| 参数 | 必填 | 说明 |
|------|------|------|
| `--hotel-id` | 二选一 | 酒店 ID |
| `--name` | 二选一 | 酒店名称 |
| `--check-in-date` | ❌ | 入住日期 |
| `--check-out-date` | ❌ | 离店日期 |

## License

ISC
