"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.coalesce = coalesce;
exports.safeFloat = safeFloat;
exports.safeInt = safeInt;
exports.safeStr = safeStr;
exports.isString = isString;
exports.isNumber = isNumber;
exports.isArray = isArray;
exports.toArray = toArray;
exports.safeKeys = safeKeys;
exports.safeLen = safeLen;
exports.uiccstamp = uiccstamp;
exports.unixstamp = unixstamp;
exports.unixstamp_rel = unixstamp_rel;
exports.UUID = UUID;
exports.dbgClone = dbgClone;
exports.dbgTYPE = dbgTYPE;
exports.dbgJSON = dbgJSON;
exports.objClone = objClone;
exports.get_clog = get_clog;
exports.clog = clog;
exports.isValidDate = isValidDate;
exports.isValidURL = isValidURL;
exports.dateTimeString = dateTimeString;
exports.dateString = dateString;
exports.arrayRemoveByValue = arrayRemoveByValue;
exports.strContainsOnly = strContainsOnly;
exports.strContainsAny = strContainsAny;
exports.strHash = strHash;
exports.strMD5 = strMD5;
exports.strTrunc = strTrunc;
exports.strFromPercent = strFromPercent;
exports.strFromTime = strFromTime;
exports.strFromDuration = strFromDuration;
exports.strFromNumber = strFromNumber;
exports.isDev = isDev;
exports.isBrowser = isBrowser;
exports.isBrowserSafary = isBrowserSafary;
exports.isBrowserMobile = isBrowserMobile;
exports.isBrowserIosApp = isBrowserIosApp;
exports.isBrowserDev = isBrowserDev;
exports.getBrowserPlatform = getBrowserPlatform;
exports.replaceAll = replaceAll;
exports.isLinux = isLinux;
exports.safeFileName = safeFileName;
exports.dbgSaveBlob = dbgSaveBlob;
exports.urlParse = urlParse;
exports.uriSplit = uriSplit;
exports.isYoutubeUrl = isYoutubeUrl;
function coalesce(value, def) {
    if (value === undefined || value === null) { // Null check
        return def;
    }
    if (typeof value == 'number' && value != 0 && !value) { // NaN check
        return def;
    }
    return value;
}
function safeFloat(text) {
    // IMPORTANT: Any non-digital postfix removed
    if (text != null && typeof (text) === "number") {
        if (isNaN(text)) {
            text = 0.0;
        }
        // Already float
        return text;
    }
    if (text == null) {
        return 0.0;
    }
    text = ("" + text).trim();
    text = text.replace(/[^\d.-]/g, '');
    if (text.length == 0) {
        return 0.0;
    }
    return parseFloat(text);
}
function safeInt(text) {
    // IMPORTANT: Any non-digital postfix removed
    if (text != null && typeof (text) === "number") {
        // Already float
        return Math.floor(text);
    }
    if (text == null || text.length == 0) {
        return 0;
    }
    text = text.trim();
    text = text.replace(/[^\d.-]/g, '');
    if (text.length == 0) {
        return 0;
    }
    return parseInt(text);
}
function safeStr(text, maxLength = -1, doTrim = false) {
    if (text == null) {
        return "";
    }
    if (!isString(text)) {
        text = "" + text;
    }
    if (doTrim) {
        text = text.trim();
    }
    if (maxLength > 3) {
        if (text.length > maxLength) {
            text = text.substring(0, maxLength - 3) + "...";
        }
    }
    return text;
}
function isString(value) {
    return typeof value === 'string' || value instanceof String;
}
function isNumber(value) {
    return typeof value === 'number';
}
function isArray(value) {
    // if (Object.prototype.toString.call(results) === '[object Array]') {
    return Array.isArray(value);
}
function toArray(input, withReverse = false) {
    var ret = new Array();
    //console.log("toArray", input);
    if (input != null) {
        if (withReverse) {
            for (var i = input.length - 1; i >= 0; i--) {
                ret.push(input[i]);
            }
        }
        else {
            for (var i = 0; i < input.length; i++) {
                ret.push(input[i]);
            }
        }
    }
    return ret;
}
function safeKeys(obj) {
    if (obj == null) {
        return [];
    }
    return Object.keys(obj);
}
function safeLen(obj) {
    if (obj == null) {
        return 0;
    }
    if (isString(obj)) {
        return obj.length;
    }
    if (isArray(obj)) {
        return obj.length;
    }
    return Object.keys(obj).length;
}
var _global_cnt = 0;
function uiccstamp() {
    _global_cnt++;
    return _global_cnt;
}
function unixstamp(forDate = null) {
    if (forDate == null) {
        forDate = new Date();
    }
    let unixstamp = Math.floor(forDate.getTime() / 1000.0);
    return unixstamp;
}
var _global_srel = -1;
function unixstamp_rel() {
    if (_global_srel < 0) {
        _global_srel = unixstamp();
    }
    return unixstamp() - _global_srel;
}
function UUID() {
    //    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    var result, i, j;
    result = '';
    for (j = 0; j < 32; j++) {
        if (j == 8 || j == 12 || j == 16 || j == 20) {
            result = result + '-';
        }
        i = Math.floor(Math.random() * 16).toString(16).toUpperCase();
        result = result + i;
    }
    return result;
}
function dbgClone(xobj, dbgUnixstamp, dbgStrings) {
    if (xobj == null) {
        return null;
    }
    if (dbgUnixstamp && (isString(xobj) || isNumber(xobj))) {
        // Check for timestamp
        var objCopy = null;
        try {
            var intval = parseInt(xobj);
            if (("" + intval).length == "1566066289".length) {
                intval = intval * 1000; // No millisec -> with millisec
            }
            if (("" + intval).length == "1659793662000".length) {
                if (("" + intval).indexOf("16") == 0 || ("" + intval).indexOf("15") == 0 || ("" + intval).indexOf("14") == 0) {
                    // Unixstamp
                    //console.log("-- upd:", key, xobj, intval);
                    objCopy = ("" + intval) + "... <" + (new Date(intval)).toString() + ">";
                }
            }
        }
        catch (e) { }
        ;
        if (objCopy != null) {
            return objCopy;
        }
    }
    if (isString(xobj)) {
        var objCopy = "" + xobj;
        if (safeInt(dbgStrings) > 0 && objCopy.length > dbgStrings) {
            objCopy = objCopy.substr(0, dbgStrings) + "... <length:" + objCopy.length + ">";
        }
        return objCopy;
    }
    if (isNumber(xobj) || xobj === true || xobj === false) {
        return xobj;
    }
    if (isArray(xobj)) {
        var objCopy = [];
        for (var i = 0; i < xobj.length; i++) {
            try {
                var itmCopy = dbgClone(xobj[i], dbgUnixstamp, dbgStrings);
                objCopy[i] = itmCopy;
            }
            catch (e) { }
            ;
        }
        return objCopy;
    }
    var objCopy = {};
    var keys = Object.keys(xobj);
    for (var key of keys) {
        try {
            let fieldVal = xobj[key];
            if (!field) {
                continue;
            }
            var itmCopy = dbgClone(fieldVal, dbgUnixstamp, dbgStrings);
            objCopy[key] = itmCopy;
        }
        catch (e) { }
        ;
    }
    return objCopy;
}
function dbgTYPE(obj) {
    return Object.prototype.toString.call(obj).match(/\s\w+/)[0].trim();
}
function dbgJSON(object) {
    if ((object instanceof Error) || (object instanceof MediaError)) {
        // if (object.stack) {
        //	 console.error('\nStacktrace:')
        //	 console.error('====================')
        //	 console.error(object.stack);
        // }
        var error = {};
        Object.getOwnPropertyNames(Object.getPrototypeOf(object))?.forEach(function (propName) {
            error[propName] = object[propName];
        });
        Object.getOwnPropertyNames(object)?.forEach(function (propName) {
            error[propName] = object[propName];
        });
        return JSON.stringify(error);
    }
    return JSON.stringify(object);
}
function objClone(obj) {
    if (obj == null) { // null, undefined
        return null;
    }
    if (isArray(obj)) {
        let objCopy = [];
        for (let i = 0; i < obj.length; i++) {
            objCopy.push(obj[i]);
        }
        return objCopy;
    }
    let objCopy = JSON.parse(JSON.stringify(obj));
    return objCopy;
}
var clog_lines = [];
function get_clog() {
    return clog_lines;
}
function clog(itm1, itm2, itm3, itm4, itm5) {
    if (itm5 != null) {
        console.log(itm1, itm2, itm3, itm4, itm5);
    }
    else if (itm4 != null) {
        console.log(itm1, itm2, itm3, itm4);
    }
    else if (itm3 != null) {
        console.log(itm1, itm2, itm3);
    }
    else if (itm2 != null) {
        console.log(itm1, itm2);
    }
    else {
        console.log(itm1);
    }
    var currentDate = '[' + new Date().toUTCString() + '] ';
    var line = currentDate; // parseInt(new Date().getTime())+": ";
    if (itm1 != null) {
        line += safeStr(JSON.stringify(dbgClone(itm1), null, 2), 500, true);
    }
    else {
        line += "null";
    }
    if (itm2 != null) {
        line += " ";
        line += safeStr(JSON.stringify(dbgClone(itm2), null, 2), 500, true);
    }
    if (itm3 != null) {
        line += " ";
        line += safeStr(JSON.stringify(dbgClone(itm3), null, 2), 500, true);
    }
    if (itm4 != null) {
        line += " ";
        line += safeStr(JSON.stringify(dbgClone(itm4), null, 2), 500, true);
    }
    if (itm5 != null) {
        line += " ";
        line += safeStr(JSON.stringify(dbgClone(itm5), null, 2), 500, true);
    }
    clog_lines.push(line);
}
// =======================
function isValidDate(d) {
    return d instanceof Date && !isNaN(d);
}
function isValidURL(urlString) {
    try {
        return Boolean(new URL(urlString));
    }
    catch (e) {
        return false;
    }
    return false;
}
function dateTimeString(unixstamp) {
    return dateString(unixstamp, true);
}
function dateString(unixstamp, withTime = null) {
    if (unixstamp == null || unixstamp <= 1) {
        return null;
    }
    unixstamp = parseInt(unixstamp); // No floats
    if (("" + unixstamp).length <= "1627304486".length) {
        // Need with milliseconds
        unixstamp = unixstamp * 1000;
    }
    let date = new Date(unixstamp);
    if (isValidDate(date)) {
        let dateString = date.toLocaleDateString(navigator.language);
        if (withTime == true) {
            dateString = dateString + " " + date.toLocaleTimeString(navigator.language);
        }
        //console.log("- dateString", unixstamp, date, dateString);
        return dateString;
    }
    return null;
}
function arrayRemoveByValue(arr, value) {
    if (arr == null) {
        return [];
    }
    if (value == null || arr.indexOf(value) < 0) {
        return arr;
    }
    return arr.filter((e) => e !== value);
}
function strContainsOnly(str, charset) {
    return str.split('').every(function (ch) {
        return charset.indexOf(ch) !== -1;
    });
}
function strContainsAny(str, charset) {
    return str.split('').some(function (ch) {
        return charset.indexOf(ch) !== -1;
    });
}
function strHash(keyString) {
    if (!keyString || keyString.length < 3) {
        return "xx" + keyString;
    }
    let hash = 0;
    for (let charIndex = 0; charIndex < keyString.length; ++charIndex) {
        hash += keyString.charCodeAt(charIndex);
        hash += hash << 10;
        hash ^= hash >> 6;
    }
    hash += hash << 3;
    hash ^= hash >> 11;
    //4,294,967,295 is FFFFFFFF, the maximum 32 bit unsigned integer value, used here as a mask.
    return (((hash + (hash << 15)) & 4294967295) >>> 0).toString(16);
}
;
//  A formatted version of a popular md5 implementation.
//  Original copyright (c) Paul Johnston & Greg Holt.
//  The function itself is now 42 lines long.
function strMD5(inputString) {
    var hc = "0123456789abcdef";
    function rh(n) { var j, s = ""; for (j = 0; j <= 3; j++)
        s += hc.charAt((n >> (j * 8 + 4)) & 0x0F) + hc.charAt((n >> (j * 8)) & 0x0F); return s; }
    function ad(x, y) { var l = (x & 0xFFFF) + (y & 0xFFFF); var m = (x >> 16) + (y >> 16) + (l >> 16); return (m << 16) | (l & 0xFFFF); }
    function rl(n, c) { return (n << c) | (n >>> (32 - c)); }
    function cm(q, a, b, x, s, t) { return ad(rl(ad(ad(a, q), ad(x, t)), s), b); }
    function ff(a, b, c, d, x, s, t) { return cm((b & c) | ((~b) & d), a, b, x, s, t); }
    function gg(a, b, c, d, x, s, t) { return cm((b & d) | (c & (~d)), a, b, x, s, t); }
    function hh(a, b, c, d, x, s, t) { return cm(b ^ c ^ d, a, b, x, s, t); }
    function ii(a, b, c, d, x, s, t) { return cm(c ^ (b | (~d)), a, b, x, s, t); }
    function sb(x) {
        var i;
        var nblk = ((x.length + 8) >> 6) + 1;
        var blks = new Array(nblk * 16);
        for (i = 0; i < nblk * 16; i++)
            blks[i] = 0;
        for (i = 0; i < x.length; i++)
            blks[i >> 2] |= x.charCodeAt(i) << ((i % 4) * 8);
        blks[i >> 2] |= 0x80 << ((i % 4) * 8);
        blks[nblk * 16 - 2] = x.length * 8;
        return blks;
    }
    var i, x = sb(inputString), a = 1732584193, b = -271733879, c = -1732584194, d = 271733878, olda, oldb, oldc, oldd;
    for (i = 0; i < x.length; i += 16) {
        olda = a;
        oldb = b;
        oldc = c;
        oldd = d;
        a = ff(a, b, c, d, x[i + 0], 7, -680876936);
        d = ff(d, a, b, c, x[i + 1], 12, -389564586);
        c = ff(c, d, a, b, x[i + 2], 17, 606105819);
        b = ff(b, c, d, a, x[i + 3], 22, -1044525330);
        a = ff(a, b, c, d, x[i + 4], 7, -176418897);
        d = ff(d, a, b, c, x[i + 5], 12, 1200080426);
        c = ff(c, d, a, b, x[i + 6], 17, -1473231341);
        b = ff(b, c, d, a, x[i + 7], 22, -45705983);
        a = ff(a, b, c, d, x[i + 8], 7, 1770035416);
        d = ff(d, a, b, c, x[i + 9], 12, -1958414417);
        c = ff(c, d, a, b, x[i + 10], 17, -42063);
        b = ff(b, c, d, a, x[i + 11], 22, -1990404162);
        a = ff(a, b, c, d, x[i + 12], 7, 1804603682);
        d = ff(d, a, b, c, x[i + 13], 12, -40341101);
        c = ff(c, d, a, b, x[i + 14], 17, -1502002290);
        b = ff(b, c, d, a, x[i + 15], 22, 1236535329);
        a = gg(a, b, c, d, x[i + 1], 5, -165796510);
        d = gg(d, a, b, c, x[i + 6], 9, -1069501632);
        c = gg(c, d, a, b, x[i + 11], 14, 643717713);
        b = gg(b, c, d, a, x[i + 0], 20, -373897302);
        a = gg(a, b, c, d, x[i + 5], 5, -701558691);
        d = gg(d, a, b, c, x[i + 10], 9, 38016083);
        c = gg(c, d, a, b, x[i + 15], 14, -660478335);
        b = gg(b, c, d, a, x[i + 4], 20, -405537848);
        a = gg(a, b, c, d, x[i + 9], 5, 568446438);
        d = gg(d, a, b, c, x[i + 14], 9, -1019803690);
        c = gg(c, d, a, b, x[i + 3], 14, -187363961);
        b = gg(b, c, d, a, x[i + 8], 20, 1163531501);
        a = gg(a, b, c, d, x[i + 13], 5, -1444681467);
        d = gg(d, a, b, c, x[i + 2], 9, -51403784);
        c = gg(c, d, a, b, x[i + 7], 14, 1735328473);
        b = gg(b, c, d, a, x[i + 12], 20, -1926607734);
        a = hh(a, b, c, d, x[i + 5], 4, -378558);
        d = hh(d, a, b, c, x[i + 8], 11, -2022574463);
        c = hh(c, d, a, b, x[i + 11], 16, 1839030562);
        b = hh(b, c, d, a, x[i + 14], 23, -35309556);
        a = hh(a, b, c, d, x[i + 1], 4, -1530992060);
        d = hh(d, a, b, c, x[i + 4], 11, 1272893353);
        c = hh(c, d, a, b, x[i + 7], 16, -155497632);
        b = hh(b, c, d, a, x[i + 10], 23, -1094730640);
        a = hh(a, b, c, d, x[i + 13], 4, 681279174);
        d = hh(d, a, b, c, x[i + 0], 11, -358537222);
        c = hh(c, d, a, b, x[i + 3], 16, -722521979);
        b = hh(b, c, d, a, x[i + 6], 23, 76029189);
        a = hh(a, b, c, d, x[i + 9], 4, -640364487);
        d = hh(d, a, b, c, x[i + 12], 11, -421815835);
        c = hh(c, d, a, b, x[i + 15], 16, 530742520);
        b = hh(b, c, d, a, x[i + 2], 23, -995338651);
        a = ii(a, b, c, d, x[i + 0], 6, -198630844);
        d = ii(d, a, b, c, x[i + 7], 10, 1126891415);
        c = ii(c, d, a, b, x[i + 14], 15, -1416354905);
        b = ii(b, c, d, a, x[i + 5], 21, -57434055);
        a = ii(a, b, c, d, x[i + 12], 6, 1700485571);
        d = ii(d, a, b, c, x[i + 3], 10, -1894986606);
        c = ii(c, d, a, b, x[i + 10], 15, -1051523);
        b = ii(b, c, d, a, x[i + 1], 21, -2054922799);
        a = ii(a, b, c, d, x[i + 8], 6, 1873313359);
        d = ii(d, a, b, c, x[i + 15], 10, -30611744);
        c = ii(c, d, a, b, x[i + 6], 15, -1560198380);
        b = ii(b, c, d, a, x[i + 13], 21, 1309151649);
        a = ii(a, b, c, d, x[i + 4], 6, -145523070);
        d = ii(d, a, b, c, x[i + 11], 10, -1120210379);
        c = ii(c, d, a, b, x[i + 2], 15, 718787259);
        b = ii(b, c, d, a, x[i + 9], 21, -343485551);
        a = ad(a, olda);
        b = ad(b, oldb);
        c = ad(c, oldc);
        d = ad(d, oldd);
    }
    return rh(a) + rh(b) + rh(c) + rh(d);
}
function strTrunc(str, n) {
    return (str.length > n) ? str.substr(0, n - 1) + ' ...' : str;
}
;
function strFromPercent(frac) {
    var perc_num = parseInt(frac * 100.0, 10);
    return "" + perc_num + "%";
}
function strFromTime(time) {
    time = safeFloat(time);
    var sec_num = parseInt(time, 10); // don't forget the second param
    var minutes = Math.floor(sec_num / 60);
    var seconds = sec_num - (minutes * 60);
    if (minutes < 10) {
        minutes = "0" + minutes;
    }
    if (seconds < 10) {
        seconds = "0" + seconds;
    }
    return minutes + ':' + seconds;
}
function strFromDuration(duration) {
    duration = Math.abs(safeFloat(duration));
    let hours = parseInt(duration / 3600);
    let minutes = parseInt(duration % 3600 / 60);
    let seconds = parseInt(duration % 60);
    let timeString = "";
    if (hours >= 1) {
        timeString += `${hours}:`;
    }
    timeString += ('' + minutes).padStart(2, "0") + ":";
    timeString += ('' + seconds).padStart(2, "0");
    return timeString;
}
function strFromNumber(prefix, n, fractDigits) {
    const intDigits = Math.trunc(Math.log10(n)) + 1;
    const val = parseFloat(n.toPrecision(intDigits + fractDigits));
    return prefix + val;
}
function isDev() {
    let inDevEnvironment = false;
    if (process && process.env.NODE_ENV === 'development') {
        inDevEnvironment = true;
    }
    return inDevEnvironment;
}
function isBrowser() {
    return typeof window !== "undefined";
}
function isBrowserSafary() {
    if (!isBrowser()) {
        return false;
    }
    if (navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome')) {
        // it's safari
        return true;
    }
    return false;
}
function isBrowserMobile() {
    if (!isBrowser()) {
        return false;
    }
    try {
        var match = window.matchMedia || window.msMatchMedia;
        if (match) {
            var mq = match("(pointer:coarse)");
            return mq.matches ? true : false;
        }
    }
    catch (e) { }
    return false;
}
function isBrowserIosApp() {
    if (!isBrowser()) {
        return false;
    }
    let href = window.location.href;
    if (href && (href.indexOf('utm_medium=app-ios') >= 0 || href.indexOf('utm_medium=app-macos') >= 0)) {
        return true;
    }
    return false;
}
function isBrowserDev(hostname) {
    if (isDev()) {
        return 2;
    }
    if (process && process.env?.DEPLOY_DOMAIN && process.env.DEPLOY_DOMAIN.indexOf("dev.transcribe.com") >= 0) {
        return 1;
    }
    if (hostname == null && isBrowser()) {
        hostname = window?.location?.hostname;
    }
    if (hostname) {
        if (hostname.indexOf("dev.transcribe.com") >= 0) {
            return 1;
        }
        if (['localhost', '127.0.0.1', '', '::1'].includes(hostname)) {
            return 2;
        }
        if ((hostname.startsWith('192.168.')) || (hostname.endsWith('.local'))) {
            return 2;
        }
    }
    return 0;
}
function getBrowserPlatform() {
    // 2022 way of detecting. Note : this userAgentData feature is available only in secure contexts (HTTPS)
    if (typeof navigator.userAgentData !== 'undefined' && navigator.userAgentData != null) {
        return navigator.userAgentData.platform;
    }
    // Deprecated but still works for most of the browser
    if (typeof navigator.platform !== 'undefined') {
        if (typeof navigator.userAgent !== 'undefined' && /android/.test(navigator.userAgent.toLowerCase())) {
            // android device’s navigator.platform is often set as 'linux', so let’s use userAgent for them
            return 'android';
        }
        return navigator.platform;
    }
    return 'unknown';
}
function replaceAll(str, what, towhat) {
    if (str == null) {
        return "";
    }
    if (what == null) {
        what = "";
    }
    if (towhat == null) {
        towhat = "";
    }
    return str.split(what).join(towhat);
}
function isLinux() {
    var ua = navigator.userAgent;
    if (ua.indexOf("Linux") >= 0) {
        return true;
    }
    return false;
}
function safeFileName(text) {
    // File-safe naming
    if (!text) {
        return "";
    }
    let res = text.trim();
    res = res.replaceAll(" ", "_");
    res = res.replaceAll(":", "_");
    res = res.replaceAll("+", "_");
    res = res.replaceAll("/", "_");
    res = res.replaceAll("\\", "_");
    res = res.replaceAll("%", "_");
    res = res.replaceAll("!", "_");
    res = res.replaceAll("?", "_");
    res = res.replaceAll(",", "_");
    res = res.replaceAll("\n", "_");
    res = res.replaceAll("\t", "_");
    res = res.replaceAll("__", "_");
    res = res.replaceAll("__", "_");
    res = res.replaceAll("__", "_");
    return res;
}
function dbgSaveBlob(blob, fileName) {
    var a = document.createElement("a");
    document.body.appendChild(a);
    a.style = "display: none";
    var url = window.URL.createObjectURL(blob);
    a.href = url;
    a.download = fileName;
    a.click();
    window.URL.revokeObjectURL(url);
}
function urlParse(url) {
    // https://stackoverflow.com/questions/736513/how-do-i-parse-a-url-into-hostname-and-path-in-javascript
    var m = url.match(/^((?:([^:\/?#]+:)(?:\/\/))?((?:([^\/?#:]*):([^\/?#:]*)@)?([^\/?#:]*)(?::([^\/?#:]*))?))?([^?#]*)(\?[^#]*)?(#.*)?$/), r = {
        hash: m[10] || "", // #asd
        host: m[3] || "", // localhost:257
        hostname: m[6] || "", // localhost
        href: m[0] || "", // http://username:password@localhost:257/deploy/?asd=asd#asd
        origin: m[1] || "", // http://username:password@localhost:257
        pathname: m[8] || (m[1] ? "/" : ""), // /deploy/
        port: m[7] || "", // 257
        protocol: m[2] || "", // http:
        search: m[9] || "", // ?asd=asd
        username: m[4] || "", // username
        password: m[5] || "" // password
    };
    if (r.protocol.length == 2) {
        r.protocol = "file:///" + r.protocol.toUpperCase();
        r.origin = r.protocol + "//" + r.host;
    }
    r.path = r.pathname;
    r.href = r.origin + r.pathname + r.search + r.hash;
    return r;
}
;
function uriSplit(uri) {
    if (safeLen(uri) == 0) {
        return null;
    }
    let parsed = urlParse(uri);
    let bucket = jsutils.safeStr(parsed.hostname);
    var path = jsutils.safeStr(parsed.path);
    if (bucket.length == 0 || path.length == 0) {
        console.log('uri_split: failed to parse uri: [' + uri + ']', parsed);
        return null;
    }
    path = path.substr(1); // removing start slash
    return [bucket, path];
}
function isYoutubeUrl(inUrl) {
    let uri_parsed = uriSplit(inUrl);
    if (safeLen(uri_parsed) == 0) {
        return false;
    }
    let domain = uri_parsed[0];
    if (domain.indexOf("youtube.com") > 0 || domain.indexOf("youtu.be") > 0) {
        return true;
    }
    if (domain.indexOf("vimeo.com") > 0 || domain.indexOf("dailymotion.com") > 0) {
        return true;
    }
    if (domain.indexOf("twitch.tv") > 0 || inUrl.indexOf("reddit.com") > 0) {
        return true;
    }
    if (domain.indexOf("facebook.com") > 0 || domain.indexOf("//x.com") > 0) {
        return true;
    }
    return false;
}
