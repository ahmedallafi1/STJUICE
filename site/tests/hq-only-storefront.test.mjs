import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderPage, renderFooter } from "../lib/hq-only-view-adapter.js";
const read = (path) => JSON.parse(readFileSync(new URL("../../" + path, import.meta.url), "utf8"));
const data = {
  catalog: read("menu/data/catalog.json"), modifiers: read("menu/data/modifiers.json"),
  builder: read("menu/data/build-your-mood.json"), bundles: read("menu/data/bundles-catering.json"),
  copy: read("content/site-copy.json")
};
data.productById = new Map(data.catalog.products.map(x=>[x.id,x]));
data.categoryById = new Map(data.catalog.categories.map(x=>[x.id,x]));
data.modifierById = new Map(data.modifiers.groups.map(x=>[x.id,x]));
const state={mode:"guest",service:"pickup",cart:[],account:{signedIn:false},
  menuFilters:{query:"",category:"all",mood:"all",occasion:"all",channel:"all"},productDrafts:{},
  builder:{step:0,selections:{base:null,mood:null,"fruit-flavor":[],texture:null,sauce:[],topping:[],boost:[]},name:""}};
const render=(path)=>renderPage({path,params:new URLSearchParams()},{data,state});
const menu=render("/menu");
assert.equal(data.catalog.products.length,40);
assert.equal((menu.match(/class="product-card"/g)||[]).length,40);
assert.ok(menu.includes("Citrus Sunrise") && menu.includes("Golden Turmeric Shot"));
assert.ok(!menu.includes("Pistachio Saint") && !menu.includes("Study Night Box"));
const home=render("/");
assert.ok(home.includes("Mango Passion") && home.includes("Pistachio Kunafa Crepe"));
assert.ok(!home.includes("birthday-box-concept-v1.webp"),"Off-catalog birthday box image must not be rendered");
assert.ok(!home.includes('<p class="eyebrow">PARTY BOXES</p>'));
assert.ok(!home.includes('<p class="eyebrow">BUILD YOUR MOOD</p>'));
for(const alias of ["/build","/boxes"]){
  const page=render(alias);
  assert.ok(page.includes("Citrus Sunrise"),alias+" must show HQ menu only");
  assert.ok(!page.includes("data-builder-option"),"Old builder options must stay hidden");
}
const footer=renderFooter(data);
assert.ok(!footer.includes('href="/boxes"'));
assert.ok(!footer.includes('href="/build"'));
for(const p of data.catalog.products){
  assert.equal(p.conceptImagePath,"media/optimized/webp/hq-catalog/hq-"+
    String(p.hqNumber).padStart(2,"0")+"-"+p.id+".webp");
}
console.log(JSON.stringify({status:"passed",hqProducts:40,retiredExtrasHidden:true,imagesMapped:40}));
