'use strict';
(()=>{
 let state={credits:100,tokens:0};const documentId=crypto.randomUUID();
 const draw=()=>{document.querySelector('#credits').textContent=state.credits;document.querySelector('#tokens').textContent=state.tokens;document.querySelector('#state').textContent=JSON.stringify({documentId,...state},null,2)};
 document.querySelector('#purchase').onclick=()=>{if(state.credits>=10){state.credits-=10;state.tokens++;draw()}};
 document.querySelector('#save').onclick=()=>localStorage.setItem('paisley-neutral-workshop',JSON.stringify(state));
 document.querySelector('#load').onclick=()=>{const saved=localStorage.getItem('paisley-neutral-workshop');if(saved){state=JSON.parse(saved);draw()}};
 document.querySelector('#hash').onclick=()=>{location.hash='next'};
 window.neutralWorkshop={read:()=>({documentId,...state})};draw();
})();
