import {useEffect,useState} from 'react';
import {addDoc,collection,deleteDoc,doc,onSnapshot,orderBy,query,serverTimestamp} from 'firebase/firestore';
import {useTranslation} from 'react-i18next';
import {db} from '../firebase/firebase';
import {useAuth} from '../context/AuthContext';
import Button from '../components/ui/Button';
import NavBar from '../components/ui/NavBar';
import LanguageToggle from '../components/LanguageToggle';
import LogoutButton from '../components/LogoutButton';
import {Link} from 'react-router-dom';
import {ImagePlus,Heart,ChevronLeft,ChevronRight,Eye,EyeOff,X,ArrowLeft,Trash2,ShieldAlert,Sparkles} from 'lucide-react';

async function compressImage(file){
  return new Promise((resolve,reject)=>{
    const img=new Image(),reader=new FileReader();
    reader.onload=e=>{img.src=e.target.result};
    reader.onerror=reject;
    img.onload=()=>{
      const max=900,scale=Math.min(1,max/Math.max(img.width,img.height));
      const canvas=document.createElement('canvas');
      canvas.width=Math.round(img.width*scale);
      canvas.height=Math.round(img.height*scale);
      canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
      resolve(canvas.toDataURL('image/jpeg',0.65));
    };
    reader.readAsDataURL(file);
  });
}

const CATEGORIES=['family','friends','festival','culture','place'];

