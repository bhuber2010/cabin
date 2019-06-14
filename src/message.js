const auth = require('basic-auth');
const c = require('ansi-colors');
const clfDate = require('clf-date');
const ms = require('ms');

// https://github.com/cabinjs/request-received
const requestReceivedStartTime = Symbol.for('request-received.startTime');
const pinoHttpStartTime = Symbol.for('pino-http.startTime');

function getStartTime(req) {
  let startTime = new Date();
  if (req[requestReceivedStartTime] instanceof Date)
    startTime = req[requestReceivedStartTime];
  else if (typeof req[requestReceivedStartTime] === 'number')
    startTime = new Date(req[requestReceivedStartTime]);
  else if (req[pinoHttpStartTime]) startTime = new Date(req[pinoHttpStartTime]);
  else if (req._startTime instanceof Date) startTime = req._startTime;
  else if (typeof req._startTime === 'number')
    startTime = new Date(req._startTime);
  return startTime;
}

// https://stackoverflow.com/questions/9234699/understanding-apaches-access-log
module.exports = (level, req, res) => {
  const startTime = getStartTime(req);

  const creds = auth(req);

  // Apache Common Log Format
  // <https://httpd.apache.org/docs/current/logs.html#common>
  // :remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length]
  if (process.env.NODE_ENV === 'production')
    return `${req.ip} - ${creds ? creds.name : '-'} ${clfDate(startTime)} "${
      req.method
    } ${req.url} HTTP/${req.httpVersionMajor}.${req.httpVersionMinor}" ${
      res.statusCode
    } ${res.get('Content-Length') || '-'}`;

  // Dev-Friendly Log Format
  // :remote-addr :remote-user :method :url HTTP/:http-version :status :res[content-length] - :response-time ms
  const statusColor =
    res.statusCode >= 500
      ? 'red'
      : res.statusCode >= 400
      ? 'yellow'
      : res.statusCode >= 300
      ? 'cyan'
      : res.statusCode >= 200
      ? 'green'
      : 'white';

  let responseTime = '-';

  if (res.get('X-Response-Time')) {
    const milliseconds = ms(res.get('X-Response-Time'));
    const responseColor =
      milliseconds >= 1000
        ? 'red'
        : milliseconds >= 500
        ? 'magenta'
        : milliseconds >= 250
        ? 'yellow'
        : milliseconds >= 100
        ? 'cyan'
        : 'green';
    responseTime = c[responseColor](`${milliseconds} ms`);
  }

  return [
    req.ip,
    creds ? creds.name : '-',
    req.method,
    req.url,
    `HTTP/${req.httpVersionMajor}.${req.httpVersionMinor}`,
    c[statusColor](res.statusCode),
    res.get('Content-Length') || '-',
    '-',
    responseTime
  ].join(' ');
};
