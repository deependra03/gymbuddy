/**
 * eSSL eBioServer SOAP API client.
 * Docs: GetEmployeePunchLogs, GetEmployeeDetails, GetEmployeeCodes
 */

function getConfig() {
  return {
    apiUrl: (process.env.ESSL_API_URL || '').replace(/\/$/, ''),
    username: process.env.ESSL_API_USERNAME || '',
    password: process.env.ESSL_API_PASSWORD || '',
  };
}

function isConfigured() {
  const { apiUrl, username, password } = getConfig();
  return Boolean(apiUrl && username && password);
}

function formatSoapDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatSoapDateOnly(date) {
  const d = date instanceof Date ? date : new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

async function soapRequest(methodName, params) {
  const { apiUrl, username, password } = getConfig();
  if (!isConfigured()) {
    throw new Error('ESSL API not configured. Set ESSL_API_URL, ESSL_API_USERNAME, ESSL_API_PASSWORD');
  }

  const paramXml = Object.entries({ UserName: username, Password: password, ...params })
    .map(([key, value]) => `<${key}>${escapeXml(String(value))}</${key}>`)
    .join('');

  const body = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <${methodName} xmlns="http://tempuri.org/">
      ${paramXml}
    </${methodName}>
  </soap:Body>
</soap:Envelope>`;

  const url = apiUrl.includes('webservice.asmx')
    ? apiUrl
    : `${apiUrl}/webservice.asmx`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      SOAPAction: `http://tempuri.org/${methodName}`,
    },
    body,
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`ESSL API error (${res.status}): ${text.slice(0, 200)}`);
  }

  return text;
}

function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function extractSoapResult(xml, methodName) {
  const resultTag = `${methodName}Result`;
  const match = xml.match(new RegExp(`<${resultTag}[^>]*>([\\s\\S]*?)</${resultTag}>`, 'i'));
  if (!match) return xml;
  return match[1].trim();
}

function parseDelimitedData(raw) {
  if (!raw || raw.toLowerCase().includes('error') || raw.toLowerCase() === 'no data') {
    return [];
  }

  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  const delimiter = lines[0].includes('\t') ? '\t' : ',';
  const headerLine = lines[0].toLowerCase();
  const hasHeader =
    headerLine.includes('employee') ||
    headerLine.includes('logdate') ||
    headerLine.includes('punch');

  const dataLines = hasHeader ? lines.slice(1) : lines;
  const headers = hasHeader
    ? lines[0].split(delimiter).map((h) => h.trim())
    : ['EmployeeCode', 'EmployeeName', 'LogDate', 'SerialNumber', 'Direction', 'VerificationType'];

  return dataLines.map((line, index) => {
    const cols = line.split(delimiter).map((c) => c.trim());
    const row = {};
    headers.forEach((h, i) => {
      row[h] = cols[i] ?? '';
    });
    row._rowIndex = index;
    return row;
  });
}

function normalizePunchRow(row) {
  const employeeCode =
    row.EmployeeCode ||
    row.EmployeeID ||
    row.employeeCode ||
    row.employee_code ||
    row.EnrollNumber ||
    row.enrollNumber;

  const logDate =
    row.LogDate ||
    row.PunchTime ||
    row.logDate ||
    row.punch_time ||
    row.DateTime;

  const serialNumber =
    row.SerialNumber ||
    row.DeviceSerial ||
    row.serialNumber ||
    row.device_serial ||
    '';

  const direction =
    row.Direction ??
    row.direction ??
    row.InOut ??
    row.inOut ??
    null;

  const verificationType =
    row.VerificationType ||
    row.verificationType ||
    row.VerifyType ||
    '';

  const logId =
    row.LogId ||
    row.logId ||
    row.TransactionId ||
    `${employeeCode}-${logDate}-${serialNumber}`;

  return {
    employeeCode: String(employeeCode || '').trim(),
    punchTime: logDate ? new Date(logDate) : null,
    deviceSerial: String(serialNumber).trim(),
    direction,
    verificationType: String(verificationType).trim(),
    externalLogId: String(logId).trim(),
    raw: row,
  };
}

