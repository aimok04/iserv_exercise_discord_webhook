const iserv = require("./IServClient");

const discord = require("discord.js");
const https = require("https");
const clone = require("git-clone/promise");
const fs = require('fs-extra')

const args = process.argv.slice(2);

const default_customization = {
    "bot_avatar": "https://%host%:%port%/iserv/static/icons/apple-touch-icon-114x114.png",
    "bot_name": "IServ Exercises",
    "embed_color": "#285080",
    "lang_embed_title": "New exercise \"%name%\"",
    "lang_embed_field_author_name": "Author",
    "lang_embed_field_beginning_name": "Beginning",
    "lang_embed_field_ending_name": "Ending"
};

if(!fs.existsSync("data")) fs.mkdirSync("data");

if(!fs.existsSync("data/settings.json") | args.includes("--setup")){
    setup();
    return;
}

function setup(){
    console.log("Welcome to the setup :)\n");
    
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    readline.question('1. [ISERV] Enter server host or ip: ', host => {
        readline.question('2. [ISERV] Enter server port (default 443): ', port => {
            if(port == "") port = 443;
            
            readline.question('3. [ISERV] Enter your account username: ', user => {
                readline.question('4. [ISERV] Enter your account password: ', pass => {
                    readline.question('5. [DISCORD] Enter your webhook url: ', url => {
                        
                        readline.question('Are you happy with your inputs? (y/n)', confirmation => {
                            
                            if(confirmation == "yes" | confirmation == "y" | confirmation == "ja" | confirmation == "j"){
                                console.log("\nAlright. The setup is complete. Please create a crontab (or something similar) to run this file repeatedly.\nYou can change all settings and customize the messages in the data/settings.json file.");
                                readline.close();
                                fs.writeFileSync("data/settings.json", JSON.stringify({ "host": host, "port": port, "user": user, "pass": pass, "discord_webhook_url": url, "customization": default_customization}, null, 2));
                                process.exit();
                                return;
                            }
                            
                            readline.close();
                            console.log("\n\n\n");
                            setup();
                        });
                    });
                });
            });
        });
    });
}

var firstTimeRunning = false;
if(!fs.existsSync("data/data.json")) {
    firstTimeRunning = true;
    fs.writeFileSync("data/data.json", '{ "ids": [] }');
}

const conf = JSON.parse(fs.readFileSync("data/settings.json"));
const dataT = JSON.parse(fs.readFileSync("data/data.json"));

var webhookClient = null;

console.log("// To enter the setup add the argument --setup");
console.log("Checking for updates ...");

const req = https.request({
    hostname: 'raw.githubusercontent.com',
    port: 443,
    path: '/aimok04/iserv_exercise_discord_webhook/main/README.md',
    method: 'GET',
    timeout: 2000
}, res => {
    if(res.statusCode !== 200){
        main();
        return;
    }
    
    var body = "";
    
    res.on('data', d => { body+=d });
    res.on('end', ()=>{
        var bodyLines = body.split("\n");
        
        var latestVersionName = bodyLines[bodyLines.length-1];
        if(latestVersionName === "") latestVersionName = bodyLines[bodyLines.length-2];
        latestVersionName = latestVersionName.split("VERSION: ")[1].split(" ")[0];

        var versionName = null;
        try {
            var readmeLines = (fs.readFileSync("README.md")+"").split("\n");
        
            var versionName = readmeLines[readmeLines.length-1];
            if(versionName === "") versionName = readmeLines[readmeLines.length-2];
            versionName = versionName.split("VERSION: ")[1].split(" ")[0];
        }catch(e){
        }
        
        if(latestVersionName !== versionName){
            console.log("\n\x1b[41mThere are some new commits that have been added to the project. If you want to update, either clone the project again and replace the files manually or execute following command in your project folder.\x1b[0m\n\x1b[31mgit pull\x1b[0m\n");
            
            if(dataT.versionNotification !== latestVersionName){
                dataT.versionNotification = latestVersionName;
                fs.writeFileSync("data/data.json", JSON.stringify(dataT));

                createWebhookClient();

                var embed = new discord.MessageEmbed();
                embed.setTitle("New commits");
                embed.setURL("https://github.com/aimok04/iserv_exercise_discord_webhook");
                embed.setDescription("If you want to update, either clone the project again and replace the files manually or execute following command in your project folder.\n```git pull```");
                embed.setColor("#ff0000");
                
                webhookClient.send('', {
                    avatarURL: conf.customization.bot_avatar.replace("%host%", conf.host).replace("%port%", conf.port),
                    username: conf.customization.bot_name,
                    embeds: [embed]
                }).then(main, main);
            }else{
                main();
            }
        }else{
            console.log("Up to date.\n");
            main();
        }
    });
})

