import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
mkdirSync('test-results/bld',{recursive:true});
const run=async()=>{
  const b=await chromium.launch();
  const page=await (await b.newContext({viewport:{width:1280,height:800}})).newPage();
  const errs:string[]=[]; page.on('pageerror',e=>errs.push(e.message)); page.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
  await page.goto('http://localhost:5199/',{waitUntil:'load'});
  await page.locator('.menu-f',{hasText:'마계'}).first().click();
  await page.locator('.menu-start').first().click();
  await page.locator('.hud-res').waitFor({timeout:20000});
  await page.waitForTimeout(3000);
  await page.screenshot({path:'test-results/bld/demon-buildings.png'});
  // 병영 건설 유도: 일꾼 선택 후 병영 버튼
  await page.mouse.move(150,120); await page.mouse.down(); await page.mouse.move(1050,650,{steps:6}); await page.mouse.up();
  await page.waitForTimeout(400);
  const br=page.locator('.hud-btn',{hasText:'병영'});
  if(await br.count()>0){await br.first().click(); await page.mouse.move(640,400); await page.waitForTimeout(300); await page.mouse.click(640,400); await page.waitForTimeout(2000);}
  await page.screenshot({path:'test-results/bld/demon-build.png'});
  console.log('에러',errs.length,errs.slice(0,4));
  await b.close();
};
run();
