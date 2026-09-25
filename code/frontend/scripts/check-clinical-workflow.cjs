const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
async function main() {
 const browser = await chromium.launch({ channel: 'msedge', headless: true });
 const output = path.resolve('../../.codex_tmp/workflow-check'); fs.mkdirSync(output, { recursive: true });
 try {
  for (const width of [1440, 390]) {
   const context = await browser.newContext({ viewport: { width, height: 1000 } });
   const page = await context.newPage(); const failures = [];
   page.on('pageerror', error => failures.push(error.message));
   await context.addInitScript(() => { localStorage.setItem('ortho_user', JSON.stringify({id:1,name:'Clinician Test',role:'STAFF',initials:'CT'})); localStorage.setItem('ortho_token','ui-test'); localStorage.setItem('ortho_theme','light'); });
   const patient = { id:'test-patient', patientId:'ORT-2026-0001', name:'Clinical Workflow Test', status:'Assessment', dob:'2000-01-01T00:00:00.000Z', caseHistory:{facialProfile:'Straight'}, radiographs:[],historyLogs:[],appointments:[] };
   let records = [];
   await page.route('http://localhost:8080/**', async route => {
    const request = route.request(), url = new URL(request.url()); let data=[];
    if(url.pathname==='/patient') data=[patient];
    else if(url.pathname==='/patient/test-patient') data=patient;
    else if(url.pathname==='/clinical/test-patient') {
     if(request.method()==='POST') {
      const form=await new Request(request.url(),{method:'POST',headers:request.headers(),body:request.postDataBuffer()}).formData();
      const payload=JSON.parse(form.get('payload'));
      const previous=records.find(r=>r.id===payload.previousId);
      data={...payload,id:records.length+1,version:previous?previous.version+1:1,status:payload.kind==='TREATMENT_PLAN'?'Pending approval':'Recorded',authorName:'Clinician Test',createdAt:new Date().toISOString(),hasDocument:Boolean(form.get('document'))};
      records.unshift(data);
     } else data=records;
    } else if(url.pathname.endsWith('/approve')) {
      data=records.find(r=>r.id===Number(url.pathname.split('/')[3])); Object.assign(data,{status:'Approved',approvedName:'Clinician Test',approvedAt:new Date().toISOString()});
    } else if(url.pathname==='/appointment/clinicians') data=[{id:1,fullName:'Clinician Test'}];
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
   });
   await page.goto('http://localhost:5173/?page=patients');
   await page.getByText('Clinical Workflow Test',{exact:true}).click();
   await page.getByRole('tab',{name:'Treatment',exact:true}).click();
   const panel=page.locator('.clinical-workspace');
   await panel.getByRole('button',{name:'Add treatment plan',exact:true}).click();
   await panel.getByLabel('Diagnosis *',{exact:true}).fill('Documented diagnosis');
   await panel.getByLabel('Treatment objectives *',{exact:true}).fill('Recorded objectives');
   await panel.getByLabel('Appliance *',{exact:true}).selectOption('Fixed');
   await panel.getByLabel('Proposed treatment *',{exact:true}).fill('Proposed treatment steps');
   await panel.getByRole('button',{name:'Save record',exact:true}).click();
   await panel.getByRole('button',{name:'Approve plan',exact:true}).click();
   await page.getByRole('button',{name:'Confirm',exact:true}).click();
   await panel.getByText('Approved',{exact:true}).waitFor();
   await panel.getByRole('button',{name:'Revise',exact:true}).click();
   await panel.getByLabel('Treatment objectives *',{exact:true}).fill('Revised objectives');
   await panel.getByRole('button',{name:'Save record',exact:true}).click();
   await panel.getByText('Superseded',{exact:true}).waitFor();
   await page.getByRole('tab',{name:'Visits',exact:true}).click();
   await panel.getByRole('button',{name:'Add progress visit',exact:true}).click();
   await panel.getByLabel('Visit date *',{exact:true}).fill('2026-09-24');
   await panel.getByLabel('Findings *',{exact:true}).fill('Stable progress');
   await panel.getByLabel('Procedures *',{exact:true}).fill('Adjustment completed');
   for (const theme of ['light','dark']) {
    if(theme==='dark') await page.getByTitle('Switch to dark theme',{exact:true}).click();
    await panel.scrollIntoViewIfNeeded();
    await page.screenshot({path:path.join(output,width+'-'+theme+'.png')});
    const overflows=await panel.evaluate(root=>[...root.querySelectorAll('input,textarea,select,button')].filter(el=>el.getBoundingClientRect().right>window.innerWidth+1).map(el=>el.textContent||el.type));
    assert.deepEqual(overflows,[]);
   }
   await panel.getByRole('button',{name:'Save record',exact:true}).click();
   await panel.getByText('Stable progress',{exact:true}).waitFor();
   await page.getByRole('tab',{name:'Treatment',exact:true}).click();
   await panel.getByRole('tab',{name:'Consent',exact:true}).click();
   await panel.getByRole('button',{name:'Add consent',exact:true}).click();
   await panel.getByLabel('Decision *',{exact:true}).selectOption('Granted');
   await panel.getByLabel('Consent scope *',{exact:true}).selectOption('Treatment');
   await panel.getByLabel('Consent date *',{exact:true}).fill('2026-09-24');
   await panel.getByLabel('Signatory name *',{exact:true}).fill('Test Patient');
   await panel.getByLabel('Signatory role *',{exact:true}).selectOption('Patient');
   await panel.locator('input[type=file]').setInputFiles({name:'signed.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\nTest')});
   await panel.getByRole('button',{name:'Save record',exact:true}).click();
   await panel.getByRole('button',{name:'Download signed document',exact:true}).waitFor();
   assert.equal(records.length,4);
   await page.emulateMedia({media:'print'});
   assert.equal(await page.locator('.clinical-print').isVisible(),true);
   assert.equal(await page.locator('#root').isVisible(),false);
   await page.screenshot({path:path.join(output,width+'-print.png'),fullPage:true});
   await page.emulateMedia({media:'screen'});
   assert.deepEqual(failures,[]);
   console.log('PASS '+width+'px: plan, approval, revision, visit, consent, light/dark, print layout.');
   await context.close();
  }
 } finally { await browser.close(); }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
