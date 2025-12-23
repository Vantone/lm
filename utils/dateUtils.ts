/**
 * 日期工具函数 - 统一处理上海时间
 */

/**
 * 获取上海时间的日期字符串 (YYYY-MM-DD格式)
 * @param daysOffset 偏移天数，正数表示未来，负数表示过去
 * @returns 上海时间的日期字符串
 */
export const getShanghaiDateString = (daysOffset: number = 0): string => {
  const now = new Date();
  // 计算带偏移的时间
  const targetDate = new Date(now.getTime() + daysOffset * 24 * 60 * 60 * 1000);
  
  // 转换为上海时间 (UTC+8)
  const shanghaiTime = new Date(targetDate.toLocaleString("en-US", { timeZone: "Asia/Shanghai" }));
  
  // 格式化为 YYYY-MM-DD
  const year = shanghaiTime.getFullYear();
  const month = String(shanghaiTime.getMonth() + 1).padStart(2, '0');
  const day = String(shanghaiTime.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * 获取上海时间的日期时间字符串 (YYYY-MM-DD HH:mm:ss格式)
 * @returns 上海时间的日期时间字符串
 */
export const getShanghaiDateTimeString = (): string => {
  const now = new Date();
  
  // 转换为上海时间 (UTC+8)
  const shanghaiTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Shanghai" }));
  
  // 格式化为 YYYY-MM-DD HH:mm:ss
  const year = shanghaiTime.getFullYear();
  const month = String(shanghaiTime.getMonth() + 1).padStart(2, '0');
  const day = String(shanghaiTime.getDate()).padStart(2, '0');
  const hours = String(shanghaiTime.getHours()).padStart(2, '0');
  const minutes = String(shanghaiTime.getMinutes()).padStart(2, '0');
  const seconds = String(shanghaiTime.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

/**
 * 获取上海时间的ISO字符串
 * @returns 上海时间的ISO字符串
 */
export const getShanghaiISOString = (): string => {
  const now = new Date();
  
  // 转换为上海时间 (UTC+8)
  const shanghaiTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Shanghai" }));
  
  return shanghaiTime.toISOString();
};