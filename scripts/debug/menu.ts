import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
mkdirSync('test-results/menu',{recursive:true});
const run=async()=>{
  const b=await chromium.launch();
  const page=await (await b.newContext({viewport:{width:1280,height:800}})).newPage();
  const errs:string[]=[]; page.on('pageerror',e=>errs.push(e.message)); page.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
  await page.goto('http://localhost:5199/',{waitUntil:'load'});
  await page.locator('.menu-fac').first().waitFor({timeout:30000});
  await page.waitForTimeout(1500);
  await page.screenshot({path:'test-results/menu/menu.png'});
  // 요괴 선택 강조 확인
  await page.locator('.menu-fac',{hasText:'요괴'}).click();
  await page.waitForTimeout(400);
  await page.screenshot({path:'test-results/menu/menu-pick.png'});
  console.log('에러',errs.length,errs.slice(0,4));
  await b.close();
};
run();
