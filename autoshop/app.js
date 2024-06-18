const cron = require('node-cron');
const fs = require('fs');
const { WebhookClient, MessageAttachment, MessageEmbed, EmbedBuilder } = require('discord.js');
const axios = require('axios').default;
const { createCanvas, loadImage } = require('canvas');
const moment = require('moment-timezone');

const itemsJson = JSON.parse(fs.readFileSync('./autoshop/items.json', 'utf-8'));
const shopConfig = {};

const prices = {
  'AthenaCharacter': {
    'uncommon': 800,
    'rare': 1200,
    'epic': 1500,
    'legendary': 2000,
    'dark': 800,
    'dc': 1200,
    'gaminglegends': 1200,
    'frozen': 1200,
    'lava': 1200,
    'marvel': 1500,
    'shadow': 1200,
    'icon': 1500,
    'starwars': 1500,
    'shadow': 1200,
  },
  'AthenaDance': {
    'uncommon': 200,
    'rare': 500,
    'epic': 800,
    'icon': 500,
    'marvel': 500,
    'dc': 300,
    'starwars': 300,
  },
  'AthenaPickaxe': {
    'uncommon': 500,
    'rare': 800,
    'epic': 1200,
    'icon': 500,
    'dark': 1200,
    'frozen': 1000,
    'slurp': 1500,
    'dc': 1800, 
    'starwars': 1200,
    'shadow': 800,
  },
  'AthenaLoadingScreen': {
    'uncommon': 100,
  },
  'AthenaGlider': {
    'uncommon': 500,
    'rare': 800,
    'epic': 1200,
    'legendary': 1500,
    'icon': 500,
    'dc': 1200,
    'dark': 500,
    'frozen': 1000,
    'marvel': 1000, 
    'lava': 1200,
    'shadow': 800,
  },
  'AthenaSkyDiveContrail': {
    'rare': 100,
  },
  'AthenaBackpack': {
    'rare': 100,
    'epic': 300,
    'epic': 500,
    'legendary': 800,
  },
};

const rarityColors = {
  common: '#818b93',
  uncommon: '#3d872c',
  rare: '#3492f4',
  epic: '#703fa2',
  legendary: '#fea238',
  'icon': '#41ebf0', 
  marvel: '#A60000',
  starwars: '#000000',
  dark: '#3D0A76',
  dc: '#2E4360',
  slurp: '#0593EA',
  frozen: '#7EABC7',
  gaminglegends: '#410BDB',
  shadow: '#373434',
};
function scheduleCreateShopConfig() {
  const easternTime = moment.tz('America/New_York');
  const scheduleTime = `0 19 * * *`; 
  cron.schedule(scheduleTime, createShopConfig);
}
async function createShopConfig() {
  const eligibleItems = itemsJson.filter(
    item => item.shopHistory && item.shopHistory.length > 0 && item.type !== 'AthenaLoadingScreen' && item.type !== 'AthenaSkyDiveContrail'
  );

  if (eligibleItems.length < 8) {
    console.log('Not enough items for shop');
    return;
  }

  const eligibleSkins = eligibleItems.filter(item => item.type === 'AthenaCharacter');
  const danceItems = eligibleItems.filter(item => item.type === 'AthenaDance');
  const pickaxeItems = eligibleItems.filter(item => item.type === 'AthenaPickaxe');
  const gliderItems = eligibleItems.filter(item => item.type === 'AthenaGlider');

  if (eligibleSkins.length < 2 || danceItems.length < 2 || pickaxeItems.length < 1 || gliderItems.length < 1) {
    console.log('not enough daily items');
    return;
  }

  const featuredItems = [];
  const usedIndices = new Set();

  while (featuredItems.length < 2) {
    const randomIndex = Math.floor(Math.random() * eligibleSkins.length);
    if (!usedIndices.has(randomIndex)) {
      featuredItems.push(eligibleSkins[randomIndex]);
      usedIndices.add(randomIndex);
    }
  }

  const randomPickaxeIndex = Math.floor(Math.random() * pickaxeItems.length);
  featuredItems.push(pickaxeItems[randomPickaxeIndex]);

  const randomGliderIndex = Math.floor(Math.random() * gliderItems.length);
  featuredItems.push(gliderItems[randomGliderIndex]);

  const dailyItems = [];
  const usedDailyIndices = new Set();

  while (dailyItems.filter(item => item.type === 'AthenaCharacter').length < 2) {
    const randomAthenaCharacterIndex = Math.floor(Math.random() * eligibleSkins.length);
    const dailyAthenaCharacterItem = eligibleSkins[randomAthenaCharacterIndex];
    dailyItems.push(dailyAthenaCharacterItem);
    const index = eligibleSkins.indexOf(dailyAthenaCharacterItem);
    eligibleSkins.splice(index, 1);
  }

  while (dailyItems.filter(item => item.type === 'AthenaDance').length < 2) {
    const randomIndex = Math.floor(Math.random() * danceItems.length);
    if (!usedDailyIndices.has(randomIndex)) {
      dailyItems.push(danceItems[randomIndex]);
      usedDailyIndices.add(randomIndex);
    }
  }

  let randomPickaxeIndexDaily = Math.floor(Math.random() * pickaxeItems.length);
  dailyItems.push(pickaxeItems[randomPickaxeIndexDaily]);

  let randomGliderIndexDaily = Math.floor(Math.random() * gliderItems.length);
  dailyItems.push(gliderItems[randomGliderIndexDaily]);

  const getImageUrls = [...featuredItems, ...dailyItems].map(async (item) => {
    const response = await axios.get(`https://fortnite-api.com/v2/cosmetics/br/${item.id}`);
    const imageUrl = response.data.data.images.icon;
    const cosmeticName = response.data.data.name;
    return {
      id: item.id,
      imageUrl,
      cosmeticName,
    };
  });

  Promise.all(getImageUrls)
    .then((itemImages) => {
      dailyItems.forEach((item, index) => {
        const price = prices[item.type][item.rarity];
        const itemImage = itemImages.find((image) => image.id === item.id);
        const imageUrl = itemImage ? itemImage.imageUrl : null;

        shopConfig[`daily${index + 1}`] = {
          itemGrants: [`${item.type}:${item.id}`],
          price,
          imageUrl,
        };
      });

      featuredItems.forEach((item, index) => {
        const price = prices[item.type][item.rarity];
        const itemImage = itemImages.find((image) => image.id === item.id);
        const imageUrl = itemImage ? itemImage.imageUrl : null;

        shopConfig[`featured${index + 1}`] = {
          itemGrants: [`${item.type}:${item.id}`],
          price,
          imageUrl,
        };
      });

      fs.writeFile('../Backend//Config/catalog_config.json', JSON.stringify(shopConfig, null, 2), 'utf-8', async (err) => {
        if (err) {
          console.error(err);
          return;
        }
        console.log('New Astro shop has been created');

        const itemShopImage = await generateItemShopImage(featuredItems, dailyItems, itemImages);
        sendWebhook(itemShopImage);
      });
    })
    .catch((error) => {
      console.error('Failed to fetch item images:', error);
    });
}


