const WHATSAPP_NUMBER = '94740405755';
const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const safe = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function money(n){return 'LKR '+Number(n||0).toLocaleString('en-LK');}
function toast(message){const t=$('#toast');t.textContent=message;t.classList.remove('hidden');clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.add('hidden'),3200);}
function showFlower(){const p=$('#petalPop');p.classList.remove('hidden');p.textContent='✿';p.style.animation='none';void p.offsetWidth;p.style.animation='';setTimeout(()=>p.classList.add('hidden'),1600);}
function openModal(id){$('#'+id).classList.remove('hidden');document.body.style.overflow='hidden';}
function closeModal(id){$('#'+id).classList.add('hidden');if(!$$('.modal:not(.hidden)').length)document.body.style.overflow='';}
$$('[data-close]').forEach(b=>b.addEventListener('click',()=>closeModal(b.dataset.close)));
$$('.modal').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)closeModal(m.id)}));
document.addEventListener('keydown',e=>{if(e.key==='Escape') $$('.modal:not(.hidden)').forEach(m=>closeModal(m.id));});

const configOk = window.RUU_SUPABASE_URL && window.RUU_SUPABASE_PUBLISHABLE_KEY &&
  !window.RUU_SUPABASE_URL.includes('PASTE_') && !window.RUU_SUPABASE_PUBLISHABLE_KEY.includes('PASTE_');
const supabase = configOk && window.supabase ? window.supabase.createClient(window.RUU_SUPABASE_URL,window.RUU_SUPABASE_PUBLISHABLE_KEY) : null;
let products=[], orders=[], selectedProduct=null, activeFilter='all', adminSession=null;

