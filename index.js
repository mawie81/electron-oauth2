const Promise = require('pinkie-promise');
const queryString = require('querystring');
const fetch = require('node-fetch');
const objectAssign = require('object-assign');
const nodeUrl = require('url');
const {BrowserWindow} = require('electron');

module.exports = function (config, windowParams) {
  function getAuthorizationCode(opts) {
    opts = opts || {};
    var urlParams = {
      response_type: 'code',
      redirect_uri: config.redirectUri || 'urn:ietf:wg:oauth:2.0:oob',
      client_id: config.clientId
    };

    if (opts.scope) {
      urlParams.scope = opts.scope;
    }

    if (opts.accessType) {
      urlParams.access_type = opts.accessType;
    }

    var url = config.authorizationUrl + '?' + queryString.stringify(urlParams);

    return new Promise(function (resolve, reject) {
      const authWindow = new BrowserWindow(windowParams || {'use-content-size': true});

      authWindow.loadURL(url);
      authWindow.show();

      authWindow.on('closed', () => {
        reject(new Error('window was closed by user'));
      });

      authWindow.webContents.on('did-get-redirect-request', (event, oldUrl, newUrl) => {
        var url_parts = nodeUrl.parse(newUrl, true);
        var query = url_parts.query;
        var code = query.code;
        var error = query.error;

        if (error !== undefined) {
          reject(error);
          authWindow.removeAllListeners('closed');
          authWindow.destroy();
        } else if (code) {
          resolve(code);
          authWindow.removeAllListeners('closed');
          authWindow.destroy();
        }
      });
    });
  }

  function tokenRequest(data) {
    const header = {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded'
    };

    if (config.useBasicAuthorizationHeader) {
      header.Authorization = 'Basic ' + new Buffer(config.clientId + ':' + config.clientSecret).toString('base64');
    } else {
      objectAssign(data, {
        client_id: config.clientId,
        client_secret: config.clientSecret
      });
    }

    return fetch(config.tokenUrl, {
      method: 'POST',
      headers: header,
      body: queryString.stringify(data)
    }).then(res => {
      return res.json();
    });
  }

  function getAccessToken(opts) {
    return getAuthorizationCode(opts)
      .then(authorizationCode => {
        return tokenRequest({
          code: authorizationCode,
          grant_type: 'authorization_code',
          redirect_uri: 'urn:ietf:wg:oauth:2.0:oob'
        });
      });
  }

  function refreshToken(refreshToken) {
    return tokenRequest({
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
      redirect_uri: 'urn:ietf:wg:oauth:2.0:oob'
    });
  }

  return {
    getAuthorizationCode: getAuthorizationCode,
    getAccessToken: getAccessToken,
    refreshToken: refreshToken
  };
};
