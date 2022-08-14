const querystring = require('querystring');
const https = require("https");
const fs = require("fs");
const cheerio = require('cheerio'); 

const { getLoginCookies } = require('./IServAuthorization');

const tag = "[ ISERV-CLIENT ] ";

class IServClass {
    constructor(host, port, user, pass, cookie, cookieUpdate) {
        this.host = host;
        this.port = port;
        this.user = user;
        this.pass = pass;
        this.cookieUpdate = cookieUpdate;
        if(cookie != null) this.tempCookie = cookie;
        
        if(fs.existsSync("_iservTmp")) fs.rmdirSync("_iservTmp", { recursive:true });
    }
    
    downloadExerciseFiles(detailed_exercise_object){
        var cl = this;
        return new Promise((resolve,reject)=>{
            var index = 0;
            
            var nextFile = function(savepath){
                if(savepath != null) detailed_exercise_object.files[index-1].local_path = savepath;
                
                var file = detailed_exercise_object.files[index];
                if(file == null){
                    resolve(detailed_exercise_object);
                    return;
                }

                var safe_name = file.name.replace(/[^A-Za-z0-9._-]/g, '');
                
                cl._download(file.url, cl._tmpfile(Date.now()+"_tmp"+safe_name)).then(nextFile, nextFile);
                index++;
            };
            
            nextFile();
        });
    }
    
    getExerciseDetailed(id){
        return new Promise((resolve,reject)=>{
            this.simpleEndpointRequest("/iserv/exercise/show/"+id).then((data)=>{
                var $ = cheerio.load(data);
                var obj = {};

                var tbody = $("table:first").find("tbody").find("tr");
                
                obj.creator = tbody.find("td:nth-child(1)").text();
                obj.start = tbody.find("td:nth-child(2)").text();
                obj.end = tbody.find("td:nth-child(3) li:nth-child(1)").text();
                
                obj.description = $(".panel:first").find("div:first").find(".col-md-6:first").find("div:first").find("div:first").find(".text-break-word").text();
                obj.files = [];
                
                $("form[name=iserv_exercise_attachment] tbody").find("tr").each(function(){
                    var object = $(this).find("td:nth-child(2) a");
                    
                    obj.files.push({
                       name: object.text(),
                       url: object.attr("href")
                    });
                });
                
                resolve(obj);
            }, ()=>{reject();});
        });
    }
    
    getExercises(){
        return new Promise((resolve,reject)=>{
            this.simpleEndpointRequest("/iserv/exercise").then((data)=>{
                var returnment = [];
                var $ = cheerio.load(data);
                
                $("#crud-table").find("tbody").find("tr").each(function(){
                    var index = 0;
                    var obj = {};
                    
                    $(this).find("td").each(function(){
                        try {
                            if(index==0){
                                obj.id = $(this).find("a").attr("href").split("/").pop();
                                obj.url = $(this).find("a").attr("href");
                                obj.name = $(this).text();
                            }else if(index == 1){
                                obj.start = $(this).text();
                            }else if(index == 2){
                                obj.end = $(this).text();
                            }else if(index == 3){
                                obj.tags = $(this).text();
                            }
                            index++;
                        }catch(e){
                        }
                    });
                    
                    if(obj.id == null) return;
                    returnment.push(obj);
                });
                
                resolve(returnment);
            }, ()=>{reject();});
        });
    }
    
    simpleEndpointRequest(endpoint){
        return new Promise((resolve,reject)=>{
            this.getCookies().then((cookies)=>{
                const options = {
                    port: this.port,
                    hostname: this.host,
                    path: endpoint,
                    method: 'GET',
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (X11; Linux i686) AppleWebKit/5331 (KHTML, like Gecko) Chrome/38.0.858.0 Mobile Safari/5331',
                        'Accept': '/',
                        'Cookie': cookies,
                        'Connection': 'keep-alive'
                    }
                };
                
                var req = https.request(options, (res)=>{
                    if("location" in res.headers){
                        this.tempCookie = null;
                        this.simpleEndpointRequest(endpoint).then((data)=>{ resolve(data); }, ()=>{reject();});
                        return;
                    }
                    
                    var data ='';
                    res.on('data', (chunk)=>{data+=chunk;});
                    res.on('end', ()=>{
                        resolve(data);
                    });
                });
                
                req.on('error', ()=>{reject();});
                req.end();
            }, ()=>{reject();});
        });
    }
    
    getCookies(){
        return new Promise(async(resolve,reject) => {
            if(this.tempCookie != null){
                resolve(this.tempCookie);
            }else{
                let cookie = await getLoginCookies(this.host, this.user, this.pass);
                this.tempCookie = cookie;
                this.cookieUpdate(cookie);
                resolve(cookie);
            }
        });
    }
    
    _download(path,savepath){
        return new Promise((resolve,reject)=>{
            this.getCookies().then((cookies)=>{
                var filestream = fs.createWriteStream(savepath);
                
                const options = {
                    port: this.port,
                    hostname: this.host,
                    path: path,
                    method: 'GET',
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (X11; Linux i686) AppleWebKit/5331 (KHTML, like Gecko) Chrome/38.0.858.0 Mobile Safari/5331',
                        'Cookie': cookies,
                        'Accept': '/',
                        'Connection': 'keep-alive'
                    }
                };
                
                var req = https.request(options, (res)=>{
                    var mb = res.headers["content-length"] / 1048576;
                    if(mb > 7.8) reject();
                    
                    res.on('data', (chunk)=>{filestream.write(chunk);});
                    res.on('end', ()=>{
                        filestream.end();
                        resolve(savepath);
                    });
                });
                
                req.on('error', ()=>{reject();});
                
                req.end();
            }, ()=>{reject();});
        });
    }
    
    _tmpfile(name){
        if(!fs.existsSync("_iservTmp")) fs.mkdirSync("_iservTmp");
        return "_iservTmp/"+name;
    }
}

module.exports = IServClass;
