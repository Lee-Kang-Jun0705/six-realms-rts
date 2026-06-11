import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
mkdirSync('test-results/allfac',{recursive:true});
const run=async()=>{
  const b=await chromium.launch();
  const page=await (await b.newContext({viewport:{width:1600,height:900}})).newPage();
  const errs:string[]=[]; page.on('pageerror',e=>errs.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
  await page.goto('http://localhost:5199/',{waitUntil:'load'});
  await page.locator('.menu-f',{hasText:'요괴'}).first().click();
  await page.locator('.menu-start.spec').click(); // 관전 (양측 AI, 종족 이미지 확인)
  await page.locator('.hud-res').waitFor({timeout:20000});
  await page.mouse.click(700,450);
  await page.waitForTimeout(40000);
  await page.screenshot({path:'test-results/allfac/spectate.png'});
  console.log('에러',errs.length,errs.slice(0,4));
  await b.close();
};
run();
