import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const PACKAGE_NAME = '@rollinggo/hotel';

// 从 package.json 读取当前版本
function getCurrentVersion(): string {
  try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const pkgPath = path.join(__dirname, '..', 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    return pkg.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

// 从 npm 获取最新版本
async function getLatestVersion(): Promise<string | null> {
  try {
    const response = await fetch(`https://registry.npmjs.org/${PACKAGE_NAME}/latest`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;
    const data = await response.json() as { version?: string };
    return data.version || null;
  } catch {
    return null;
  }
}

// 比较版本号
function isNewerVersion(current: string, latest: string): boolean {
  const currentParts = current.split('.').map(Number);
  const latestParts = latest.split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    if (latestParts[i] > currentParts[i]) return true;
    if (latestParts[i] < currentParts[i]) return false;
  }
  return false;
}

// 检查并显示更新提示
export async function checkForUpdates(): Promise<void> {
  try {
    const currentVersion = getCurrentVersion();
    const latestVersion = await getLatestVersion();

    if (latestVersion && isNewerVersion(currentVersion, latestVersion)) {
      console.log('\n┌─────────────────────────────────────────┐');
      console.log('│  📦 有新版本可用！                       │');
      console.log(`│  当前: v${currentVersion.padEnd(28)}│`);
      console.log(`│  最新: v${latestVersion.padEnd(28)}│`);
      console.log('│                                         │');
      console.log('│  运行以下命令更新:                       │');
      console.log('│  npm install -g @rollinggo/hotel@latest  │');
      console.log('└─────────────────────────────────────────┘\n');
    }
  } catch {
    // 版本检查失败不影响正常使用
  }
}
