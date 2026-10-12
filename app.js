const SUPABASE_URL = "https://xizbmuzcvhtvduuyiymn.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_93QlWcwewRXuv-yq190nwQ_4A26JLrT";
let supabaseClient = null, supabaseLoadPromise = null, currentSession = null, groupRefreshBusy = false;
const DB_NAME = "words-goal-tracker-db";
const DB_VERSION = 1;
let db, state = {books:[], monthlyGoal:10000, dailyGoal:500, dailyLog:{}, groups:[], theme:"light"}, selectedBookId = null, selectedChapterId = null, saveTimer, lastEditorWords=0, calendarDate=new Date(), sprintInterval=null, sprintRemaining=1500, sprintActive=false, sprintPaused=false, sprintStartedWords=0;
const $ = id => document.getElementById(id);
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)+Math.random().toString(36).slice(2));
const countWords = text => (text.trim().match(/\S+/g) || []).length;
const fmt = n => (Number(n)||0).toLocaleString();
function openDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,DB_VERSION);req.onupgradeneeded=()=>{const d=req.result;if(!d.objectStoreNames.contains("state"))d.createObjectStore("state");};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
function readState(){return new Promise((resolve,reject)=>{const tx=db.transaction("state","readonly");const req=tx.objectStore("state").get("main");req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error);});}
function writeState(){return new Promise((resolve,reject)=>{const tx=db.transaction("state","readwrite");tx.objectStore("state").put(state,"main");tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}
function toast(message){const el=$("toast");el.textContent=message;el.classList.add("show");clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove("show"),2400);}
function bookWords(book){return (book.chapters||[]).reduce((sum,c)=>sum+countWords(c.content||""),0);}
function selectedBook(){return state.books.find(b=>b.id===selectedBookId)||null;}
function selectedChapter(){const b=selectedBook();return b?(b.chapters||[]).find(c=>c.id===selectedChapterId)||null:null;}
function applyTheme(){document.documentElement.dataset.theme=state.theme==="dark"?"dark":"light";$("themeToggle").textContent=state.theme==="dark"?"☀":"☾";$("themeToggle").title=state.theme==="dark"?"Switch to light theme":"Switch to dark theme";}
function render(){applyTheme();renderBooks();renderEditor();renderStats();renderCalendar();}
function renderBooks(){const list=$("bookList");list.innerHTML="";if(!state.books.length)list.innerHTML='<p class="empty-note">Your library is waiting for its first story. Tap + to add a book.</p>';state.books.forEach(b=>{const el=document.createElement("button");el.className="book-item"+(b.id===selectedBookId?" active":"");el.innerHTML=`<span class="book-dot"></span><span><strong></strong><small>${fmt(bookWords(b))} / ${fmt(b.goal)} words</small></span>`;el.querySelector("strong").textContent=b.title;el.onclick=()=>{selectedBookId=b.id;selectedChapterId=b.chapters[0]?.id||null;render();};list.appendChild(el);});}
function renderEditor(){const b=selectedBook(),c=selectedChapter();$("currentBookTitle").textContent=b?b.title:"No book selected";$("welcomeTitle").textContent=b?`Keep going, writer. 💜`:"Every word counts."; $("welcomeSubtitle").textContent=b?"Your story is growing, one chapter at a time.":"Choose a book or create a new one to begin."; $("editBookBtn").disabled=!b;$("addChapterBtn").disabled=!b;$("exportChapterBtn").disabled=!c;
const cl=$("chapterList");cl.innerHTML="";if(!b)cl.innerHTML='<p class="muted tiny">Create a book to add chapters.</p>';else if(!b.chapters.length)cl.innerHTML='<p class="muted tiny">No chapters yet. Tap + Chapter to begin.</p>';else b.chapters.forEach(ch=>{const el=document.createElement("button");el.className="chapter-item"+(ch.id===selectedChapterId?" active":"");el.innerHTML="<strong></strong><small>"+fmt(countWords(ch.content||""))+" words</small>";el.querySelector("strong").textContent=ch.title;el.onclick=()=>{saveCurrentEditor();selectedChapterId=ch.id;renderEditor();};cl.appendChild(el);});
$("chapterTitle").disabled=!c;$("chapterEditor").disabled=!c;$("chapterTitle").value=c?c.title:"";$("chapterEditor").value=c?c.content||"":"";lastEditorWords=countWords(c?c.content||"":"");$("liveWordCount").textContent=fmt(c?countWords(c.content||""):0);$("saveStatus").textContent=c?"Saved on this device":"Nothing to save yet";
const words=b?bookWords(b):0,goal=b?Number(b.goal)||1:1,pct=Math.min(100,Math.round(words/goal*100));$("bookGoalLabel").textContent=b?fmt(goal):"—";$("bookProgressBar").style.width=pct+"%";$("bookProgressLabel").textContent=b?pct+"%":"0%";}
function dateKey(date=new Date()){return date.getFullYear()+"-"+String(date.getMonth()+1).padStart(2,"0")+"-"+String(date.getDate()).padStart(2,"0");}
function renderStats(){const total=state.books.reduce((s,b)=>s+bookWords(b),0),today=dateKey(),log=state.dailyLog||{},todayWords=Number(log[today]||0),goal=Number(state.monthlyGoal)||10000,dailyGoal=Number(state.dailyGoal)||500;$("totalWords").textContent=fmt(total);$("bookCount").textContent=state.books.length;$("monthlyGoalInput").value=goal;$("monthlyGoalLabel").textContent=fmt(goal);$("dailyGoalInput").value=dailyGoal;$("dailyGoalLabel").textContent=fmt(dailyGoal);$("todayWords").textContent=fmt(todayWords);const monthWords=Object.entries(log).filter(([d])=>d.startsWith(today.slice(0,7))).reduce((a,[,v])=>a+Number(v||0),0);$("monthWords").textContent=fmt(monthWords);const pct=Math.min(100,Math.round(monthWords/goal*100));$("monthProgressBar").style.width=pct+"%";$("monthProgressLabel").textContent=pct+"% of monthly goal";let streak=0,day=new Date();if(!log[today])day.setDate(day.getDate()-1);while(Number(log[dateKey(day)]||0)>0){streak++;day.setDate(day.getDate()-1);}$("streakDays").textContent=streak+(streak===1?" day":" days");}
function renderCalendar(){const y=calendarDate.getFullYear(),m=calendarDate.getMonth();$("calendarMonthLabel").textContent=new Date(y,m,1).toLocaleDateString(undefined,{month:"long",year:"numeric"});const grid=$("calendarGrid");grid.innerHTML="";const first=new Date(y,m,1).getDay(),days=new Date(y,m+1,0).getDate(),today=dateKey();for(let i=0;i<first;i++){const e=document.createElement("div");e.className="calendar-day empty";grid.appendChild(e);}for(let d=1;d<=days;d++){const date=new Date(y,m,d),key=dateKey(date),el=document.createElement("div");el.className="calendar-day";if(Number((state.dailyLog||{})[key]||0)>0)el.classList.add("wrote");if(key===today)el.classList.add("today");if(date>new Date())el.classList.add("future");el.textContent=d;el.title=Number((state.dailyLog||{})[key]||0)?fmt(state.dailyLog[key])+" words recorded":"No words recorded";grid.appendChild(el);}}
function saveCurrentEditor(){const c=selectedChapter();if(!c)return;c.title=$("chapterTitle").value.trim()||"Untitled chapter";c.content=$("chapterEditor").value;writeState().then(()=>{$("saveStatus").textContent="Saved on this device";renderBooks();renderStats();if(navigator.onLine)syncMyProgress(false);});}
function scheduleSave(){const c=selectedChapter();if(!c)return;c.title=$("chapterTitle").value.trim()||"Untitled chapter";c.content=$("chapterEditor").value;const currentWords=countWords(c.content),delta=Math.max(0,currentWords-lastEditorWords);if(delta>0){const key=dateKey();state.dailyLog=state.dailyLog||{};state.dailyLog[key]=(Number(state.dailyLog[key])||0)+delta;}lastEditorWords=currentWords;$("liveWordCount").textContent=fmt(currentWords);$("saveStatus").textContent="Saving…";clearTimeout(saveTimer);saveTimer=setTimeout(()=>{writeState().then(()=>{$("saveStatus").textContent="Saved on this device";renderBooks();renderStats();renderCalendar();renderChapterListOnly();if(navigator.onLine)syncMyProgress(false);}).catch(()=>{$("saveStatus").textContent="Could not save";toast("Saving failed. Please export a backup.");});},250);}
function renderChapterListOnly(){const b=selectedBook();if(!b)return;[...$("chapterList").children].forEach((el,i)=>{const c=b.chapters[i];if(c)el.querySelector("small").textContent=fmt(countWords(c.content||""))+" words";});}
function download(filename,content,type="application/json"){const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$("addBookBtn").onclick=()=>{$("bookDialogTitle").textContent="Create a book";$("bookNameInput").value="";$("bookGoalInput").value=100000;$("bookDialog").showModal();};
$("editBookBtn").onclick=()=>{const b=selectedBook();if(!b)return;$("bookDialogTitle").textContent="Edit book";$("bookNameInput").value=b.title;$("bookGoalInput").value=b.goal;$("bookDialog").showModal();};
$("bookForm").onsubmit=e=>{e.preventDefault();const title=$("bookNameInput").value.trim(),goal=Math.max(1,Number($("bookGoalInput").value)||100000);let b=selectedBook();if($("bookDialogTitle").textContent==="Edit book"&&b){b.title=title;b.goal=goal;}else{b={id:uid(),title,goal,chapters:[]};state.books.push(b);selectedBookId=b.id;selectedChapterId=null;}writeState().then(()=>{ $("bookDialog").close();render();toast("Book saved 💜");});};
$("addChapterBtn").onclick=()=>{if(!selectedBook())return;$("newChapterTitle").value=`Chapter ${(selectedBook().chapters.length||0)+1}`;$("chapterDialog").showModal();};
$("chapterForm").onsubmit=e=>{e.preventDefault();const b=selectedBook();if(!b)return;const c={id:uid(),title:$("newChapterTitle").value.trim(),content:""};b.chapters.push(c);selectedChapterId=c.id;writeState().then(()=>{$("chapterDialog").close();render();$("chapterEditor").focus();toast("Chapter created. Start writing!");});};
document.querySelectorAll("[data-close]").forEach(btn=>btn.onclick=()=>$(btn.dataset.close).close());
$("chapterTitle").addEventListener("input",scheduleSave);$("chapterEditor").addEventListener("input",scheduleSave);
$("monthlyGoalInput").addEventListener("change",()=>{state.monthlyGoal=Math.max(1,Number($("monthlyGoalInput").value)||10000);writeState().then(renderStats);});
$("dailyGoalInput").addEventListener("change",()=>{state.dailyGoal=Math.max(1,Number($("dailyGoalInput").value)||500);writeState().then(renderStats);});
$("prevMonthBtn").onclick=()=>{calendarDate=new Date(calendarDate.getFullYear(),calendarDate.getMonth()-1,1);renderCalendar();};$("nextMonthBtn").onclick=()=>{calendarDate=new Date(calendarDate.getFullYear(),calendarDate.getMonth()+1,1);renderCalendar();};
function updateSprintClock(){const mm=Math.floor(sprintRemaining/60),ss=sprintRemaining%60;$("sprintClock").textContent=String(mm).padStart(2,"0")+":"+String(ss).padStart(2,"0");}
function resetSprint(){clearInterval(sprintInterval);sprintInterval=null;sprintActive=false;sprintPaused=false;sprintRemaining=Number($("sprintDuration").value)*60;updateSprintClock();$("sprintStartBtn").disabled=false;$("sprintPauseBtn").disabled=true;$("sprintPauseBtn").textContent="Pause";}
$("sprintDuration").onchange=()=>{resetSprint();$("sprintResult").textContent="Ready when you are. Choose a chapter and start writing!";};
$("sprintStartBtn").onclick=()=>{if(sprintActive)return;sprintActive=true;sprintPaused=false;sprintStartedWords=countWords($("chapterEditor").value||"");$("sprintStartBtn").disabled=true;$("sprintPauseBtn").disabled=false;$("sprintResult").textContent="Sprint in progress. Focus on your words! 💜";sprintInterval=setInterval(()=>{if(sprintPaused)return;sprintRemaining--;updateSprintClock();if(sprintRemaining<=0){clearInterval(sprintInterval);sprintInterval=null;sprintActive=false;const written=Math.max(0,countWords($("chapterEditor").value||"")-sprintStartedWords);$("sprintResult").textContent="Sprint complete! You added approximately "+fmt(written)+" words during this sprint. Celebrate showing up! 🎉";$("sprintStartBtn").disabled=false;$("sprintPauseBtn").disabled=true;toast("Sprint complete! Great job 💜");}},1000);};
$("sprintPauseBtn").onclick=()=>{sprintPaused=!sprintPaused;$("sprintPauseBtn").textContent=sprintPaused?"Resume":"Pause";$("sprintResult").textContent=sprintPaused?"Sprint paused. Take a breath, then resume.":"You're back! Keep going.";};$("sprintResetBtn").onclick=()=>{resetSprint();$("sprintResult").textContent="Sprint reset. Ready for another round?";};

// Separate screens keep the mobile app uncluttered.
function showPage(page){document.querySelectorAll(".page-section").forEach(el=>{el.hidden=el.dataset.page!==page;});document.querySelectorAll(".nav-tab").forEach(el=>el.classList.toggle("active",el.dataset.page===page));window.scrollTo({top:0,behavior:"smooth"});if(page==="groups")renderGroups();}
document.querySelectorAll(".nav-tab").forEach(btn=>btn.addEventListener("click",()=>showPage(btn.dataset.page)));
function ensureSupabase(){
  if(window.supabase?.createClient){
    if(!supabaseClient) supabaseClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    return Promise.resolve(supabaseClient);
  }
  if(supabaseLoadPromise) return supabaseLoadPromise;
  supabaseLoadPromise=new Promise((resolve,reject)=>{
    if(!navigator.onLine){reject(new Error("Connect to the internet to use group features."));return;}
    const script=document.createElement("script");
    script.src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js";
    script.async=true;
    script.onload=()=>{if(!window.supabase?.createClient){reject(new Error("Could not load the group connection library."));return;}supabaseClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});resolve(supabaseClient);};
    script.onerror=()=>reject(new Error("Could not load group tools. Connect to the internet and try again."));
    document.head.appendChild(script);
  });
  return supabaseLoadPromise;
}
function setAuthStatus(message,isError=false){const el=$("authStatus");if(el){el.textContent=message;el.classList.toggle("error",isError);}}
function updateAuthUI(){
  const signed=!!currentSession;
  $("signUpBtn").hidden=signed;$("signInBtn").hidden=signed;$("signOutBtn").hidden=!signed;
  $("authEmail").disabled=signed;$("authPassword").disabled=signed;$("authDisplayName").disabled=signed;
  setAuthStatus(signed?`Signed in as ${currentSession.user.email}. Group features are available online.`:(navigator.onLine?"Sign in or create an account to use sprint groups.":"You're offline. Personal writing and solo sprint remain available; groups need internet."));
}
async function initGroupAuth(){
  updateAuthUI();
  if(!navigator.onLine)return;
  try{const client=await ensureSupabase();const {data}=await client.auth.getSession();currentSession=data.session;updateAuthUI();client.auth.onAuthStateChange((_event,session)=>{currentSession=session;updateAuthUI();if(session){loadRemoteGroups();processInviteFromURL();}else{renderGroups();}});if(currentSession){await loadRemoteGroups();await processInviteFromURL();}}
  catch(e){setAuthStatus(e.message||"Group service is unavailable. Personal writing still works offline.",true);}
}
async function loadRemoteGroups(){
  const wrap=$("groupsList");
  if(groupRefreshBusy)return;groupRefreshBusy=true;
  try{
    if(!currentSession){renderGroups();return;}
    const client=await ensureSupabase();const {data,error}=await client.rpc("wgt_my_groups");if(error)throw error;
    const groups=(data||[]).map(g=>({id:g.group_id,name:g.group_name,code:g.invite_code,joinedAt:g.joined_at,myWords:g.my_words}));
    state.remoteGroups=groups;renderGroups();await syncMyProgress(false);
  }catch(e){if(wrap)wrap.innerHTML='<div class="empty-groups"><span>⚠️</span><strong>Could not load groups.</strong><p></p></div>';if(wrap?.querySelector('p'))wrap.querySelector('p').textContent=e.message||"Please try again when online.";}
  finally{groupRefreshBusy=false;}
}
function renderGroups(){
  const wrap=$("groupsList");if(!wrap)return;
  if(!currentSession){wrap.innerHTML='<div class="empty-groups"><span>👥</span><strong>Sign in to use sprint groups.</strong><p>Your books and chapters remain private on this device. Group features require internet.</p></div>';return;}
  const groups=state.remoteGroups||[];
  if(!groups.length){wrap.innerHTML='<div class="empty-groups"><span>👥</span><strong>Your writing circle starts here.</strong><p>Create a group or join using a friend’s invitation code.</p></div>';return;}
  wrap.innerHTML="";
  groups.forEach(g=>{
    const card=document.createElement("article");card.className="group-card";
    const heading=document.createElement("div");heading.className="group-card-head";
    const title=document.createElement("div");title.innerHTML='<p class="eyebrow">SPRINT GROUP</p><h3></h3><small>Shared progress only · no manuscripts</small>';title.querySelector("h3").textContent=g.name;
    const code=document.createElement("span");code.className="group-code";code.textContent=g.code;heading.append(title,code);
    const actions=document.createElement("div");actions.className="group-actions";
    const share=document.createElement("button");share.className="primary-button";share.textContent="Share invite";share.onclick=async()=>{const invite=location.origin+location.pathname+"?join="+encodeURIComponent(g.code);try{if(navigator.share)await navigator.share({title:"Join "+g.name,text:"Join my Words Goal Tracker sprint group. Sign in or create an account, then join with this code: "+g.code,url:invite});else if(navigator.clipboard){await navigator.clipboard.writeText(invite);toast("Invitation link copied 💜");}else prompt("Copy invitation link",invite);}catch(e){}};
    const progress=document.createElement("button");progress.className="secondary-button";progress.textContent="Refresh progress";progress.onclick=()=>loadGroupProgress(g.id,card);
    const shareWords=document.createElement("button");shareWords.className="secondary-button";shareWords.textContent="Share today's words";shareWords.onclick=async()=>{try{await updateGroupWords(g.id);toast("Today's word count shared 💜");await loadGroupProgress(g.id,card);}catch(e){toast(e.message||"Could not share progress.");}};
    actions.append(share,shareWords,progress);
    const memberArea=document.createElement("div");memberArea.className="member-progress";memberArea.innerHTML='<p class="muted tiny">Tap “Refresh progress” to see members’ shared word counts.</p>';
    card.append(heading,actions,memberArea);wrap.appendChild(card);
  });
}
async function loadGroupProgress(groupId,card){
  try{const client=await ensureSupabase();const {data,error}=await client.rpc("wgt_group_progress",{p_group_id:groupId});if(error)throw error;const area=card.querySelector(".member-progress");area.innerHTML="";if(!data?.length){area.textContent="No progress shared yet.";return;}data.forEach(m=>{const row=document.createElement("div");row.className="member-row";const name=document.createElement("span");name.textContent=m.display_name;const words=document.createElement("strong");words.textContent=fmt(m.shared_words)+" words today";row.append(name,words);area.appendChild(row);});}catch(e){toast(e.message||"Could not load member progress.");}
}
async function updateGroupWords(groupId){const client=await ensureSupabase();const todayWords=Number((state.dailyLog||{})[dateKey()]||0);const {error}=await client.rpc("wgt_update_progress",{p_group_id:groupId,p_words:todayWords});if(error)throw error;}
async function syncMyProgress(showMessage=false){if(!currentSession||!navigator.onLine)return;const groups=state.remoteGroups||[];for(const g of groups){try{await updateGroupWords(g.id);}catch(e){if(showMessage)toast(e.message||"Progress sync failed.");}}}
async function processInviteFromURL(){
  const code=new URLSearchParams(location.search).get("join");if(!code||!currentSession)return;
  try{const client=await ensureSupabase();const {data,error}=await client.rpc("wgt_join_group",{p_invite_code:code});if(error)throw error;history.replaceState({},"",location.pathname);$("joinCodeInput").value="";showPage("groups");await loadRemoteGroups();toast("You joined "+data.name+"! 💜");}
  catch(e){setAuthStatus("Invitation could not be joined: "+(e.message||"please check the code."),true);showPage("groups");}
}
async function createRemoteGroup(){
  const name=$("groupNameInput").value.trim();if(!name){toast("Give your group a name first.");return;}
  try{if(!currentSession)throw new Error("Sign in first to create a shared group.");if(!navigator.onLine)throw new Error("Connect to the internet to create a group.");const client=await ensureSupabase();const {error}=await client.rpc("wgt_create_group",{p_name:name});if(error)throw error;$("groupNameInput").value="";await loadRemoteGroups();toast("Group created online 💜");}
  catch(e){toast(e.message||"Could not create group.");}
}
async function joinRemoteGroup(){const code=$("joinCodeInput").value.trim();if(!code){toast("Enter an invitation code first.");return;}try{if(!currentSession)throw new Error("Sign in first to join a group.");if(!navigator.onLine)throw new Error("Connect to the internet to join a group.");const client=await ensureSupabase();const {data,error}=await client.rpc("wgt_join_group",{p_invite_code:code});if(error)throw error;$("joinCodeInput").value="";await loadRemoteGroups();toast("You joined "+data.name+"! 💜");}catch(e){toast(e.message||"Could not join group.");}}
$("signUpBtn").onclick=async()=>{try{const email=$("authEmail").value.trim(),password=$("authPassword").value,displayName=$("authDisplayName").value.trim()||"Writer";if(!email||!password)throw new Error("Enter your email and password.");if(password.length<6)throw new Error("Use a password with at least 6 characters.");const client=await ensureSupabase();const {data,error}=await client.auth.signUp({email,password,options:{data:{display_name:displayName},emailRedirectTo:location.origin+location.pathname}});if(error)throw error;if(data.session){currentSession=data.session;updateAuthUI();await loadRemoteGroups();toast("Account created 💜");}else setAuthStatus("Account created. Check your email to confirm it, then sign in.");}catch(e){setAuthStatus(e.message||"Could not create account.",true);}};
$("signInBtn").onclick=async()=>{try{const email=$("authEmail").value.trim(),password=$("authPassword").value;if(!email||!password)throw new Error("Enter your email and password.");const client=await ensureSupabase();const {data,error}=await client.auth.signInWithPassword({email,password});if(error)throw error;currentSession=data.session;updateAuthUI();await loadRemoteGroups();await processInviteFromURL();toast("Signed in 💜");}catch(e){setAuthStatus(e.message||"Could not sign in.",true);}};
$("signOutBtn").onclick=async()=>{try{const client=await ensureSupabase();await client.auth.signOut();currentSession=null;state.remoteGroups=[];updateAuthUI();renderGroups();toast("Signed out.");}catch(e){setAuthStatus(e.message||"Could not sign out.",true);}};
$("createGroupBtn").onclick=createRemoteGroup;
$("joinGroupBtn").onclick=joinRemoteGroup;
window.addEventListener("online",()=>{updateAuthUI();if(currentSession)loadRemoteGroups();});
window.addEventListener("offline",updateAuthUI);
$("themeToggle").onclick=()=>{state.theme=state.theme==="dark"?"light":"dark";writeState().then(applyTheme);};
$("exportChapterBtn").onclick=()=>{saveCurrentEditor();const c=selectedChapter();if(c)download((c.title||"chapter").replace(/[^\w\- ]/g,"").replace(/\s+/g,"-")+".txt",c.content||"","text/plain;charset=utf-8");};
$("exportBackupBtn").onclick=()=>{saveCurrentEditor();download("words-goal-tracker-backup-"+new Date().toISOString().slice(0,10)+".json",JSON.stringify(state,null,2));toast("Backup exported. Keep it somewhere safe.");};
$("importBackupInput").onchange=async e=>{const file=e.target.files[0];if(!file)return;try{const imported=JSON.parse(await file.text());if(!Array.isArray(imported.books))throw Error("Invalid backup");if(!confirm("Import this backup and replace the current library on this device? Export your current backup first if you want to keep it."))return;state={books:imported.books,monthlyGoal:imported.monthlyGoal||10000,dailyGoal:imported.dailyGoal||500,dailyLog:imported.dailyLog||{},groups:imported.groups||[],theme:imported.theme||"light"};selectedBookId=state.books[0]?.id||null;selectedChapterId=state.books[0]?.chapters?.[0]?.id||null;await writeState();render();toast("Backup restored.");}catch(err){toast("That backup file could not be read.");}finally{e.target.value="";}};
document.addEventListener("visibilitychange",()=>{if(document.hidden)saveCurrentEditor();});
window.addEventListener("beforeunload",()=>{const c=selectedChapter();if(c){c.title=$("chapterTitle").value.trim()||"Untitled chapter";c.content=$("chapterEditor").value;writeState();}});
async function init(){try{db=await openDB();const saved=await readState();if(saved)state={...state,...saved};selectedBookId=state.books[0]?.id||null;selectedChapterId=state.books[0]?.chapters?.[0]?.id||null;render();resetSprint();showPage("dashboard");if("serviceWorker"in navigator&&location.protocol!=="file:"){navigator.serviceWorker.register("./service-worker.js").catch(()=>{});}}catch(e){document.body.insertAdjacentHTML("afterbegin",'<div class="empty-note">This browser could not open local storage. Please use a recent version of Chrome.</div>');}}
init();
initGroupAuth();