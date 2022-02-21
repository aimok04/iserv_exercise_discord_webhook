# [UNOFFICAL] IServ Exercise Discord Webhook
This NodeJS script automatically sends new iserv exercises to a discord webhook.

# Installing
  1. Download the latest NodeJS Version from https://nodejs.org/en/download/ and install it.
  2. Download this repository. `git clone https://github.com/aimok04/iserv_exercise_discord_webhook/`
  3. Cd into the new folder and run `npm install cheerio discord.js@12.5.3` to install all dependencies.
  4. Create a discord webhook in your server settings.<br><br>
    <img src="https://media.giphy.com/media/N59N9NJI6SVhegfWph/giphy.gif" width="450"></img>


  5. Run the **main.js** file with `node main.js` to start the setup. You will need the host and port of your IServ-Web-Server, the credentials from your IServ-Account and the link to your Discord webhook.
  6. Create a crontab (or something similar) to run the **main.js** script repeatedly.
<br><br>Example: `*/5 6-17 * * 1-5 cd /path/to/script/ && node main.js`<br>
This will execute the script every 5 minutes from 6 am to 5 pm from Monday until Friday.

# Used NPM packages
I used two NPM packages in this script.
* [Discord.JS](https://github.com/discordjs/discord.js)
* [Cheerio](https://github.com/cheeriojs/cheerio)

# Disclaimer
I don't know if this will work for every server. If you have any suggestions or questions please let me know! :)
