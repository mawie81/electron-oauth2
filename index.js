'use strict';

const Promise = require('pinkie-promise');
const queryString = require('querystring');
const fetch = require('node-fetch');
const objectAssign = require('object-assign');
const nodeUrl = require('url');
const electron = require('electron');
const BrowserWindow = electron.BrowserWindow || electron.remote.BrowserWindow;

var generateRandomString = function (length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }

  return text;
};

module.exports = function (config, windowParams) {
  function getAuthorizationCode(opts) {
    opts = opts || {};

    if (!config.redirectUri) {
      config.redirectUri = 'urn:ietf:wg:oauth:2.0:oob';
    }

    var urlParams = {
      response_type: 'code',
      redirect_uri: config.redirectUri,
      client_id: config.clientId,
      state: generateRandomString(16)
    };

    if (opts.scope) {
      urlParams.scope = opts.scope;
    }

    if (opts.accessType) {
      urlParams.access_type = opts.accessType;
    }

    var url = config.authorizationUrl + '?' + queryString.stringify(urlParams);

    return new Promise(function (resolve, reject) {
      const authWindow = new BrowserWindow(windowParams || { 'use-content-size': true });

      let receivedCode = false;
      let receivedError = false;

      authWindow.loadURL(url);
      authWindow.show();

      authWindow.on('closed', () => {
        reject(new Error('window was closed by user'));
      });

      function closeAuthWindow() {
        authWindow.removeAllListeners();
        setImmediate(function () {
          authWindow.close();
        });
      }

      function onCallback(url, err) {
        if (receivedCode || receivedError) {
          return;
        }

        if (err) {
          receivedError = true
          reject(err);
          closeAuthWindow();
          return;
        }

        var url_parts = nodeUrl.parse(url, true);
        var query = url_parts.query;
        var code = null;
        var error = query.error;

        // Grant code should be captured only from the redirect uri specified in the config
        // This allows for multiple brokers in OIDC chain which may url parameter with name code
        if ( url.startsWith(config.redirectUri + '?')
          || url.startsWith(config.redirectUri + '/?')) {
          code = query.code;
        }

        if (error !== undefined) {
          receivedError = true
          reject(error);
          closeAuthWindow();
          return;
        } else if (code) {
          receivedCode = true;
          resolve(code);
          closeAuthWindow();
          return;
        }
      }

      authWindow.webContents.on('will-navigate', (event, url) => {
        onCallback(url);
      });

      authWindow.webContents.on('did-get-redirect-request', (event, oldUrl, newUrl) => {
        onCallback(newUrl);
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
        var tokenRequestData = {
          code: authorizationCode,
          grant_type: 'authorization_code',
          redirect_uri: config.redirectUri
        };
        tokenRequestData = Object.assign(tokenRequestData, opts.additionalTokenRequestData);
        return tokenRequest(tokenRequestData);
      });
  }

  function refreshToken(refreshToken) {
    return tokenRequest({
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
      redirect_uri: config.redirectUri
    });
  }

  return {
    getAuthorizationCode: getAuthorizationCode,
    getAccessToken: getAccessToken,
    refreshToken: refreshToken
  };
};