const kb = require('./kb-keys')
module.exports={
    start: [[kb.start.auto, kb.start.manual]],
    back: [[kb.back]],
    auto: [[{text: kb.auto.auto, request_location: true}],[kb.auto.back]]
}