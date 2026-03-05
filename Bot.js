const { 
Client,
GatewayIntentBits,
EmbedBuilder,
ActionRowBuilder,
ButtonBuilder,
ButtonStyle,
StringSelectMenuBuilder,
PermissionsBitField
} = require("discord.js")

const fs = require("fs")
const QRCode = require("qrcode")

const client = new Client({
intents:[
GatewayIntentBits.Guilds,
GatewayIntentBits.GuildMessages,
GatewayIntentBits.MessageContent,
GatewayIntentBits.GuildMembers
]
})

/* ===========================
CONFIG
=========================== */

const TOKEN = "MTQ2MDI0MjYxNTQ2MjI2ODk2OA.Gtx4Pp.C1SwKduYASHTgejv9whQi6rR67oSnj-rfUEsFo"

const SHOP_NAME = "TaiYTB - OFFICIAL STORE"

const TICKET_CHANNEL_ID = "1477569247650779157"
const TICKET_CATEGORY_ID = "1478970977542082613"
const LOG_CHANNEL_ID = "1477569757199728673"
const FEEDBACK_CHANNEL_ID = "1477569550475198585"

const BUYER_ROLE_ID = "1477645740137250877"
const FOUNDER_ROLE_ID = "1477565735327760394"

const TICKET_TIMEOUT = 900000

const MB_BANK = {
bank:"MB Bank",
account:"0905564558",
name:"NGUYEN DUY PHUOC TAI"
}

/* ===========================
DATABASE FILES
=========================== */

function load(file,def){
if(!fs.existsSync(file)) fs.writeFileSync(file,JSON.stringify(def,null,2))
return JSON.parse(fs.readFileSync(file))
}

function save(file,data){
fs.writeFileSync(file,JSON.stringify(data,null,2))
}

let products = load("products.json",{})
let stock = load("stock.json",{})
let revenue = load("revenue.json",{today:0,month:0})
let tickets = load("tickets.json",{})
let feedback = load("feedback.json",[])

/* ===========================
BOT READY
=========================== */

client.once("ready",()=>{
console.log("BOT ONLINE")
})

/* ===========================
CREATE TICKET PANEL
=========================== */

client.on("messageCreate",async message=>{

if(message.content === "!ticketpanel"){

const embed = new EmbedBuilder()
.setTitle("🎫 HỖ TRỢ KHÁCH HÀNG")
.setDescription("Nhấn nút bên dưới để mở ticket mua hàng")

const btn = new ActionRowBuilder()
.addComponents(
new ButtonBuilder()
.setCustomId("create_ticket")
.setLabel("Mở Ticket")
.setStyle(ButtonStyle.Primary)
)

message.channel.send({embeds:[embed],components:[btn]})

}

})

/* ===========================
PANEL QUẢN LÝ SHOP
=========================== */

client.on("messageCreate",async message=>{

if(message.content === "!panel"){

if(!message.member.roles.cache.has(FOUNDER_ROLE_ID))
return message.reply("Bạn không có quyền")

const embed = new EmbedBuilder()
.setTitle("🛠 PANEL QUẢN LÝ SHOP")
.setDescription(`
➕ Thêm sản phẩm
➖ Xoá sản phẩm
📦 Thêm stock
📊 Xem doanh thu
`)

message.channel.send({embeds:[embed]})

}

})

/* ===========================
BUTTON EVENTS
=========================== */

client.on("interactionCreate",async interaction=>{

if(!interaction.isButton()) return

/* CREATE TICKET */

if(interaction.customId === "create_ticket"){

if(tickets[interaction.user.id])
return interaction.reply({content:"Bạn đã có ticket",ephemeral:true})

const channel = await interaction.guild.channels.create({

name:`ticket-${interaction.user.username}`,
parent:TICKET_CATEGORY_ID,
permissionOverwrites:[
{
id:interaction.guild.id,
deny:[PermissionsBitField.Flags.ViewChannel]
},
{
id:interaction.user.id,
allow:[PermissionsBitField.Flags.ViewChannel]
}
]

})

tickets[interaction.user.id] = channel.id
save("tickets.json",tickets)

const closeBtn = new ActionRowBuilder().addComponents(
new ButtonBuilder()
.setCustomId("close_ticket")
.setLabel("Đóng Ticket")
.setStyle(ButtonStyle.Danger)
)

const shopMenu = new StringSelectMenuBuilder()
.setCustomId("shop_menu")
.setPlaceholder("Chọn sản phẩm")

for(let p in products){

if(!stock[p] || stock[p].length===0) continue

shopMenu.addOptions({
label:p,
description:`Giá: ${products[p].price}`,
value:p
})

}

const row = new ActionRowBuilder().addComponents(shopMenu)

channel.send({
content:`Xin chào ${interaction.user}`,
components:[row,closeBtn]
})

interaction.reply({content:`Ticket: ${channel}`,ephemeral:true})

setTimeout(()=>{
if(channel) channel.delete().catch(()=>{})
delete tickets[interaction.user.id]
save("tickets.json",tickets)
},TICKET_TIMEOUT)

}

/* CLOSE TICKET */

if(interaction.customId === "close_ticket"){

interaction.channel.delete()

}

/* FEEDBACK BUTTON */

if(interaction.customId === "feedback_btn"){

const member = interaction.guild.members.cache.get(interaction.user.id)

member.roles.add(BUYER_ROLE_ID)

const embed = new EmbedBuilder()
.setTitle("⭐ FEEDBACK KHÁCH HÀNG")
.setDescription(`
👤 Khách hàng: ${interaction.user}
🏪 Shop: ${SHOP_NAME}
`)

const channel = client.channels.cache.get(FEEDBACK_CHANNEL_ID)

channel.send({embeds:[embed]})

interaction.reply({content:"Cảm ơn feedback!",ephemeral:true})

}

})

/* ===========================
SELECT PRODUCT
=========================== */

client.on("interactionCreate",async interaction=>{

if(!interaction.isStringSelectMenu()) return

if(interaction.customId === "shop_menu"){

const product = interaction.values[0]

const price = products[product].price

const code = "TaiYTB-"+Math.floor(Math.random()*99999)

const payment = `
BANK: ${MB_BANK.bank}
ACC: ${MB_BANK.account}
NAME: ${MB_BANK.name}

SỐ TIỀN: ${price}

NỘI DUNG: ${code}
`

const qr = await QRCode.toDataURL(payment)

const embed = new EmbedBuilder()
.setTitle("💳 THANH TOÁN")
.setDescription(payment)
.setImage(qr)

interaction.channel.send({embeds:[embed]})

}

})

/* ===========================
FEEDBACK COMMAND
=========================== */

client.on("messageCreate",async message=>{

if(message.content.startsWith("+1 legit")){

const embed = new EmbedBuilder()

.setTitle("⭐ FEEDBACK KHÁCH HÀNG")
.setDescription(message.content)
.addFields(
{name:"Khách",value:`${message.author}`},
{name:"Shop",value:SHOP_NAME}
)

const ch = client.channels.cache.get(FEEDBACK_CHANNEL_ID)

ch.send({embeds:[embed]})

feedback.push({
user:message.author.id,
text:message.content,
time:Date.now()
})

save("feedback.json",feedback)

}

})

/* ===========================
REVENUE COMMAND
=========================== */

client.on("messageCreate",message=>{

if(message.content === "!revenue"){

const embed = new EmbedBuilder()
.setTitle("📊 DOANH THU")
.setDescription(`
Hôm nay: ${revenue.today}
Tháng: ${revenue.month}
`)

message.channel.send({embeds:[embed]})

}

})

client.login(TOKEN)
