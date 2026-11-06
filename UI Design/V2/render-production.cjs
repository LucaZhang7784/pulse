// Renders the implemented UI with explicitly synthetic values; no account access.
const {app,BrowserWindow,ipcMain}=require('electron');
const path=require('node:path');
const fs=require('node:fs');
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('force-device-scale-factor','1');
app.on('window-all-closed',()=>{});
ipcMain.on('preview:fit',(event,height)=>{
  const win=BrowserWindow.fromWebContents(event.sender);
  if(win && Number.isFinite(height)) win.setContentSize(390,Math.min(1000,Math.max(240,Math.ceil(height))));
});
app.whenReady().then(async()=>{
  try {
    for(const [name,file,width,height,query] of [
      ['implemented-rail','index.html',84,680,{}],
      ['implemented-edge','index.html',84,680,{collapsed:'true'}],
      ['implemented-codex','card.html',390,660,{provider:'0'}],
      ['implemented-antigravity','card.html',390,660,{provider:'1'}],
      ['implemented-unavailable','card.html',390,660,{provider:'2'}],
      ['implemented-balance','card.html',390,660,{provider:'3'}],
    ]){
      const win=new BrowserWindow({width,height,useContentSize:true,show:false,transparent:true,backgroundColor:'#00000000',webPreferences:{contextIsolation:false,nodeIntegration:false,backgroundThrottling:false,preload:path.join(__dirname,'production-preview-preload.cjs')}});
      await win.loadFile(path.resolve(__dirname,'../../renderer',file),{query});
      await win.webContents.executeJavaScript('document.fonts.ready');
      await new Promise(resolve=>setTimeout(resolve,500));
      fs.writeFileSync(path.join(__dirname,name+'.png'),(await win.webContents.capturePage()).toPNG());
      console.log(name);
      win.destroy();
    }
    app.quit();
  }catch(error){console.error(error);app.exit(1)}
});

