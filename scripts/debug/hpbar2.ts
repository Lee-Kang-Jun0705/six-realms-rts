import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
mkdirSync('test-results/hp',{recursive:true});
const run=async()=>{
  const b=await chromium.launch();
  const page=await (await b.newContext({viewport:{width:1280,height:800}})).newPage();
  await page.goto('http://localhost:5199/',{waitUntil:'load'});
  await page.locator('.menu-start').first().click(); // 스커미시
  await page.locator('.hud-res').waitFor({timeout:20000});
  await page.waitForTimeout(2500);
  // 본진 주변 일꾼 전체 드래그 선택 → HP바(선택조건) 표시
  await page.mouse.move(200,150); await page.mouse.down();
  await page.mouse.move(1000,650,{steps:8}); await page.mouse.up();
  await page.waitForTimeout(600);
  await page.screenshot({path:'test-results/hp/selected.png'});
  console.log('선택 HP바 스샷 완료');
  await b.close();
};
run();
