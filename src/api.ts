import { loadToken } from './auth.js';
import { MCP_BASE_URL, API_ENDPOINTS } from './constants.js';

// 通用请求函数
async function request(
  method: string,
  endpoint: string,
  payload?: unknown
): Promise<unknown> {
  const token = loadToken();
  if (!token?.access_token) {
    throw new Error('未登录，请先执行 rgh login');
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token.access_token}`,
    Accept: 'application/json',
  };

  if (method.toUpperCase() === 'POST') {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${MCP_BASE_URL}${endpoint}`, {
    method: method.toUpperCase(),
    headers,
    body: payload ? JSON.stringify(payload) : undefined,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`API 请求失败 (${response.status}): ${body}`);
  }

  return response.json();
}

// 1. 获取搜索标签
export async function getHotelSearchTags(): Promise<any> {
  return request('GET', API_ENDPOINTS.HOTEL_TAGS);
}

// 2. 搜索酒店
export async function searchHotels(params: {
  originQuery: string;
  place: string;
  placeType: string;
  countryCode?: string;
  size?: number;
  checkInParam?: {
    checkInDate?: string;
    stayNights?: number;
    adultCount?: number;
  };
  filterOptions?: {
    starRatings?: number[];
    distanceInMeter?: number;
  };
  hotelTags?: {
    preferredTags?: string[];
    requiredTags?: string[];
    excludedTags?: string[];
    preferredBrands?: string[];
    minRoomSize?: number;
    maxPricePerNight?: number;
  };
}): Promise<any> {
  return request('POST', API_ENDPOINTS.HOTEL_SEARCH, params);
}

// 3. 获取酒店详情
export async function getHotelDetail(params: {
  hotelId?: number;
  name?: string;
  dateParam?: {
    checkInDate?: string;
    checkOutDate?: string;
  };
  occupancyParam?: {
    roomCount?: number;
    adultCount?: number;
    childCount?: number;
    childAgeDetails?: number[];
  };
  localeParam?: {
    countryCode?: string;
    currency?: string;
  };
}): Promise<any> {
  return request('POST', API_ENDPOINTS.HOTEL_DETAIL, params);
}

// 4. 价格确认
export async function hotelPriceConfirm(params: {
  hotelID: number;
  ratePlanID: string;
  numOfRooms: number;
  dateParam: {
    checkInDate: string;
    checkOutDate: string;
  };
  occupancyDetails: Array<{
    roomNum: number;
    adultCount: number;
    childCount?: number;
    childAgeDetails?: number[];
  }>;
  localeParam?: {
    nationality?: string;
    currency?: string;
  };
}): Promise<any> {
  return request('POST', API_ENDPOINTS.PRICE_CONFIRM, params);
}

// 5. 创建订单
export async function createHotelBooking(params: {
  referenceNo: string;
  contact: {
    firstName: string;
    lastName: string;
    email: string;
  };
  guestList: Array<{
    roomNum: number;
    guestInfo: Array<{
      firstName: string;
      lastName: string;
      isAdult: boolean;
      age?: number;
    }>;
  }>;
  customerRequest?: string;
  alipayUrlScene?: 'PC_WEB' | 'MOBILE_WEB';
}): Promise<any> {
  return request('POST', API_ENDPOINTS.HOTEL_BOOK, params);
}

// 6. 查询订单列表
export async function searchHotelOrders(): Promise<any> {
  return request('GET', API_ENDPOINTS.HOTEL_ORDERS);
}
