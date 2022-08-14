const fetch = require("node-fetch");
const querystring = require("querystring");

exports.getLoginCookies = async (host, user, pass)=>{
    let authBody = querystring.encode({
        _username: user,
        _password: pass
    });

    let res = await fetch(`https://${ host }/iserv/`, {
        "redirect": "manual",
        "body": null,
        "method": "GET",
        "mode": "cors",
        "credentials": "omit"
    });

    let redirectUrl = res.headers.get("location");

    /* /iserv/auth/auth request */
    res = await fetch(redirectUrl, {
        "redirect": "manual",
        "body": null,
        "method": "GET",
        "mode": "cors",
        "credentials": "omit"
    });

    redirectUrl = res.headers.get("location");
    let cookie = res.headers.get("set-cookie")[0];

    /* /iserv/auth/login request */
    res = await fetch(redirectUrl, {
        "redirect": "manual",
        "headers": {
            "content-type": "application/x-www-form-urlencoded",
            "cookie": cookie
        },
        "referrerPolicy": "no-referrer",
        "body": authBody,
        "method": "POST"
    });
    
    redirectUrl = res.headers.get("location");
    cookie = res.headers.get("set-cookie");

    /* /iserv/auth/auth request */
    res = await fetch(redirectUrl, {
        "redirect": "manual",
        "headers": {
            "cookie": cookie
        },
        "referrerPolicy": "no-referrer",
        "method": "GET"
    });

    redirectUrl = res.headers.get("location");
    cookie = res.headers.get("set-cookie");
    
    /* /iserv/app/authorization/redirect */
    res = await fetch(redirectUrl, {
        "redirect": "manual",
        "headers": {
            "cookie": cookie
        },
        "referrerPolicy": "no-referrer",
        "method": "GET"
    });
    
    cookie = res.headers.get("set-cookie");
    return cookie;
}