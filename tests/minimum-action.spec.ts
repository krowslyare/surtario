import {test,expect} from '@playwright/test';
import {randomUUID,createHash} from 'node:crypto';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {usRiceOffers,usRiceRequest} from '../fixtures/procurement';
import {connectOnlyToLocalBackend,runLocalConvex} from './e2e-local';

test('minimum proposal stays in its case; a partial reply recalculates and survives reload',async({page,context})=>{
 await connectOnlyToLocalBackend(context);
 const token=createHash('sha256').update(randomUUID()).digest('hex');
 const run=(name:string,args:object)=>JSON.parse(runLocalConvex(['run',name,JSON.stringify(args)]));
 const caseId=run('sourcing:create',{token,ingredient:'Rice',region:'Portland, OR, US',objective:'Review the minimum against the budget'});
 const comparison=run('comparisons:save',{token,sourcingCaseId:caseId,clientId:randomUUID(),id:null,expectedRevision:0,request:usRiceRequest,offers:usRiceOffers.map((o,i)=>i===0?{...o,minimumPackages:5}:o),selectedOfferId:null});
 await context.addInitScript(value=>localStorage.setItem('procurement-demo-session-v1',value),token);
 await page.goto('/?view=comparison');
 await page.getByRole('button',{name:'Saved comparisons (1)'}).click();await page.getByRole('button',{name:'Open comparison',exact:true}).click();
 const advisor=page.getByRole('region',{name:'Purchasing advisor'});await advisor.getByText('Budget and preferences').click();await advisor.getByLabel('Available budget').fill('50');
 await page.getByRole('button',{name:'Prepare minimum proposal'}).click();
 const dialog=page.getByRole('dialog');await expect(dialog).toContainText('minimum of 2 packs');await expect(dialog).not.toContainText('Supplier B');
 await page.keyboard.press('Escape');
 const request=run('quotationMail:list',{token})[0];
 const directory=mkdtempSync(join(tmpdir(),'minimum-reply-'));const reply='We confirm a minimum of 2 packs; other terms unchanged.';
 try{const file=join(directory,'reply.json');writeFileSync(file,JSON.stringify([{requestId:request.id,eventId:randomUUID(),messageId:randomUUID(),threadId:'synthetic-thread',from:'demo@example.test',text:reply,receivedAt:new Date().toISOString()}]));runLocalConvex(['import','--append','--table','quotationReplies',file]);}finally{rmSync(directory,{recursive:true,force:true});}
 await page.getByRole('button',{name:'View request',exact:true}).click();await page.getByRole('button',{name:'Use reply to confirm minimum'}).click();
 await page.getByLabel('Minimum packs',{exact:true}).fill('2');await page.getByLabel('Exact phrase confirming minimum').fill(reply);
 await page.getByLabel('I confirm this reply gives the minimum number of packs for this offer.',{exact:false}).check();await page.getByRole('button',{name:'Confirm minimum and save'}).click();
 await expect(page.getByRole('heading',{name:'Minimum saved'})).toBeVisible();await expect(page.getByRole('dialog')).toContainText('Supplier B');await page.getByRole('button',{name:'Done',exact:true}).click();
 await expect(page.getByTestId('total-0')).toHaveText('USD 45.00');
 await page.reload();await page.getByRole('button',{name:'Saved comparisons (1)'}).click();await page.getByRole('button',{name:'Open comparison',exact:true}).click();await expect(page.getByTestId('total-0')).toHaveText('USD 45.00');
 const saved=run('comparisons:list',{token})[0];expect(saved.offers[0]).toEqual({...comparison.offers[0],minimumPackages:2});expect(saved.selectedOfferId).toBeNull();
 expect(run('sourcing:get',{token,caseId}).events.some((e:{kind:string})=>e.kind==='minimum_confirmed')).toBe(true);
});