async function getEmployeePunchLogs(fromDate, toDate) {
  const xml = await soapRequest('GetEmployeePunchLogs', {
    FromDate: formatSoapDateOnly(fromDate),
    ToDate: formatSoapDateOnly(toDate),
  });

  const result = extractSoapResult(xml, 'GetEmployeePunchLogs');
  const dataMatch = result.match(/<strDataSet[^>]*>([\s\S]*?)<\/strDataSet>/i);
  const rawData = dataMatch ? dataMatch[1].trim() : result;

  const rows = parseDelimitedData(decodeXmlEntities(rawData));
  return rows.map(normalizePunchRow).filter((r) => r.employeeCode && r.punchTime && !isNaN(r.punchTime));
}

async function getEmployeeDetails() {
  const xml = await soapRequest('GetEmployeeDetails', {});
  const result = extractSoapResult(xml, 'GetEmployeeDetails');
  const dataMatch = result.match(/<strDataSet[^>]*>([\s\S]*?)<\/strDataSet>/i);
  const rawData = dataMatch ? dataMatch[1].trim() : result;

  const rows = parseDelimitedData(decodeXmlEntities(rawData));
  return rows.map((row) => ({
    employeeCode: String(
      row.EmployeeCode || row.EmployeeID || row.employeeCode || ''
    ).trim(),
    name: String(row.EmployeeName || row.Name || row.name || '').trim(),
    phone: String(row.Phone || row.Mobile || row.phone || '').trim(),
    cardNumber: String(row.CardNumber || row.cardNumber || '').trim(),
    location: String(row.Location || row.location || '').trim(),
    raw: row,
  })).filter((e) => e.employeeCode);
}

function decodeXmlEntities(str) {
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

const crypto = require('crypto');

function decryptAdmsPayload(encryptedData, password) {
  if (!password || !encryptedData) return null;

  try {
    const key = password.padEnd(32, '1').slice(0, 32);
    const buffer = Buffer.from(encryptedData, 'base64');
    const iv = buffer.slice(0, 16);
    const encrypted = buffer.slice(16);

    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), iv);
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString('utf8');
  } catch (err) {
    console.error('ADMS decryption error:', err.message);
    return null;
  }
}

function normalizeWebhookLog(payload) {
  if (Array.isArray(payload)) {
    return payload.map(normalizeWebhookLog).flat();
  }

  if (payload.logs && Array.isArray(payload.logs)) {
    return payload.logs.map((log) => normalizePunchRow({
      EmployeeCode: log.EmployeeCode || log.employeeCode || log.enrollNumber,
      LogDate: log.LogDate || log.punchTime || log.timestamp,
      SerialNumber: log.SerialNumber || log.deviceSerial,
      Direction: log.Direction ?? log.direction,
      VerificationType: log.VerificationType || log.verificationType,
      LogId: log.LogId || log.id,
    }));
  }

  return [normalizePunchRow({
    EmployeeCode: payload.EmployeeCode || payload.employeeCode || payload.enrollNumber,
    LogDate: payload.LogDate || payload.punchTime || payload.timestamp,
    SerialNumber: payload.SerialNumber || payload.deviceSerial,
    Direction: payload.Direction ?? payload.direction,
    VerificationType: payload.VerificationType || payload.verificationType,
    LogId: payload.LogId || payload.id,
  })];
}

function normalizeUserRow(row) {
  return {
    employeeCode: String(
      row.EmployeeCode || row.EmployeeID || row.employeeCode || row.UserId || row.userId || ''
    ).trim(),
    name: String(row.EmployeeName || row.Name || row.name || '').trim(),
    phone: String(row.Phone || row.Mobile || row.phone || '').trim(),
    cardNumber: String(row.CardNumber || row.cardNumber || '').trim(),
    email: String(row.Email || row.email || '').trim(),
    department: String(row.Department || row.department || '').trim(),
    designation: String(row.Designation || row.designation || '').trim(),
    raw: row,
  };
}

function normalizeWebhookUser(payload) {
  if (Array.isArray(payload)) {
    return payload.map(normalizeWebhookUser).flat();
  }

  if (payload.users && Array.isArray(payload.users)) {
    return payload.users.map(normalizeUserRow);
  }

  return [normalizeUserRow(payload)];
}

module.exports = {
  getConfig,
  isConfigured,
  formatSoapDate,
  getEmployeePunchLogs,
  getEmployeeDetails,
  normalizePunchRow,
  normalizeWebhookLog,
  normalizeWebhookUser,
  decryptAdmsPayload,
};
