#!/usr/bin/env node

import { Command } from 'commander';
import { login, logout, isLoggedIn, loadToken } from './auth.js';
import {
  getHotelSearchTags,
  searchHotels,
  getHotelDetail,
  hotelPriceConfirm,
  createHotelBooking,
  searchHotelOrders,
} from './api.js';
import { DEFAULTS, PLACE_TYPES } from './constants.js';
import { checkForUpdates } from './version-check.js';
import pkg from '../package.json' with { type: 'json' };

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
      console.error('❌ 登录失败:', error.message);
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
  .command('whoami')
  .description('查看当前登录状态')
  .action(() => {
    if (isLoggedIn()) {
      const token = loadToken();
      console.log('✅ 已登录');
      if (token?.user) {
        console.log(`   用户: ${token.user}`);
      }
    } else {
      console.log('❌ 未登录，请先执行 rgh login');
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
      console.error('❌ 获取标签失败:', error.message);
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
  .option('--country-code <code>', '国家代码')
  .option('--size <n>', '返回数量', String(DEFAULTS.SIZE))
  .option('--check-in-date <date>', '入住日期 YYYY-MM-DD')
  .option('--stay-nights <n>', '入住晚数', String(DEFAULTS.STAY_NIGHTS))
  .option('--adult-count <n>', '每间房成人数', String(DEFAULTS.ADULT_COUNT))
  .option('--star-ratings <min,max>', '星级范围')
  .option('--distance-in-meter <m>', '距离限制（米）')
  .option('--preferred-tag <tag>', '偏好标签（可多次使用）')
  .option('--required-tag <tag>', '必须标签（可多次使用）')
  .option('--excluded-tag <tag>', '排除标签（可多次使用）')
  .option('--max-price-per-night <price>', '每晚最高价格')
  .action(async (options) => {
    try {
      const params: any = {
        originQuery: options.originQuery,
        place: options.place,
        placeType: options.placeType,
      };

      if (options.countryCode) params.countryCode = options.countryCode;
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
      const preferredTags = program.opts().preferredTag
        ? Array.isArray(program.opts().preferredTag)
          ? program.opts().preferredTag
          : [program.opts().preferredTag]
        : [];
      const requiredTags = program.opts().requiredTag
        ? Array.isArray(program.opts().requiredTag)
          ? program.opts().requiredTag
          : [program.opts().requiredTag]
        : [];
      const excludedTags = program.opts().excludedTag
        ? Array.isArray(program.opts().excludedTag)
          ? program.opts().excludedTag
          : [program.opts().excludedTag]
        : [];

      if (preferredTags.length || requiredTags.length || excludedTags.length || options.maxPricePerNight) {
        params.hotelTags = {};
        if (preferredTags.length) params.hotelTags.preferredTags = preferredTags;
        if (requiredTags.length) params.hotelTags.requiredTags = requiredTags;
        if (excludedTags.length) params.hotelTags.excludedTags = excludedTags;
        if (options.maxPricePerNight) params.hotelTags.maxPricePerNight = parseFloat(options.maxPricePerNight);
      }

      const result = await searchHotels(params);
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error('❌ 搜索失败:', error.message);
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
  .option('--country-code <code>', '国家代码', DEFAULTS.COUNTRY_CODE)
  .option('--currency <currency>', '币种', DEFAULTS.CURRENCY)
  .action(async (options) => {
    try {
      if (!options.hotelId && !options.name) {
        console.error('❌ 请提供 --hotel-id 或 --name');
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

      params.localeParam = {
        countryCode: options.countryCode,
        currency: options.currency,
      };

      const result = await getHotelDetail(params);
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error('❌ 获取详情失败:', error.message);
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
  .option('--nationality <code>', '国籍代码', DEFAULTS.NATIONALITY)
  .option('--currency <currency>', '币种', DEFAULTS.CURRENCY)
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
        localeParam: {
          nationality: options.nationality,
          currency: options.currency,
        },
      });
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error('❌ 价格确认失败:', error.message);
      process.exit(1);
    }
  });

// 5. 创建订单
program
  .command('book')
  .description('创建酒店订单')
  .requiredOption('--reference-no <no>', '预订参考号')
  .requiredOption('--first-name <name>', '联系人名')
  .requiredOption('--last-name <name>', '联系人姓')
  .requiredOption('--email <email>', '联系邮箱')
  .option('--guests <json>', '客人信息 JSON')
  .option('--scene <scene>', '支付场景：PC_WEB / MOBILE_WEB', DEFAULTS.ALIPAY_SCENE)
  .action(async (options) => {
    try {
      let guestList;
      if (options.guests) {
        guestList = JSON.parse(options.guests);
      } else {
        // 默认：联系人作为唯一客人
        guestList = [
          {
            roomNum: 1,
            guestInfo: [
              {
                firstName: options.firstName,
                lastName: options.lastName,
                isAdult: true,
              },
            ],
          },
        ];
      }

      const result = await createHotelBooking({
        referenceNo: options.referenceNo,
        contact: {
          firstName: options.firstName,
          lastName: options.lastName,
          email: options.email,
        },
        guestList,
        alipayUrlScene: options.scene,
      });
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error('❌ 下单失败:', error.message);
      process.exit(1);
    }
  });

// 6. 查询订单
program
  .command('orders')
  .description('查询订单列表')
  .action(async () => {
    try {
      const result = await searchHotelOrders();
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error('❌ 查询订单失败:', error.message);
      process.exit(1);
    }
  });

program.parse();
