// Standalone design renderer. Run from project: node_modules\.bin\electron "UI Design\render.cjs"
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs');
const path=require('node:path');
app.disableHardwareAcceleration();
app.whenReady().then(async()=>{try{const win=new BrowserWindow({width:1440,height:960,show:false,webPreferences:{backgroundThrottling:false}});for(const theme of ['graphite','light','console']){await win.loadFile(path.join(__dirname,'preview.html'),{query:{theme}});await win.webContents.executeJavaScript('document.fonts.ready');await new Promise(resolve=>setTimeout(resolve,500));const shot=await win.webContents.capturePage();fs.writeFileSync(path.join(__dirname,theme+'.png'),shot.toPNG());if(theme==='graphite'){await win.webContents.executeJavaScript('select(1)');await new Promise(resolve=>setTimeout(resolve,200));fs.writeFileSync(path.join(__dirname,'graphite-antigravity.png'),(await win.webContents.capturePage()).toPNG());}}win.destroy();app.quit()}catch(error){console.error(error);app.exit(1)}});
