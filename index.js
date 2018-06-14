require('dotenv').config();

const { parse: parseURL } = require('url');
const { parse: parseQS } = require('querystring');
const google = require('googleapis');
const { send } = require('micro');
const { Z_BEST_COMPRESSION } = require('zlib');
const compress = require('micro-compress');
const crypto = require('crypto');
const sentry = require('micro-sentry');

const { email, spreadsheetId, sentry: sentryURL } = process.env;

const sheets = google.sheets('v4');

const decrypt = text => {
  const decipher = crypto.createDecipher('aes-256-ctr', process.env.password);
  let dec = decipher.update(text, 'hex', 'utf8');
  dec += decipher.final('utf8');
  return dec;
};

const key = decrypt(process.env.key);

const handler = async (req, res) => {
  const { query } = parseURL(req.url);
  const { address } = parseQS(query);

  if (!address) {
    return send(res, 404, 'Address required');
  }

  const jwtClient = new google.auth.JWT(
    email,
    null,
    key,
    ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    null
  );

  jwtClient.authorize(err => {
    if (err) {
      throw new Error(err);
    }

    const request = {
      spreadsheetId,
      range: 'B:B',
      auth: jwtClient
    };

    sheets.spreadsheets.values.get(request, (err, response) => {
      if (err) {
        throw new Error(err);
      }

      const { values } = response;

      for (const [value] of values) {
        if (value === address.toUpperCase()) {
          return send(res, 200, {
            controlled: true
          });
        }
      }

      return send(res, 200, {
        controlled: false
      });
    });
  });
};

const withSentry = sentry(sentryURL)(handler);

const withCompression = compress(
  { level: Z_BEST_COMPRESSION },
  withSentry
);

module.exports = withCompression;