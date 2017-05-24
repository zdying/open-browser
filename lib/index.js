/**
 * @file open browser window
 * @author zdying
 */

var os = require('os');
var path = require('path');
var configUtil = require('./configUtil');

var childProcess = require('child_process');

var platform = os.platform();

var browsers = {
  'chrome': {
    darwin: 'com.google.Chrome',
    appName: 'Google Chrome',
    win32: 'chrome.exe'
  },
  'firefox': {
    darwin: 'org.mozilla.firefox',
    appName: 'firefox',
    win32: 'firefox.exe'
  },
  'opera': {
    darwin: 'com.operasoftware.Opera',
    appName: 'Opera',
    win32: 'opera.exe'
  },
  'safari': {
    darwin: 'com.apple.Safari',
    appName: 'Safari',
    win32: 'safari.exe'
  }
};

/**
 * Browser
 * @namespace op-browser
 */
module.exports = {
  /**
   * open browser window, if the `pacFileURL` is not empty, will use `proxy auto-configuration`
   * @memberof op-browser
   * @param {String} browser the browser's name
   * @param {String} url     the url that to open
   * @param {String} proxyURL the proxy url, format: `http://<hostname>[:[port]]`
   * @param {String} pacFileURL the proxy url, format: `http://<hostname>[:[port]]/[pac-file-name]`
   * @return {Promise}
   */
  open: function (browser, url, proxyURL, pacFileURL) {
    // Firefox pac set
    // http://www.indexdata.com/connector-platform/enginedoc/proxy-auto.html
    // http://kb.mozillazine.org/Network.proxy.autoconfig_url
    // user_pref("network.proxy.autoconfig_url", "http://us2.indexdata.com:9005/id/cf.pac");
    // user_pref("network.proxy.type", 2);

    var browserPath = this.detect(browser);

    if (!browserPath) {
      console.error('[Error] can not find browser', browser.bold.yellow);
    } else {
      var dataDir = path.join(os.tmpdir(), 'op-browser');

      if (os.platform() === 'win32') {
        browserPath = '"' + browserPath + '"';
      }

      var commandOptions = configUtil[browser](dataDir, url, browserPath, proxyURL, pacFileURL);

      return new Promise(function (resolve, reject) {
        childProcess.exec(browserPath + ' ' + commandOptions, function (err) {
          if (err) {
            reject(err);
          } else {
            resolve({
              path: browserPath,
              cmdOptions: commandOptions,
              proxyURL: proxyURL,
              pacFileURL: pacFileURL
            });
          }
        });
      });
    }
  },

  /**
   * detect browser, return the browser's path
   * @memberof op-browser
   * @param {String} name the browser name
   * @return {Promise}
   */
  detect: function (name) {
    var result = '';
    var cmd = '';
    var info = browsers[name];

    return new Promise(function (resolve, reject) {
      if (!info) {
        reject(Error('Browser not supported.'));
      }

      try {
        switch (platform) {
          case 'darwin':
            cmd = 'mdfind "kMDItemCFBundleIdentifier==' + info.darwin + '" | head -1';
            result = childProcess.execSync(cmd).toString().trim();
            result += '/Contents/MacOS/' + info.appName;
            result = result.replace(/\s/g, '\\ ');
            break;

          case 'win32':
            // windows chrome path:
            // HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe
            // reg query "HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe" /v Path

            cmd = 'reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\' + info.win32 + '" /ve';
            // result:
            /*
            HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\firefox.exe
            (默认)    REG_SZ    C:\Program Files\Mozilla Firefox\firefox.exe
            */

            result = childProcess.execSync(cmd).toString().trim();
            result = result.split('\n').pop().split(/\s+REG_SZ\s+/).pop();
            result = result.replace(/^"|"$/g, '');
            break;

          default:
            result = name;
        }
      } catch (e) {
        reject(Error('Can not find browser info', name));
      }

      resolve(result.trim());
    });
  }
};