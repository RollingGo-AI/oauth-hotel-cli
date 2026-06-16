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
