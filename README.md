# [UNOFFICAL] IServ Exercise Discord Webhook
This NodeJS script automatically sends new iserv exercises to a discord webhook.

# Installing
  1. Download the latest NodeJS Version from https://nodejs.org/en/download/ and install it.
  2. Download this repository (git clone https://github.com/aimok04/iserv_exercise_discord_webhook/)
  3. Create a discord webhook in your server settings.<br><br>
    <img src="https://media.giphy.com/media/N59N9NJI6SVhegfWph/giphy.gif" width="450"></img>


  4. Start the **main.js** with *node main.js* to start the setup. You will need the host and port of your IServ-Web-Server, the credentials to your IServ-Account and the link to your discord webhook.
  5. Create a cron job (or something similar) to run the **main.js** script repeatedly.

# Disclaimer
I could only test this script with our school server so I don't know if this will work with other ones.
