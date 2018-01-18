module.exports = {
    started: x=>console.log('started'),
    chatId: msg=>msg.chat.id,
    getUuid: source=>source.substr(2, source.length)
}