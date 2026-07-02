import * as dotenv from 'dotenv';
dotenv.config();

// ==================== API 地址 ====================

/** MCP 服务器地址 */
export const MCP_BASE_URL = process.env.MCP_BASE_URL || 'https://mcp.rollinggo.cn/mcp';

/** OAuth 中转服务器地址 */
export const OAUTH_SERVER_URL = process.env.OAUTH_SERVER_URL || 'https://rollinggo.store';

/** OAuth 授权页面地址 */
export const OAUTH_AUTHORIZE_URL = process.env.OAUTH_AUTHORIZE_URL || 'https://api.rollinggo.cn/oauth2/authorize';

/** OAuth Client ID */
export const CLIENT_ID = process.env.CLIENT_ID || 'rollinggo-skill';

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
  /** 默认国家代码 */
  COUNTRY_CODE: 'CN',
  /** 默认币种 */
  CURRENCY: 'CNY',
  /** 默认国籍 */
  NATIONALITY: 'CN',
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
