import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {deleteDoc,doc,onSnapshot,serverTimestamp,setDoc} from 'firebase/firestore';
import {Link} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {db} from '../../firebase/firebase';
import {useAuth} from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import {
  ArrowLeft,Bluetooth,CheckCircle2,Contact,HeartPulse,MonitorSmartphone,Pill,Plus,RefreshCw,Save,
  ShieldAlert,Trash2,UserRound,Usb,PlugZap,WifiOff,Terminal,Copy,Download,Info,AlertTriangle,ChevronDown,ChevronUp,
} from 'lucide-react';
import {PagerLink,bluetoothSupported,serialSupported,MEMORYCARE_SERVICE,MEMORYCARE_RX,MEMORYCARE_TX} from '../../services/pagerLink';
import {buildPayloadLines,hasPagerContent,makeEmptyPagerData,normalisePagerData,payloadSummary} from '../../services/pagerProtocol';

export default function PagerManagement(){
  const {t}=useTranslation();
  const {profile}=useAuth();
  const [data,setData]=useState(makeEmptyPagerData());
  const [loaded,setLoaded]=useState(false);
  const [msg,setMsg]=useState('');
  const [note,setNote]=useState('');
  const [logs,setLogs]=useState([]);
  const [connected,setConnected]=useState(false);
  const [connectionLabel,setConnectionLabel]=useState('');
  const [showAll,setShowAll]=useState(true);
  const [showDiagnostics,setShowDiagnostics]=useState(false);
  const [services,setServices]=useState([]);
  const [progress,setProgress]=useState(null);
  const [syncing,setSyncing]=useState(false);
  const [lastSync,setLastSync]=useState(null);
  const [confirmAction,setConfirmAction]=useState(null);
  const [deviceDump,setDeviceDump]=useState(null);
  const [copied,setCopied]=useState(false);

  const linkRef=useRef(null);
  const waitersRef=useRef([]);

  const pushLog=useCallback(entry=>{
    setLogs(prev=>[...prev.slice(-199),entry]);
  },[]);

  // Incoming line handling: fills the console and releases waiters (ACK/SAVED/…).
  const handleLine=useCallback(line=>{
    const parts=String(line).split('|');
    if(parts[0]==='MCV1'&&parts[1]==='DATA'){
      setDeviceDump(prev=>[...(prev||[]),parts.slice(2).join('|')]);
    }
    const waiters=waitersRef.current;
    waitersRef.current=waiters.filter(w=>{
      if(w.match(line)){clearTimeout(w.timer);w.resolve(line);return false;}
      return true;
    });
  },[]);

  const waitFor=useCallback((match,timeoutMs=4000)=>new Promise(resolve=>{
    const waiter={match,resolve,timer:setTimeout(()=>{
      waitersRef.current=waitersRef.current.filter(w=>w!==waiter);
      resolve(null);
    },timeoutMs)};
    waitersRef.current.push(waiter);
  }),[]);

  const ensureLink=useCallback(()=>{
    if(linkRef.current)return linkRef.current;
    const link=new PagerLink({
      onLine:handleLine,
      onLog:pushLog,
      onProgress:setProgress,
      onDisconnect:()=>{setConnected(false);setConnectionLabel('');setMsg(t('pagerDisconnectedMsg'));},
    });
    linkRef.current=link;
    return link;
  },[handleLine,pushLog,t]);

  useEffect(()=>()=>{linkRef.current?.disconnect?.();},[]);

  useEffect(()=>{
    if(!profile)return;
    if(!profile.groupId){setLoaded(true);setMsg(t('pagerNoGroup'));return;}
    setLoaded(false);
    return onSnapshot(doc(db,'groups',profile.groupId,'pagerData','main'),s=>{
      if(s.exists()){
        const d=s.data();
        setData(normalisePagerData(d));
        setLastSync(d.lastSyncAt?.toDate?.()||null);
      }else{
        setData(makeEmptyPagerData());
        setLastSync(null);
      }
      setLoaded(true);
    },e=>{
      console.error(e);
      setLoaded(true);
      setMsg(t('pagerLoadFailed'));
    });
  },[profile?.groupId,t]);

  async function save(show=true){
    if(!profile?.groupId)return;
    await setDoc(doc(db,'groups',profile.groupId,'pagerData','main'),{...data,updatedBy:profile.uid,updatedAt:serverTimestamp()},{merge:true});
    if(show)setMsg(t('pagerSaved'));
  }

  function add(type){
    const templates={routine:{time:'',title:''},medicines:{time:'',name:''},contacts:{relation:'',name:'',phone:''}};
    setData(d=>({...d,[type]:[...d[type],templates[type]]}));
  }
  function updateList(type,i,key,value){setData(d=>({...d,[type]:d[type].map((x,n)=>n===i?{...x,[key]:value}:x)}));}
  function remove(type,i){setData(d=>({...d,[type]:d[type].filter((_,n)=>n!==i)}));}

  async function connectBluetooth(){
    setMsg('');setNote('');setProgress(null);
    try{
      const link=ensureLink();
      const result=await link.connectBle({showAll});
      setServices(result.services);
      setConnected(true);
      setConnectionLabel(link.statusLabel);
      setShowDiagnostics(true);
      setMsg(`${t('pagerConnected')} — ${link.statusLabel}`);
      link.writeLine('MCV1|HELLO').catch(()=>{});
    }catch(e){
      setConnected(false);
      setConnectionLabel('');
      if(e?.message==='BT_UNSUPPORTED')setMsg(t('pagerBrowserUnsupportedBody'));
      else if(e?.message==='NO_WRITABLE_CHARACTERISTIC'){setMsg(t('pagerNoWritable'));setShowDiagnostics(true);}
      else if(e?.name==='NotFoundError')setMsg(t('pagerNeedConnect'));
      else setMsg(`${t('pagerSyncFail')} (${e?.message||e})`);
      pushLog({kind:'error',text:e?.message||String(e),at:Date.now()});
    }
  }

  async function connectUsb(){
    setMsg('');setNote('');
    try{
      const link=ensureLink();
      await link.connectSerial();
      setConnected(true);
      setConnectionLabel(link.statusLabel);
      setMsg(`${t('pagerConnected')} — USB`);
    }catch(e){
      setConnected(false);
      if(e?.message==='SERIAL_UNSUPPORTED')setMsg(t('pagerUsbUnsupported'));
      else if(e?.name==='NotFoundError')setMsg(t('pagerNeedConnect'));
      else setMsg(e?.message||t('pagerSyncFail'));
    }
  }

  async function disconnect(){
    await linkRef.current?.disconnect?.();
    setConnected(false);setConnectionLabel('');setMsg(t('pagerDisconnectedMsg'));
  }

  async function testConnection(){
    const link=linkRef.current;
    if(!link?.connected)return setMsg(t('pagerNeedConnect'));
    // Register the listener before writing, otherwise a fast reply is missed.
    const replyPromise=waitFor(l=>l.startsWith('MCV1|PONG')||l.startsWith('MCV1|READY'),2500);
    await link.writeLine('MCV1|PING').catch(()=>{});
    const reply=await replyPromise;
    setMsg(reply?`${t('pagerDeviceAnswer')}: ${reply}`:t('pagerSyncNoAck'));
  }

  async function readFromPager(){
    const link=linkRef.current;
    if(!link?.connected)return setMsg(t('pagerNeedConnect'));
    setDeviceDump([]);
    const endPromise=waitFor(l=>l.startsWith('MCV1|DUMP_END'),4000);
    await link.writeLine('MCV1|DUMP').catch(()=>{});
    await link.readFromDevice();
    const end=await endPromise;
    setMsg(end?`${end}`:t('pagerSyncNoAck'));
  }

  async function sync(){
    const link=linkRef.current;
    if(!link?.connected)return setMsg(t('pagerNeedConnect'));
    if(!hasPagerContent(data))return setMsg(t('pagerEmptyData'));
    setSyncing(true);setMsg(t('pagerSyncing'));setNote('');setProgress({sent:0,total:0});
    try{
      const lines=buildPayloadLines(data);
      await save(false);
      const helloPromise=waitFor(l=>l.startsWith('MCV1|READY')||l.startsWith('MCV1|PONG'),1200);
      const savedPromise=waitFor(l=>l.startsWith('MCV1|SAVED'),8000);
      await link.writeLine('MCV1|HELLO').catch(()=>{});
      await helloPromise;                       // handshake (optional for custom firmware)
      await link.sendLines(lines);
      const ack=await savedPromise;
      await setDoc(doc(db,'groups',profile.groupId,'pagerData','main'),{lastSyncAt:serverTimestamp(),lastSyncBy:profile.uid},{merge:true});
      setLastSync(new Date());
      setMsg(ack?t('pagerSyncOk'):t('pagerSyncNoAck'));
      setNote(ack?`${t('pagerDeviceAnswer')}: ${ack}`:t('pagerDiagnosticsHint'));
    }catch(e){
      setMsg(`${t('pagerSyncFail')} — ${e?.message||e}`);
      pushLog({kind:'error',text:e?.message||String(e),at:Date.now()});
      setShowDiagnostics(true);
    }finally{
      setSyncing(false);
      setProgress(null);
    }
  }

  async function clearDevice(){
    setConfirmAction(null);
    const link=linkRef.current;
    if(!link?.connected)return setMsg(t('pagerNeedConnect'));
    setSyncing(true);setMsg(t('pagerSyncing'));
    try{
      const clearedPromise=waitFor(l=>l.startsWith('MCV1|CLEARED'),4500);
      await link.writeLine('MCV1|CLEAR_ALL');
      await clearedPromise;
      setMsg(t('pagerClearedDevice'));
    }catch(e){setMsg(`${e?.message||e}`);}
    finally{setSyncing(false);}
  }

  async function clearEverything(){
    if(!profile?.groupId)return;
    setSyncing(true);setConfirmAction(null);setMsg(t('pagerSyncing'));
    try{
      if(linkRef.current?.connected)await linkRef.current.writeLine('MCV1|CLEAR_ALL').catch(()=>{});
      await deleteDoc(doc(db,'groups',profile.groupId,'pagerData','main'));
      setData(makeEmptyPagerData());setLastSync(null);
      setMsg(t('pagerClearedAll'));
    }catch(e){setMsg(e?.message||t('pagerSyncFail'));}
    finally{setSyncing(false);}
  }

  const summary=useMemo(()=>payloadSummary(data),[data]);
  const lines=useMemo(()=>buildPayloadLines(data),[data]);
  const btOk=bluetoothSupported();
  const usbOk=serialSupported();

  async function copyPayload(){
    try{await navigator.clipboard.writeText(lines.join('\n'));setCopied(true);setTimeout(()=>setCopied(false),2000);}catch{}
  }

  if(!loaded)return <main className="page"><p>{t('pagerLoading')}</p></main>;

  return <main className="page premium-page"><div className="max-w-6xl mx-auto relative z-10">
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <Link to="/caregiver/dashboard"><Button variant="secondary"><ArrowLeft className="inline mr-2" size={19}/>{t('back')}</Button></Link>
      <span className={`pager-status ${connected?'pager-online':''}`}><span/> {connected?(connectionLabel||t('pagerConnected')):t('pagerNotConnected')}</span>
    </div>

    <section className="pager-hero">
      <div>
        <span className="eyebrow">{t('pagerEyebrow')}</span>
        <h1>{t('pagerTitle')}</h1>
        <p>{t('pagerIntro')}</p>
        <p className="pager-protocol-line"><Info size={16}/> {t('pagerProtocolLine')}</p>
      </div>
      <div className="pager-device"><MonitorSmartphone size={52}/><b>OFFLINE READY</b><small>ESP32 + BLE</small></div>
    </section>

    <div className="grid lg:grid-cols-[1fr_380px] gap-6">
      <div className="space-y-5">
        <PagerCard icon={UserRound} title={t('pagerPersonal')}>
          <div className="grid sm:grid-cols-3 gap-3">
            <Field label={t('pagerName')} value={data.personal.name} onChange={v=>setData(d=>({...d,personal:{...d.personal,name:v}}))}/>
            <Field label={t('pagerAge')} value={data.personal.age} onChange={v=>setData(d=>({...d,personal:{...d.personal,age:v}}))}/>
            <Field label={t('pagerBloodGroup')} value={data.personal.bloodGroup} onChange={v=>setData(d=>({...d,personal:{...d.personal,bloodGroup:v}}))}/>
          </div>
          <Field label={t('pagerNote')} value={data.personal.note} onChange={v=>setData(d=>({...d,personal:{...d.personal,note:v}}))}/>
        </PagerCard>

        <PagerCard icon={RefreshCw} title={t('pagerRoutine')} action={()=>add('routine')} actionText={t('pagerAddRoutine')}>
          {data.routine.map((x,i)=><Row key={i} onDelete={()=>remove('routine',i)}>
            <input className="field" type="time" value={x.time} onChange={e=>updateList('routine',i,'time',e.target.value)}/>
            <input className="field" placeholder={t('pagerRoutineWhat')} value={x.title} onChange={e=>updateList('routine',i,'title',e.target.value)}/>
          </Row>)}
          {!data.routine.length&&<Empty text={t('pagerEmptyRoutine')}/>}
        </PagerCard>

        <PagerCard icon={Pill} title={t('pagerMedicines')} action={()=>add('medicines')} actionText={t('pagerAddMedicine')}>
          {data.medicines.map((x,i)=><Row key={i} onDelete={()=>remove('medicines',i)}>
            <input className="field" type="time" value={x.time} onChange={e=>updateList('medicines',i,'time',e.target.value)}/>
            <input className="field" placeholder={t('pagerMedName')} value={x.name} onChange={e=>updateList('medicines',i,'name',e.target.value)}/>
          </Row>)}
          {!data.medicines.length&&<Empty text={t('pagerEmptyMedicines')}/>}
        </PagerCard>

        <PagerCard icon={Contact} title={t('pagerContacts')} action={()=>add('contacts')} actionText={t('pagerAddContact')}>
          {data.contacts.map((x,i)=><div className="grid sm:grid-cols-[.7fr_1fr_1fr_auto] gap-3 mb-3" key={i}>
            <input className="field" placeholder={t('pagerRelation')} value={x.relation} onChange={e=>updateList('contacts',i,'relation',e.target.value)}/>
            <input className="field" placeholder={t('name')} value={x.name} onChange={e=>updateList('contacts',i,'name',e.target.value)}/>
            <input className="field" placeholder={t('pagerPhoneField')} value={x.phone} onChange={e=>updateList('contacts',i,'phone',e.target.value)}/>
            <Delete onClick={()=>remove('contacts',i)} label={t('delete')}/>
          </div>)}
          {!data.contacts.length&&<Empty text={t('pagerEmptyContacts')}/>}
        </PagerCard>

        <PagerCard icon={ShieldAlert} title={t('pagerEmergency')}>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label={t('pagerEmergencyNumber')} value={data.emergency.number} onChange={v=>setData(d=>({...d,emergency:{...d.emergency,number:v}}))}/>
            <Field label={t('pagerEmergencyNote')} value={data.emergency.medicalNote} onChange={v=>setData(d=>({...d,emergency:{...d.emergency,medicalNote:v}}))}/>
          </div>
        </PagerCard>
      </div>

      <aside className="space-y-5">
        <section className="pager-side">
          <h2>{t('pagerPreview')}</h2>
          <div className="oled">
            <b>MEMORYCARE</b>
            <span>&gt; {t('pagerPersonal')}</span>
            <span>  {t('pagerRoutine')} ({summary.routine})</span>
            <span>  {t('pagerMedicines')} ({summary.medicines})</span>
            <span>  {t('pagerContacts')} ({summary.contacts})</span>
            <span>  {t('pagerEmergency')}</span>
          </div>
          <p>{t('pagerPreviewNote')}</p>
        </section>

        <section className="pager-side">
          <h2>{t('pagerSaveChanges')}</h2>
          <Button className="w-full" variant="secondary" onClick={()=>save()}><Save className="inline mr-2" size={19}/>{t('pagerSaveChanges')}</Button>

          <label className="pager-switch">
            <input type="checkbox" checked={showAll} onChange={e=>setShowAll(e.target.checked)}/>
            <span><b>{t('pagerShowAllDevices')}</b><small>{t('pagerShowAllDevicesHint')}</small></span>
          </label>

          <Button className="w-full mt-3" onClick={connectBluetooth} disabled={!btOk||syncing}><Bluetooth className="inline mr-2" size={19}/>{connected?t('pagerReconnect'):t('pagerConnect')}</Button>
          {!btOk&&<p className="pager-warn"><WifiOff size={17}/>{t('pagerBrowserUnsupportedBody')}</p>}

          <Button className="w-full mt-3" variant="soft" onClick={connectUsb} disabled={!usbOk||syncing}><Usb className="inline mr-2" size={19}/>{t('pagerUsbConnect')}</Button>
          {!usbOk&&<p className="pager-hint">{t('pagerUsbUnsupported')}</p>}

          <Button className="w-full mt-3" disabled={!connected||syncing} onClick={sync}><PlugZap className="inline mr-2" size={19}/>{syncing?t('pagerSyncing'):t('pagerSync')}</Button>
          {progress?.total>0&&<p className="pager-hint">{t('pagerProgress',{sent:progress.sent,total:progress.total})}</p>}

          <div className="grid grid-cols-2 gap-3 mt-3">
            <Button variant="soft" disabled={!connected||syncing} onClick={testConnection}>{t('pagerTestSend')}</Button>
            <Button variant="soft" disabled={!connected||syncing} onClick={readFromPager}><Download className="inline mr-1" size={17}/>{t('pagerReadDevice')}</Button>
          </div>

          {connected&&<Button className="w-full mt-3" variant="secondary" onClick={disconnect}>{t('pagerDisconnect')}</Button>}

          {msg&&<div className="pager-message"><CheckCircle2 size={18}/><span>{msg}</span></div>}
          {note&&<div className="pager-note">{note}</div>}

          <p className="text-sm mt-4 opacity-70">{t('pagerLastSync')}: {lastSync?lastSync.toLocaleString():t('pagerNever')}</p>
        </section>

        <section className="pager-side">
          <button type="button" className="pager-accordion" onClick={()=>setShowDiagnostics(v=>!v)} aria-expanded={showDiagnostics}>
            <span><Terminal size={19}/> {t('pagerDiagnostics')}</span>
            {showDiagnostics?<ChevronUp size={19}/>:<ChevronDown size={19}/>}
          </button>
          {showDiagnostics&&<div className="mt-4">
            <p className="pager-hint">{t('pagerDiagnosticsHint')}</p>
            <ul className="pager-services">
              <li className={services.length?'is-ok':''}><b>FFF0</b> {MEMORYCARE_SERVICE}</li>
              <li><b>RX</b> {MEMORYCARE_RX}</li>
              <li><b>TX</b> {MEMORYCARE_TX}</li>
              {services.map(s=><li key={s.uuid}><b>service</b> {s.uuid} <small>{s.characteristics.map(c=>`${c.uuid.slice(0,8)}${c.write?'(w)':''}${c.writeWithoutResponse?'(w-)':''}${c.notify?'(n)':''}${c.read?'(r)':''}`).join(' ')}</small></li>)}
            </ul>
            {services.length>0&&<p className="pager-ok"><CheckCircle2 size={17}/>{t('pagerServiceFound')}</p>}
            <div className="pager-console" role="log" aria-live="polite">
              {!logs.length&&<p className="pager-console-empty">{t('pagerNoMessages')}</p>}
              {logs.map((l,i)=><p key={i} className={`pager-console-line is-${l.kind}`}>
                <span>{l.kind==='out'?'→':l.kind==='in'?'←':l.kind==='ok'?'✓':l.kind==='error'?'✕':'•'}</span> {l.text}
              </p>)}
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <Button variant="soft" onClick={()=>setLogs([])}>{t('pagerClearConsole')}</Button>
              <Button variant="soft" onClick={copyPayload}>{copied?<CheckCircle2 className="inline mr-1" size={17}/>:<Copy className="inline mr-1" size={17}/>}{copied?t('pagerDataCopied'):t('pagerCopyData')}</Button>
            </div>
          </div>}
        </section>

        <section className="pager-side">
          <h2>{t('pagerStepsTitle')}</h2>
          <ol className="pager-steps">
            <li>{t('pagerStep1')}</li>
            <li>{t('pagerStep2')}</li>
            <li>{t('pagerStep3')}</li>
            <li>{t('pagerStep4')}</li>
          </ol>
          <p className="pager-hint"><HeartPulse size={17}/> {t('pagerSeparateBody')}</p>
          <a className="pager-link" href="/hardware/README.md" target="_blank" rel="noreferrer">{t('pagerHardwareLink')}</a>
        </section>

        {deviceDump&&<section className="pager-side">
          <h2>{t('pagerReadDevice')}</h2>
          <div className="oled oled-small">{deviceDump.length?deviceDump.map((l,i)=><span key={i}>{l}</span>):<span>{t('pagerNoMessages')}</span>}</div>
        </section>}
      </aside>
    </div>

    <section className="pager-side pager-danger pager-danger-wide">
      <div className="pager-danger-copy">
        <h2><AlertTriangle className="inline mr-2" size={20}/>{t('pagerDangerZone')}</h2>
        <p className="text-sm opacity-75">{t('pagerDangerSub')}</p>
      </div>
      <div className="pager-danger-actions">
        <Button className="pager-clear-device" variant="secondary" disabled={syncing} onClick={()=>setConfirmAction('device')}><Trash2 className="inline mr-2" size={19}/>{t('pagerClearDevice')}</Button>
        <button type="button" className="pager-clear-all" disabled={syncing} onClick={()=>setConfirmAction('all')}><Trash2 size={19}/>{t('pagerClearAll')}</button>
      </div>
    </section>

    {confirmAction&&<ConfirmModal mode={confirmAction} connected={connected} onCancel={()=>setConfirmAction(null)} onConfirm={confirmAction==='device'?clearDevice:clearEverything}/>}
  </div></main>;
}

