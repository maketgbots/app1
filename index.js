const TB = require('node-telegram-bot-api')
const helpers = require('./helpers')
const config = require('./config')
const keyboard = require('./keyboards')
const kb = require('./kb-keys')
const translate = require('./translate')
const http = require('http')
const serverhttp = http.createServer((req, res)=>{
        res.writeHead(200, {'Content-Type': 'text/plain'})
        res.write('hello')
        res.end()
}).listen(process.env.PORT || 5000)
/////////////////////////////////////////////
const bot = new TB(config.token, {
    polling: true
})
helpers.started()
/////////////////////////////////////////////
const state = {}
bot.on('message', msg=>{
    const chatId = helpers.chatId(msg)
    switch(msg.text){
        case kb.back:
            key=String(chatId)
            if(state[key])
                delete state[key]
            sendHTML(chatId, `<b>${msg.from.first_name}</b>, отправьте место, где желаете узнать погоду
или будет использоваться тестовый город - New york,
если вы покликаете по кнопкам из сообщений выше`, 'start')
            break
        case kb.start.auto:
            saveStateAuto(chatId)
            sendHTML(chatId, 'Отправьте Ваше местоположение (не работает в десктопной версии)', 'auto')
            break
        case kb.start.manual:
            saveState(chatId)
            getManual(chatId)
            break
        default:
            putManual(chatId, msg) 
    }
    if(msg.location){
        getWeatherByCoords(chatId, msg.location.latitude, msg.location.longitude)
    }
        
})
bot.onText(/\/start/, msg=>{
    const html = `Здравствуйте, <b>${msg.from.first_name}</b>, отправьте место, где желаете узнать погоду`
    sendHTML(helpers.chatId(msg), html, 'start')
})
bot.on('callback_query', query => {
    //console.log(query)
    const chatId = query.message.chat.id
    const key = String(chatId)
    const city =  state[key]?state[key]['cityRet']:'new york'
    //console.log(state)
    switch(query.data){
        case 'now':
            getWeatherByCity(chatId, city)
            break
        case 'five':
            getWeatherByCity(chatId, city, 'five')
            break

    }
})
/////////////////////////////////////////////
function getManual(chatId){
    sendHTML(chatId, '<b>Отправьте в сообщении название города</b>', 'back')
}
function putManual(chatId, msg){
        const key = String(chatId)
        if(state[key] && state[key]['manual']){
            state[key]['city'] = msg.text
        getWeatherByCity(chatId, msg.text.toLowerCase())
    }
    else if(state[key] && !state[key]['manual'] && msg.text)
        sendHTML(chatId, 'Здесь <b>координаты отправляются только автоматически</b> по кнопке <i>"Отправить координаты"</i>')
    else if(state[key] && !state[key]['manual'] && !msg.text)
        5+5
    else
        sendHTML(chatId, '<b>Необрабатываемая команда</b>')
}
function getWeatherByCoords(chatId, lat, lon){
    const url = `http://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${config.weatherToken}`
    http.get(url, res=>{
        let body=''
        res.on('data', data=>{
            body+=data
        })
        res.on('end', ()=>{
            showResult(body, chatId)
        })      
    })
}
function getWeatherByCity(chatId, city, five=null){
        if(city.match(/[а-я]/))
            city=translateText(city,'rte')
        let url = `http://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${config.weatherToken}`
        let url2 = `http://api.openweathermap.org/data/2.5/forecast?q=${city}&units=metric&appid=${config.weatherToken}`
        if(five=='five')
            url = url2
    http.get(url, res=>{
        let body=''
        res.on('data', data=>{
            body+=data
        })
        res.on('end', ()=>{
            if(five=='five')
                showResultFive(body, chatId)
            else
                showResult(body, chatId)
        })      
    })
}
function showResult(res, chatId){
    //console.log(res)
    res = JSON.parse(res)
    if(res.cod != 404){
    bot.sendLocation(chatId, res.coord.lat, res.coord.lon)
    const key = String(chatId)
    if(state[key])
            state[key]['cityRet'] = res.name
    if(state[key] && !state[key]['city'])
        state[key]['city'] = res.name
    let city=''
    //console.log(state)
    //console.log(res)
    if(state[key] && state[key]['city'].match(/[а-я]/i) && res.sys.country=='RU')
        city = state[key]['city']
    else if(res.sys.country=='RU')
        city = (translateText(res.name.toLowerCase(), 'etr'))
    else
        city = res.name.toLowerCase()
    city = city[0].toUpperCase()+city.substr(1)
    const html = `<b>Погода в ${city} сейчас</b>
    Температура: ${res.main.temp} гр. Цельсия
    Давление: ${Math.round((res.main.pressure/1.33322),2)} мм. рт. столба
    Видимость: ${res.visibility || 'неизвестно'} м.
    Ветер: ${res.wind.speed} м/с
    Облачность: ${res.clouds.all/100}
    `
    //console.log(html+'\n'+chatId)
    bot.sendMessage(chatId, html, {
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: [
                [{
                    text: 'Прогноз на 5 дней',
                    callback_data: 'five'
                }],
                [{
                    text: 'Погода сейчас',
                    callback_data: 'now'
                }
                ]
            ]
        }
    })
    }
    else
        sendHTML(chatId, 'Заданный город не найден, введите более крупный или Вы ошиблись при вводе')
}
function showResultFive(res, chatId){
    //console.log(res)
    res = JSON.parse(res)
    if(res.cod != 404){
    bot.sendLocation(chatId, res.city.coord.lat, res.city.coord.lon)
    const key = String(chatId)
    let city=''
    if(state[key] && state[key]['city'].match(/[а-я]/i) && res.city.country=='RU')
        city = state[key]['city']
    else if(res.city.country=='RU')
        city = (translateText(res.city.name.toLowerCase(), 'etr'))
    else
        city = res.city.name.toLowerCase()
    city = city[0].toUpperCase()+city.substr(1)
    let html = ''
    for(let i=0; i<res.list.length; i=i+4){
    html+= `
    <b>Погода в ${city} на ${res.list[i].dt_txt}</b>
    Температура: ${res.list[i].main.temp} гр. Цельсия
    Давление: ${Math.round((res.list[i].main.pressure/1.33322),2)} мм. рт. столба
    Видимость: ${res.list[i].visibility || 'неизвестно'} м.
    Ветер: ${res.list[i].wind.speed} м/с
    Облачность: ${res.list[i].clouds.all/100}`
    if(i%8==0)
        html+=`
        --------------------------------------
        `
    }
    bot.sendMessage(chatId, html, {
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: [
                [{
                    text: 'Прогноз на 5 дней',
                    callback_data: 'five'
                }],
                [{
                    text: 'Погода сейчас',
                    callback_data: 'now'
                }
                ]
            ]
        }
    })
    }
    else
        sendHTML(chatId, 'Заданный город не найден, введите более крупный или Вы ошиблись при вводе')
}
/////////////////////////////////////////////
function sendHTML(chatId, html, kbName = null) {
    options = {
        parse_mode: 'HTML'
    }
    if (kbName)
        options.reply_markup = {
            keyboard: keyboard[kbName],
            resize_keyboard: true
        }

    bot.sendMessage(chatId, html, options)
}
function saveState(chatId){
    key = String(chatId)
    state[key] = {manual:true}
}
function saveStateAuto(chatId){
    key = String(chatId)
    state[key] = {}
}
function translateText(text, direct){
    if(text && direct == 'rte'){
        let trans = ''
        for(let i=0; i<text.length; i++){
            const r = (`${text[i]}`)
            trans+=translate.rte[r]
        }
        return trans
    }
    if(text && direct == 'etr'){
        let trans = ''
        for(let i=0; i<text.length; i++){
            const r = text[i]
            trans+=translate.etr[r]
        }
        return trans
    }
}