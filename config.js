require("dotenv").config();

module.exports = {
  token: process.env.TOKEN,
  channels: [
    "1164586303153782897", // général
    "1116044460632055838", // médias
    "1114210212430233700", // photos-de-nous
    "1324379994239270943"  // petpets
  ],
  fishImages: ["./images/fish1.png","./images/fish2.png","./images/fish3.png","./images/fish4.png","./images/fish5.png"]
};
