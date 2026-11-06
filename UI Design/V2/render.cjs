const {app,BrowserWindow}=require('electron');
const fs=require('node:fs');
const path=require('node:path');
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('force-device-scale-factor','1');
app.whenReady().then(async()=>{
  try {
    const win=new BrowserWindow({width:1600,height:1000,useContentSize:true,show:false,webPreferences:{backgroundThrottling:false}});
    const variants=[['01-codex-smoked-glass',{provider:'codex'}],['02-antigravity-smoked-glass',{provider:'ag'}],['03-codex-daylight',{provider:'codex',day:'1'}],['04-codex-warm-white',{provider:'codex',warm:'1'}]];
    for(const [name,query] of variants){
      await win.loadFile(path.join(__dirname,'preview.html'),{query});
      await win.webContents.executeJavaScript('document.fonts.ready');
      await new Promise(resolve=>setTimeout(resolve,450));
      const shot=await win.webContents.capturePage();
      if(shot.isEmpty())throw new Error('Empty render: '+name);
      fs.writeFileSync(path.join(__dirname,name+'.png'),shot.toPNG());
      console.log(name,shot.getSize());
    }
    win.destroy();app.quit();
  }catch(error){console.error(error);app.exit(1)}
});
