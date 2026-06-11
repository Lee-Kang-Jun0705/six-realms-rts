import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
mkdirSync('test-results/cargo',{recursive:true});
const run=async()=>{
  const b=await chromium.launch();
  const page=await (await b.newContext({viewport:{width:1100,height:760}})).newPage();
  const errs:string[]=[]; page.on('pageerror',e=>errs.push(e.message));
  await page.goto('http://localhost:5199/',{waitUntil:'load'});
  await page.locator('.menu-start').first().click();
  await page.locator('.hud-res').waitFor({timeout:20000});
  await page.waitForTimeout(8000); // 일꾼 채집→운반 사이클
  await page.screenshot({path:'test-results/cargo/cargo.png'});
  console.log('에러',errs.length);
  await b.close();
};
run();