function PagerCard({icon:Icon,title,children,action,actionText}){
  return <section className="pager-card">
    <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
      <div className="flex items-center gap-3"><span className="pager-card-icon"><Icon/></span><h2>{title}</h2></div>
      {action&&<Button variant="secondary" onClick={action}><Plus className="inline mr-1" size={18}/>{actionText}</Button>}
    </div>
    {children}
  </section>;
}
function Field({label,value,onChange}){
  return <label className="label">{label}<input className="field mt-2" value={value} onChange={e=>onChange(e.target.value)}/></label>;
}
function Row({children,onDelete}){
  return <div className="grid sm:grid-cols-[150px_1fr_auto] gap-3 mb-3">{children}<Delete onClick={onDelete} label="Delete"/></div>;
}
function Delete({onClick,label}){
  return <button type="button" onClick={onClick} className="w-14 min-h-14 rounded-2xl bg-rose-50 text-rose-600 grid place-items-center" aria-label={label||'Delete'}><Trash2/></button>;
}
function Empty({text}){
  return <p className="rounded-2xl border border-dashed border-slate-300 p-4 text-slate-500">{text}</p>;
}
function ConfirmModal({mode,connected,onCancel,onConfirm}){
  const {t}=useTranslation();
  const all=mode==='all';
  return <div className="pager-confirm-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onCancel()}}>
    <section className="pager-confirm" role="dialog" aria-modal="true" aria-labelledby="pager-confirm-title">
      <span className="pager-confirm-icon"><ShieldAlert/></span>
      <h2 id="pager-confirm-title">{all?t('pagerConfirmAllTitle'):t('pagerConfirmDeviceTitle')}</h2>
      <p>{all?t('pagerConfirmAllBody'):t('pagerConfirmDeviceBody')} {all&&!connected?t('pagerConfirmAllOffline'):''}</p>
      <div className="flex gap-3 mt-5">
        <Button className="flex-1" variant="secondary" onClick={onCancel}>{t('cancel')}</Button>
        <button type="button" className="pager-confirm-delete" onClick={onConfirm}>{all?t('pagerConfirmAllBtn'):t('pagerConfirmDeviceBtn')}</button>
      </div>
    </section>
  </div>;
}
