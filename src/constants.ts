
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// 向上递归查找特定文件名（例如 client_id.txt 或 .client_id）
function findFileUpwards(startDir: string, filenames: string[]): string | null {
  try {
    let dir = path.resolve(startDir);
    while (true) {
      for (const name of filenames) {
        const target = path.join(dir, name);
        if (fs.existsSync(target) && fs.statSync(target).isFile()) {
          return target;
        }
      }
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  } catch {}
  return null;
}

// ==================== API 地址 ====================

/** MCP 服务器地址 */
export const getMcpBaseUrl = () => process.env.MCP_BASE_URL || 'https://mcp.rollinggo.cn/mcp';

/** OAuth 中转服务器地址 */
export const getOauthServerUrl = () => {
  const url = process.env.OAUTH_SERVER_URL;
  if (url && /https?:\/\/rollinggo\.store\/?$/i.test(url.trim())) {
    return 'https://api.rollinggo.store';
  }
  return url || 'https://api.rollinggo.store';
};

/** OAuth 授权页面地址 */
export const getOauthAuthorizeUrl = () => process.env.OAUTH_AUTHORIZE_URL || 'https://api.rollinggo.cn/oauth2/authorize';

/**
 * OAuth Client ID 多层优先级解析链：
 * 1. 命令行显式传入 (--client-id)
 * 2. 当前工作目录（CWD）向上递归查找 client_id.txt 或 .client_id
 * 3. 脚本自身所在目录向上递归查找 client_id.txt 或 .client_id
 * 4. 系统/环境配置 process.env.CLIENT_ID（含 ~/.hotel-cli/.env 中的持久化配置）
 * 5. 内建默认值 'rollinggoskill'
 */
export const getClientId = (cliOverride?: string): string => {
  // 优先级 1：CLI 显式传入参数
  if (cliOverride && cliOverride.trim()) {
    return cliOverride.trim();
  }

  // 优先级 2：当前工作目录（CWD）向上递归查找 client_id.txt / .client_id
  const cwdFile = findFileUpwards(process.cwd(), ['client_id.txt', '.client_id']);
  if (cwdFile) {
    try {
      const content = fs.readFileSync(cwdFile, 'utf8').trim();
      if (content) return content;
    } catch {}
  }

  // 优先级 3：脚本自身目录向上递归查找
  try {
    const scriptDir = path.dirname(fileURLToPath(import.meta.url));
    const scriptFile = findFileUpwards(scriptDir, ['client_id.txt', '.client_id']);
    if (scriptFile && scriptFile !== cwdFile) {
      const content = fs.readFileSync(scriptFile, 'utf8').trim();
      if (content) return content;
    }
  } catch {}

  // 优先级 4：环境变量 / .env 加载的配置
  if (process.env.CLIENT_ID && process.env.CLIENT_ID.trim()) {
    return process.env.CLIENT_ID.trim();
  }

  // 优先级 5：内建默认值
  return 'rollinggoskill';
};

// ==================== API 端点 ====================

export const API_ENDPOINTS = {
  /** 获取搜索标签 */
  HOTEL_TAGS: '/hoteltags',
  /** 搜索酒店 */
  HOTEL_SEARCH: '/hotelsearch',
  /** 酒店详情 */
  HOTEL_DETAIL: '/hoteldetail',
  /** 价格确认 */
  PRICE_CONFIRM: '/hotelpriceconfirm',
  /** 创建订单 */
  HOTEL_BOOK: '/hotelbook',
  /** 查询订单 */
  HOTEL_ORDERS: '/hotelorders',
  /** 订单详情 */
  HOTEL_ORDER_DETAIL: '/hotelorderdetail',
  /** 预取消订单 (查罚金与凭证) */
  HOTEL_PRE_CANCEL: '/hotelprecancel',
  /** 确认取消订单 */
  HOTEL_CONFIRM_CANCEL: '/hotelcancelconfirm',
} as const;

// ==================== OAuth 端点 ====================

export const OAUTH_ENDPOINTS = {
  /** 获取 state */
  INIT: '/skill/oauth/init',
  /** OAuth 回调 */
  CALLBACK: '/skill/oauth/callback',
  /** 获取 token */
  TOKEN: '/skill/oauth/token',
} as const;

// ==================== 短链接端点 ====================

export const SHORT_LINK_ENDPOINT = '/s/shorten';

// ==================== 地点类型 ====================

export const PLACE_TYPES = [
  '城市',
  '机场',
  '景点',
  '火车站',
  '地铁站',
  '酒店',
  '区/县',
  '详细地址',
] as const;

export type PlaceType = (typeof PLACE_TYPES)[number];

// ==================== 默认值 ====================

export const DEFAULTS = {
  /** 默认返回数量 */
  SIZE: 5,
  /** 最大返回数量 */
  MAX_SIZE: 20,
  /** 默认入住晚数 */
  STAY_NIGHTS: 1,
  /** 默认成人数 */
  ADULT_COUNT: 2,
  /** 默认儿童数 */
  CHILD_COUNT: 0,
  /** 默认房间数 */
  ROOM_COUNT: 1,
  /** 默认币种 */
  CURRENCY: 'CNY',
} as const;

// ==================== OAuth 配置 ====================

export const OAUTH_CONFIG = {
  /** 本地回调端口 */
  LOCAL_PORT: 18900,
  /** PKCE code_verifier 长度 */
  CODE_VERIFIER_LENGTH: 128,
  /** State 过期时间（分钟） */
  STATE_EXPIRY_MINUTES: 10,
} as const;

// ==================== Token 存储 ====================

export const TOKEN_PATH = process.env.HOME
  ? `${process.env.HOME}/.hotel-cli/token.json`
  : `${process.env.USERPROFILE}/.hotel-cli/token.json`;
