import {useEffect,useMemo,useState} from 'react';
import {deleteDoc,doc,onSnapshot,setDoc,serverTimestamp} from 'firebase/firestore';
import {db} from '../../firebase/firebase';
import {useAuth} from '../../context/AuthContext';
import {Link} from 'react-router-dom';
import Button from '../../components/ui/Button';
import {ArrowLeft,Bluetooth,CheckCircle2,Contact,HeartPulse,MonitorSmartphone,Pill,Plus,RefreshCw,Save,ShieldAlert,Trash2,UserRound} from 'lucide-react';

const SERVICE_UUID='0000fff0-0000-1000-8000-00805f9b34fb';
const DATA_UUID='0000fff1-0000-1000-8000-00805f9b34fb';
const makeEmpty=()=>({personal:{name:'',age:'',bloodGroup:'',note:''},routine:[],medicines:[],contacts:[],emergency:{number:'112',medicalNote:''}});
const clean=x=>String(x??'').replace(/[|\n\r]/g,' ').trim();
const wait=ms=>new Promise(r=>setTimeout(r,ms));

export default function PagerManagement(){
  const {profile}=useAuth();
  const [data,setData]=useState(makeEmpty());
  const [loaded,setLoaded]=useState(false);
  const [msg,setMsg]=useState('');
  const [device,setDevice]=useState(null);
  const [characteristic,setCharacteristic]=useState(null);
  const [syncing,setSyncing]=useState(false);
  const [lastSync,setLastSync]=useState(null);
  const [confirmAction,setConfirmAction]=useState(null);

  useEffect(()=>{
    if(!profile)return;
    if(!profile.groupId){setLoaded(true);setMsg('No patient group is linked to this caregiver yet.');return;}
    setLoaded(false);
    return onSnapshot(doc(db,'groups',profile.groupId,'pagerData','main'),s=>{
      if(s.exists()){
        const d=s.data();
        setData({personal:{...makeEmpty().personal,...d.personal},routine:d.routine||[],medicines:d.medicines||[],contacts:d.contacts||[],emergency:{...makeEmpty().emergency,...d.emergency}});
        setLastSync(d.lastSyncAt?.toDate?.()||null);
      }else{
        setData(makeEmpty());
        setLastSync(null);
      }
      setLoaded(true);
    },e=>{console.error(e);setLoaded(true);setMsg('Could not load saved pager data. You can still enter pager information below.');});
  },[profile]);

  const connected=!!device?.gatt?.connected;

  async function save(show=true){
    if(!profile?.groupId)return;
    await setDoc(doc(db,'groups',profile.groupId,'pagerData','main'),{...data,updatedBy:profile.uid,updatedAt:serverTimestamp()},{merge:true});
    if(show)setMsg('Pager information saved. Connect and sync when the device is nearby.');
  }

  function add(type){
    const templates={routine:{time:'',title:''},medicines:{time:'',name:''},contacts:{relation:'',name:'',phone:''}};
    setData(d=>({...d,[type]:[...d[type],templates[type]]}));
  }
  function updateList(type,i,key,value){setData(d=>({...d,[type]:d[type].map((x,n)=>n===i?{...x,[key]:value}:x)}));}
  function remove(type,i){setData(d=>({...d,[type]:d[type].filter((_,n)=>n!==i)}));}

  async function connect(){
    setMsg('');
    try{
      if(!navigator.bluetooth)throw new Error('Web Bluetooth is not available. Use Chrome or Edge on a supported device.');
      const dev=await navigator.bluetooth.requestDevice({filters:[{services:[SERVICE_UUID]}],optionalServices:[SERVICE_UUID]});
      const server=await dev.gatt.connect();
      const service=await server.getPrimaryService(SERVICE_UUID);
      const ch=await service.getCharacteristic(DATA_UUID);
      dev.addEventListener('gattserverdisconnected',()=>{setCharacteristic(null);setMsg('Pager disconnected. Saved pager data is still available.');});
      setDevice(dev);setCharacteristic(ch);setMsg(`Connected to ${dev.name||'MemoryCare Pager'}.`);
    }catch(e){setMsg(e.message||'Could not connect to pager.');}
  }

  const lines=useMemo(()=>{
    const a=['MCV1|REPLACE_ALL',`PERSON|${clean(data.personal.name)}|${clean(data.personal.age)}|${clean(data.personal.bloodGroup)}|${clean(data.personal.note)}`];
    data.routine.forEach(x=>a.push(`ROUTINE|${clean(x.time)}|${clean(x.title)}`));
    data.medicines.forEach(x=>a.push(`MED|${clean(x.time)}|${clean(x.name)}`));
    data.contacts.forEach(x=>a.push(`CONTACT|${clean(x.relation)}|${clean(x.name)}|${clean(x.phone)}`));
    a.push(`EMERGENCY|${clean(data.emergency.number)}|${clean(data.emergency.medicalNote)}`,'MCV1|END');
    return a;
  },[data]);

  async function writeLines(out){
    if(!characteristic)throw new Error('Connect the pager first.');
    const enc=new TextEncoder();
    for(const line of out){await characteristic.writeValueWithResponse(enc.encode(line+'\n'));await wait(90);}
  }

  async function sync(){
    if(!characteristic)return setMsg('Connect the pager first.');
    setSyncing(true);setMsg('Replacing pager data with the latest saved information…');
    try{
      await save(false);
      await writeLines(lines);
      await setDoc(doc(db,'groups',profile.groupId,'pagerData','main'),{lastSyncAt:serverTimestamp(),lastSyncBy:profile.uid},{merge:true});
      setLastSync(new Date());setMsg('Pager updated successfully. Old device data was replaced and the new data is available offline.');
    }catch(e){setMsg(e.message||'Sync failed. Keep the pager nearby and try again.');}
    finally{setSyncing(false);}
  }

  async function clearDevice(){
    if(!characteristic){setConfirmAction(null);return setMsg('Connect the pager first to clear the physical device.');}
    setSyncing(true);setConfirmAction(null);setMsg('Clearing data stored on the pager…');
    try{await writeLines(['MCV1|CLEAR_ALL']);setMsg('Physical pager cleared. Your saved Pager Management data is still available in MemoryCare.');}
    catch(e){setMsg(e.message||'Could not clear the pager.');}
    finally{setSyncing(false);}
  }

  async function clearEverything(){
    if(!profile?.groupId)return;
    setSyncing(true);setConfirmAction(null);setMsg('Clearing Pager Management data…');
    try{
      if(characteristic)await writeLines(['MCV1|CLEAR_ALL']);
      await deleteDoc(doc(db,'groups',profile.groupId,'pagerData','main'));
      setData(makeEmpty());setLastSync(null);
      setMsg(characteristic?'All Pager Management data and physical pager data were cleared.':'Pager Management data cleared. Connect the physical pager later and use Clear Device if it still contains old offline data.');
    }catch(e){setMsg(e.message||'Could not clear all pager data.');}
    finally{setSyncing(false);}
  }

  if(!loaded)return <main className="page"><p>Loading pager manager…</p></main>;

  return <main className="page premium-page"><div className="max-w-6xl mx-auto relative z-10">
    <div className="flex items-center justify-between gap-3"><Link to="/caregiver/dashboard"><Button variant="secondary"><ArrowLeft className="inline mr-2" size={19}/>Dashboard</Button></Link><span className={`pager-status ${connected?'pager-online':''}`}><span/> {connected?'Pager connected':'Pager not connected'}</span></div>
    <section className="pager-hero"><div><span className="eyebrow">Independent hardware module</span><h1>MemoryCare Pager</h1><p>Enter only the information you want stored on the patient's pager. This section is completely separate from app reminders, family and profile data.</p></div><div className="pager-device"><MonitorSmartphone size={52}/><b>OFFLINE READY</b><small>ESP32 + BLE</small></div></section>
    <div className="grid lg:grid-cols-[1fr_360px] gap-6"><div className="space-y-5">
      <PagerCard icon={UserRound} title="Personal information"><div className="grid sm:grid-cols-3 gap-3"><Field label="Patient name" value={data.personal.name} onChange={v=>setData(d=>({...d,personal:{...d.personal,name:v}}))}/><Field label="Age" value={data.personal.age} onChange={v=>setData(d=>({...d,personal:{...d.personal,age:v}}))}/><Field label="Blood group" value={data.personal.bloodGroup} onChange={v=>setData(d=>({...d,personal:{...d.personal,bloodGroup:v}}))}/></div><Field label="Important note" value={data.personal.note} onChange={v=>setData(d=>({...d,personal:{...d.personal,note:v}}))}/></PagerCard>
      <PagerCard icon={RefreshCw} title="Daily routine" action={()=>add('routine')} actionText="Add routine">{data.routine.map((x,i)=><Row key={i} onDelete={()=>remove('routine',i)}><input className="field" type="time" value={x.time} onChange={e=>updateList('routine',i,'time',e.target.value)}/><input className="field" placeholder="Breakfast / Morning walk" value={x.title} onChange={e=>updateList('routine',i,'title',e.target.value)}/></Row>)}{!data.routine.length&&<Empty text="No pager routine added yet."/>}</PagerCard>
      <PagerCard icon={Pill} title="Medicines" action={()=>add('medicines')} actionText="Add medicine">{data.medicines.map((x,i)=><Row key={i} onDelete={()=>remove('medicines',i)}><input className="field" type="time" value={x.time} onChange={e=>updateList('medicines',i,'time',e.target.value)}/><input className="field" placeholder="Medicine name" value={x.name} onChange={e=>updateList('medicines',i,'name',e.target.value)}/></Row>)}{!data.medicines.length&&<Empty text="No pager medicines added yet."/>}</PagerCard>
      <PagerCard icon={Contact} title="Important contacts" action={()=>add('contacts')} actionText="Add contact">{data.contacts.map((x,i)=><div className="grid sm:grid-cols-[.7fr_1fr_1fr_auto] gap-3 mb-3" key={i}><input className="field" placeholder="Relation" value={x.relation} onChange={e=>updateList('contacts',i,'relation',e.target.value)}/><input className="field" placeholder="Name" value={x.name} onChange={e=>updateList('contacts',i,'name',e.target.value)}/><input className="field" placeholder="Phone" value={x.phone} onChange={e=>updateList('contacts',i,'phone',e.target.value)}/><Delete onClick={()=>remove('contacts',i)}/></div>)}{!data.contacts.length&&<Empty text="No pager contacts added yet."/>}</PagerCard>
      <PagerCard icon={ShieldAlert} title="Emergency information"><div className="grid sm:grid-cols-2 gap-3"><Field label="Emergency number" value={data.emergency.number} onChange={v=>setData(d=>({...d,emergency:{...d.emergency,number:v}}))}/><Field label="Medical / emergency note" value={data.emergency.medicalNote} onChange={v=>setData(d=>({...d,emergency:{...d.emergency,medicalNote:v}}))}/></div></PagerCard>
    </div>
    <aside className="space-y-5">
      <section className="pager-side"><h2>Pager preview</h2><div className="oled"><b>MEMORYCARE</b><span>&gt; About Me</span><span>  My Routine ({data.routine.length})</span><span>  Medicines ({data.medicines.length})</span><span>  Contacts ({data.contacts.length})</span><span>  Emergency</span></div><p>This preview represents the simple menu the patient will navigate using UP, DOWN and SELECT.</p></section>
      <section className="pager-side"><h2>Save & sync</h2><Button className="w-full" variant="secondary" onClick={()=>save()}><Save className="inline mr-2"/>Save Changes</Button><Button className="w-full mt-3" onClick={connect}><Bluetooth className="inline mr-2"/>{connected?'Reconnect Pager':'Connect Pager'}</Button><Button className="w-full mt-3" disabled={!connected||syncing} onClick={sync}><RefreshCw className="inline mr-2"/>{syncing?'Working…':'Sync / Replace Pager Data'}</Button>{msg&&<div className="pager-message"><CheckCircle2 size={18}/><span>{msg}</span></div>}<p className="text-sm mt-4 opacity-70">Last sync: {lastSync?lastSync.toLocaleString():'Not synced yet'}</p></section>
      <section className="pager-side"><HeartPulse/><h3 className="mt-2">Separate by design</h3><p>Nothing here is automatically copied from MemoryCare's normal reminders, family or patient profile.</p></section>
    </aside></div>
    <section className="pager-side pager-danger pager-danger-wide"><div className="pager-danger-copy"><h2>Danger zone</h2><p className="text-sm opacity-75">Clear only the physical device, or remove all Pager Management information and start again.</p></div><div className="pager-danger-actions"><Button className="pager-clear-device" variant="secondary" disabled={syncing} onClick={()=>setConfirmAction('device')}><Trash2 className="inline mr-2"/>Clear Device Only</Button><button type="button" className="pager-clear-all" disabled={syncing} onClick={()=>setConfirmAction('all')}><Trash2 size={19}/>Clear All Pager Data</button></div></section>
    {confirmAction&&<ConfirmModal mode={confirmAction} connected={connected} onCancel={()=>setConfirmAction(null)} onConfirm={confirmAction==='device'?clearDevice:clearEverything}/>} 
  </div></main>;
}