function renderProducts(){
 const list=products.filter(p=>activeFilter==='all'||p.category===activeFilter);
 $('#productGrid').innerHTML=list.map(p=>`<article class="product-card"><div class="product-photo"><img src="${safe(p.image_url||'assets/cover.jpg')}" alt="${safe(p.name)}" loading="lazy"><span class="category-tag">${safe(p.category)}</span></div><div class="product-info"><h3>${safe(p.name)}</h3><p>${safe(p.description||'A handmade creation from Ruu Craft.')}</p><div class="product-bottom"><span class="price">${money(p.price)}</span><button class="request-btn" data-order="${safe(p.id)}">Request on WhatsApp ↗</button></div></div></article>`).join('');
 $('#emptyState').classList.toggle('hidden',list.length>0);
 $$('[data-order]').forEach(b=>b.addEventListener('click',()=>openOrder(b.dataset.order)));
}
async function loadProducts(){
 if(!supabase){products=[];renderProducts();toast('Add your Supabase URL and Publishable key in supabase-config.js first.');return;}
 const {data,error}=await supabase.from('products').select('id,name,description,price,category,image_url,is_active,created_at').eq('is_active',true).order('created_at',{ascending:false});
 if(error){console.error(error);toast('Could not load products. Check Supabase setup.');return;}
 products=data||[];renderProducts();
}
function openOrder(id){
 selectedProduct=products.find(p=>p.id===id);if(!selectedProduct)return;
 $('#orderProduct').innerHTML=`<img src="${safe(selectedProduct.image_url||'assets/cover.jpg')}" alt=""><div><b>${safe(selectedProduct.name)}</b><small>${money(selectedProduct.price)} · ${safe(selectedProduct.category)}</small></div>`;
 $('#orderForm').reset();$('#quantity').value=1;openModal('orderModal');
}
async function uploadFile(bucket,file){
 const ext=(file.name.split('.').pop()||'bin').replace(/[^a-zA-Z0-9]/g,'').slice(0,8)||'bin';
 const path=`${crypto.randomUUID()}.${ext}`;
 const {error}=await supabase.storage.from(bucket).upload(path,file,{upsert:false,contentType:file.type||'application/octet-stream'});
 if(error) throw error;
 return path;
}
$('#orderForm').addEventListener('submit',async e=>{
 e.preventDefault();if(!selectedProduct)return;
 if(!supabase){toast('Website database is not configured yet.');return;}
 const button=$('#orderForm button[type="submit"]');button.disabled=true;
 try{
  const name=$('#customerName').value.trim(), quantity=Math.max(1,Number($('#quantity').value)||1), notes=$('#notes').value.trim(), file=$('#receipt').files[0];
  let receiptPath='',receiptName='';
  if(file){
   if(file.size>5*1024*1024){toast('Please use a receipt file smaller than 5 MB.');return;}
   receiptPath=await uploadFile('payment-receipts',file);receiptName=file.name;
  }
  const orderRef='RC-'+Date.now().toString().slice(-7);
  const row={order_ref:orderRef,product_id:selectedProduct.id,product_name:selectedProduct.name,price:Number(selectedProduct.price),quantity,customer_name:name,notes,receipt_path:receiptPath,receipt_name:receiptName,status:'Pending review'};
  const {error}=await supabase.from('orders').insert(row);
  if(error) throw error;
  const message=`Hi Ruu Craft! 🌸 I'd like to request this order.\n\nOrder: ${selectedProduct.name}\nCategory: ${selectedProduct.category}\nQuantity: ${quantity}\nPrice shown: ${money(selectedProduct.price*quantity)}\nName: ${name}\nNotes: ${notes||'None'}\nOrder reference: ${orderRef}\n${file?'I uploaded a payment receipt on the website; I can attach it in this WhatsApp chat if needed.':''}\nPlease confirm availability and payment/delivery details. Thank you! 💗`;
  closeModal('orderModal');showFlower();toast('Order saved. Opening WhatsApp…');
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`,'_blank','noopener');
 }catch(err){console.error(err);toast('Order could not be saved. Check Storage/table policies.');}
 finally{button.disabled=false;}
});
$$('.filter').forEach(b=>b.addEventListener('click',()=>{$$('.filter').forEach(x=>x.classList.remove('active'));b.classList.add('active');activeFilter=b.dataset.filter;renderProducts();}));

$('#adminOpen').addEventListener('click',async()=>{
 $('#adminLogin').classList.remove('hidden');$('#adminDashboard').classList.add('hidden');$('#adminEmail').value='';$('#adminPassword').value='';$('#loginError').classList.add('hidden');
 if(supabase){const {data}=await supabase.auth.getSession();if(data.session){adminSession=data.session;const ok=await checkAdmin();if(ok){$('#adminLogin').classList.add('hidden');$('#adminDashboard').classList.remove('hidden');await refreshAdmin();}}}
 openModal('adminModal');
});
async function checkAdmin(){
 if(!supabase||!adminSession)return false;
 const {data,error}=await supabase.from('admin_users').select('user_id').eq('user_id',adminSession.user.id).maybeSingle();
 if(error){console.error(error);return false;}return !!data;
}
$('#loginForm').addEventListener('submit',async e=>{
 e.preventDefault();if(!supabase){$('#loginError').textContent='Add Supabase URL and Publishable key in supabase-config.js.';$('#loginError').classList.remove('hidden');return;}
 const {data,error}=await supabase.auth.signInWithPassword({email:$('#adminEmail').value.trim(),password:$('#adminPassword').value});
 if(error){$('#loginError').textContent='Sign-in failed. Check email/password.';$('#loginError').classList.remove('hidden');return;}
 adminSession=data.session;const ok=await checkAdmin();
 if(!ok){await supabase.auth.signOut();adminSession=null;$('#loginError').textContent='This account has not been granted admin access yet.';$('#loginError').classList.remove('hidden');return;}
 $('#adminLogin').classList.add('hidden');$('#adminDashboard').classList.remove('hidden');await refreshAdmin();
});
$('#logoutBtn').addEventListener('click',async()=>{if(supabase)await supabase.auth.signOut();adminSession=null;$('#adminDashboard').classList.add('hidden');$('#adminLogin').classList.remove('hidden');closeModal('adminModal');toast('Logged out.');});
$$('[data-tab]').forEach(b=>b.addEventListener('click',async()=>{$$('[data-tab]').forEach(x=>x.classList.toggle('active',x===b));['productsAdmin','ordersAdmin'].forEach(id=>$('#'+id).classList.toggle('hidden',id!==b.dataset.tab));if(b.dataset.tab==='ordersAdmin')await renderAdminOrders();}));
async function refreshAdmin(){await loadProducts();await renderAdminProducts();await renderAdminOrders();}
async function renderAdminProducts(){
 const box=$('#adminProductList');
 if(!supabase){box.innerHTML='<p class="admin-hint">Supabase is not configured.</p>';return;}
 const {data,error}=await supabase.from('products').select('*').order('created_at',{ascending:false});
 if(error){box.innerHTML='<p class="admin-hint">Could not load products. Check admin access and RLS policies.</p>';return;}
 if(!data?.length){box.innerHTML='<p class="admin-hint">No products yet. Add your first creation above.</p>';return;}
 box.innerHTML=data.map(p=>`<div class="admin-item"><img src="${safe(p.image_url||'assets/cover.jpg')}" alt=""><div class="item-text"><b>${safe(p.name)}</b><small>${money(p.price)} · ${safe(p.category)}${p.is_active?'':' · Hidden'}</small></div><button class="mini-btn delete" data-delete-product="${safe(p.id)}">Delete</button></div>`).join('');
 $$('[data-delete-product]').forEach(b=>b.addEventListener('click',async()=>{const p=data.find(x=>x.id===b.dataset.deleteProduct);if(!p||!confirm(`Delete “${p.name}”?`))return;const {error}=await supabase.from('products').delete().eq('id',p.id);if(error){toast('Could not delete product.');return;}await refreshAdmin();toast('Product removed.');}));
}
$('#productForm').addEventListener('submit',async e=>{
 e.preventDefault();if(!supabase){toast('Supabase is not configured.');return;}
 const button=$('#productForm button[type="submit"]');button.disabled=true;
 try{
  const file=$('#productImage').files[0];if(!file){toast('Please choose a product photo.');return;}
  if(file.size>5*1024*1024){toast('Please use an image smaller than 5 MB.');return;}
  const imagePath=await uploadFile('product-images',file);
  const {data:urlData}=supabase.storage.from('product-images').getPublicUrl(imagePath);
  const row={name:$('#productName').value.trim(),category:$('#productCategory').value,price:Number($('#productPrice').value),description:$('#productDescription').value.trim(),image_url:urlData.publicUrl,is_active:true};
  const {error}=await supabase.from('products').insert(row);if(error)throw error;
  $('#productForm').reset();await refreshAdmin();toast('Your creation is now live for everyone! ✿');
 }catch(err){console.error(err);toast('Could not add product. Check admin access and Storage policies.');}
 finally{button.disabled=false;}
});
async function renderAdminOrders(){
 if(!supabase)return;
 const box=$('#adminOrderList');const {data,error}=await supabase.from('orders').select('*').order('created_at',{ascending:false});
 if(error){box.innerHTML='<p class="admin-hint">Could not load orders. Check admin access and RLS policies.</p>';return;}
 orders=data||[];$('#orderCount').textContent=orders.filter(o=>o.status==='Pending review').length;
 if(!orders.length){box.innerHTML='<p class="admin-hint">No order requests yet.</p>';return;}
 box.innerHTML=await Promise.all(orders.map(async o=>{
  let receiptLink='';
  if(o.receipt_path){const {data:signed}=await supabase.storage.from('payment-receipts').createSignedUrl(o.receipt_path,300);if(signed?.signedUrl)receiptLink=`<p><a class="mini-btn" href="${safe(signed.signedUrl)}" target="_blank" rel="noopener">View receipt (5 min link)</a></p>`;}
  return `<div class="admin-item"><div class="item-text"><b>${safe(o.product_name)} · ${safe(o.order_ref)}</b><small>${safe(o.customer_name)} · Qty ${Number(o.quantity)} · ${money(o.price*o.quantity)}<br>${safe(new Date(o.created_at).toLocaleString())} · ${safe(o.status)}${o.receipt_name?' · Receipt: '+safe(o.receipt_name):' · No receipt uploaded'}${o.notes?'<br>Note: '+safe(o.notes):''}</small>${receiptLink}</div><div class="item-actions">${o.status==='Pending review'?`<button class="mini-btn accept" data-accept="${safe(o.id)}">Accept</button>`:''}<button class="mini-btn delete" data-delete-order="${safe(o.id)}">Delete</button></div></div>`;
 }).join(''));
 $$('[data-accept]').forEach(b=>b.addEventListener('click',async()=>{const {error}=await supabase.from('orders').update({status:'Accepted'}).eq('id',b.dataset.accept);if(error){toast('Could not update order.');return;}await renderAdminOrders();showFlower();toast('Order marked as accepted.');}));
 $$('[data-delete-order]').forEach(b=>b.addEventListener('click',async()=>{if(!confirm('Delete this order?'))return;const {error}=await supabase.from('orders').delete().eq('id',b.dataset.deleteOrder);if(error){toast('Could not delete order.');return;}await renderAdminOrders();toast('Order removed.');}));
}
$('#menuToggle').addEventListener('click',()=>$('#nav').classList.toggle('open'));$$('#nav a').forEach(a=>a.addEventListener('click',()=>$('#nav').classList.remove('open')));
$('#year').textContent=new Date().getFullYear();
if(supabase){loadProducts();supabase.auth.onAuthStateChange((_event,session)=>{adminSession=session;});}else{renderProducts();toast('Configure Supabase in supabase-config.js to publish shared products.');}
setTimeout(()=>$('#loader').classList.add('done'),1600);
