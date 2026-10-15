import assert from "node:assert/strict";
import { once } from "node:events";
import { startOrderingServer } from "../../ordering/server.mjs";

process.env.STJ_TEST_ADMIN_TOKEN="hq-menu-commercial-test";
const server=await startOrderingServer({port:0});
const base="http://127.0.0.1:"+server.address().port;
const adminHeaders={"X-STJ-Admin-Token":process.env.STJ_TEST_ADMIN_TOKEN};
async function json(path,options={}) {
 const response=await fetch(base+path,{...options,headers:{"Content-Type":"application/json",...(options.headers||{})}});
 return {response,payload:await response.json().catch(()=>({}))};
}
try {
 const original=await json("/api/admin/commercial",{headers:adminHeaders});
 assert.equal(original.response.status,200);
 assert.equal(original.payload.products.length,40);
 assert.ok(original.payload.products.some(x=>x.productId==="citrus-sunrise"&&x.status==="available"));
 const retired=["pistachio-saint","study-night-box","dragon-cloud-cup"];
 for(const id of retired) assert.ok(!original.payload.products.some(x=>x.productId===id));
 const soldOut=await json("/api/admin/commercial/products/citrus-sunrise",{method:"PATCH",headers:adminHeaders,body:JSON.stringify({status:"sold_out"})});
 assert.equal(soldOut.response.status,200);
 const quote=await json("/api/cart/validate",{method:"POST",body:JSON.stringify({service:"pickup",items:[{kind:"catalog",productId:"citrus-sunrise",sizeId:"16-oz",quantity:1,modifierSelections:{}}],tipPercent:0})});
 assert.equal(quote.response.status,422);
 assert.ok(quote.payload.errors.some(x=>x.code==="product_sold_out"));
 const reset=await json("/api/admin/commercial/products/citrus-sunrise",{method:"PATCH",headers:adminHeaders,body:JSON.stringify({status:"available"})});
 assert.equal(reset.response.status,200);
 const retiredQuote=await json("/api/cart/validate",{method:"POST",body:JSON.stringify({service:"pickup",items:[{kind:"catalog",productId:"study-night-box",sizeId:"serves-2-3",quantity:1}],tipPercent:0})});
 assert.equal(retiredQuote.response.status,422);
 assert.ok(retiredQuote.payload.errors.some(x=>x.code==="product_not_found"));
 const publicState=await json("/api/catalog-status");
 assert.equal(publicState.response.status,200);
 assert.equal(Object.keys(publicState.payload.products).length,40);
 assert.equal(publicState.payload.products["citrus-sunrise"].status,"available");
 assert.equal(publicState.payload.drops.length,2);
 assert.equal(Object.keys(publicState.payload.boxes).length,5);
 const audit=await json("/api/admin/audit",{headers:adminHeaders});
 assert.ok(audit.payload.events.some(x=>x.eventType==="catalog.product_status_changed"));
 console.log(JSON.stringify({status:"valid",hqProducts:40,soldOutBlocked:true,retiredSkusBlocked:true,featuredDropPreviews:2,legacyBoxEnquiries:5}));
} finally {
 server.close(); await once(server,"close");
 delete process.env.STJ_TEST_ADMIN_TOKEN;
}