function PagerCard({icon:Icon,title,children,action,actionText}){return <section className="pager-card"><div className="flex items-center justify-between gap-3 mb-5"><div className="flex items-center gap-3"><span className="pager-card-icon"><Icon/></span><h2>{title}</h2></div>{action&&<Button variant="secondary" onClick={action}><Plus className="inline mr-1" size={18}/>{actionText}</Button>}</div>{children}</section>}
function Field({label,value,onChange}){return <label className="label">{label}<input className="field mt-2" value={value} onChange={e=>onChange(e.target.value)}/></label>}
function Row({children,onDelete}){return <div className="grid sm:grid-cols-[150px_1fr_auto] gap-3 mb-3">{children}<Delete onClick={onDelete}/></div>}
function Delete({onClick}){return <button type="button" onClick={onClick} className="w-14 min-h-14 rounded-2xl bg-rose-50 text-rose-600 grid place-items-center" aria-label="Delete"><Trash2/></button>}
function Empty({text}){return <p className="rounded-2xl border border-dashed border-slate-300 p-4 text-slate-500">{text}</p>}
function ConfirmModal({mode,connected,onCancel,onConfirm}){const all=mode==='all';return <div className="pager-confirm-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onCancel()}}><section className="pager-confirm" role="dialog" aria-modal="true" aria-labelledby="pager-confirm-title"><span className="pager-confirm-icon"><ShieldAlert/></span><h2 id="pager-confirm-title">{all?'Clear all pager data?':'Clear physical pager?'}</h2><p>{all?'This removes Personal Info, Routine, Medicines, Contacts and Emergency information saved in Pager Management. ': 'This erases the offline information stored on the ESP32 but keeps your saved MemoryCare Pager Management data. '}{all&&!connected?'The physical pager is not connected, so its offline copy cannot be erased right now.':''}</p><div className="flex gap-3 mt-5"><Button className="flex-1" variant="secondary" onClick={onCancel}>Cancel</Button><button type="button" className="pager-confirm-delete" onClick={onConfirm}>{all?'Clear Everything':'Clear Device'}</button></div></section></div>}