req.on('error', main);
req.end();

async function main(){
    console.log("Checking for new exercises ...");

    var iserv_client = new iserv(conf.host, conf.port, conf.user, conf.pass, dataT.cookie, function(c){
        dataT.cookie = c;
        fs.writeFileSync("data/data.json", JSON.stringify(dataT));
    });

    iserv_client.getExercises().then((data)=> {
        var new_exercises = [];
        for(var obj of data) if(!dataT.ids.includes(obj.id)) new_exercises.push(obj);
        
        if(firstTimeRunning){
            var idList = [];
            for(var obj of data) idList.push(obj.id);
            dataT.ids = idList;
            fs.writeFileSync("data/data.json", JSON.stringify(dataT));
            
            console.log("No new exercises were found. Exit.");
            process.exit();
            return;
        }
        
        if(new_exercises.length>0){
            createWebhookClient();
            
            var index = 0;
            var f = function(){
                var exercise = new_exercises[index];
                if(exercise == null){
                    console.log("Finished. Exit.");
                    process.exit();
                    return;
                }
                
                index++;
                iserv_client.getExerciseDetailed(exercise.id).then(function(detailed_exercise){
                    exercise.detailed = detailed_exercise;
                    iserv_client.downloadExerciseFiles(exercise.detailed).then(function(){
                        var embeds = [];
                        var index = 0;
                        var pieces = textIntoPieces(exercise.detailed.description + "\n \n_ _", 2000);
                        for(var part of pieces){
                            var embed = new discord.MessageEmbed();
                            embed.setDescription(part);
                            embed.setColor(conf.customization.embed_color);
                            
                            if(index == 0){
                                embed.setTitle(conf.customization.lang_embed_title.replace("%name%",exercise.name));
                                embed.setURL(exercise.url);
                            }
                            
                            if(index+1 == pieces.length) embed.addFields([{name: conf.customization.lang_embed_field_author_name, value: detailed_exercise.creator},{name: conf.customization.lang_embed_field_beginning_name, value: detailed_exercise.start}, {name: conf.customization.lang_embed_field_ending_name, value: detailed_exercise.end}]);
                            
                            embeds.push(embed);
                            index++;
                        }
                        
                        var index2 = 0;
                        var f2 = function(){
                            var embed = embeds[index2];
                            if(embed == null){
                                var index3 = 0;
                                var f3 = function(){
                                    var file = exercise.detailed.files[index3];
                                    if(file == null){
                                        f();
                                        return;
                                    }
                                    
                                    index3++;
                                    
                                    if(file.local_path == null){
                                        webhookClient.send("["+file.name+"](https://"+conf.host+":"+conf.port+file.url+")", {
                                            avatarURL: conf.customization.bot_avatar.replace("%host%", conf.host).replace("%port%", conf.port),
                                            username: conf.customization.bot_name
                                        }).then(f3, f3);
                                    }else{
                                        webhookClient.send({
                                            avatarURL: conf.customization.bot_avatar.replace("%host%", conf.host).replace("%port%", conf.port),
                                            username: conf.customization.bot_name,
                                            files: [{
                                                attachment: file.local_path,
                                                name: file.name
                                            }]
                                        }).then(f3, f3);
                                    }
                                }
                                
                                f3();
                                return;
                            }
                            
                            index2++;
                            webhookClient.send('', {
                                avatarURL: conf.customization.bot_avatar.replace("%host%", conf.host).replace("%port%", conf.port),
                                username: conf.customization.bot_name,
                                embeds: [embed]
                            }).then(f2, f2);
                        }
                        f2();
                    }, f);
                }, f);
            }
            
            console.log(new_exercises.length + " new exercise(s) was/were found.");
            f();
            
            var idList = [];
            for(var obj of data) idList.push(obj.id);
            dataT.ids = idList;
            fs.writeFileSync("data/data.json", JSON.stringify(dataT));
        }else{
            console.log("No new exercises were found. Exit.");
            process.exit();
        }
    });
}

function createWebhookClient(){
    if(webhookClient != null) return;
    var discordparams = conf.discord_webhook_url.split("/");
    webhookClient = new discord.WebhookClient(discordparams[5], discordparams[6]);
}

function textIntoPieces(text, splitAt){
    var ts = text.split(" ");
    var cl = 0;
    var cp = "";
    var p = [];

    for(var pa of ts){
        cl += (pa+" ").length;
        if(cl>splitAt){
            cl=pa.length;
            p.push(cp);
            cp = ""; }
        cp += pa + " "; }

    if(cp != "") p.push(cp);
    return p;
}