async function generateItemShopImage(featuredItems, dailyItems, itemImages) {
  const canvasWidth = 1920;
  const canvasHeight = 1080;

  const canvas = createCanvas(canvasWidth, canvasHeight);
  const context = canvas.getContext('2d');

  const backgroundImage = await loadImage('https://backend.ploosh.dev:2053/assets/Itemshop.png');
  context.drawImage(backgroundImage, 0, 0, canvasWidth, canvasHeight);

  const featuredItemWidth = 200;
  const featuredItemHeight = 200;
  const featuredItemsX = 150;
  const featuredItemsY = 350;
  const featuredItemsSpacing = 100;

  for (let i = 0; i < featuredItems.length; i++) {
    const item = featuredItems[i];
    const itemImage = itemImages.find((image) => image.id === item.id);

    if (itemImage && itemImage.imageUrl) {
      const image = await loadImage(itemImage.imageUrl);

      const x = featuredItemsX + (featuredItemWidth + featuredItemsSpacing) * i;
      const y = featuredItemsY;

      const boxWidth = featuredItemWidth + 10;
      const boxHeight = featuredItemHeight + 10;
      const boxX = x - 5;
      const boxY = y - 5;
      const cornerRadius = 25; 

  
      context.fillStyle = `${rarityColors[item.rarity]}80`;
      context.beginPath();
      context.moveTo(boxX + cornerRadius, boxY);
      context.lineTo(boxX + boxWidth - cornerRadius, boxY);
      context.arc(boxX + boxWidth - cornerRadius, boxY + cornerRadius, cornerRadius, Math.PI * 1.5, 0);
      context.lineTo(boxX + boxWidth, boxY + boxHeight - cornerRadius);
      context.arc(boxX + boxWidth - cornerRadius, boxY + boxHeight - cornerRadius, cornerRadius, 0, Math.PI * 0.5);
      context.lineTo(boxX + cornerRadius, boxY + boxHeight);
      context.arc(boxX + cornerRadius, boxY + boxHeight - cornerRadius, cornerRadius, Math.PI * 0.5, Math.PI);
      context.lineTo(boxX, boxY + cornerRadius);
      context.arc(boxX + cornerRadius, boxY + cornerRadius, cornerRadius, Math.PI, Math.PI * 1.5);
      context.closePath();
      context.fill();

      context.drawImage(image, x, y, featuredItemWidth, featuredItemHeight);

      const cosmeticName = itemImage.cosmeticName;
      const textX = x + featuredItemWidth / 2;
      const textY = y + featuredItemHeight + 50;
      context.font = 'bold 30px Arial Nova';
      context.fillStyle = '#ffffff';
      context.textAlign = 'center';
      context.fillText(cosmeticName, textX, textY);
    }
  }

  const dailyItemWidth = 180;
  const dailyItemHeight = 180;
  const dailyItemsX = 150;
  const dailyItemsY = 765;
  const dailyItemsSpacing = 100;
  const dailyItemsPerRow = 6;

  for (let i = 0; i < dailyItems.length; i++) {
    const item = dailyItems[i];
    const itemImage = itemImages.find((image) => image.id === item.id);

    if (itemImage && itemImage.imageUrl) {
      const image = await loadImage(itemImage.imageUrl);

      const rowIndex = Math.floor(i / dailyItemsPerRow);
      const columnIndex = i % dailyItemsPerRow;

      const x = dailyItemsX + (dailyItemWidth + dailyItemsSpacing) * columnIndex;
      const y = dailyItemsY + (dailyItemHeight + dailyItemsSpacing) * rowIndex;

      const boxWidth = dailyItemWidth + 10;
      const boxHeight = dailyItemHeight + 10;
      const boxX = x - 5;
      const boxY = y - 5;      
      const cornerRadius = 25; 

      context.fillStyle = `${rarityColors[item.rarity]}80`;
      context.beginPath();
      context.moveTo(boxX + cornerRadius, boxY);
      context.lineTo(boxX + boxWidth - cornerRadius, boxY);
      context.arc(boxX + boxWidth - cornerRadius, boxY + cornerRadius, cornerRadius, Math.PI * 1.5, 0);
      context.lineTo(boxX + boxWidth, boxY + boxHeight - cornerRadius);
      context.arc(boxX + boxWidth - cornerRadius, boxY + boxHeight - cornerRadius, cornerRadius, 0, Math.PI * 0.5);
      context.lineTo(boxX + cornerRadius, boxY + boxHeight);
      context.arc(boxX + cornerRadius, boxY + boxHeight - cornerRadius, cornerRadius, Math.PI * 0.5, Math.PI);
      context.lineTo(boxX, boxY + cornerRadius);
      context.arc(boxX + cornerRadius, boxY + cornerRadius, cornerRadius, Math.PI, Math.PI * 1.5);
      context.closePath();
      context.fill();

      context.drawImage(image, x, y, dailyItemWidth, dailyItemHeight);

      const cosmeticName = itemImage.cosmeticName; 
      const textX = x + dailyItemWidth / 2;
      const textY = y + dailyItemHeight + 40;
      context.font = 'bold 30px Arial Nova';
      context.fillStyle = '#ffffff';
      context.textAlign = 'center';
      context.fillText(cosmeticName, textX, textY);
    }
  }


    const currentDate = new Date().toLocaleDateString();
    const dateText = `${currentDate}`;
    const dateTextFont = 'bold 30px Arial Nova';
    const dateTextX = 885; 
    const dateTextY = 240; 
  
    context.fillStyle = '#ffffff';
    context.font = dateTextFont;
    context.textAlign = 'start';
    context.textBaseline = 'alphabetic';
    context.fillText(dateText, dateTextX, dateTextY);

  return canvas.toBuffer();
}



async function sendWebhook(imageBuffer) {
  const webhookURL = 'https://discord.com/api/webhooks/1202029459490742322/jbqfJtAnyMgBOO4dCjb2envRA8jR7ub1-OOkjAJGmRJfXklCUfn6POqxFQZGWDDc_0SP'; 

  const webhookClient = new WebhookClient({ url: webhookURL });

  const attachment = await new MessageAttachment(imageBuffer, 'item_shop.png');
  const embed = new MessageEmbed()
    .setTitle('**NEW ASTRO SHOP**')
    .setColor('#f7568b')
    .setImage('attachment://item_shop.png')
    .setTimestamp();
    webhookClient.send({ content: "<@&1202033340161724447>", embeds: [embed], files: [attachment] });
  console.log("Sent Webhook item shop.");
}

if (process.argv[2] === '--now') {
  createShopConfig();
} else {
 scheduleCreateShopConfig();
}
