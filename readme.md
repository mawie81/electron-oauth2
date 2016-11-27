# electron-oauth2 [![Build Status](https://travis-ci.org/mawie81/electron-oauth2.svg?branch=master)](https://travis-ci.org/mawie81/electron-oauth2)

> A library to handle OAuth2 authentication for your [Electron](http://electron.atom.io) app.


## Install

```
$ npm install --save electron-oauth2
```


## Usage

```js
const electronOauth2 = require('electron-oauth2');

var config = {
    clientId: 'CLIENT_ID',
    clientSecret: 'CLIENT_SECRET',
    authorizationUrl: 'AUTHORIZATION_URL',
    tokenUrl: 'TOKEN_URL',
    useBasicAuthorizationHeader: false,
    redirectUri: 'http://localhost'
};

app.on('ready', () => {
  const windowParams = {
    alwaysOnTop: true,
    autoHideMenuBar: true,
    webPreferences: {
        nodeIntegration: false
    }
  }

  const options = {
    scope: 'SCOPE',
    accessType: 'ACCESS_TYPE'
  };

  const myApiOauth = electronOauth2(config, windowParams);

  myApiOauth.getAccessToken(options)
    .then(token => {
      // use your token.access_token

      myApiOauth.refreshToken(token.refresh_token)
        .then(newToken => {
          //use your new token
        });
    });
});
```


## API

### electronOauth2(config, windowParams)

#### config

Type: `Object`

##### Fields

###### authorizationUrl
Type: `String`
The URL for the authorization request.

###### tokenUrl
Type: `String`
The URL for the access token request.

###### clientId
Type: `String`
The OAuth2 client id.

###### clientSecret
Type: `String`
The OAuth2 client secret.

###### useBasicAuthorizationHeader
Type: `bool`
If set to true, token requests will be made using a Basic authentication header instead of passing the client id and secret in the body.

###### redirectUri (optional)
Type: `String`
Sets a custom redirect_uri that can be required by some OAuth2 clients. 
Default: ```urn:ietf:wg:oauth:2.0:oob```

#### windowParams

Type: `Object`

An object that will be used to create the BrowserWindow. Details: [Electron BrowserWindow documention](https://github.com/atom/electron/blob/master/docs/api/browser-window.md)

### Methods

#### getAccessToken(options)

Returns a ```Promise``` that gets resolved with the retrieved access token object if the authentication succeeds.

##### options: *optional*

###### scopes
Type: `String`
The optional OAuth2 scopes.

###### accessType
Type: `String`
The optional OAuth2 access type.

###### additionalTokenRequestData
Type: `Object`
The optional additional parameters to pass to the server in the body of the token request.

#### getAuthorizationCode(options)

Returns a ```Promise``` that gets resolved with the authorization code of the OAuth2 authorization request.

##### options

###### scope
Type: `String`
The optional OAuth2 scope.

###### accessType
Type: `String`
The optional OAuth2 access type.

#### refreshToken(token)

Returns a ```Promise``` that gets resolved with the refreshed token object.

##### token
Type: `String`
An OAuth2 refresh token.

## License

MIT © [Marcel Wiehle](http://marcel.wiehle.me)
