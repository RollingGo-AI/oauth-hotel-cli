#!/usr/bin/env node
import dotenv from 'dotenv';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

// 向上寻找 .env 文件的辅助函数
function findEnvUpwards(startDir: string): string | null {
  let dir = path.resolve(startDir);
  while (true) {
    const envPath = path.join(dir, '.env');
    if (fs.existsSync(envPath) && fs.statSync(envPath).isFile()) {
      return envPath;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
  return null;
}

// 1. 优先从当前工作目录（CWD）向上寻找 .env
const cwdEnv = findEnvUpwards(process.cwd());
if (cwdEnv) {
  dotenv.config({ path: cwdEnv });
}

// 2. 然后从 CLI 脚本自身所在目录向上寻找 .env（支持 CLI 被包含在 Skill 目录中的情况）
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const scriptEnv = findEnvUpwards(scriptDir);
if (scriptEnv && scriptEnv !== cwdEnv) {
  dotenv.config({ path: scriptEnv });
}

// 3. 最后加载全局家目录下的 .env（~/.hotel-cli/.env）
const globalEnvPath = path.join(os.homedir(), '.hotel-cli', '.env');
if (fs.existsSync(globalEnvPath)) {
  dotenv.config({ path: globalEnvPath });
}

import { Command } from 'commander';
import { execSync } from 'child_process';
import { login, logout, isLoggedIn, loadToken } from './auth.js';
import {
  getHotelSearchTags,
  searchHotels,
  getHotelDetail,
  hotelPriceConfirm,
  createHotelBooking,
  searchHotelOrders,
  getHotelOrderDetail,
} from './api.js';
import { DEFAULTS, PLACE_TYPES } from './constants.js';
import { checkForUpdates } from './version-check.js';
import pkg from '../package.json' with { type: 'json' };

// 执行版本检查
await checkForUpdates();

const program = new Command();

program
  .name('rgh')
  .description('RollingGo 酒店 CLI 工具 - OAuth 登录 + 酒店预订全流程')
  .version(pkg.version);

// ==================== 认证命令 ====================

program
  .command('login')
  .description('OAuth 登录')
  .action(async () => {
    try {
      await login();
    } catch (error: any) {
      console.error('登录失败:', error.message);
      process.exit(1);
    }
  });

program
  .command('logout')
  .description('退出登录')
  .action(() => {
    logout();
  });

program
  .command('status')
  .aliases(['whoami', 'me'])
  .description('查看当前登录状态 (别名: whoami, me)')
  .action(() => {
    if (isLoggedIn()) {
      const token = loadToken();
      console.log('已登录');
      if (token?.user) {
        console.log(`   用户: ${token.user}`);
      }
    } else {
      console.log('未登录，请先执行 rgh login');
    }
  });

// ==================== 酒店工具命令 ====================

// 1. 获取搜索标签
program
  .command('hotel-tags')
  .description('获取所有可用的酒店搜索标签')
  .action(async () => {
    try {
      const result = await getHotelSearchTags();
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error('获取标签失败:', error.message);
      process.exit(1);
    }
  });

// 2. 搜索酒店
program
  .command('search-hotels')
  .description('搜索酒店')
  .requiredOption('--origin-query <query>', '用户原始查询语句')
  .requiredOption('--place <place>', '地点名称')
  .requiredOption('--place-type <type>', `地点类型：${PLACE_TYPES.join('/')}`)
  .option('--size <n>', '返回数量', String(DEFAULTS.SIZE))
  .option('--check-in-date <date>', '入住日期 YYYY-MM-DD')
  .option('--stay-nights <n>', '入住晚数', String(DEFAULTS.STAY_NIGHTS))
  .option('--adult-count <n>', '每间房成人数', String(DEFAULTS.ADULT_COUNT))
  .option('--star-ratings <min,max>', '星级范围')
  .option('--distance-in-meter <m>', '距离限制（米）')
  .option('--required-tag <tag>', '必须标签（可多次使用）')
  .option('--preferred-brand <brand>', '偏好品牌（可多次使用）')
  .option('--max-price-per-night <price>', '每晚最高价格')
  .action(async (options) => {
    try {
      const params: any = {
        originQuery: options.originQuery,
        place: options.place,
        placeType: options.placeType,
      };

      if (options.size) params.size = parseInt(options.size);

      if (options.checkInDate || options.stayNights || options.adultCount) {
        params.checkInParam = {};
        if (options.checkInDate) params.checkInParam.checkInDate = options.checkInDate;
        if (options.stayNights) params.checkInParam.stayNights = parseInt(options.stayNights);
        if (options.adultCount) params.checkInParam.adultCount = parseInt(options.adultCount);
      }

      if (options.starRatings || options.distanceInMeter) {
        params.filterOptions = {};
        if (options.starRatings) {
          const [min, max] = options.starRatings.split(',').map(Number);
          params.filterOptions.starRatings = [min, max];
        }
        if (options.distanceInMeter) params.filterOptions.distanceInMeter = parseInt(options.distanceInMeter);
      }

      // 收集标签（支持多次使用）
      const requiredTags = program.opts().requiredTag
        ? Array.isArray(program.opts().requiredTag)
          ? program.opts().requiredTag
          : [program.opts().requiredTag]
        : [];
      const preferredBrands = program.opts().preferredBrand
        ? Array.isArray(program.opts().preferredBrand)
          ? program.opts().preferredBrand
          : [program.opts().preferredBrand]
        : [];

      if (requiredTags.length || preferredBrands.length || options.maxPricePerNight) {
        params.hotelTags = {};
        if (requiredTags.length) params.hotelTags.requiredTags = requiredTags;
        if (preferredBrands.length) params.hotelTags.preferredBrands = preferredBrands;
        if (options.maxPricePerNight) params.hotelTags.maxPricePerNight = parseFloat(options.maxPricePerNight);
      }

      const result = await searchHotels(params);
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error('搜索失败:', error.message);
      process.exit(1);
    }
  });

// 3. 酒店详情
program
  .command('hotel-detail')
  .description('查询酒店详情与房型报价')
  .option('--hotel-id <id>', '酒店 ID')
  .option('--name <name>', '酒店名称（模糊匹配）')
  .option('--check-in-date <date>', '入住日期 YYYY-MM-DD')
  .option('--check-out-date <date>', '离店日期 YYYY-MM-DD')
  .option('--room-count <n>', '房间数', String(DEFAULTS.ROOM_COUNT))
  .option('--adult-count <n>', '每间房成人数', String(DEFAULTS.ADULT_COUNT))
  .option('--child-count <n>', '每间房儿童数', String(DEFAULTS.CHILD_COUNT))
  .option('--child-age <ages>', '儿童年龄（逗号分隔）')
  .option('--cancel-policy <policy>', '取消政策: CANCELABLE / NON_CANCELABLE')
  .option('--meal-type <type>', '餐食类型: WITH_BREAKFAST / SINGLE_BREAKFAST / DOUBLE_BREAKFAST / NO_MEAL')
  .action(async (options) => {
    try {
      if (!options.hotelId && !options.name) {
        console.error('请提供 --hotel-id 或 --name');
        process.exit(1);
      }

      const params: any = {};
      if (options.hotelId) params.hotelId = parseInt(options.hotelId);
      if (options.name) params.name = options.name;

      if (options.checkInDate || options.checkOutDate) {
        params.dateParam = {};
        if (options.checkInDate) params.dateParam.checkInDate = options.checkInDate;
        if (options.checkOutDate) params.dateParam.checkOutDate = options.checkOutDate;
      }

      params.occupancyParam = {
        roomCount: parseInt(options.roomCount),
        adultCount: parseInt(options.adultCount),
        childCount: parseInt(options.childCount),
      };

      if (options.childAge) {
        params.occupancyParam.childAgeDetails = options.childAge.split(',').map(Number);
      }

      if (options.cancelPolicy || options.mealType) {
        params.filter = {};
        if (options.cancelPolicy) params.filter.cancelPolicy = options.cancelPolicy;
        if (options.mealType) params.filter.mealType = options.mealType;
      }

      const result = await getHotelDetail(params);
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error('获取详情失败:', error.message);
      process.exit(1);
    }
  });

// 4. 价格确认
program
  .command('price-confirm')
  .description('锁定房型实时价格')
  .requiredOption('--hotel-id <id>', '酒店 ID')
  .requiredOption('--rate-plan-id <id>', '价格方案 ID')
  .requiredOption('--rooms <n>', '房间数量')
  .requiredOption('--check-in-date <date>', '入住日期 YYYY-MM-DD')
  .requiredOption('--check-out-date <date>', '离店日期 YYYY-MM-DD')
  .requiredOption('--adults <n>', '每间房成人数')
  .option('--children <n>', '每间房儿童数', String(DEFAULTS.CHILD_COUNT))
  .option('--child-age <ages>', '儿童年龄（逗号分隔）')
  .action(async (options) => {
    try {
      const numOfRooms = parseInt(options.rooms);
      const adultCount = parseInt(options.adults);
      const childCount = parseInt(options.children);

      const occupancyDetails = [];
      for (let i = 1; i <= numOfRooms; i++) {
        const detail: any = {
          roomNum: i,
          adultCount,
          childCount,
        };
        if (options.childAge) {
          detail.childAgeDetails = options.childAge.split(',').map(Number);
        }
        occupancyDetails.push(detail);
      }

      const result = await hotelPriceConfirm({
        hotelID: parseInt(options.hotelId),
        ratePlanID: options.ratePlanId,
        numOfRooms,
        dateParam: {
          checkInDate: options.checkInDate,
          checkOutDate: options.checkOutDate,
        },
        occupancyDetails,
      });
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error('价格确认失败:', error.message);
      process.exit(1);
    }
  });

function parseGuestList(value: string, previous: any[]) {
  const parts = value.split(',');
  const roomNum = parseInt(parts[0], 10) || 1;
  const firstName = parts[1] || '';
  const lastName = parts[2] || '';
  const isAdult = parts[3] ? parts[3].toLowerCase() !== 'false' : true;
  
  let room = previous.find((r: any) => r.roomNum === roomNum);
  if (!room) {
    room = { roomNum, guestInfo: [] };
    previous.push(room);
  }
  room.guestInfo.push({ firstName, lastName, isAdult });
  return previous;
}

// 5. 创建订单
program
  .command('book')
  .description('创建酒店订单')
  .requiredOption('--reference-no <no>', '预订参考号')
  .option('--first-name <name>', '联系人名 (可选，默认取首个入住人)')
  .option('--last-name <name>', '联系人姓 (可选，默认取首个入住人)')
  .option('--email <email>', '联系邮箱 (国内版必填)')
  .option('--guest <info>', '客人信息: 房间号,名字,姓氏,是否成人 (如: 1,San,Zhang,true)', parseGuestList, [])
  .option('--customer-request <request>', '客户特殊要求 (如高楼层、无烟房等)')
  .action(async (options) => {
    try {
      let guestList = options.guest;
      let contactFirstName = options.firstName;
      let contactLastName = options.lastName;

      if (!contactFirstName && (!guestList || guestList.length === 0)) {
        console.error('下单失败: 必须提供 --first-name/--last-name 或至少一个 --guest');
        process.exit(1);
      }

      if (guestList && guestList.length > 0) {
        if (!contactFirstName) contactFirstName = guestList[0].guestInfo[0].firstName;
        if (!contactLastName) contactLastName = guestList[0].guestInfo[0].lastName;
      } else {
        guestList = [
          {
            roomNum: 1,
            guestInfo: [
              {
                firstName: contactFirstName,
                lastName: contactLastName,
                isAdult: true,
              },
            ],
          },
        ];
      }

      if (!options.email) {
        console.error('下单失败: 必须提供 --email');
        process.exit(1);
      }

      const bookingParams: any = {
        referenceNo: options.referenceNo,
        contact: {
          firstName: contactFirstName,
          lastName: contactLastName,
          email: options.email,
        },
        guestList,
      };

      if (options.customerRequest) {
        bookingParams.customerRequest = options.customerRequest;
      }

      const result = await createHotelBooking(bookingParams);
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error('下单失败:', error.message);
      process.exit(1);
    }
  });

// 6. 查询订单
program
  .command('orders')
  .description('查询订单列表')
  .option('-s, --status <status>', '订单状态筛选 (ALL, PENDING, FINISHED)')
  .option('--start-date <date>', '开始日期 (YYYY-MM-DD)')
  .option('--end-date <date>', '结束日期 (YYYY-MM-DD)')
  .action(async (options) => {
    try {
      const params: any = {};
      if (options.status) params.status = options.status;
      if (options.startDate || options.endDate) {
        params.dateRange = {};
        if (options.startDate) params.dateRange.startDate = options.startDate;
        if (options.endDate) params.dateRange.endDate = options.endDate;
      }
      
      const result = await searchHotelOrders(Object.keys(params).length > 0 ? params : undefined);
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error('查询订单失败:', error.message);
      process.exit(1);
    }
  });

// 7. 查询订单详情
program
  .command('order-detail <orderNo>')
  .description('查询订单详情')
  .action(async (orderNo) => {
    try {
      const result = await getHotelOrderDetail({ orderNo });
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error('查询订单详情失败:', error.message);
      process.exit(1);
    }
  });

// 8. 初始化配置
program
  .command('init')
  .description('初始化配置 (自动在用户主目录生成并合并全局 .env 文件，用于配置 MCP 和 OAuth 服务地址等环境变量)')
  .option('--mcp-base-url <url>', 'MCP Base URL')
  .option('--oauth-server-url <url>', 'OAuth Server URL')
  .option('--oauth-authorize-url <url>', 'OAuth Authorize URL')
  .option('--client-id <id>', 'Client ID')
  .action((options) => {
    try {
      const configDir = path.join(os.homedir(), '.hotel-cli');
      const envPath = path.join(configDir, '.env');
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      let existingEnv: Record<string, string> = {};
      if (fs.existsSync(envPath)) {
         existingEnv = dotenv.parse(fs.readFileSync(envPath, 'utf8'));
      }
      
      const newEnv = {
        ...existingEnv,
        ...(options.mcpBaseUrl && { MCP_BASE_URL: options.mcpBaseUrl }),
        ...(options.oauthServerUrl && { OAUTH_SERVER_URL: options.oauthServerUrl }),
        ...(options.oauthAuthorizeUrl && { OAUTH_AUTHORIZE_URL: options.oauthAuthorizeUrl }),
        ...(options.clientId && { CLIENT_ID: options.clientId }),
      };

      const envContent = Object.entries(newEnv)
        .map(([k, v]) => `${k}=${v}`)
        .join('\n') + '\n';
        
      fs.writeFileSync(envPath, envContent, 'utf8');
      console.log(`配置已成功写入: ${envPath}`);
    } catch (error: any) {
      console.error('配置初始化失败:', error.message);
      process.exit(1);
    }
  });

// 9. 更新 CLI
program
  .command('update')
  .description('更新 CLI 工具到最新版本')
  .action(() => {
    try {
      console.log('正在更新 @rollinggo/hotel 到最新版本...');
      execSync('npm install -g @rollinggo/hotel@latest', { stdio: 'inherit' });
      console.log('更新成功！');
    } catch (error: any) {
      console.error('更新失败:', error.message);
      process.exit(1);
    }
  });

program.parse();
