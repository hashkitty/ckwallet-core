let electron = require('electron');
let {app, Menu} = electron;

let template = [
    {
        label: app.getName(),
        submenu: [{
            label: 'Exit',
            click: _ => app.quit()
        }]
    },
    {
        label: "Log",
        click: _ => onClick('log')
    }
];
let handlers = {};
function onClick(event) {
    if(handlers[event]) {
        handlers[event].forEach(h => h());
    }
}
let menu = Menu.buildFromTemplate(template);
menu.on = function(event, handler) {
    handlers[event] = handlers[event] || [];
    handlers[event].push(handler);
}

module.exports = menu;