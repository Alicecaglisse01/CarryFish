require("dotenv").config();

module.exports = {
  token: process.env.TOKEN,
  channels: ["général", "médias", "photos-de-nous", "petpets"],
  fishImages: ["./images/fish1.png","./images/fish2.png","./images/fish3.png","./images/fish4.png","./images/fish5.png"]
};
