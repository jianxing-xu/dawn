const path = require('path');
const fs = require('fs/promises');
const https = require('https');

const shopifySchemaSheetId = 'st-b58f7fed-78516';
const shopifyStoreSheetId = 'st-b58f7fed-78509';
const getTokenUrl =
  'https://oapi.dingtalk.com/gettoken?appkey=dingoofet1l8gwrvzjw4&appsecret=TnFv8k414xJfB1peKeHThZm5WccRou8QlXjmyGo61i1kalZELySFzbNN4xrzKZDQ';

/**
 * 使用原生 https 模块发送 GET 请求
 * @param {string} url - 请求 URL
 * @param {Object} options - 请求选项（headers 等）
 * @returns {Promise<Object>} 响应的 JSON 数据
 */
function httpsGet(url, options = {}) {
  return new Promise((resolve, reject) => {
    https
      .get(url, options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (err) {
            reject(new Error(`Failed to parse JSON: ${err.message}`));
          }
        });
      })
      .on('error', (err) => {
        reject(err);
      });
  });
}

async function getToken() {
  const data = await httpsGet(getTokenUrl);
  console.log(`dingding token:`, data.access_token);
  return data.access_token;
}

async function getDingDingExcel(sheetId) {
  const token = await getToken();
  console.log('fetching dingding excel data...');

  const url = `https://api.dingtalk.com/v1.0/doc/workbooks/pLdn5gYvwYojOo83/sheets/${sheetId}/ranges/A:H?operatorId=NXGiSas9kHxl8HRf5w7NmjQiEiE&select=values`;

  const options = {
    headers: {
      'x-acs-dingtalk-access-token': token,
    },
  };

  const data = await httpsGet(url, options);
  return data.values;
}

/**
 * 将点号分隔的 key 设置到嵌套对象中
 * @param {Object} obj - 目标对象
 * @param {string} key - 点号分隔的键名，如 "sidebar.account"
 * @param {string} value - 要设置的值
 */
function setNestedValue(obj, key, value) {
  const keys = key.split('.');
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (!current[k]) {
      current[k] = {};
    }
    current = current[k];
  }

  current[keys[keys.length - 1]] = value;
}

/**
 * 将钉钉表格数据转换为按语言分组的 JSON 对象
 * @param {Array<Array<string>>} data - 钉钉表格数据
 * @returns {Object} 按语言分组的嵌套对象
 */
function transformToJson(data) {
  if (!data || data.length === 0) {
    return {};
  }

  // 第一行是表头
  const headers = data[0];
  const result = {};

  // 初始化每个语言的对象（跳过第一列 KEY）
  for (let i = 1; i < headers.length; i++) {
    result[headers[i]] = {};
  }

  // 处理数据行（从第二行开始）
  for (let rowIndex = 1; rowIndex < data.length; rowIndex++) {
    const row = data[rowIndex];
    const key = row[0]; // 第一列是 KEY

    if (!key) continue; // 跳过空行

    // 遍历每个语言列
    for (let colIndex = 1; colIndex < headers.length && colIndex < row.length; colIndex++) {
      const lang = headers[colIndex];
      const value = row[colIndex];

      if (value !== undefined && value !== null && value !== '') {
        setNestedValue(result[lang], key, value);
      }
    }
  }

  return result;
}

/**
 * 将翻译数据写入 locales 目录
 * @param {Object} jsonData - 按语言分组的数据
 */
async function writeToJson(jsonData) {
  const localesDir = path.join(__dirname, 'locales');

  // 确保 locales 目录存在
  try {
    await fs.mkdir(localesDir, { recursive: true });
  } catch (err) {
    // 目录已存在，忽略错误
  }

  // 遍历每个语言，写入对应的文件
  for (const [lang, translations] of Object.entries(jsonData)) {
    const filePath = path.join(localesDir, `${lang}.json`);
    const content = JSON.stringify(translations, null, 2);
    await fs.writeFile(filePath, content, 'utf8');
    console.log(`✓ 已写入: ${filePath}`);
  }
}

/**
 * 主函数：从钉钉获取数据，转换并写入文件
 */
async function main() {
  try {
    console.log('开始同步 i18n 数据...\n');

    for await (const sheetId of [shopifySchemaSheetId, shopifyStoreSheetId]) {
      // 1. 获取钉钉表格数据
      const excelData = await getDingDingExcel(sheetId);
      console.log(`获取到 ${excelData.length} 行数据\n`);

      // 2. 转换为 JSON 格式
      const jsonData = transformToJson(excelData);
      console.log(`转换完成，包含语言: ${Object.keys(jsonData).join(', ')}\n`);

      // 3. 写入文件
      await writeToJson(jsonData);
    }

    console.log('\n✓ i18n 数据同步完成！');
  } catch (error) {
    console.error('同步失败:', error);
    process.exit(1);
  }
}

main();