export default function MemoryGallery(){
  const {profile}=useAuth();
  const {t}=useTranslation();
  const [items,setItems]=useState([]);
  const [title,setTitle]=useState('');
  const [story,setStory]=useState('');
  const [people,setPeople]=useState('');
  const [category,setCategory]=useState('family');
  const [file,setFile]=useState(null);
  const [busy,setBusy]=useState(false);
  const [msg,setMsg]=useState('');
  const [error,setError]=useState('');
  const [index,setIndex]=useState(0);
  const [reveal,setReveal]=useState(false);
  const [remembered,setRemembered]=useState(false);
  const [fullscreen,setFullscreen]=useState(false);
  const [pendingDelete,setPendingDelete]=useState(null);

  useEffect(()=>{
    if(!profile?.groupId)return;
    return onSnapshot(query(collection(db,'groups',profile.groupId,'memoryGallery'),orderBy('createdAt','desc')),s=>setItems(s.docs.map(d=>({id:d.id,...d.data()}))));
  },[profile?.groupId]);

  // Keep the patient carousel inside the list even after deletions.
  useEffect(()=>{
    if(index>items.length-1)setIndex(Math.max(0,items.length-1));
  },[items.length,index]);

  function next(){setIndex(i=>Math.min(items.length-1,i+1));setReveal(false);setRemembered(false);}
  function previous(){setIndex(i=>Math.max(0,i-1));setReveal(false);setRemembered(false);}

  async function upload(e){
    e.preventDefault();
    if(!file){setError(t('photoMissing'));return;}
    setBusy(true);setError('');setMsg('');
    try{
      const imageData=await compressImage(file);
      if(imageData.length>850000)throw new Error(t('photoTooLarge'));
      await addDoc(collection(db,'groups',profile.groupId,'memoryGallery'),{
        imageData,
        title:title.trim()||t('familyMemory'),
        caption:title.trim()||t('familyMemory'),
        story:story.trim(),
        people:people.trim(),
        category,
        createdBy:profile.uid,
        createdAt:serverTimestamp(),
      });
      setTitle('');setStory('');setPeople('');setFile(null);
      e.target.reset();
      setMsg(t('memoryAdded'));
    }catch(err){
      setError(err.message||t('errGeneric'));
    }finally{
      setBusy(false);
    }
  }

  async function confirmDelete(){
    if(!pendingDelete)return;
    setBusy(true);
    try{
      await deleteDoc(doc(db,'groups',profile.groupId,'memoryGallery',pendingDelete.id));
      setPendingDelete(null);
      setMsg(t('deleteMemory'));
    }catch(e){
      setError(e.message||t('errGeneric'));
    }finally{
      setBusy(false);
    }
  }

  const item=items[index];

  return <main className="page premium-page">
    <div className="max-w-5xl mx-auto relative z-10">
      <header className="top-shell">
        <div className="brand-mark"><span className="brand-icon"><Sparkles size={23}/></span><span>{t('app')}</span></div>
        <div className="header-actions"><LanguageToggle/><LogoutButton compact/></div>
      </header>

      <div className="welcome-block compact-welcome">
        <span className="eyebrow"><Heart className="inline" size={16}/> {t('gallery')}</span>
        <h1>{t('galleryTitle')}</h1>
        <p>{t('galleryIntro')}</p>
        {items.length>0&&<p className="font-bold mt-2">{t('photoCount',{count:items.length})}</p>}
      </div>

      <div className="flex flex-wrap gap-3 mb-2">
        <Link to={profile?.role==='caregiver'?'/caregiver/dashboard':'/patient/home'}><Button variant="secondary"><ArrowLeft className="inline mr-2" size={19}/>{t('back')}</Button></Link>
      </div>

      {profile?.role==='caregiver'&&<section className="hero-card p-6 mt-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center"><ImagePlus/></div>
          <div><h2 className="text-2xl">{t('addMemory')}</h2><p className="text-slate-600">{t('addMemorySub')}</p></div>
        </div>
        <form className="grid md:grid-cols-2 gap-4" onSubmit={upload}>
          <div className="md:col-span-2"><label className="label">{t('photo')}</label><input className="field py-3" type="file" accept="image/*" onChange={e=>setFile(e.target.files?.[0]||null)} required/></div>
          <div><label className="label">{t('memoryTitle')}</label><input className="field" value={title} onChange={e=>setTitle(e.target.value)} placeholder={t('memoryTitlePlaceholder')}/></div>
          <div><label className="label">{t('peopleInPhoto')}</label><input className="field" value={people} onChange={e=>setPeople(e.target.value)} placeholder={t('peoplePlaceholder')}/></div>
          <div><label className="label">{t('category')}</label><select className="field" value={category} onChange={e=>setCategory(e.target.value)}>
            {CATEGORIES.map(c=><option key={c} value={c}>{t(`category${c[0].toUpperCase()}${c.slice(1)}`)}</option>)}
          </select></div>
          <div><label className="label">{t('story')}</label><input className="field" value={story} onChange={e=>setStory(e.target.value)} placeholder={t('storyPlaceholder')}/></div>
          <div className="md:col-span-2 flex items-center gap-4 flex-wrap">
            <Button disabled={busy}>{busy?t('adding'):t('addToGallery')}</Button>
            {msg&&<span className="font-bold text-care-700">{msg}</span>}
            {error&&<span className="font-bold text-rose-700">{error}</span>}
          </div>
        </form>
      </section>}

      {profile?.role==='patient'&&item&&<section className="hero-card overflow-hidden mt-6">
        <button type="button" className="block w-full cursor-zoom-in" onClick={()=>setFullscreen(true)} aria-label={t('closeFullScreen')}>
          <img src={item.imageData} alt={item.title||item.caption||t('familyMemory')} className="w-full h-[360px] md:h-[500px] object-cover"/>
        </button>
        <div className="p-6 md:p-8 text-center">
          <span className="pill">{t('rememberQuestion')}</span>
          {remembered?<div className="mt-5">
            <h2 className="text-3xl font-black">{t('wonderful')} 💛</h2>
            <p className="text-slate-600 mt-2">{t('takeYourTime')}</p>
            <Button variant="soft" className="mt-5" onClick={()=>setRemembered(false)}>{t('showChoicesAgain')}</Button>
          </div>:reveal?<div className="mt-5">
            <h2 className="text-3xl font-black">{item.title||item.caption}</h2>
            {item.people&&<p className="text-xl mt-2">{item.people}</p>}
            {item.story&&<p className="text-slate-600 mt-2">{item.story}</p>}
            <Button variant="soft" className="mt-5" onClick={()=>setReveal(false)}><EyeOff className="inline mr-2"/>{t('hideAnswer')}</Button>
          </div>:<div className="flex flex-wrap justify-center gap-3 mt-5">
            <Button onClick={()=>setRemembered(true)}>{t('yesIRemember')}</Button>
            <Button variant="secondary" onClick={()=>setReveal(true)}><Eye className="inline mr-2"/>{t('showMe')}</Button>
          </div>}
          <div className="flex justify-between items-center mt-7">
            <Button variant="secondary" disabled={index===0} onClick={previous} aria-label={t('back')}><ChevronLeft/></Button>
            <span className="font-bold">{index+1} / {items.length}</span>
            <Button variant="secondary" disabled={index===items.length-1} onClick={next} aria-label={t('nextLevelBtn')}><ChevronRight/></Button>
          </div>
        </div>
      </section>}

      {profile?.role==='patient'&&fullscreen&&item&&<div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col" role="dialog" aria-modal="true">
        <div className="absolute top-0 left-0 right-0 z-10 p-4 md:p-6 bg-gradient-to-b from-black/70 to-transparent">
          <Button variant="secondary" onClick={()=>setFullscreen(false)}><ArrowLeft className="inline mr-2" size={20}/>{t('back')}</Button>
        </div>
        <button type="button" onClick={()=>setFullscreen(false)} className="absolute top-4 right-4 md:top-6 md:right-6 z-20 w-12 h-12 rounded-full bg-white/90 text-slate-900 flex items-center justify-center shadow-xl" aria-label={t('close')}><X/></button>
        <img src={item.imageData} alt={item.title||item.caption||t('familyMemory')} className="w-full h-full object-contain"/>
      </div>}

      {profile?.role==='caregiver'&&<div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-6">
        {items.map(memory=><article className="soft-card overflow-hidden gallery-card" key={memory.id}>
          <img src={memory.imageData} alt={memory.title||memory.caption||t('familyMemory')} className="w-full h-52 object-cover"/>
          <button type="button" className="gallery-delete" onClick={()=>setPendingDelete(memory)} title={t('deleteMemory')} aria-label={t('deleteMemory')}><Trash2 size={20}/></button>
          <div className="p-5">
            <h3 className="text-xl">{memory.title||memory.caption}</h3>
            <p className="text-slate-600 mt-1">{memory.people||memory.story||t(`category${(memory.category||'family')[0].toUpperCase()}${(memory.category||'family').slice(1)}`)}</p>
          </div>
        </article>)}
      </div>}

      {items.length===0&&<div className="hero-card p-8 mt-6 text-center">
        <div className="text-5xl">🖼️</div>
        <p className="text-xl font-bold mt-4">{t('noMemories')}</p>
      </div>}

      {error&&profile?.role==='caregiver'&&!items.length&&<p className="mt-4 font-bold text-rose-700">{error}</p>}
    </div>

    {pendingDelete&&<div className="pager-confirm-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)setPendingDelete(null)}}>
      <section className="pager-confirm" role="dialog" aria-modal="true">
        <span className="pager-confirm-icon"><ShieldAlert/></span>
        <h2>{t('deleteMemoryTitle')}</h2>
        <p>{t('deleteMemoryBody')}</p>
        <div className="flex gap-3 mt-5">
          <Button className="flex-1" variant="secondary" onClick={()=>setPendingDelete(null)} disabled={busy}>{t('cancel')}</Button>
          <button type="button" className="pager-confirm-delete" onClick={confirmDelete} disabled={busy}>{busy?t('working'):t('delete')}</button>
        </div>
      </section>
    </div>}

    {profile?.role==='patient'&&<NavBar/>}
  </main>;
}
