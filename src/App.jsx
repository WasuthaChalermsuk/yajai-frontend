import { useState, useEffect, useRef } from 'react'
import Swal from 'sweetalert2' 

// ✨ สำคัญ: ใส่ Public Key ของคุณตรงนี้!
const PUBLIC_VAPID_KEY = 'BOSDiwWnjtEkd-PimXzb_PeyTJpX1J9KARBfm_mYwVDLL-3oJ8wBU2Vvwce4FTRHl1dDokD0096qeSlcJbSeE88';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) { outputArray[i] = rawData.charCodeAt(i); }
  return outputArray;
}

function App() {
  const [meds, setMeds] = useState([])
  const [patients, setPatients] = useState([]) 
  const [history, setHistory] = useState([])
  const [activeTab, setActiveTab] = useState('meds') 
  const [pushEnabled, setPushEnabled] = useState(Notification.permission === 'granted')

  // ระบบเพิ่มยา
  const [newName, setNewName] = useState('')
  const [newTime, setNewTime] = useState('')
  const [newMeal, setNewMeal] = useState('เช้า')
  const [newStock, setNewStock] = useState(30)
  const [newImage, setNewImage] = useState('') 
  const [targetPatient, setTargetPatient] = useState('')
  const [filterPatient, setFilterPatient] = useState('') 
  
  // ระบบแก้ไข
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editTime, setEditTime] = useState('')
  const [editMeal, setEditMeal] = useState('เช้า')

  const [isLoading, setIsLoading] = useState(false);

  const startEdit = (med) => {
    setEditingId(med.id);
    setEditName(med.name);
    setEditTime(med.time);
    setEditMeal(med.meal || 'เช้า'); 
  };

  const handleSaveEdit = (id) => {
    const updatedMeds = meds.map(med =>
      med.id === id ? { ...med, name: editName, time: editTime, meal: editMeal } : med
    );
    setMeds(updatedMeds); 
    setEditingId(null);   
  };

  // ระบบแชท
  const [messages, setMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [chatTarget, setChatTarget] = useState('') 
  const messagesEndRef = useRef(null)

  // ระบบบันทึกอาการ ✨
  const [diaryInput, setDiaryInput] = useState('')
  const [diaries, setDiaries] = useState([])

  // ระบบ Auth
  const [token, setToken] = useState(localStorage.getItem('token') || '')
  const [username, setUsername] = useState(localStorage.getItem('username') || '')
  const [authUsername, setAuthUsername] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [isLoginMode, setIsLoginMode] = useState(true)

  const API_URL = 'https://yajai-api.onrender.com/api'; 
  const getAuthHeaders = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` })
  const handleLogout = () => { setToken(''); setUsername(''); localStorage.clear(); setMeds([]); setActiveTab('meds'); setPushEnabled(false); }

  // ฟังก์ชันโหลดข้อมูลหลัก
  const fetchMeds = () => { fetch(`${API_URL}/meds`, { headers: getAuthHeaders() }).then(res => { if (!res.ok) throw new Error(); return res.json(); }).then(setMeds).catch(() => handleLogout()) }
  const fetchPatients = () => { fetch(`${API_URL}/users`, { headers: getAuthHeaders() }).then(res => res.json()).then(data => { if(Array.isArray(data)) { setPatients(data); setChatTarget(data[0] || ''); } }) }
  const fetchHistory = () => { fetch(`${API_URL}/history`, { headers: getAuthHeaders() }).then(res => res.json()).then(setHistory); }
  
  const fetchDiaries = () => {
    let target = '';
    if (username === 'admin') {
        target = filterPatient || 'all'; 
    } else {
        target = username;
    }

    if (!target) return;

    // 1. เริ่มดึงข้อมูล -> สั่งให้ขึ้น Loading
    setIsLoading(true); 

    fetch(`${API_URL}/diary/${target}`, {
      method: 'GET',
      headers: getAuthHeaders()
    })
      .then(res => res.json())
      .then(data => {
        setDiaries(data);
        // 2. โหลดสำเร็จ -> สั่งปิด Loading
        setIsLoading(false); 
      })
      .catch(err => {
        console.error("โหลดข้อมูลประวัติไม่สำเร็จ:", err);
        // 3. โหลดพัง (Error) -> ก็ต้องสั่งปิด Loading เหมือนกัน ไม่งั้นมันจะหมุนค้าง
        setIsLoading(false); 
      });
  };

  // โหลดข้อมูลเมื่อเข้าแอป
  useEffect(() => { 
    if (token) {
        fetchMeds(); 
        fetchHistory(); 
        if (username === 'admin') fetchPatients(); 
         else {
          setTimeout(() => setChatTarget('admin'), 0);
        }
    } 
  }, [token, username])

  useEffect(() => {
    if (token) {
      setTimeout(() => fetchDiaries(), 0);
    }
  }, [token, filterPatient, username]);

  useEffect(() => {
    let interval;
    if (activeTab === 'chat' && chatTarget) {
      const fetchMsgs = () => {
        fetch(`${API_URL}/messages/${chatTarget}`, { headers: getAuthHeaders() })
          .then(res => res.json())
          .then(setMessages)
          .catch(err => console.error(err));
      }
      fetchMsgs(); 
      interval = setInterval(fetchMsgs, 3000); 
    }
    return () => clearInterval(interval);
  }, [activeTab, chatTarget]);

  useEffect(() => { if (activeTab === 'chat') messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, activeTab]);

  const handleVoiceTyping = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return Swal.fire('ขออภัย', 'เบราว์เซอร์ของคุณไม่รองรับระบบสั่งงานด้วยเสียงครับ ลองใช้ Chrome ดูนะ', 'error');
    
    const recognition = new SpeechRecognition();
    recognition.lang = 'th-TH'; 
    recognition.start();
    
    Swal.fire({ title: '🎙️ กำลังฟัง...', text: 'พูดข้อความที่ต้องการส่งได้เลยครับ', showConfirmButton: false });
    
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setChatInput(prev => prev + transcript + ' ');
      Swal.close();
    };
    recognition.onerror = () => Swal.fire('เกิดข้อผิดพลาด', 'จับเสียงไม่ได้ครับ ลองใหม่อีกครั้งนะ', 'error');
  };

  const handleSaveDiary = async (e) => {
    e.preventDefault();
    if (!diaryInput.trim()) return;

    try {
      const response = await fetch(`${API_URL}/diaries`, { 
        method: 'POST', 
        headers: getAuthHeaders(), 
        body: JSON.stringify({ note: diaryInput }) 
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`เซิร์ฟเวอร์ตอบกลับ: ${response.status} ${errText}`);
      }

      setDiaryInput(''); 
      Swal.fire('บันทึกแล้ว', 'แจ้งอาการให้ผู้ดูแลทราบแล้วครับ', 'success'); 
      fetchDiaries(); 
      
    } catch (error) {
      console.error("❌ Save Diary Error:", error);
      Swal.fire('เกิดข้อผิดพลาด!', `ส่งข้อมูลไม่ได้\n${error.message}`, 'error');
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !chatTarget) return;
    fetch(`${API_URL}/messages`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ receiver: chatTarget, text: chatInput })
    }).then(() => { setChatInput(''); });
  }

  const handleEnablePush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return Swal.fire('เสียใจด้วย', 'เบราว์เซอร์ไม่รองรับ', 'error');
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      try {
        await navigator.serviceWorker.register('/sw.js');
        const readySw = await navigator.serviceWorker.ready;
        const subscription = await readySw.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY) });
        await fetch(`${API_URL}/subscribe`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(subscription) });
        setPushEnabled(true);
        Swal.fire('สำเร็จ', 'เปิดรับการแจ้งเตือนแล้ว!', 'success');
      } catch (err) { console.error(err); Swal.fire('เกิดข้อผิดพลาด', String(err), 'error'); }
    } else { Swal.fire('ถูกปฏิเสธ', 'ไม่อนุญาตให้แอปส่งแจ้งเตือน', 'warning'); }
  }

  const handleCallAdmin = () => { fetch(`${API_URL}/call-admin`, { method: 'POST', headers: getAuthHeaders() }).then(() => Swal.fire('ส่งข้อความแล้ว', 'ระบบแจ้งเตือนไปยังผู้ดูแลเรียบร้อยครับ', 'success')) }
  const handleImageChange = (e) => { const file = e.target.files[0]; if (file) { const reader = new FileReader(); reader.onloadend = () => setNewImage(reader.result); reader.readAsDataURL(file); } }
  
  const handleAddMed = (e) => { e.preventDefault(); if (!newName || !newTime || !targetPatient || !newStock) return Swal.fire('กรุณากรอกข้อมูลให้ครบ'); fetch(`${API_URL}/meds`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ name: newName, time: newTime, meal: newMeal, patientName: targetPatient, stock: Number(newStock), imageUrl: newImage }) }).then(res => res.json()).then(data => { setMeds([...meds, data.medicine]); setNewName(''); setNewTime(''); setNewImage(''); Swal.fire('สำเร็จ', `สั่งยาให้คุณ ${targetPatient} เรียบร้อย`, 'success'); }) }
  const handleDeleteMed = (id) => { Swal.fire({ title: 'ลบรายการยา?', icon: 'warning', showCancelButton: true }).then(res => { if (res.isConfirmed) fetch(`${API_URL}/meds/${id}`, { method: 'DELETE', headers: getAuthHeaders() }).then(() => setMeds(meds.filter(m => m.id !== id))) }) }
  const handleTakeMed = (id) => { fetch(`${API_URL}/meds/${id}`, { method: 'PUT', headers: getAuthHeaders() }).then(res => res.json()).then((updatedMed) => { setMeds(meds.map(med => med.id === id ? { ...med, status: 'กินแล้ว 💖', stock: updatedMed.stock } : med)); Swal.fire({ icon: 'success', title: 'เยี่ยมมาก!', timer: 1000, showConfirmButton: false }); }) }
  const handleResetMeds = () => { Swal.fire({ title: 'เริ่มวันใหม่?', text: "สถานะยาจะกลับเป็น 'ยังไม่ได้กิน'", icon: 'question', showCancelButton: true }).then(res => { if (res.isConfirmed) { fetch(`${API_URL}/meds/reset/all`, { method: 'PUT', headers: getAuthHeaders() }).then(() => { fetchMeds(); Swal.fire('สำเร็จ', 'รีเซ็ตสถานะแล้ว', 'success'); }) } }) }

  const handleAuth = (e) => { e.preventDefault(); fetch(`${API_URL}${isLoginMode ? '/login' : '/register'}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: authUsername, password: authPassword }) }).then(res => res.json()).then(data => { if (data.token) { setToken(data.token); setUsername(data.username); localStorage.setItem('token', data.token); localStorage.setItem('username', data.username); } else { Swal.fire(data.message || 'เกิดข้อผิดพลาด'); } }) }
  
  if (!token) {
    return (
      <div style={{ padding: '20px', maxWidth: '400px', margin: '50px auto', background: '#333', borderRadius: '15px', textAlign: 'center', color: 'white' }}>
        <h2>{isLoginMode ? '🔐 เข้าสู่ระบบ YaJai' : '📝 สมัครสมาชิก YaJai'}</h2>
        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input type="text" placeholder="ชื่อผู้ใช้" value={authUsername} onChange={e => setAuthUsername(e.target.value)} style={{ padding: '12px', borderRadius: '8px' }} />
          <input type="password" placeholder="รหัสผ่าน" value={authPassword} onChange={e => setAuthPassword(e.target.value)} style={{ padding: '12px', borderRadius: '8px' }} />
          <button type="submit" style={{ padding: '12px', background: '#2196F3', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>{isLoginMode ? 'ล็อกอิน' : 'สมัคร'}</button>
        </form>
        <p onClick={() => setIsLoginMode(!isLoginMode)} style={{ cursor: 'pointer', color: '#64B5F6', marginTop: '15px' }}>{isLoginMode ? 'สร้างบัญชีใหม่' : 'มีบัญชีแล้ว'}</p>
      </div>
    )
  }

  const mealsCategory = ['เช้า', 'กลางวัน', 'เย็น', 'ก่อนนอน'];
  const filteredAdminMeds = filterPatient === '' ? meds : meds.filter(m => m.owner === filterPatient);

  return (
    <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto', fontFamily: 'sans-serif', color: 'white' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ margin: 0, color: '#90CAF9' }}>YaJai 💊</h1>
        <div style={{ textAlign: 'right' }}>
          <span style={{ marginRight: '10px' }}>👤 {username} {username === 'admin' && '(Admin)'}</span>
          <button onClick={handleLogout} style={{ background: '#ff4d4d', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px' }}>ออก</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button onClick={() => setActiveTab('meds')} style={{ flex: 1, padding: '10px', background: activeTab === 'meds' ? '#2196F3' : '#555', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>💊 {username === 'admin' ? 'จัดการยา' : 'หน้ากินยา'}</button>
        <button onClick={() => setActiveTab('history')} style={{ flex: 1, padding: '10px', background: activeTab === 'history' ? '#2196F3' : '#555', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>
          {username === 'admin' ? '📊 ประวัติ' : '📓 บันทึกอาการ'}
        </button>
        <button onClick={() => setActiveTab('chat')} style={{ flex: 1, padding: '10px', background: activeTab === 'chat' ? '#2196F3' : '#555', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>💬 แชท</button>
      </div>

      {!pushEnabled && activeTab === 'meds' && (
        <div style={{ background: '#FF9800', padding: '15px', borderRadius: '10px', marginBottom: '20px', textAlign: 'center', color: 'white' }}>
          <button onClick={handleEnablePush} style={{ background: '#333', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold' }}>🔔 เปิดแจ้งเตือนแอป</button>
        </div>
      )}

      {activeTab === 'meds' && (
        username === 'admin' ? (
          <>
            <div style={{ background: '#303f9f', padding: '20px', borderRadius: '15px', marginBottom: '20px' }}>
              <h3 style={{ marginTop: 0 }}>➕ สั่งยาให้คนไข้</h3>
              <form onSubmit={handleAddMed} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <select value={filterPatient} onChange={e => setFilterPatient(e.target.value)} style={{ padding: '6px', borderRadius: '5px', flex: 1 }}>
                  <option value="">-- เลือกคนไข้ --</option>{patients.map(p => <option key={p} value={p}>คุณ {p}</option>)}
                </select>
                <input type="text" placeholder="ชื่อยา" value={newName} onChange={e => setNewName(e.target.value)} style={{ padding: '10px', borderRadius: '5px' }} />
                <input type="number" placeholder="จำนวนยาที่มี (เม็ด)" value={newStock} onChange={e => setNewStock(e.target.value)} style={{ padding: '10px', borderRadius: '5px' }} />
                
                <div style={{ background: '#3f51b5', padding: '10px', borderRadius: '5px' }}>
                  <span style={{ fontSize: '14px', color: '#fff' }}>📸 อัปโหลดรูปยา:</span>
                  <input type="file" accept="image/*" onChange={handleImageChange} style={{ width: '100%', marginTop: '5px' }} />
                  {newImage && <div style={{ marginTop: '10px', textAlign: 'center' }}><img src={newImage} alt="preview" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '5px' }} /></div>}
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <select value={newMeal} onChange={e => setNewMeal(e.target.value)} style={{ padding: '10px', borderRadius: '5px', flex: 1 }}>{mealsCategory.map(meal => <option key={meal} value={meal}>มื้อ{meal}</option>)}</select>
                  <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} style={{ padding: '10px', borderRadius: '5px', flex: 1 }} />
                </div>
                <button type="submit" style={{ background: '#FFC107', color: '#333', padding: '10px', border: 'none', borderRadius: '5px', fontWeight: 'bold' }}>บันทึก</button>
              </form>
            </div>
            
            <div style={{ background: '#444', padding: '20px', borderRadius: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}><h3 style={{ margin: 0 }}>📋 จัดการยาทั้งหมด</h3><button onClick={handleResetMeds} style={{ background: '#2196F3', color: 'white', border: 'none', padding: '8px', borderRadius: '5px' }}>🔄 เริ่มวันใหม่</button></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#555', padding: '10px', borderRadius: '8px', marginBottom: '10px' }}><span style={{ fontSize: '14px' }}>🔍 กรองดูคนไข้:</span><select value={filterPatient} onChange={e => setFilterPatient(e.target.value)} style={{ padding: '6px', borderRadius: '5px', flex: 1 }}><option value="">-- ดูทุกคน --</option>{patients.map(p => <option key={p} value={p}>คุณ {p}</option>)}</select></div>
              {filteredAdminMeds.map(m => (
                <div key={m.id} style={{ borderBottom: '1px solid #555', padding: '15px 0' }}>
                  {editingId === m.id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: '#555', padding: '15px', borderRadius: '10px' }}>
                      <b style={{ color: '#FFC107' }}>✏️ แก้ไขข้อมูลยา</b>
                      <input type="text" value={editName} onChange={e => setEditName(e.target.value)} placeholder="ชื่อยา" style={{ padding: '8px', borderRadius: '5px', border: 'none' }} />
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <select value={editMeal} onChange={e => setEditMeal(e.target.value)} style={{ padding: '8px', borderRadius: '5px', flex: 1, border: 'none' }}>
                          {mealsCategory.map(meal => <option key={meal} value={meal}>มื้อ{meal}</option>)}
                        </select>
                        <input type="time" value={editTime} onChange={e => setEditTime(e.target.value)} style={{ padding: '8px', borderRadius: '5px', flex: 1, border: 'none' }} />
                      </div>
                      <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                        <button onClick={() => handleSaveEdit(m.id)} style={{ flex: 1, background: '#4CAF50', color: 'white', padding: '8px', border: 'none', borderRadius: '5px', fontWeight: 'bold' }}>💾 บันทึก</button>
                        <button onClick={() => setEditingId(null)} style={{ flex: 1, background: '#9e9e9e', color: 'white', padding: '8px', border: 'none', borderRadius: '5px', fontWeight: 'bold' }}>❌ ยกเลิก</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                        {m.imageUrl ? <img src={m.imageUrl} alt="med" style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '8px' }} /> : <div style={{ width: '50px', height: '50px', background: '#555', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>💊</div>}
                        <div>
                          <b>{m.name}</b> <span style={{ color: m.stock <= 5 ? '#ff5252' : '#81C784' }}>(เหลือ {m.stock || 0})</span> 
                          <span style={{ color: '#bbb', fontSize: '14px' }}><br/>({m.owner})</span> <br/>
                          <span style={{ fontSize: '14px', color: '#90CAF9' }}>มื้อ{m.meal || 'เช้า'} - {m.time} น.</span><br/>
                          <span style={{ fontSize: '13px', color: m.status === 'กินแล้ว 💖' ? '#4CAF50' : '#FF9800' }}>{m.status}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '5px', flexDirection: 'column' }}>
                        <button onClick={() => startEdit(m)} style={{ background: '#FFC107', color: '#333', border: 'none', borderRadius: '5px', padding: '6px 15px', fontWeight: 'bold' }}>✏️ แก้ไข</button>
                        <button onClick={() => handleDeleteMed(m.id)} style={{ background: '#ff5252', color: 'white', border: 'none', borderRadius: '5px', padding: '6px 15px' }}>🗑️ ลบ</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <button onClick={handleCallAdmin} style={{ width: '100%', padding: '12px', background: '#E91E63', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '16px', marginBottom: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>🛎️ เรียกผู้ดูแล</button>
            {mealsCategory.map(mealName => {
              const medsInThisMeal = meds.filter(m => (m.meal || 'เช้า') === mealName);
              if (medsInThisMeal.length === 0) return null; 
              return (
                <div key={mealName} style={{ background: '#444', padding: '15px', borderRadius: '15px', marginBottom: '15px' }}>
                  <h3 style={{ margin: '0 0 15px 0', color: '#FFC107', borderBottom: '2px solid #555', paddingBottom: '10px' }}>🍽️ ยามื้อ{mealName}</h3>
                  {medsInThisMeal.map(m => (
                    <div key={m.id} style={{ background: '#333', padding: '15px', borderRadius: '10px', marginBottom: '10px', borderLeft: m.status === 'กินแล้ว 💖' ? '6px solid #4CAF50' : '6px solid #FF9800' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '18px', marginBottom: '5px' }}>{m.name} <span style={{ fontSize: '14px', color: m.stock <= 5 ? '#ff5252' : '#aaa' }}>(เหลือ {m.stock || 0})</span><span style={{ float: 'right' }}>🕒 {m.time} น.</span></div>
                      {m.imageUrl && (<div style={{ margin: '10px 0', textAlign: 'center' }}><img src={m.imageUrl} alt="ยา" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '10px' }} /></div>)}
                      <div style={{ margin: '10px 0', color: m.status === 'กินแล้ว 💖' ? '#81C784' : '#FFB74D', textAlign: 'center', fontWeight: 'bold' }}>{m.status}</div>
                      <button onClick={() => handleTakeMed(m.id)} disabled={m.status === 'กินแล้ว 💖'} style={{ width: '100%', padding: '12px', background: m.status === 'กินแล้ว 💖' ? '#555' : '#4CAF50', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '16px' }}>{m.status === 'กินแล้ว 💖' ? '✅ กินแล้ว' : 'กดเมื่อกินยา'}</button>
                    </div>
                  ))}
                </div>
              )
            })}
          </>
        )
      )}

      {activeTab === 'history' && (
        <div style={{ background: '#444', padding: '20px', borderRadius: '15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0 }}>{username === 'admin' ? '📊 สถิติ & ประวัติ' : '📓 บันทึกอาการ'}</h3>
            {username === 'admin' && (
              <button onClick={() => window.print()} style={{ background: '#9C27B0', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '8px', fontWeight: 'bold' }}>🖨️ Save เป็น PDF</button>
            )}
          </div>

          {username === 'admin' && (
            <>
              {history.length === 0 ? <p style={{ color: '#bbb' }}>ยังไม่มีประวัติการกินยา</p> : 
                history.map((h, index) => (
                  <div key={index} style={{ background: '#333', padding: '15px', borderRadius: '10px', marginBottom: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <b>📅 {h.date}</b><span style={{ color: '#90CAF9' }}>คุณ {h.owner}</span>
                    </div>
                    <div style={{ background: '#555', height: '12px', borderRadius: '6px', overflow: 'hidden', marginBottom: '8px' }}>
                        <div style={{ width: `${h.percent}%`, background: h.percent === 100 ? '#4CAF50' : h.percent >= 50 ? '#FFC107' : '#F44336', height: '100%', transition: 'width 0.5s' }}></div>
                    </div>
                    <div style={{ fontSize: '14px', color: '#ccc' }}>กินยาแล้ว: {h.taken}/{h.total} รายการ <b style={{ float: 'right', color: h.percent === 100 ? '#4CAF50' : '#FFC107' }}>{h.percent}%</b></div>
                  </div>
                ))
              }
              <hr style={{ borderColor: '#555', margin: '20px 0' }} />
              <h3 style={{ color: '#FF9800' }}>📓 บันทึกอาการของคนไข้</h3>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#555', padding: '10px', borderRadius: '8px', marginBottom: '15px' }}>
                <span style={{ fontSize: '14px', color: 'white' }}>🔍 ดูอาการของ:</span>
                <select 
                  value={filterPatient} 
                  onChange={e => setFilterPatient(e.target.value)} 
                  style={{ padding: '6px', borderRadius: '5px', flex: 1 }}
                >
                  <option value="">-- ดูทุกคน --</option>
                  {patients.map(p => <option key={p} value={p}>คุณ {p}</option>)}
                </select>
              </div>
            </>
          )}

          {username !== 'admin' && (
              <form onSubmit={handleSaveDiary} style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                  <input type="text" value={diaryInput} onChange={e => setDiaryInput(e.target.value)} placeholder="วันนี้รู้สึกยังไงบ้าง? พิมพ์แจ้งผู้ดูแลได้เลย" style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none' }} />
                  <button type="submit" style={{ background: '#FF9800', color: 'white', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold' }}>บันทึก</button>
              </form>
          )}

          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#888' }}>
              <h3>⏳ กำลังโหลดข้อมูลประวัติ...</h3>
            </div>
          ) : diaries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#aaa' }}>
              ยังไม่มีการบันทึกอาการครับ
            </div>
          ) : (
            diaries.map((d, i) => (
              <div key={i} style={{ background: '#555', padding: '10px', borderRadius: '8px', marginBottom: '8px', fontSize: '14px' }}>
                <div style={{ color: '#aaa', fontSize: '12px', marginBottom: '4px' }}>{new Date(d.timestamp).toLocaleString('th-TH')}</div>
                <div>💬 {d.note}</div>
                {username === 'admin' && <div style={{ fontSize: '12px', color: '#90CAF9', marginTop: '4px' }}>- คุณ {d.owner}</div>}
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'chat' && (
        <div style={{ display: 'flex', flexDirection: 'column', height: '60vh', background: '#444', borderRadius: '15px', overflow: 'hidden' }}>
          <div style={{ background: '#303f9f', padding: '15px', borderBottom: '1px solid #555' }}>
            {username === 'admin' ? (
               <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                 <b>แชทกับ:</b>
                 <select value={chatTarget} onChange={e => setChatTarget(e.target.value)} style={{ padding: '5px', borderRadius: '5px', flex: 1 }}>
                   {patients.map(p => <option key={p} value={p}>คุณ {p}</option>)}
                 </select>
               </div>
            ) : (
               <div style={{ fontWeight: 'bold', textAlign: 'center' }}>👩‍⚕️ คุยกับผู้ดูแล (Admin)</div>
            )}
          </div>

          <div style={{ flex: 1, padding: '15px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', background: '#222' }}>
             {messages.length === 0 ? (
               <div style={{ textAlign: 'center', color: '#888', marginTop: '20px' }}>เริ่มบทสนทนาได้เลย! 👋</div>
             ) : (
               messages.map((msg, idx) => {
                 const isMe = msg.sender === username;
                 return (
                   <div key={idx} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '75%', background: isMe ? '#4CAF50' : '#555', padding: '10px 15px', borderRadius: '15px', borderBottomRightRadius: isMe ? '2px' : '15px', borderBottomLeftRadius: !isMe ? '2px' : '15px' }}>
                     {!isMe && <div style={{ fontSize: '11px', color: '#ccc', marginBottom: '3px' }}>{msg.sender}</div>}
                     <div style={{ wordBreak: 'break-word' }}>{msg.text}</div>
                     <div style={{ fontSize: '10px', color: '#ddd', textAlign: 'right', marginTop: '5px' }}>{new Date(msg.timestamp).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})}</div>
                   </div>
                 )
               })
             )}
             <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSendMessage} style={{ display: 'flex', padding: '10px', background: '#333', gap: '10px' }}>
             <button type="button" onClick={handleVoiceTyping} style={{ background: '#FF9800', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '50%', cursor: 'pointer', fontSize: '18px' }}>🎙️</button>
             <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="พิมพ์ข้อความ หรือกดไมค์..." style={{ flex: 1, padding: '10px', borderRadius: '20px', border: 'none', outline: 'none' }} />
             <button type="submit" style={{ background: '#2196F3', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '20px', fontWeight: 'bold' }}>ส่ง</button>
          </form>
        </div>
      )}
    </div>
  )
}

export default App;