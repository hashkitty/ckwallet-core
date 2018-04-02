let electron = require('electron');
let path = require('path');
let url = require('url');
let synchronization = require('../workers/synchronization');
let configuration = require('./configuration');
let Logger = require("../providers/log/logger");
let menu = require("./menu");
let {app, BrowserWindow} = electron;

let mainWindow;
let logWindow;
let logger;

menu.on("log", _ => {
    logWindow = new BrowserWindow({width: 800, height: 600, false:true, resizable:false, modal:true });
    logWindow.setMenu(null);

    // and load the index.html of the app.
    logWindow.loadURL(url.format({
        pathname: path.join(__dirname, './log.html'),
        protocol: 'file:',
        slashes: true
    }));

    logWindow.on('closed', function () {
        logWindow = null;
    });   
});

function createWindow() {
    mainWindow = new BrowserWindow({width: 800, height: 600, false:true, resizable:false });
    mainWindow.setMenu(menu);

    // and load the index.html of the app.
    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, './search.html'),
        protocol: 'file:',
        slashes: true
    }));

    mainWindow.on('closed', function () {
        mainWindow = null;
    });   
}

app.on('ready', async function() {
    createWindow();
    let config = configuration.read();
    if(config.synchronization) {
        synchronization.start(config.synchronization.interval);
    }
    if(config.logger) {
        logger = new Logger(config.logger);
        logger.log("App ready");
    }
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        app.quit()
    }
});

app.on('activate', function () {
    if (mainWindow === null) {
        createWindow();
    }
});
