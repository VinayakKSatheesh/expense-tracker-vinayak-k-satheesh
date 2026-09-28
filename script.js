const STORAGE_KEY="expenseFlowTransactions";
const CATEGORIES={expense:["Food","Transport","Shopping","Bills","Entertainment","Health","Education","Other"],income:["Salary","Freelance","Business","Investment","Gift","Other"]};
const COLORS=["#5b5fe6","#19a273","#e05268","#e6a43b","#8c6de8","#3d9fca","#ef7690","#657083"];
let transactions=loadTransactions(),selectedType="expense",activeFilter="all",editingId=null;

const $=id=>document.getElementById(id);
const form=$("transactionForm"), amountInput=$("amount"), categoryInput=$("category"), dateInput=$("date"), descriptionInput=$("description");

document.addEventListener("DOMContentLoaded",init);

function init(){
  $("todayLabel").textContent=new Intl.DateTimeFormat("en-IN",{day:"2-digit",month:"short",year:"numeric"}).format(new Date());
  dateInput.value=getToday();
  populateCategoryOptions();populateCategoryFilter();populateMonthFilter();bindEvents();render();
}
function bindEvents(){
  $("openModalBtn").onclick=()=>openModal();
  $("emptyAddBtn").onclick=()=>openModal();
  $("quickAddBtn").onclick=()=>openModal("expense");
  $("closeModalBtn").onclick=closeModal;
  $("cancelEditBtn").onclick=closeModal;
  $("mobileMenu").onclick=()=>$("sidebar").classList.toggle("open");
  $("viewAllBtn").onclick=()=>{activeFilter="all";document.querySelectorAll(".filter-btn").forEach(b=>b.classList.toggle("active",b.dataset.filter==="all"));$("categoryFilter").value="all";renderTransactions()};
  $("categoryFilter").onchange=renderTransactions;
  $("monthFilter").onchange=()=>{renderMonthlySummary();drawCharts()};
  document.querySelectorAll(".filter-btn").forEach(btn=>btn.onclick=()=>{activeFilter=btn.dataset.filter;document.querySelectorAll(".filter-btn").forEach(b=>b.classList.toggle("active",b===btn));populateCategoryFilter();renderTransactions()});
  document.querySelectorAll(".type-btn").forEach(btn=>btn.onclick=()=>{selectedType=btn.dataset.type;document.querySelectorAll(".type-btn").forEach(b=>b.classList.toggle("active",b===btn));populateCategoryOptions()});
  form.onsubmit=handleSubmit;
  document.addEventListener("keydown",e=>{if(e.key==="Escape")closeModal()});
  window.addEventListener("resize",drawCharts);
  document.querySelectorAll(".nav-item").forEach(a=>a.onclick=()=>{if(window.innerWidth<=760)$("sidebar").classList.remove("open")});
}
function openModal(type=selectedType){
  if(type==="income"||type==="expense"){selectedType=type}
  document.querySelectorAll(".type-btn").forEach(b=>b.classList.toggle("active",b.dataset.type===selectedType));
  populateCategoryOptions();
  $("modalBackdrop").classList.add("open");document.body.style.overflow="hidden";
  setTimeout(()=>amountInput.focus(),100);
}
function closeModal(){resetForm();$("modalBackdrop").classList.remove("open");document.body.style.overflow=""}
function handleSubmit(e){
  e.preventDefault();clearErrors();
  const amount=Number(amountInput.value),category=categoryInput.value,date=dateInput.value,description=descriptionInput.value.trim();
  let valid=true;
  if(!Number.isFinite(amount)||amount<=0){showError("amountError","Enter an amount greater than 0.");valid=false}
  if(!category){showError("categoryError","Select a category.");valid=false}
  if(!date){showError("dateError","Select a date.");valid=false}
  if(!valid)return;
  const tx={id:editingId||createId(),type:selectedType,amount:Math.round(amount*100)/100,category,date,description:description||category,createdAt:editingId?(transactions.find(x=>x.id===editingId)?.createdAt||Date.now()):Date.now()};
  if(editingId){transactions=transactions.map(x=>x.id===editingId?tx:x);showToast("Transaction updated")}
  else{transactions.unshift(tx);showToast("Transaction added")}
  saveTransactions();populateCategoryFilter();populateMonthFilter();closeModal();render();
}
function render(){renderSummary();renderTransactions();renderMonthlySummary();drawCharts()}
function renderSummary(){
  const income=transactions.filter(x=>x.type==="income").reduce((s,x)=>s+x.amount,0);
  const expense=transactions.filter(x=>x.type==="expense").reduce((s,x)=>s+x.amount,0);
  $("totalIncome").textContent=currency(income);$("totalExpense").textContent=currency(expense);$("balance").textContent=currency(income-expense);$("totalTransactions").textContent=transactions.length;
}
function renderTransactions(){
  const list=getFilteredTransactions(),container=$("transactionList"),empty=$("emptyState");
  container.innerHTML="";
  if(!list.length){empty.classList.add("show");return} empty.classList.remove("show");
  list.slice(0,8).forEach(tx=>{
    const item=document.createElement("article");item.className="transaction-item";
    const icon=tx.type==="income"?"↗":"↘",sign=tx.type==="income"?"+":"-";
    item.innerHTML=`<div class="transaction-icon ${tx.type}">${icon}</div>
      <div class="transaction-main"><h4>${esc(tx.description)}</h4><p>${esc(tx.category)} • ${formatDate(tx.date)}</p></div>
      <div class="transaction-amount ${tx.type}">${sign}${currency(tx.amount)}</div>
      <div class="item-actions"><button class="action-btn" type="button">Edit</button><button class="action-btn" type="button">Delete</button></div>`;
    item.querySelectorAll(".action-btn")[0].onclick=()=>startEdit(tx.id);
    item.querySelectorAll(".action-btn")[1].onclick=()=>deleteTransaction(tx.id);
    container.appendChild(item);
  });
}
function getFilteredTransactions(){
  let list=[...transactions];
  if(activeFilter!=="all")list=list.filter(x=>x.type===activeFilter);
  if($("categoryFilter").value!=="all")list=list.filter(x=>x.category===$("categoryFilter").value);
  return list.sort((a,b)=>new Date(b.date)-new Date(a.date)||b.createdAt-a.createdAt);
}
function startEdit(id){
  const tx=transactions.find(x=>x.id===id);if(!tx)return;
  editingId=id;selectedType=tx.type;populateCategoryOptions();
  amountInput.value=tx.amount;categoryInput.value=tx.category;dateInput.value=tx.date;descriptionInput.value=tx.description;
  document.querySelectorAll(".type-btn").forEach(b=>b.classList.toggle("active",b.dataset.type===selectedType));
  $("formTitle").textContent="Edit transaction";$("submitBtn").innerHTML="<span>✓</span> Save changes";openModal();
}
function deleteTransaction(id){
  const tx=transactions.find(x=>x.id===id);if(!tx)return;
  if(!confirm(`Delete "${tx.description}"?`))return;
  transactions=transactions.filter(x=>x.id!==id);saveTransactions();populateCategoryFilter();populateMonthFilter();render();showToast("Transaction deleted");
}
function resetForm(){
  editingId=null;selectedType="expense";form.reset();dateInput.value=getToday();clearErrors();
  document.querySelectorAll(".type-btn").forEach(b=>b.classList.toggle("active",b.dataset.type==="expense"));
  populateCategoryOptions();$("formTitle").textContent="Add transaction";$("submitBtn").innerHTML="<span>+</span> Add transaction";
}
function populateCategoryOptions(){
  categoryInput.innerHTML='<option value="">Select category</option>';
  CATEGORIES[selectedType].forEach(c=>categoryInput.insertAdjacentHTML("beforeend",`<option value="${escAttr(c)}">${esc(c)}</option>`));
}
function populateCategoryFilter(){
  const old=$("categoryFilter").value;
  const cats=[...new Set(transactions.filter(x=>activeFilter==="all"||x.type===activeFilter).map(x=>x.category))].sort();
  $("categoryFilter").innerHTML='<option value="all">All categories</option>'+cats.map(c=>`<option value="${escAttr(c)}">${esc(c)}</option>`).join("");
  $("categoryFilter").value=cats.includes(old)?old:"all";
}
function populateMonthFilter(){
  const old=$("monthFilter").value,months=[...new Set(transactions.map(x=>x.date.slice(0,7)))];
  if(!months.length)months.push(getToday().slice(0,7));months.sort().reverse();
  $("monthFilter").innerHTML=months.map(m=>`<option value="${m}">${monthName(m)}</option>`).join("");
  $("monthFilter").value=months.includes(old)?old:months[0];
}
function renderMonthlySummary(){
  const month=$("monthFilter").value,items=transactions.filter(x=>x.date.startsWith(month));
  const income=items.filter(x=>x.type==="income").reduce((s,x)=>s+x.amount,0),expense=items.filter(x=>x.type==="expense").reduce((s,x)=>s+x.amount,0);
  $("monthlyIncome").textContent=currency(income);$("monthlyExpense").textContent=currency(expense);$("monthlyNet").textContent=currency(income-expense);
  $("categoryMonthLabel").textContent=monthName(month);
}
function drawCharts(){drawMonthlyChart();drawCategoryChart()}
function drawMonthlyChart(){
  const canvas=$("monthlyChart"),rect=canvas.getBoundingClientRect(),dpr=devicePixelRatio||1,w=Math.max(rect.width,280),h=210;
  canvas.width=w*dpr;canvas.height=h*dpr;const ctx=canvas.getContext("2d");ctx.scale(dpr,dpr);ctx.clearRect(0,0,w,h);
  const month=$("monthFilter").value,days=new Date(Number(month.slice(0,4)),Number(month.slice(5,7)),0).getDate();
  const income=Array(days).fill(0),expense=Array(days).fill(0);
  transactions.filter(x=>x.date.startsWith(month)).forEach(x=>{const d=Number(x.date.slice(8,10))-1;(x.type==="income"?income:expense)[d]+=x.amount});
  if(!transactions.some(x=>x.date.startsWith(month))){$("monthlyChartEmpty").classList.remove("hidden");return}
  $("monthlyChartEmpty").classList.add("hidden");
  const max=Math.max(...income,...expense,1),left=26,right=8,top=12,bottom=25,cw=(w-left-right)/days;
  ctx.strokeStyle="#edf0f5";ctx.lineWidth=1;for(let i=0;i<4;i++){const y=top+i*(h-top-bottom)/3;ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(w-right,y);ctx.stroke()}
  function bars(arr,color){ctx.fillStyle=color;arr.forEach((v,i)=>{if(!v)return;const bh=(v/max)*(h-top-bottom),x=left+i*cw+cw*.22,y=h-bottom-bh;ctx.beginPath();roundRect(ctx,x,y,Math.max(cw*.22,2),bh,3);ctx.fill()})}
  bars(income,"#5b5fe6");bars(expense,"#e05268");
  ctx.fillStyle="#a0a6b3";ctx.font="8px DM Sans";ctx.textAlign="center";
  [1,8,15,22,days].forEach(d=>{if(d<=days)ctx.fillText(String(d),left+(d-.5)*cw,h-7)});
}
function drawCategoryChart(){
  const canvas=$("categoryChart"),ctx=canvas.getContext("2d"),dpr=devicePixelRatio||1;canvas.width=220*dpr;canvas.height=220*dpr;ctx.scale(dpr,dpr);ctx.clearRect(0,0,220,220);
  const month=$("monthFilter").value,totals={};
  transactions.filter(x=>x.type==="expense"&&x.date.startsWith(month)).forEach(x=>totals[x.category]=(totals[x.category]||0)+x.amount);
  const entries=Object.entries(totals).sort((a,b)=>b[1]-a[1]),total=entries.reduce((s,x)=>s+x[1],0);
  $("categoryTotal").textContent=shortCurrency(total);$("categoryLegend").innerHTML="";
  if(!entries.length){drawEmptyDonut(ctx);return}
  let start=-Math.PI/2;
  entries.forEach(([name,value],i)=>{const angle=value/total*Math.PI*2;ctx.beginPath();ctx.moveTo(110,110);ctx.arc(110,110,82,start,start+angle);ctx.closePath();ctx.fillStyle=COLORS[i%COLORS.length];ctx.fill();start+=angle;
    $("categoryLegend").insertAdjacentHTML("beforeend",`<div class="legend-item"><span class="legend-dot" style="background:${COLORS[i%COLORS.length]}"></span><span class="legend-name">${esc(name)}</span><span class="legend-value">${currency(value)}</span></div>`)});
  ctx.globalCompositeOperation="destination-out";ctx.beginPath();ctx.arc(110,110,49,0,Math.PI*2);ctx.fill();ctx.globalCompositeOperation="source-over";
}
function drawEmptyDonut(ctx){ctx.beginPath();ctx.arc(110,110,82,0,Math.PI*2);ctx.strokeStyle="#eef0f5";ctx.lineWidth=25;ctx.stroke();$("categoryLegend").innerHTML='<div class="legend-item"><span class="legend-dot" style="background:#dfe2ea"></span><span class="legend-name">No expenses yet</span><span class="legend-value">—</span></div>'}
function roundRect(ctx,x,y,w,h,r){const rr=Math.min(r,w/2,h/2);ctx.moveTo(x+rr,y);ctx.arcTo(x+w,y,x+w,y+h,rr);ctx.arcTo(x+w,y+h,x,y+h,rr);ctx.arcTo(x,y+h,x,y,rr);ctx.arcTo(x,y,x+w,y,rr);ctx.closePath()}
function loadTransactions(){try{const x=JSON.parse(localStorage.getItem(STORAGE_KEY));return Array.isArray(x)?x:[]}catch{return[]}}
function saveTransactions(){localStorage.setItem(STORAGE_KEY,JSON.stringify(transactions))}
function currency(v){return new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:2}).format(v)}
function shortCurrency(v){if(v>=100000)return "₹"+(v/100000).toFixed(1)+"L";if(v>=1000)return "₹"+(v/1000).toFixed(1)+"K";return "₹"+Math.round(v)}
function formatDate(s){return new Intl.DateTimeFormat("en-IN",{day:"2-digit",month:"short",year:"numeric"}).format(new Date(s+"T00:00:00"))}
function monthName(s){return new Intl.DateTimeFormat("en-IN",{month:"long",year:"numeric"}).format(new Date(s+"-01T00:00:00"))}
function getToday(){const d=new Date(),o=d.getTimezoneOffset();return new Date(d.getTime()-o*60000).toISOString().slice(0,10)}
function createId(){return Date.now()+"-"+Math.random().toString(36).slice(2,8)}
function showError(id,msg){$(id).textContent=msg}
function clearErrors(){document.querySelectorAll(".error").forEach(x=>x.textContent="")}
function showToast(msg){$("toast").textContent=msg;$("toast").classList.add("show");clearTimeout(showToast.t);showToast.t=setTimeout(()=>$("toast").classList.remove("show"),2200)}
function esc(v){return String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}
function escAttr(v){return esc(v)}
