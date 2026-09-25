const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
async function main() {
 const browser = await chromium.launch({channel:'msedge',headless:true});
 const output = path.resolve('../../.codex_tmp/calendar-check');
 fs.mkdirSync(output,{recursive:true});
 try {
  for (const width of [1440,390]) {
   const context = await browser.newContext({viewport:{width,height:1000}});
   await context.addInitScript(() => { localStorage.setItem('ortho_user',JSON.stringify({id:1,name:'Test Clinician',role:'STAFF',initials:'TC'}));localStorage.setItem('ortho_token','test');localStorage.setItem('ortho_theme','light'); });
   const page = await context.newPage(); const errors=[];
   page.on('pageerror',e=>{ errors.push(e.message); console.error(e.message); });
   const date = new Date().toLocaleDateString('en-CA');
   let fail=false;
   await page.route('http://localhost:8080/**',async route=>{
    const url=new URL(route.request().url()); let data=[];
    if(url.pathname==='/appointment') {
     if(fail) return route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({error:'Test unavailable'})});
     data=[{id:1,patientId:'test',patient:{name:'Calendar Test'},date:date+'T00:00:00.000Z',time:'14:30',duration:'30min',type:'adjustment',status:'Scheduled',clinicianId:1,patientEmailStatus:'Sent'}];
    }
    if(url.pathname==='/appointment/clinicians') data=[{id:1,fullName:'Test Clinician'},{id:2,fullName:'Second Clinician'}];
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
   });
   await page.goto('http://localhost:5173/?page=appointments');
   await page.locator('.fc').waitFor().catch(async e=>{ await page.screenshot({path:path.join(output,'failure.png'),fullPage:true}); console.log(await page.locator('body').innerText()); throw e; });
   await page.screenshot({path:path.join(output,width+'-initial.png'),fullPage:true});
   console.log('Calendar date',date,await page.locator('.fc-toolbar-title').textContent(),errors);
   await page.locator('.fc-event').getByText('Calendar Test').waitFor();
   await page.locator('.fc-event').click();
   await page.locator('.appointment-calendar .appointment-row').getByText('Calendar Test',{exact:true}).waitFor();
   await page.getByLabel('Filter clinician').selectOption('2');
   assert.equal(await page.locator('.fc-event').count(),0);
   await page.getByLabel('Filter clinician').selectOption('');
   await page.getByLabel('Filter status').selectOption('Cancelled');
   assert.equal(await page.locator('.fc-event').count(),0);
   await page.getByLabel('Filter status').selectOption('');
   await page.getByRole('button',{name:'Next month'}).click();
   assert.equal(await page.locator('.fc-event').count(),0);
   await page.getByRole('button',{name:'Previous month'}).click();
   await page.locator('.fc-event').waitFor();
   for(const theme of ['light','dark']) {
    if(theme==='dark') await page.getByTitle('Switch to dark theme',{exact:true}).click();
    await page.screenshot({path:path.join(output,width+'-'+theme+'.png'),fullPage:true});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth <= window.innerWidth),true,'No horizontal page overflow');
   }
   await page.getByRole('tab',{name:'List',exact:true}).click();
   assert.equal(await page.locator('.fc').count(),0);
   await page.getByText('Calendar Test',{exact:true}).filter({visible:true}).waitFor();
   fail=true;
   await page.reload();
   await page.getByRole('button',{name:'Retry',exact:true}).waitFor();
   fail=false;
   await page.getByRole('button',{name:'Retry',exact:true}).click();
   await page.locator('.fc-event').waitFor();
   assert.deepEqual(errors,[]);
   console.log('PASS '+width+'px: calendar, filters, navigation, list, retry, themes, overflow.');
   await context.close();
  }
 } finally { await browser.close(); }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
