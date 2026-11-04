'use strict';
// Synthetic original state API, not SugarCube/game source or an ecosystem acceptance claim.
(()=>{
 const state={passage:'NeutralRoom',turns:1,variables:{money:100,timeStamp:0,location:'lab'}};
 let tokens=0,calls=0;const documentId=crypto.randomUUID();
 window.SugarCube={State:state};
 const read=()=>({documentId,money:state.variables.money,tokens,calls});
 const draw=()=>{document.querySelector('#money').textContent=state.variables.money;document.querySelector('#tokens').textContent=tokens;document.querySelector('#state').textContent=JSON.stringify(read())};
 document.querySelector('#buy').onclick=()=>{const price=Number(document.querySelector('#buy').dataset.price);if(state.variables.money>=price){calls++;tokens++;state.variables.money-=price;draw()}};
 window.gerFixture={read};draw();
})();
