import { useState, useEffect, useRef } from 'react'
import Swal from 'sweetalert2' 
import './index.css'; // อย่าลืม import CSS นะเพื่อน!

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
  const [chatImage, setChatImage] = useState(null); // ตัวแปรเก็บรูปภาพที่จะส่ง

  // ระบบบันทึกอาการ
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
    setIsLoading(true); 

    fetch(`${API_URL}/diary/${target}`, { method: 'GET', headers: getAuthHeaders() })
      .then(res => res.json())
      .then(data => { setDiaries(data); setIsLoading(false); })
      .catch(err => { console.error(err); setIsLoading(false); });
  };

  useEffect(() => { 
    if (token) {
        fetchMeds(); 
        fetchHistory(); 
        if (username === 'admin') fetchPatients(); 
         else setTimeout(() => setChatTarget('admin'), 0);
    } 
  }, [token, username])

  useEffect(() => {
    if (token) setTimeout(() => fetchDiaries(), 0);
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
    if (!SpeechRecognition) return Swal.fire('ขออภัย', 'เบราว์เซอร์ของคุณไม่รองรับระบบสั่งงานด้วยเสียงครับ', 'error');
    const recognition = new SpeechRecognition();
    recognition.lang = 'th-TH'; 
    recognition.start();
    Swal.fire({ title: '🎙️ กำลังฟัง...', text: 'พูดข้อความที่ต้องการส่งได้เลยครับ', showConfirmButton: false });
    recognition.onresult = (event) => {
      setChatInput(prev => prev + event.results[0][0].transcript + ' ');
      Swal.close();
    };
    recognition.onerror = () => Swal.fire('เกิดข้อผิดพลาด', 'จับเสียงไม่ได้ครับ ลองใหม่อีกครั้งนะ', 'error');
  };

  const handleSaveDiary = async (e) => {
    e.preventDefault();
    if (!diaryInput.trim()) return;
    try {
      const response = await fetch(`${API_URL}/diaries`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ note: diaryInput }) });
      if (!response.ok) throw new Error(`เซิร์ฟเวอร์ตอบกลับ: ${response.status}`);
      setDiaryInput(''); 
      Swal.fire('บันทึกแล้ว', 'แจ้งอาการให้ผู้ดูแลทราบแล้วครับ', 'success'); 
      fetchDiaries(); 
    } catch (error) { Swal.fire('เกิดข้อผิดพลาด!', `ส่งข้อมูลไม่ได้\n${error.message}`, 'error'); }
  };

  const handleSendMessage = async (e) => {
  e.preventDefault();
  
  // ✨ เช็คทั้งข้อความและรูป ถ้าว่างทั้งคู่ไม่ต้องส่ง
  if ((!chatInput.trim() && !chatImage) || !chatTarget) return;

  const body = {
    receiver: chatTarget,
    text: chatInput,
    image: chatImage // ✨ ส่งรูป Base64 ไปด้วย
  };

  try {
    const res = await fetch(`${API_URL}/messages`, {
      method: 'POST',
      headers: { 
        ...getAuthHeaders(), // ใช้ฟังก์ชันดึง Header เดิมของเพื่อน
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify(body)
    });

    if (res.ok) {
      setChatInput('');
      setChatImage(null); // ✨ ล้างรูปหลังส่งสำเร็จ
      // ถ้าเพื่อนมีฟังก์ชันโหลดแชทใหม่ (เช่น fetchMessages) ให้เรียกตรงนี้ครับ
    }
  } catch (err) {
    console.error("ส่งข้อความล้มเหลว:", err);
  }
};

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
      } catch (err) { Swal.fire('เกิดข้อผิดพลาด', String(err), 'error'); }
    } else { Swal.fire('ถูกปฏิเสธ', 'ไม่อนุญาตให้แอปส่งแจ้งเตือน', 'warning'); }
  }

  const handleCallAdmin = () => { fetch(`${API_URL}/call-admin`, { method: 'POST', headers: getAuthHeaders() }).then(() => Swal.fire('ส่งข้อความแล้ว', 'ระบบแจ้งเตือนไปยังผู้ดูแลเรียบร้อยครับ', 'success')) }
  const handleImageChange = (e) => { const file = e.target.files[0]; if (file) { const reader = new FileReader(); reader.onloadend = () => setNewImage(reader.result); reader.readAsDataURL(file); } }
  
  const handleAddMed = (e) => { e.preventDefault(); if (!newName || !newTime || !targetPatient || !newStock) return Swal.fire('กรุณากรอกข้อมูลให้ครบ'); fetch(`${API_URL}/meds`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ name: newName, time: newTime, meal: newMeal, patientName: targetPatient, stock: Number(newStock), imageUrl: newImage }) }).then(res => res.json()).then(data => { setMeds([...meds, data.medicine]); setNewName(''); setNewTime(''); setNewImage(''); Swal.fire('สำเร็จ', `สั่งยาให้คุณ ${targetPatient} เรียบร้อย`, 'success'); if (Notification.permission === 'granted') {
    // ถ้าผู้ใช้กดอนุญาตให้แจ้งเตือนแล้ว ให้เด้ง Push Notification
    new Notification('💊 มียาใหม่เข้ามา!', {
      body: `พยาบาล/ผู้ดูแล ได้เพิ่มยา "${newName}" ให้คุณ ${targetPatient} (มื้อ${newMeal}) เรียบร้อยแล้ว`,
      // ถ้ามีอัปโหลดรูปยามาด้วย ให้เอารูปยาโชว์ในแจ้งเตือนเลย
      icon: newImage ? URL.createObjectURL(newImage) : null 
    });
  }}) }
  const handleDeleteMed = (id) => { Swal.fire({ title: 'ลบรายการยา?', icon: 'warning', showCancelButton: true }).then(res => { if (res.isConfirmed) fetch(`${API_URL}/meds/${id}`, { method: 'DELETE', headers: getAuthHeaders() }).then(() => setMeds(meds.filter(m => m.id !== id))) }) }
  const handleTakeMed = (id) => { fetch(`${API_URL}/meds/${id}`, { method: 'PUT', headers: getAuthHeaders() }).then(res => res.json()).then((updatedMed) => { setMeds(meds.map(med => med.id === id ? { ...med, status: 'กินแล้ว 💖', stock: updatedMed.stock } : med)); Swal.fire({ icon: 'success', title: 'เยี่ยมมาก!', timer: 1000, showConfirmButton: false }); }) }
  const handleResetMeds = () => { Swal.fire({ title: 'เริ่มวันใหม่?', text: "สถานะยาจะกลับเป็น 'ยังไม่ได้กิน'", icon: 'question', showCancelButton: true }).then(res => { if (res.isConfirmed) { fetch(`${API_URL}/meds/reset/all`, { method: 'PUT', headers: getAuthHeaders() }).then(() => { fetchMeds(); Swal.fire('สำเร็จ', 'รีเซ็ตสถานะแล้ว', 'success'); }) } }) }

  const handleAuth = (e) => { e.preventDefault(); fetch(`${API_URL}${isLoginMode ? '/login' : '/register'}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: authUsername, password: authPassword }) }).then(res => res.json()).then(data => { if (data.token) { setToken(data.token); setUsername(data.username); localStorage.setItem('token', data.token); localStorage.setItem('username', data.username); } else { Swal.fire(data.message || 'เกิดข้อผิดพลาด'); } }) }
  const [zoomedImageUrl, setZoomedImageUrl] = useState(null);
  // สไตล์สำหรับ Input พื้นฐาน
  const inputStyle = { padding: '12px', borderRadius: '8px', border: '1px solid #ddd', outline: 'none',width: '100%',boxSizing: 'border-box' , backgroundColor: '#fff', color: '#333' };

  if (!token) {
    return (
<div style={{ backgroundColor: '#F0F4F8', minHeight: '100vh', width: '100%', margin: 0, padding: 0 }}>
  <div style={{ width: '100%', minHeight: '100vh', background: 'white', padding: '20px', textAlign: 'center' , boxSizing: 'border-box'}}>
          <h1 style={{ color: '#1976D2', marginBottom: '10px' }}><div style={{ display: 'flex', justifyContent: 'center', marginBottom: '30px' }}>
  <img 
    src="./logo.png" // 💡 1. ใส่ path รูปโลโก้ของเพื่อนตรงนี้
    alt="YaJai Logo" 
    style={{ 
      width: '120px',    // 💡 2. ปรับขนาดความกว้างตามต้องการ
      height: 'auto',    // ให้ความสูงปรับตามสัดส่วนอัตโนมัติ รูปจะได้ไม่บี้
      objectFit: 'contain' // ป้องกันรูปโดนตัดขอบ
    }} 
  />
</div></h1>
          <h3 style={{ color: '#555', marginBottom: '20px' }}>{isLoginMode ? 'เข้าสู่ระบบ' : 'สมัครสมาชิกใหม่'}</h3>
          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input type="text" placeholder="ชื่อผู้ใช้" value={authUsername} onChange={e => setAuthUsername(e.target.value)} style={inputStyle} />
            <input type="password" placeholder="รหัสผ่าน" value={authPassword} onChange={e => setAuthPassword(e.target.value)} style={inputStyle} />
            <button type="submit" style={{ padding: '12px', background: '#1976D2', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '16px', marginTop: '10px', boxSizing: 'border-box' , boxShadow: '0 4px 10px rgba(25, 118, 210, 0.3)' }}>{isLoginMode ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}</button>
          </form>
          <p onClick={() => setIsLoginMode(!isLoginMode)} style={{ cursor: 'pointer', color: '#1976D2', marginTop: '20px', fontSize: '14px', fontWeight: 'bold' }}>{isLoginMode ? 'ยังไม่มีบัญชี? สมัครเลย' : 'มีบัญชีแล้ว? เข้าสู่ระบบ'}</p>
        </div>
      </div>
    )
  }

  const mealsCategory = ['เช้า', 'กลางวัน', 'เย็น', 'ก่อนนอน'];
  const filteredAdminMeds = filterPatient === '' ? meds : meds.filter(m => m.owner === filterPatient);

  return (
    <div style={{ backgroundColor: '#F0F4F8', minHeight: '100vh', width: '100%', margin: '0 auto', padding: '20px', paddingBottom: '100px', boxSizing: 'border-box', fontFamily: 'sans-serif', color: '#333', position: 'relative' }}>
      
      {/* ส่วนหัวแอป (ซ่อนไว้เมื่อ activeTab เป็น 'chat') */}
      {activeTab !== 'chat' && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', backgroundColor: 'white', padding: '15px 20px', borderRadius: '15px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <h2 style={{ margin: 0, color: '#1976D2', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '30px' }}>
  <img 
    src="./logo.png" // 💡 1. ใส่ path รูปโลโก้ของเพื่อนตรงนี้
    alt="YaJai Logo" 
    style={{ 
      width: '80px',    // 💡 2. ปรับขนาดความกว้างตามต้องการ
      height: 'auto',    // ให้ความสูงปรับตามสัดส่วนอัตโนมัติ รูปจะได้ไม่บี้
      objectFit: 'contain' // ป้องกันรูปโดนตัดขอบ
    }} 
  />
</div></h2>
          <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#555' }}>👤 {username} {username === 'admin' && '(Admin)'}</span>
            <button onClick={handleLogout} style={{ background: '#FFF0F0', color: '#E53935', border: '1px solid #FFCDD2', padding: '6px 12px', borderRadius: '8px', fontWeight: 'bold' }}>ออก</button>
          </div>
        </div>
      )}

      {!pushEnabled && activeTab === 'meds' && (
        <div style={{ background: '#FFF3E0', border: '1px solid #FFE0B2', padding: '15px', borderRadius: '15px', marginBottom: '20px', textAlign: 'center' }}>
          <p style={{ margin: '0 0 10px 0', color: '#E65100', fontSize: '14px' }}>คุณยังไม่ได้เปิดรับการแจ้งเตือนเตือนกินยา!</p>
          <button onClick={handleEnablePush} style={{ background: '#FF9800', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', boxShadow: '0 2px 8px rgba(255, 152, 0, 0.4)' }}>🔔 เปิดแจ้งเตือนเดี๋ยวนี้</button>
        </div>
      )}

      {/* หน้าจัดการยา / หน้ากินยา */}
      {activeTab === 'meds' && (
        username === 'admin' ? (
          <>
            <div style={{ background: 'white', padding: '20px', borderRadius: '15px', marginBottom: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
              <h3 style={{ marginTop: 0, color: '#1976D2', borderBottom: '2px solid #E3F2FD', paddingBottom: '10px' }}>➕ สั่งยาให้คนไข้</h3>
              <form onSubmit={handleAddMed} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '15px' }}>
                <select value={targetPatient} onChange={e => setTargetPatient(e.target.value)} style={inputStyle}>
                  <option value="">-- เลือกคนไข้ --</option>{patients.map(p => <option key={p} value={p}>คุณ {p}</option>)}
                </select>
                <input type="text" placeholder="ชื่อยา" value={newName} onChange={e => setNewName(e.target.value)} style={inputStyle} />
                <input type="number" placeholder="จำนวนยาที่มี (เม็ด)" value={newStock} onChange={e => setNewStock(e.target.value)} style={inputStyle} />
                
                <div style={{ background: '#F8F9FA', padding: '12px', borderRadius: '8px', border: '1px dashed #ccc' }}>
                  <span style={{ fontSize: '14px', color: '#666', fontWeight: 'bold' }}>📸 อัปโหลดรูปยา:</span>
                  <input type="file" accept="image/*" onChange={handleImageChange} style={{ width: '100%', marginTop: '8px', fontSize: '14px' }} />
                  {newImage && <div style={{ marginTop: '10px', textAlign: 'center' }}><img src={newImage} alt="preview" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }} /></div>}
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <select value={newMeal} onChange={e => setNewMeal(e.target.value)} style={{...inputStyle, flex: 1}}>{mealsCategory.map(meal => <option key={meal} value={meal}>มื้อ{meal}</option>)}</select>
                  <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} style={{...inputStyle, flex: 1}} />
                </div>
                <button type="submit" style={{ background: '#1976D2', color: 'white', padding: '12px', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '16px', boxShadow: '0 4px 10px rgba(25, 118, 210, 0.3)' }}>บันทึกรายการยา</button>
              </form>
            </div>
            
            <div style={{ background: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h3 style={{ margin: 0, color: '#333' }}>📋 รายการยาทั้งหมด</h3>
                  <button onClick={handleResetMeds} style={{ background: '#E3F2FD', color: '#1976D2', border: 'none', padding: '8px 12px', borderRadius: '8px', fontWeight: 'bold' }}>🔄 เริ่มวันใหม่</button>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#F5F5F5', padding: '10px', borderRadius: '8px', marginBottom: '15px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#555' }}>🔍 กรองดูคนไข้:</span>
                  <select value={filterPatient} onChange={e => setFilterPatient(e.target.value)} style={{...inputStyle, padding: '8px', flex: 1}}><option value="">-- ดูทุกคน --</option>{patients.map(p => <option key={p} value={p}>คุณ {p}</option>)}</select>
              </div>

              {filteredAdminMeds.map(m => (
                <div key={m.id} style={{ borderBottom: '1px solid #EEE', padding: '15px 0' }}>
                  {editingId === m.id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: '#FFF8E1', padding: '15px', borderRadius: '10px', border: '1px solid #FFE082' }}>
                      <b style={{ color: '#F57F17' }}>✏️ แก้ไขข้อมูลยา</b>
                      <input type="text" value={editName} onChange={e => setEditName(e.target.value)} placeholder="ชื่อยา" style={inputStyle} />
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <select value={editMeal} onChange={e => setEditMeal(e.target.value)} style={{...inputStyle, flex: 1}}>
                          {mealsCategory.map(meal => <option key={meal} value={meal}>มื้อ{meal}</option>)}
                        </select>
                        <input type="time" value={editTime} onChange={e => setEditTime(e.target.value)} style={{...inputStyle, flex: 1}} />
                      </div>
                      <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                        <button onClick={() => handleSaveEdit(m.id)} style={{ flex: 1, background: '#4CAF50', color: 'white', padding: '10px', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>💾 บันทึก</button>
                        <button onClick={() => setEditingId(null)} style={{ flex: 1, background: '#E0E0E0', color: '#555', padding: '10px', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>❌ ยกเลิก</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                        {m.imageUrl ? <img src={m.imageUrl} alt="med" style={{ width: '55px', height: '55px', objectFit: 'cover', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }} /> : <div style={{ width: '55px', height: '55px', background: '#E3F2FD', color: '#1976D2', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>💊</div>}
                        <div>
                          <b style={{ fontSize: '16px', color: '#333' }}>{m.name}</b> <span style={{ fontSize: '13px', fontWeight: 'bold', color: m.stock <= 5 ? '#E53935' : '#4CAF50' }}>(เหลือ {m.stock || 0})</span> 
                          <div style={{ color: '#888', fontSize: '13px', marginTop: '2px' }}>👤 ของคุณ: {m.owner}</div>
                          <div style={{ fontSize: '14px', color: '#1976D2', marginTop: '2px', fontWeight: 'bold' }}>มื้อ{m.meal || 'เช้า'} - {m.time} น.</div>
                          <div style={{ fontSize: '13px', fontWeight: 'bold', marginTop: '2px', color: m.status === 'กินแล้ว 💖' ? '#4CAF50' : '#FF9800' }}>{m.status}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                        <button onClick={() => startEdit(m)} style={{ background: '#FFF3E0', color: '#F57F17', border: '1px solid #FFE0B2', borderRadius: '8px', padding: '6px 12px', fontWeight: 'bold' }}>✏️ แก้ไข</button>
                        <button onClick={() => handleDeleteMed(m.id)} style={{ background: '#FFEBEE', color: '#E53935', border: '1px solid #FFCDD2', borderRadius: '8px', padding: '6px 12px', fontWeight: 'bold' }}>🗑️ ลบ</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <button onClick={handleCallAdmin} style={{ width: '100%', padding: '15px', background: 'linear-gradient(135deg, #FF4081, #E91E63)', color: 'white', border: 'none', borderRadius: '15px', fontWeight: 'bold', fontSize: '16px', marginBottom: '20px', boxShadow: '0 4px 10px rgba(233, 30, 99, 0.3)' }}>🛎️ เรียกพยาบาล / ผู้ดูแล</button>
            {mealsCategory.map(mealName => {
              const medsInThisMeal = meds.filter(m => (m.meal || 'เช้า') === mealName);
              if (medsInThisMeal.length === 0) return null; 
              return (
                <div key={mealName} style={{ marginBottom: '20px' }}>
                  <h3 style={{ margin: '0 0 10px 0', color: '#1976D2', display: 'flex', alignItems: 'center', gap: '8px' }}>🍽️ ยามื้อ{mealName}</h3>
                  {medsInThisMeal.map(m => (
                    <div key={m.id} style={{ background: 'white', padding: '20px', borderRadius: '15px', marginBottom: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', borderLeft: m.status === 'กินแล้ว 💖' ? '6px solid #4CAF50' : '6px solid #FF9800' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <span style={{ fontWeight: 'bold', fontSize: '18px', color: '#333' }}>{m.name}</span>
                          <span style={{ background: '#E3F2FD', color: '#1976D2', padding: '4px 10px', borderRadius: '10px', fontSize: '14px', fontWeight: 'bold' }}>🕒 {m.time} น.</span>
                      </div>
                      <div style={{ fontSize: '14px', color: m.stock <= 5 ? '#E53935' : '#888', marginBottom: '10px' }}>ยามีเหลือ {m.stock || 0} เม็ด</div>
                      
                      {m.imageUrl && (<div style={{ margin: '15px 0', textAlign: 'center' }}><img src={m.imageUrl} alt="ยา" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' , cursor: 'pointer' }} onClick={() => setZoomedImageUrl(m.imageUrl)} /></div>)}
                      
                      <div style={{ margin: '15px 0 10px 0', color: m.status === 'กินแล้ว 💖' ? '#4CAF50' : '#FF9800', textAlign: 'center', fontWeight: 'bold', fontSize: '16px' }}>{m.status}</div>
                      
                      <button onClick={() => handleTakeMed(m.id)} disabled={m.status === 'กินแล้ว 💖'} style={{ width: '100%', padding: '14px', background: m.status === 'กินแล้ว 💖' ? '#E8F5E9' : '#4CAF50', color: m.status === 'กินแล้ว 💖' ? '#2E7D32' : 'white', border: m.status === 'กินแล้ว 💖' ? '1px solid #C8E6C9' : 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '16px', boxShadow: m.status === 'กินแล้ว 💖' ? 'none' : '0 4px 10px rgba(76, 175, 80, 0.3)', transition: 'all 0.3s' }}>{m.status === 'กินแล้ว 💖' ? '✅ ทานยาเรียบร้อย' : 'กดปุ่มนี้เมื่อกินยาแล้ว'}</button>
                    </div>
                  ))}
                </div>
              )
            })}
          </>
        )
      )}

      {/* หน้าประวัติ */}
      {activeTab === 'history' && (
        <div style={{ background: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, color: '#1976D2' }}>{username === 'admin' ? '📊 สถิติ & ประวัติ' : '📓 บันทึกอาการ'}</h3>
            {username === 'admin' && (
              <button onClick={() => window.print()} style={{ background: '#E3F2FD', color: '#1976D2', border: 'none', padding: '8px 15px', borderRadius: '8px', fontWeight: 'bold' }}>🖨️ PDF</button>
            )}
          </div>

          {username === 'admin' && (
            <>
              {history.length === 0 ? <p style={{ color: '#888', textAlign: 'center', padding: '20px' }}>ยังไม่มีประวัติการกินยา</p> : 
                history.map((h, index) => (
                  <div key={index} style={{ background: '#F8F9FA', border: '1px solid #EEE', padding: '15px', borderRadius: '12px', marginBottom: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <b style={{ color: '#333' }}>📅 {h.date}</b><span style={{ color: '#1976D2', fontWeight: 'bold' }}>คุณ {h.owner}</span>
                    </div>
                    <div style={{ background: '#E0E0E0', height: '12px', borderRadius: '6px', overflow: 'hidden', marginBottom: '8px' , WebkitPrintColorAdjust: 'exact',printColorAdjust: 'exact' }}>
                        <div style={{ width: `${h.percent}%`, background: h.percent === 100 ? '#4CAF50' : h.percent >= 50 ? '#FFC107' : '#F44336', height: '100%', transition: 'width 0.5s' }}></div>
                    </div>
                    <div style={{ fontSize: '14px', color: '#666' }}>กินยาแล้ว: {h.taken}/{h.total} รายการ <b style={{ float: 'right', WebkitPrintColorAdjust: 'exact', color: h.percent === 100 ? '#4CAF50' : h.percent >= 50 ? '#F57F17' : '#D32F2F' }}>{h.percent}%</b></div>
                  </div>
                ))
              }
              <hr style={{ borderColor: '#EEE', margin: '25px 0' }} />
              <h3 style={{ color: '#1976D2', marginBottom: '15px' }}>📓 บันทึกอาการคนไข้</h3>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#F5F5F5', padding: '10px', borderRadius: '8px', marginBottom: '15px' }}>
                <span style={{ fontSize: '14px', color: '#555', fontWeight: 'bold' }}>🔍 ดูอาการของ:</span>
                <select value={filterPatient} onChange={e => setFilterPatient(e.target.value)} style={{...inputStyle, padding: '8px', flex: 1}}>
                  <option value="">-- ดูทุกคน --</option>
                  {patients.map(p => <option key={p} value={p}>คุณ {p}</option>)}
                </select>
              </div>
            </>
          )}

          {username !== 'admin' && (
              <form onSubmit={handleSaveDiary} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                  <input type="text" value={diaryInput} onChange={e => setDiaryInput(e.target.value)} placeholder="วันนี้รู้สึกยังไงบ้าง? พิมพ์แจ้งไว้ได้เลย" style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #ccc', outline: 'none', backgroundColor: '#F8F9FA' , color: '#000' }} />
                  <button type="submit" style={{ background: '#1976D2', color: 'white', border: 'none', padding: '0 20px', borderRadius: '10px', fontWeight: 'bold', boxShadow: '0 4px 8px rgba(25, 118, 210, 0.2)' }}>บันทึก</button>
              </form>
          )}

          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#888' }}><h3>⏳ กำลังโหลดข้อมูล...</h3></div>
          ) : diaries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#aaa', background: '#F8F9FA', borderRadius: '10px' }}>ยังไม่มีการบันทึกอาการครับ</div>
          ) : (
            diaries.map((d, i) => (
              <div key={i} style={{ background: '#E3F2FD', borderLeft: '4px solid #1976D2', padding: '12px 15px', borderRadius: '8px', marginBottom: '10px', fontSize: '14px' }}>
                <div style={{ color: '#555', fontSize: '12px', marginBottom: '6px' }}>{new Date(d.timestamp).toLocaleString('th-TH')}</div>
                <div style={{ color: '#333', fontSize: '15px' }}>💬 {d.note}</div>
                {username === 'admin' && <div style={{ fontSize: '12px', color: '#1976D2', marginTop: '6px', fontWeight: 'bold' }}>- คุณ {d.owner}</div>}
              </div>
            ))
          )}
        </div>
      )}

      {/* หน้าแชท */}
      {activeTab === 'chat' && (
        <div style={{
          position: 'fixed',
          width: '100%',
          top: '0',        
          bottom: '100px',   
          left: '0',          
          right: '0',         
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          background: 'white',
          overflow: 'hidden',
          boxShadow: '0 -4px 15px rgba(0,0,0,0.1)',
          zIndex: 50
        }}>
          
          {/* หัวข้อแชท */}
          <div style={{ background: '#1976D2', padding: '20px 15px 15px', color: 'white', zIndex: 51, boxShadow: '0 2px 5px rgba(255, 255, 255, 0.1)' }}>
            {username === 'admin' ? (
               <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                 <b style={{ whiteSpace: 'nowrap' }}>แชทกับ:</b>
                 <select value={chatTarget} onChange={e => setChatTarget(e.target.value)} style={{ padding: '6px', borderRadius: '8px', flex: 1, border: 'none', outline: 'none', color: '#ffffff' }}>
                   {patients.map(p => <option key={p} value={p}>คุณ {p}</option>)}
                 </select>
               </div>
            ) : (
               <div style={{ fontWeight: 'bold', textAlign: 'center', fontSize: '16px' }}>👩‍⚕️ คุยกับพยาบาล / ผู้ดูแล</div>
            )}
          </div>

          {/* พื้นที่ข้อความ */}
          <div style={{ flex: 1, padding: '15px', overflowY: 'auto', overscrollBehavior: 'contain', display: 'flex', flexDirection: 'column', gap: '10px', background: '#F0F4F8' }}>
             {messages.length === 0 ? (
               <div style={{ textAlign: 'center', color: '#888', marginTop: '30px', background: 'white', padding: '15px', borderRadius: '10px', alignSelf: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>เริ่มบทสนทนาได้เลย! 👋</div>
             ) : (
               messages.map((msg, idx) => {
                 const isMe = msg.sender === username;
                 return (
                   <div key={idx} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '75%', background: isMe ? '#1976D2' : 'white', color: isMe ? 'white' : '#333', padding: '12px 16px', borderRadius: '18px', borderBottomRightRadius: isMe ? '4px' : '18px', borderBottomLeftRadius: !isMe ? '4px' : '18px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                     {!isMe && <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px', fontWeight: 'bold' }}>{msg.sender}</div>}
                     <div style={{ wordBreak: 'break-word', fontSize: '15px' }}>
                      {msg.text}
                      {/* ✨ เพิ่มส่วนนี้เข้าไปเพื่อให้รูปยอมโผล่หน้าออกมา! */}
                      {msg.image && (
                        <img 
                        src={msg.image} 
                        alt="chat-pic"
                        style={{ 
                          display: 'block', 
                          maxWidth: '100%', 
                          maxHeight: '250px', 
                          borderRadius: '10px', 
                          marginTop: '8px', 
                          cursor: 'pointer' 
                        }} 
                        onClick={() => setZoomedImageUrl(msg.image)} 
                        />
                        )}
                        </div>

                     <div style={{ fontSize: '10px', color: isMe ? '#BBDEFB' : '#999', textAlign: 'right', marginTop: '6px' }}>{new Date(msg.timestamp).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})}</div>
                   </div>
                 )
               })
             )}
             <div ref={messagesEndRef} />
          </div>

          {/* ----------------- ส่วนช่องพิมพ์ข้อความใหม่ ----------------- */}
<div style={{ background: 'white', borderTop: '1px solid #EEE' }}>
  
  {/* 🖼️ ส่วนแสดงตัวอย่างรูปก่อนส่ง (จะโผล่มาเมื่อเลือกรูป) */}
  {chatImage && (
    <div style={{ padding: '10px', position: 'relative', display: 'inline-block' }}>
      <img src={chatImage} style={{ width: '80px', borderRadius: '10px', border: '1px solid #ddd' }} />
      <button 
        onClick={() => setChatImage(null)}
        style={{ position: 'absolute', top: 0, right: 0, background: 'red', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer' }}
      >✕</button>
    </div>
  )}

  <form onSubmit={handleSendMessage} style={{ display: 'flex', padding: '12px', gap: '10px', alignItems: 'center' }}>
    <button 
      type="button" 
      onClick={handleVoiceTyping} 
      style={{ 
        cursor: 'pointer', 
        fontSize: '24px',
        background: 'none',
        border: 'none',     
        padding: '0',     
        display: 'flex', 
        alignItems: 'center'
      }}
    >
      🎙️
    </button>

    {/* 📷 ปุ่มเลือกรูปภาพใหม่ */}
    <label style={{ cursor: 'pointer', fontSize: '24px' }}>
      📷
      <input 
        type="file" 
        accept="image/*" 
        style={{ display: 'none' }} 
        onChange={(e) => {
          const file = e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setChatImage(reader.result);
            reader.readAsDataURL(file);
          }
        }} 
      />
    </label>

    <input 
      type="text" 
      value={chatInput} 
      onChange={(e) => setChatInput(e.target.value)} 
      placeholder="พิมพ์ข้อความที่นี่..." 
      style={{ flex: 1, padding: '10px 15px', borderRadius: '25px', border: '1px solid #DDD', outline: 'none' , background: '#ffffff77' , color: '#000' }}
    />

    <button type="submit" style={{ background: '#1976D2', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '25px', fontWeight: 'bold' }}>
      ส่ง
    </button>
  </form>
</div>
</div>
)}

      {/* เมนูด้านล่าง (Bottom Navigation) */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        margin: '0 auto', 
        background: 'white',
        display: 'flex',
        justifyContent: 'space-around',
        padding: '12px 0',
        boxShadow: '0 -4px 15px rgba(0,0,0,0.05)',
        zIndex: 1000,
        borderTopLeftRadius: '20px',
        borderTopRightRadius: '20px',
        borderTop: '1px solid #EEE'
      }}>
        <button onClick={() => setActiveTab('meds')} style={{ flex: 1, background: 'none', border: 'none', color: activeTab === 'meds' ? '#1976D2' : '#999', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
          <span style={{ fontSize: '24px', marginBottom: '4px', transform: activeTab === 'meds' ? 'scale(1.15)' : 'scale(1)', transition: 'transform 0.2s', filter: activeTab === 'meds' ? 'none' : 'grayscale(100%) opacity(0.6)' }}>💊</span>
          <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{username === 'admin' ? 'จัดการยา' : 'หน้ากินยา'}</span>
        </button>
        
        <button onClick={() => setActiveTab('history')} style={{ flex: 1, background: 'none', border: 'none', color: activeTab === 'history' ? '#1976D2' : '#999', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
          <span style={{ fontSize: '24px', marginBottom: '4px', transform: activeTab === 'history' ? 'scale(1.15)' : 'scale(1)', transition: 'transform 0.2s', filter: activeTab === 'history' ? 'none' : 'grayscale(100%) opacity(0.6)' }}>{username === 'admin' ? '📊' : '📓'}</span>
          <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{username === 'admin' ? 'ประวัติ' : 'บันทึกอาการ'}</span>
        </button>

        <button onClick={() => setActiveTab('chat')} style={{ flex: 1, background: 'none', border: 'none', color: activeTab === 'chat' ? '#1976D2' : '#999', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }}>
          <span style={{ fontSize: '24px', marginBottom: '4px', transform: activeTab === 'chat' ? 'scale(1.15)' : 'scale(1)', transition: 'transform 0.2s', filter: activeTab === 'chat' ? 'none' : 'grayscale(100%) opacity(0.6)' }}>💬</span>
          <span style={{ fontSize: '12px', fontWeight: 'bold' }}>แชท</span>
        </button>
      </div>
      
      {zoomedImageUrl && (
  <div 
    style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0,0,0,0.85)', // พื้นหลังดำโปร่งแสง ลอยทับทั้งหน้าจอ
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999, // ✨ สำคัญ: ให้ลอยทับเมนูล่างและทุกๆ อย่าง
      cursor: 'zoom-out' // เปลี่ยนรูป Cursor เมื่อต้องการปิด
    }}
    // ✨ เมื่อคลิกที่พื้นที่ว่างสีดำ ให้ปิดรูปขยาย
    onClick={() => setZoomedImageUrl(null)} 
  >
    {/* ปุ่ม X สำหรับปิด (เผื่อผู้ใช้หาทางปิดไม่เจอ) */}
    <button 
      style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        background: 'white',
        color: '#333',
        border: 'none',
        borderRadius: '50%',
        width: '40px',
        height: '40px',
        fontSize: '20px',
        fontWeight: 'bold',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
      }}
      onClick={() => setZoomedImageUrl(null)}
    >
      ✕
    </button>

    <img 
      src={zoomedImageUrl} 
      alt="รูปยาขยายใหญ่" 
      style={{
        maxWidth: '90%', // กางเต็มจอแต่ไม่เกินขอบ
        maxHeight: '90%',
        borderRadius: '15px',
        boxShadow: '0 5px 25px rgba(0,0,0,0.3)',
        cursor: 'default' // ไม่เปลี่ยน cursor บนตัวรูป
      }} 
      // ✨ ป้องกันการปิดรูปเมื่อเผลอคลิกที่ตัวรูปยา
      onClick={(e) => e.stopPropagation()} 
    />
  </div>
)}

    </div>
  )
}

export default App;