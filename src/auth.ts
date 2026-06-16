import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  MCP_BASE_URL,
  OAUTH_SERVER_URL,
  OAUTH_ENDPOINTS,
  TOKEN_PATH,
  OAUTH_AUTHORIZE_URL,
  CLIENT_ID,
  SHORT_LINK_ENDPOINT,
} from './constants.js';

// 生成 PKCE code_verifier（RFC 7636 规范：32 字节随机数 base64url 编码后 43 字符，熵充足）
function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}

// SHA256 哈希
function sha256(plain: string): string {
  return crypto.createHash('sha256').update(plain).digest('base64url');
}

// 生成随机 session_id
function generateSessionId(): string {
  return crypto.randomBytes(16).toString('hex');
}

// 保存 token 到本地
export function saveToken(token: any): void {
  const dir = path.dirname(TOKEN_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(token, null, 2));
}

// 读取本地 token
export function loadToken(): any | null {
  try {
    if (fs.existsSync(TOKEN_PATH)) {
      const data = fs.readFileSync(TOKEN_PATH, 'utf-8');
      return JSON.parse(data);
    }
  } catch {
    // 忽略错误
  }
  return null;
}

// 检查是否已登录
export function isLoggedIn(): boolean {
  const token = loadToken();
  return token !== null && token.access_token !== undefined;
}

// 退出登录
export function logout(): void {
  if (fs.existsSync(TOKEN_PATH)) {
    fs.unlinkSync(TOKEN_PATH);
    console.log('已退出登录');
  }
}

// OAuth 登录流程
export async function login(): Promise<void> {
  console.log('🔐 开始 OAuth 登录...\n');

  // 1. 生成 PKCE 参数
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = sha256(codeVerifier);
  const sessionId = generateSessionId();

  // 2. 调用中转服务器获取 state
  console.log('📝 正在获取授权 state...');
  const initResponse = await fetch(
    `${OAUTH_SERVER_URL}${OAUTH_ENDPOINTS.INIT}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        code_verifier: codeVerifier,
      }),
    }
  );
  // 注意：initResponse 返回 state（JWT）和 session_id（短 key），轮询时用 session_id

  if (!initResponse.ok) {
    throw new Error(`获取 state 失败: ${initResponse.status}`);
  }

  const { state, session_id: pollKey } = (await initResponse.json()) as { state: string; session_id: string };

  // 3. 构建授权 URL
  const redirectUri = `${OAUTH_SERVER_URL}${OAUTH_ENDPOINTS.CALLBACK}`;
  const scope = 'profile phone email hotel:order:read hotel:order:book hotel:order:cancel';
  const resource = `${MCP_BASE_URL}`;
  const authUrl = `${OAUTH_AUTHORIZE_URL}?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}&code_challenge=${encodeURIComponent(codeChallenge)}&code_challenge_method=S256&scope=${encodeURIComponent(scope)}&resource=${encodeURIComponent(resource)}`;

  // 4. 获取短链接
  let shortUrl = authUrl;
  try {
    const shortResponse = await fetch(`${OAUTH_SERVER_URL}${SHORT_LINK_ENDPOINT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: authUrl }),
    });
    if (shortResponse.ok) {
      const { shortUrl: url } = (await shortResponse.json()) as { shortUrl: string };
      shortUrl = url;
    }
  } catch {
    // 短链接服务不可用，使用长链接
  }

  // 5. 显示授权指引
  console.log('┌─────────────────────────────────────────┐');
  console.log('│         🔐 请完成授权以继续使用          │');
  console.log('└─────────────────────────────────────────┘\n');

  console.log('📱 方式一：手机扫描二维码\n');
  console.log(`![扫码授权](https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(shortUrl)})`);

  await new Promise((r) => setTimeout(r, 300));

  console.log('\n💻 方式二：点击链接或复制到浏览器打开\n');
  console.log(`   ${shortUrl}\n`);
  console.log('⏳ 等待授权中...（授权后自动继续）\n');

  // 4. 轮询中转服务器获取 token（用短 session_id 作为轮询 key，而非整个 JWT）
  console.log('\n🔄 正在等待用户授权并获取 token...');
  const tokenUrl = `${OAUTH_SERVER_URL}${OAUTH_ENDPOINTS.TOKEN}?session_id=${encodeURIComponent(pollKey)}`;

  const MAX_RETRIES = 150; // 最多轮询 5 分钟 (150 * 2s)
  for (let i = 0; i < MAX_RETRIES; i++) {
    await new Promise((r) => setTimeout(r, 2000)); // 每 2 秒查一次

    let result: { status: string; token?: any } | null = null;
    try {
      const tokenResponse = await fetch(tokenUrl);
      if (!tokenResponse.ok) continue; // 网络波动，继续轮询
      result = (await tokenResponse.json()) as { status: string; token?: any };
    } catch {
      // 仅吞掉网络层错误（超时、DNS 等），继续轮询
      continue;
    }

    // 业务逻辑在 try/catch 之外处理，确保 expired 可以正常向上抛
    if (result.status === 'success' && result.token) {
      saveToken(result.token);
      console.log('✅ 登录成功！Token 已保存\n');
      console.log('📋 Token 信息:');
      if (result.token.access_token) {
        console.log(`   Access Token: ${result.token.access_token.substring(0, 20)}...`);
      }
      if (result.token.expires_in) {
        console.log(`   过期时间: ${result.token.expires_in} 秒`);
      }
      return;
    }

    if (result.status === 'expired') {
      throw new Error('授权会话已过期，请重新执行 login 命令。');
    }

    // pending：继续等待
  }

  throw new Error('等待授权超时，请重新执行 login 命令。');
}
