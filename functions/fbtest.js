const Embed = require('discord.js').MessageEmbed
const request = require('request')
const cheerio = require('cheerio')
const urlRegex = require('url-regex')

const util = require('../util.js')
const config = require('../config.js')

const DEBUG = true

const root = 'https://www.facebook.com'

const selector = {
	post: '#pagelet_timeline_main_column ._1dwg._1w_m._q7o',
	top: '._449j',
	link: '.fsm.fwn.fcg a._5pcq',
	caption: '._6a._5u5j._6b>h5 .fwn.fcg',
	content: '._5pbx.userContent._3576',
	image: 'img.scaledImageFitWidth',
	video: '._3chq',
	headpic: 'img._s0._4ooo._5xib._5sq7._44ma._rw.img',
	timestamp: '._6a._5u5j._6b abbr._5ptz'
}

const interval = 1800000

function escapeStr(str) {
	str.find('.text_exposed_hide').remove()
	str.find('p').append('<br>')
	str.find('br').replaceWith('\n')
	str = str.text()
	str = str.replace(/\\/g, '\\\\')
	str = str.replace(/\`/g, '\\\`')
	str = str.replace(/\*/g, '\\\*')
	str = str.replace(/\|/g, '\\\|')
	str = str.replace(/\~/g, '\\\~')
	str = str.replace(/\_/g, '\\\_')
	str = str.replace(/\</g, '\\\<')
	str = str.replace(/\>/g, '\\\>')
	str = str.replace(/\#/g, '\\\#')
	str = str.replace(/\@/g, '\\\@')
	str = str.replace(urlRegex(), m=>`<${m}>`)
	return str
}

function fetchPage(fanpage) {
	request({
		url: `${root}/${fanpage.id}/posts`,
		headers: { 'User-Agent': 'request' }
	}, (err, res, body)=>{
		const $ = cheerio.load(body)
		let posts = $(selector.post)
		let i = 0
		while($(posts.get(i)).find(selector.top).length) i++
		let post = $(posts.get(i))
		let checkElement = function (ele, eleName) {
			if (!ele.length) {
				let errMsg = `(checkElement ${fanpage.name}) ${eleName} element not found!`
				// util.debugSend(`warn`, errMsg, bot)
				console.error(errMsg)
				return false
			} else return true
		}
		// check timestamp
		let timestamp = post.find(selector.timestamp)
		if (!checkElement(timestamp, 'timestamp')) return
		let utime = timestamp.attr('data-utime') || 0
		if ((fanpage.updateTime && utime > fanpage.updateTime) || DEBUG) {
			let link = post.find(selector.link).attr('href')
			checkElement(link, 'link')
			link = root + link.split('?')[0]
			let caption = post.find(selector.caption).text()
			let image = post.find(selector.image).attr('src') ||
				post.find(selector.video).attr('src') || ''
			let headpic = post.find(selector.headpic).attr('src')
			let content = post.find(selector.content)
			content = content ? escapeStr(content) : ''
			if (content.length > 1024)
				content = content.slice(0,1024) + '...'
			const embed = new Embed()
				.setColor('#3578E5')
				.setTitle(caption)
				.setURL(link)
				.setAuthor(`${fanpage.name} (Facebook)`, headpic, `${root}/${fanpage.id}`)
				.setDescription(content)
				.setImage(image)
				.setTimestamp(utime*1000)
				console.log(content)
			// if (!DEBUG) {
			// 	bot.channels.fetch(fanpage.channel).then(async ch=>{
			// 		let role = await bot.guilds.resolve(config.guildId).roles.fetch(fanpage.pinRole)
			// 		ch.send(`${role}`, {embed: embed})
			// 			.catch(err=>util.catch(`(fetchPage ${fanpage.name})` + err, ch))
			// 	})
			// } else {
			// 	bot.channels.fetch(config.channels.debug).then(ch=>{
			// 		ch.send('\@TEST', {embed: embed})
			// 			.catch(err=>util.catch(`(fetchPage ${fanpage.name})` + err, bot))
			// 	})
			// }
		}
		fanpage.updateTime = utime
	})
}

config.fanpages.forEach(fanpage=>{ fetchPage(fanpage) })
// fetchPage(config.fanpages[0])