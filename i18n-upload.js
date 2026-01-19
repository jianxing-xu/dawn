const path = require('path');
const fs = require('fs/promises');
const fsSync = require('fs');
const zlib = require('zlib');

/**
 * 将嵌套的 JSON 对象扁平化为点号分隔的键值对
 * @param {Object} obj - 嵌套的对象
 * @param {string} prefix - 键名前缀
 * @returns {Object} 扁平化的键值对对象
 */
function flattenJson(obj, prefix = '') {
  const result = {};

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      // 递归处理嵌套对象
      Object.assign(result, flattenJson(value, newKey));
    } else {
      // 基本类型或数组，直接赋值
      result[newKey] = value;
    }
  }

  return result;
}

/**
 * 移除 JSON 字符串中的注释（支持单行 // 和多行 /* 注释）
 * @param {string} jsonString - 包含注释的 JSON 字符串
 * @returns {string} 移除注释后的 JSON 字符串
 */
function removeJsonComments(jsonString) {
  let result = '';
  let inString = false;
  let inSingleLineComment = false;
  let inMultiLineComment = false;
  let stringChar = null;

  for (let i = 0; i < jsonString.length; i++) {
    const char = jsonString[i];
    const nextChar = jsonString[i + 1];

    // 处理字符串状态
    if (!inSingleLineComment && !inMultiLineComment) {
      if ((char === '"' || char === "'") && (i === 0 || jsonString[i - 1] !== '\\')) {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
          stringChar = null;
        }
      }
    }

    // 在字符串内，直接保留
    if (inString) {
      result += char;
      continue;
    }

    // 处理单行注释开始
    if (!inMultiLineComment && char === '/' && nextChar === '/') {
      inSingleLineComment = true;
      i++; // 跳过第二个 /
      continue;
    }

    // 处理单行注释结束（换行）
    if (inSingleLineComment && (char === '\n' || char === '\r')) {
      inSingleLineComment = false;
      result += char; // 保留换行符
      continue;
    }

    // 处理多行注释开始
    if (!inSingleLineComment && char === '/' && nextChar === '*') {
      inMultiLineComment = true;
      i++; // 跳过 *
      continue;
    }

    // 处理多行注释结束
    if (inMultiLineComment && char === '*' && nextChar === '/') {
      inMultiLineComment = false;
      i++; // 跳过 /
      continue;
    }

    // 如果在注释中，跳过字符
    if (inSingleLineComment || inMultiLineComment) {
      continue;
    }

    // 正常字符，添加到结果
    result += char;
  }

  return result;
}

/**
 * 读取 JSON 文件（支持带注释的 JSON）
 * @param {string} filePath - 文件路径
 * @returns {Promise<Object>} JSON 对象
 */
async function readJsonFile(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  const cleanedContent = removeJsonComments(content);
  return JSON.parse(cleanedContent);
}

/**
 * 获取目录下所有语言的 JSON 文件
 * @returns {Promise<Object>} 文件路径数组
 * @returns {Array<string>} langFiles - 语言文件路径数组
 * @returns {Array<string>} schemaFiles - schema文件路径数组
 */
async function getLangFiles() {
  const files = await fs.readdir(path.join(__dirname, 'locales'));
  const langFiles = [];
  const schemaFiles = [];
  files.forEach((f) => {
    if (f.endsWith('.schema.json') || f.endsWith('.default.schema.json')) {
      schemaFiles.push(f);
    } else {
      langFiles.push(f);
    }
  });
  return {
    langFiles,
    schemaFiles,
  };
}

/**
 * 转义 XML 特殊字符
 * @param {string} value - 要转义的值
 * @returns {string} 转义后的值
 */
function escapeXml(value) {
  const strValue = String(value);
  return strValue
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * 将二维数组转换为 Excel XML Spreadsheet 格式
 * @param {Array<Array<string>>} rows - 二维数组数据
 * @returns {string} Excel XML 格式字符串
 */
function arrayToExcelXml(rows) {
  let xml = '<?xml version="1.0"?>\n';
  xml += '<?mso-application progid="Excel.Sheet"?>\n';
  xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"\n';
  xml += ' xmlns:o="urn:schemas-microsoft-com:office:office"\n';
  xml += ' xmlns:x="urn:schemas-microsoft-com:office:excel"\n';
  xml += ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"\n';
  xml += ' xmlns:html="http://www.w3.org/TR/REC-html40">\n';

  // 添加文档属性
  xml += ' <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">\n';
  xml += '  <Version>16.00</Version>\n';
  xml += ' </DocumentProperties>\n';

  // 添加 Excel 工作簿属性
  xml += ' <ExcelWorkbook xmlns="urn:schemas-microsoft-com:office:excel">\n';
  xml += '  <WindowHeight>8000</WindowHeight>\n';
  xml += '  <WindowWidth>15000</WindowWidth>\n';
  xml += '  <WindowTopX>0</WindowTopX>\n';
  xml += '  <WindowTopY>0</WindowTopY>\n';
  xml += '  <ProtectStructure>False</ProtectStructure>\n';
  xml += '  <ProtectWindows>False</ProtectWindows>\n';
  xml += ' </ExcelWorkbook>\n';

  // 添加样式
  xml += ' <Styles>\n';
  xml += '  <Style ss:ID="Default" ss:Name="Normal">\n';
  xml += '   <Alignment ss:Vertical="Bottom"/>\n';
  xml += '   <Borders/>\n';
  xml += '   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#000000"/>\n';
  xml += '   <Interior/>\n';
  xml += '   <NumberFormat/>\n';
  xml += '   <Protection/>\n';
  xml += '  </Style>\n';
  xml += '  <Style ss:ID="Header">\n';
  xml += '   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#000000" ss:Bold="1"/>\n';
  xml += '  </Style>\n';
  xml += ' </Styles>\n';

  xml += ' <Worksheet ss:Name="Sheet1">\n';
  xml +=
    '  <Table ss:ExpandedColumnCount="' +
    Math.max(...rows.map((row) => row.length)) +
    '" ss:ExpandedRowCount="' +
    rows.length +
    '" x:FullColumns="1" x:FullRows="1" ss:DefaultRowHeight="15">\n';

  // 添加数据行
  rows.forEach((row, rowIndex) => {
    xml += '   <Row>\n';
    row.forEach((cell) => {
      const cellValue = cell === undefined || cell === null ? '' : String(cell);
      // 第一行使用 Header 样式
      const styleId = rowIndex === 0 ? ' ss:StyleID="Header"' : '';
      xml += '    <Cell' + styleId + '><Data ss:Type="String">' + escapeXml(cellValue) + '</Data></Cell>\n';
    });
    xml += '   </Row>\n';
  });

  xml += '  </Table>\n';
  xml += '  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">\n';
  xml += '   <PageSetup>\n';
  xml += '    <Header x:Margin="0.3"/>\n';
  xml += '    <Footer x:Margin="0.3"/>\n';
  xml += '    <PageMargins x:Bottom="0.75" x:Left="0.7" x:Right="0.7" x:Top="0.75"/>\n';
  xml += '   </PageSetup>\n';
  xml += '   <Print>\n';
  xml += '    <ValidPrinterInfo/>\n';
  xml += '    <HorizontalResolution>600</HorizontalResolution>\n';
  xml += '    <VerticalResolution>600</VerticalResolution>\n';
  xml += '   </Print>\n';
  xml += '   <Selected/>\n';
  xml += '   <Panes>\n';
  xml += '    <Pane>\n';
  xml += '     <Number>3</Number>\n';
  xml += '     <ActiveRow>0</ActiveRow>\n';
  xml += '     <ActiveCol>0</ActiveCol>\n';
  xml += '    </Pane>\n';
  xml += '   </Panes>\n';
  xml += '   <ProtectObjects>False</ProtectObjects>\n';
  xml += '   <ProtectScenarios>False</ProtectScenarios>\n';
  xml += '  </WorksheetOptions>\n';
  xml += ' </Worksheet>\n';
  xml += '</Workbook>\n';

  return xml;
}

/**
 * 将数据保存为 Excel XLS 文件
 * @param {string} fileName - 文件名
 * @param {Array<Array<string>>} values - 要保存的数据（二维数组）
 */
async function saveToXls(fileName, values) {
  const xlsContent = arrayToExcelXml(values);
  const filePath = path.join(__dirname, fileName);
  await fs.writeFile(filePath, xlsContent, 'utf8');
  console.log(`  ✓ 已保存到: ${filePath}`);
}

/**
 * 将列索引转换为 Excel 列名（A, B, ..., Z, AA, AB, ...）
 * @param {number} colIndex - 列索引（从 0 开始）
 * @returns {string} Excel 列名
 */
function getExcelColumnName(colIndex) {
  let columnName = '';
  let index = colIndex;

  while (index >= 0) {
    columnName = String.fromCharCode(65 + (index % 26)) + columnName;
    index = Math.floor(index / 26) - 1;
  }

  return columnName;
}

/**
 * 生成 XLSX 文件所需的 XML 内容
 */
function generateXlsxFiles(rows) {
  // [Content_Types].xml
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
</Types>`;

  // _rels/.rels
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  // xl/_rels/workbook.xml.rels
  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
</Relationships>`;

  // xl/workbook.xml
  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>
<sheet name="Sheet1" sheetId="1" r:id="rId1"/>
</sheets>
</workbook>`;

  // xl/styles.xml
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="2">
<font><sz val="11"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><name val="Calibri"/></font>
</fonts>
<fills count="1">
<fill><patternFill patternType="none"/></fill>
</fills>
<borders count="1">
<border><left/><right/><top/><bottom/><diagonal/></border>
</borders>
<cellXfs count="2">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
</cellXfs>
</styleSheet>`;

  // 构建 sharedStrings
  const stringMap = new Map();
  const strings = [];
  rows.forEach((row) => {
    row.forEach((cell) => {
      const str = cell === undefined || cell === null ? '' : String(cell);
      if (!stringMap.has(str)) {
        stringMap.set(str, strings.length);
        strings.push(str);
      }
    });
  });

  let sharedStrings = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${strings.length}" uniqueCount="${strings.length}">`;
  strings.forEach((str) => {
    sharedStrings += `<si><t>${escapeXml(str)}</t></si>`;
  });
  sharedStrings += `</sst>`;

  // xl/worksheets/sheet1.xml
  let worksheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetData>`;

  rows.forEach((row, rowIndex) => {
    worksheet += `<row r="${rowIndex + 1}">`;
    row.forEach((cell, colIndex) => {
      const cellRef = getExcelColumnName(colIndex) + (rowIndex + 1);
      const str = cell === undefined || cell === null ? '' : String(cell);
      const stringIndex = stringMap.get(str);
      // 第一行使用样式 1（粗体），其他行使用样式 0
      const styleId = rowIndex === 0 ? '1' : '0';
      worksheet += `<c r="${cellRef}" s="${styleId}" t="s"><v>${stringIndex}</v></c>`;
    });
    worksheet += `</row>`;
  });

  worksheet += `</sheetData></worksheet>`;

  return {
    '[Content_Types].xml': contentTypes,
    '_rels/.rels': rels,
    'xl/_rels/workbook.xml.rels': workbookRels,
    'xl/workbook.xml': workbook,
    'xl/styles.xml': styles,
    'xl/sharedStrings.xml': sharedStrings,
    'xl/worksheets/sheet1.xml': worksheet,
  };
}

/**
 * 创建简单的 ZIP 文件（用于 XLSX）
 */
async function createZip(files, outputPath) {
  // 创建临时目录
  const tempDir = path.join(__dirname, '.temp_xlsx_' + Date.now());
  await fs.mkdir(tempDir, { recursive: true });

  try {
    // 写入所有文件
    for (const [filePath, content] of Object.entries(files)) {
      const fullPath = path.join(tempDir, filePath);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content, 'utf8');
    }

    // 使用系统 zip 命令创建 zip 文件
    const { execSync } = require('child_process');
    const currentDir = process.cwd();
    process.chdir(tempDir);

    try {
      execSync(`zip -r -q "${outputPath}" .`, { stdio: 'pipe' });
    } catch (error) {
      // 如果系统没有 zip 命令，尝试使用 PowerShell（Windows）
      try {
        execSync(`powershell Compress-Archive -Path * -DestinationPath "${outputPath}" -Force`, { stdio: 'pipe' });
      } catch {
        throw new Error('无法创建 ZIP 文件。请确保系统安装了 zip 命令或使用 Windows PowerShell。');
      }
    }

    process.chdir(currentDir);
  } finally {
    // 清理临时目录
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

/**
 * 将数据保存为 Excel XLSX 文件
 * @param {string} fileName - 文件名
 * @param {Array<Array<string>>} values - 要保存的数据（二维数组）
 */
async function saveToXlsx(fileName, values) {
  const filePath = path.join(__dirname, fileName);
  const files = generateXlsxFiles(values);
  await createZip(files, filePath);
  console.log(`  ✓ 已保存到: ${filePath}`);
}

/**
 * 从多个语言的 JSON 文件构建表格数据并生成 XLSX 文件
 * @param {string} xlsxFileName - XLSX 文件名
 * @param {Array<string>} files - 文件路径数组
 */
async function generateXlsxFile(xlsxFileName, files) {
  console.log(`\n处理文件生成: ${xlsxFileName}`);

  // 1. 读取并扁平化所有语言的 JSON 数据
  const languageData = new Map(); // lang => flatData
  const allKeys = new Set();

  for (const file of files) {
    // 从文件名提取语言代码
    // en.default.json -> en.default
    // en.schema.default.json -> en.schema.default
    // fr.json -> fr
    // fr.schema.json -> fr.schema
    const lang = file.slice(0, [file.lastIndexOf('.')]);
    const filePath = path.join(__dirname, 'locales', file);

    console.log(`  读取文件: ${file} (语言: ${lang})`);
    const jsonData = await readJsonFile(filePath);
    const flatData = flattenJson(jsonData);

    languageData.set(lang, flatData);

    // 收集所有的键
    for (const key of Object.keys(flatData)) {
      allKeys.add(key);
    }
  }

  console.log(`  共收集 ${allKeys.size} 个唯一键`);

  // 2. 构建表格数据
  const languages = Array.from(languageData.keys()).sort(); // 排序语言列表
  const headers = ['KEY', ...languages];
  const rows = [headers];

  // 按键排序，构建每一行
  const sortedKeys = Array.from(allKeys).sort();
  for (const key of sortedKeys) {
    const row = [key];

    for (const lang of languages) {
      const flatData = languageData.get(lang);
      const value = flatData[key];

      if (value !== undefined && value !== null) {
        // 将值转换为字符串（处理数组和对象）
        row.push(typeof value === 'object' ? JSON.stringify(value) : String(value));
      } else {
        row.push(''); // 该语言没有这个键的翻译
      }
    }

    rows.push(row);
  }

  console.log(`  构建完成: ${rows.length - 1} 行数据 x ${headers.length} 列`);

  // 3. 保存为 XLSX 文件
  await saveToXlsx(xlsxFileName, rows);
}

/**
 * 主函数
 */
async function main() {
  try {
    console.log('开始生成 i18n XLSX 文件...\n');

    const { langFiles, schemaFiles } = await getLangFiles();

    // 生成普通翻译文件的 XLSX
    await generateXlsxFile('i18n-store.xlsx', langFiles);

    // 生成 schema 翻译文件的 XLSX
    await generateXlsxFile('i18n-schema.xlsx', schemaFiles);

    console.log('\n✓ 所有 XLSX 文件生成完成！');
  } catch (error) {
    console.error('生成失败:', error);
    process.exit(1);
  }
}

main();
