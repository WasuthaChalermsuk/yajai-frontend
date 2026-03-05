import { useState, useEffect } from 'react'
import Swal from 'sweetalert2' 

const PUBLIC_VAPID_KEY = 'BOSDiwWnjtEkd-PimXzb_PeyTJpX1J9KARBfm_mYwVDLL-3oJ8wBU2Vvwce4FTRHl1dDokD0096qeSlcJbSeE88';

// ฟังก์ชันแปลงกุญแจให้เป็นภาษาที่เบราว์เซอร์เข้าใจ
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
  const [showHistory, setShowHistory] = useState(false)
  const [pushEnabled, setPushEnabled] = useState(Notification.permission === 'granted') // เช็คว่าเปิดแจ้งเตือนหรือยัง

  const [newName, setNewName] = useState('')
  const [newTime, setNewTime] = useState('')
  const [newMeal, setNewMeal] = useState('เช้า')
  const [targetPatient, setTargetPatient] = useState('')
  const [token, setToken] = useState(localStorage.getItem('token') || '')
  const [username, setUsername] = useState(localStorage.getItem('username') || '')
  const [authUsername, setAuthUsername] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [isLoginMode, setIsLoginMode] = useState(true)

  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editTime, setEditTime] = useState('')
  const [editMeal, setEditMeal] = useState('เช้า')
  const [filterPatient, setFilterPatient] = useState('') 

  const API_URL = 'https://yajai-api.onrender.com/api'; 
  const getAuthHeaders = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` })

  const fetchMeds = () => {
    fetch(`${API_URL}/meds`, { headers: getAuthHeaders() }).then(res => { if (!res.ok) throw new Error(); return res.json(); }).then(data => setMeds(data)).catch(() => handleLogout())
  }
  const fetchPatients = () => { fetch(`${API_URL}/users`, { headers: getAuthHeaders() }).then(res => res.json()).then(data => { if(Array.isArray(data)) setPatients(data); }) }
  const fetchHistory = () => { fetch(`${API_URL}/history`, { headers: getAuthHeaders() }).then(res => res.json()).then(data => setHistory(data)); }

  useEffect(() => { 
    if (token) { fetchMeds(); fetchHistory(); if (username === 'admin') fetchPatients(); } 
  }, [token, username])

  // ✨ 🟢 ฟังก์ชันขออนุญาตแจ้งเตือน
  const handleEnablePush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return Swal.fire('เสียใจด้วย', 'เบราว์เซอร์ของคุณไม่รองรับการแจ้งเตือน', 'error');
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
        try {
          // 1. สั่งลงทะเบียน Service Worker
          await navigator.serviceWorker.register('/sw.js');
          
          // ✨ 2. (เพิ่มใหม่) สั่งให้ระบบ "รอ" จนกว่ายามจะพร้อมทำงาน 100%
          const readySw = await navigator.serviceWorker.ready;
          
          // 3. เปลี่ยนมาใช้ readySw ในการ subscribe
          const subscription = await readySw.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
          });
          
          // ส่งข้อมูลไปเซฟที่หลังบ้าน
          await fetch(`${API_URL}/subscribe`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(subscription) });
          setPushEnabled(true);
          Swal.fire('สำเร็จ', 'เปิดรับการแจ้งเตือนแล้ว! เวลามียาใหม่จะเด้งเตือนทันที', 'success');
        } catch (err) { 
          console.error(err); 
          Swal.fire('พังตรงนี้!', String(err), 'error'); 
        }
    } else { Swal.fire('ถูกปฏิเสธ', 'คุณไม่อนุญาตให้แอปส่งการแจ้งเตือน', 'warning'); }
  }

  const handleAddMed = (e) => {
    e.preventDefault();
    if (!newName || !newTime || !targetPatient) return Swal.fire('กรุณากรอกข้อมูลให้ครบ');
    fetch(`${API_URL}/meds`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ name: newName, time: newTime, meal: newMeal, patientName: targetPatient }) 
    }).then(res => res.json()).then(data => { 
      setMeds([...meds, data.medicine]); setNewName(''); setNewTime(''); setNewMeal('เช้า');
      Swal.fire('สำเร็จ', `สั่งยาให้คุณ ${targetPatient} เรียบร้อย (ระบบส่งแจ้งเตือนไปที่มือถือคนไข้แล้ว)`, 'success');
    })
  }

  const handleDeleteMed = (id) => { Swal.fire({ title: 'ลบรายการยา?', icon: 'warning', showCancelButton: true }).then(res => { if (res.isConfirmed) fetch(`${API_URL}/meds/${id}`, { method: 'DELETE', headers: getAuthHeaders() }).then(() => setMeds(meds.filter(m => m.id !== id))) }) }
  const startEdit = (med) => { setEditingId(med.id); setEditName(med.name); setEditTime(med.time); setEditMeal(med.meal || 'เช้า'); }
  const handleSaveEdit = (id) => { fetch(`${API_URL}/meds/edit/${id}`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify({ name: editName, time: editTime, meal: editMeal }) }).then(res => res.json()).then(updatedMed => { setMeds(meds.map(m => m.id === id ? updatedMed : m)); setEditingId(null); Swal.fire({ icon: 'success', title: 'อัปเดตยาเรียบร้อย', timer: 1000, showConfirmButton: false }); }) }
  const handleTakeMed = (id) => { fetch(`${API_URL}/meds/${id}`, { method: 'PUT', headers: getAuthHeaders() }).then(() => { setMeds(meds.map(med => med.id === id ? { ...med, status: 'กินแล้ว 💖' } : med)); Swal.fire({ icon: 'success', title: 'เยี่ยมมาก!', timer: 1000, showConfirmButton: false }); }) }
  const handleResetMeds = () => { Swal.fire({ title: 'เริ่มวันใหม่?', text: "สถานะยาจะกลับเป็น 'ยังไม่ได้กิน'", icon: 'question', showCancelButton: true }).then(res => { if (res.isConfirmed) { fetch(`${API_URL}/meds/reset/all`, { method: 'PUT', headers: getAuthHeaders() }).then(() => { fetchMeds(); Swal.fire('สำเร็จ', 'รีเซ็ตสถานะแล้ว', 'success'); }) } }) }

  const handleAuth = (e) => {
    e.preventDefault()
    fetch(`${API_URL}${isLoginMode ? '/login' : '/register'}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: authUsername, password: authPassword }) })
    .then(res => res.json()).then(data => { if (data.token) { setToken(data.token); setUsername(data.username); localStorage.setItem('token', data.token); localStorage.setItem('username', data.username); } else { Swal.fire(data.message || 'เกิดข้อผิดพลาด'); } })
  }
  const handleLogout = () => { setToken(''); setUsername(''); localStorage.clear(); setMeds([]); setFilterPatient(''); setShowHistory(false); setPushEnabled(false); }

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
        <h1 style={{ margin: 0, color: '#90CAF9' }}>YaJai 💊</h1>
        <div style={{ textAlign: 'right' }}>
          <span style={{ marginRight: '10px' }}>👤 {username} {username === 'admin' && '(Admin)'}</span>
          <button onClick={handleLogout} style={{ background: '#ff4d4d', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px' }}>ออก</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button onClick={() => setShowHistory(false)} style={{ flex: 1, padding: '10px', background: !showHistory ? '#2196F3' : '#555', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>💊 {username === 'admin' ? 'จัดการยา' : 'หน้ากินยา'}</button>
        <button onClick={() => setShowHistory(true)} style={{ flex: 1, padding: '10px', background: showHistory ? '#2196F3' : '#555', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>📊 ประวัติ</button>
      </div>

      {showHistory ? (
        <div style={{ background: '#444', padding: '20px', borderRadius: '15px' }}>
          <h3 style={{ marginTop: 0 }}>📊 ประวัติการกินยาย้อนหลัง</h3>
          {history.length === 0 ? <p style={{ color: '#bbb' }}>ยังไม่มีประวัติการกินยา</p> : 
            history.map((h, index) => (
              <div key={index} style={{ background: '#333', padding: '15px', borderRadius: '10px', marginBottom: '10px', borderLeft: h.percent === 100 ? '6px solid #4CAF50' : '6px solid #FF9800' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}><b>📅 {h.date}</b>{username === 'admin' && <span style={{ color: '#90CAF9' }}>คุณ {h.owner}</span>}</div>
                <div>กินยาแล้ว: {h.taken}/{h.total} รายการ <b style={{ float: 'right', color: h.percent === 100 ? '#4CAF50' : '#FFC107' }}>{h.percent}%</b></div>
              </div>
            ))
          }
        </div>
      ) : (
        username === 'admin' ? (
          <>
            <div style={{ background: '#303f9f', padding: '20px', borderRadius: '15px', marginBottom: '20px' }}>
              <h3 style={{ marginTop: 0 }}>➕ สั่งยาให้คนไข้</h3>
              <form onSubmit={handleAddMed} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <select value={targetPatient} onChange={e => setTargetPatient(e.target.value)} style={{ padding: '10px', borderRadius: '5px' }}>
                  <option value="">-- เลือกคนไข้ --</option>{patients.map(p => <option key={p} value={p}>คุณ {p}</option>)}
                </select>
                <input type="text" placeholder="ชื่อยา" value={newName} onChange={e => setNewName(e.target.value)} style={{ padding: '10px', borderRadius: '5px' }} />
                <div style={{ display: 'flex', gap: '10px' }}>
                  <select value={newMeal} onChange={e => setNewMeal(e.target.value)} style={{ padding: '10px', borderRadius: '5px', flex: 1 }}>{mealsCategory.map(meal => <option key={meal} value={meal}>มื้อ{meal}</option>)}</select>
                  <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} style={{ padding: '10px', borderRadius: '5px', flex: 1 }} />
                </div>
                <button type="submit" style={{ background: '#FFC107', color: '#333', padding: '10px', border: 'none', borderRadius: '5px', fontWeight: 'bold' }}>บันทึก</button>
              </form>
            </div>
            
            <div style={{ background: '#444', padding: '20px', borderRadius: '15px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><h3 style={{ margin: 0 }}>📋 จัดการยาทั้งหมด</h3><button onClick={handleResetMeds} style={{ background: '#2196F3', color: 'white', border: 'none', padding: '8px', borderRadius: '5px' }}>🔄 เริ่มวันใหม่</button></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#555', padding: '10px', borderRadius: '8px' }}><span style={{ fontSize: '14px' }}>🔍 กรองดูคนไข้:</span><select value={filterPatient} onChange={e => setFilterPatient(e.target.value)} style={{ padding: '6px', borderRadius: '5px', flex: 1 }}><option value="">-- ดูทุกคน --</option>{patients.map(p => <option key={p} value={p}>คุณ {p}</option>)}</select></div>
              </div>
              {filteredAdminMeds.length === 0 ? <p style={{ textAlign: 'center', color: '#bbb' }}>ไม่มีรายการยา</p> : (
                filteredAdminMeds.map(m => (
                  <div key={m.id} style={{ borderBottom: '1px solid #555', padding: '15px 0' }}>
                    {editingId === m.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}><input type="text" value={editName} onChange={e => setEditName(e.target.value)} style={{ padding: '8px' }}/><div style={{ display: 'flex', gap: '5px' }}><select value={editMeal} onChange={e => setEditMeal(e.target.value)} style={{ padding: '8px', flex: 1 }}><option value="เช้า">มื้อเช้า</option><option value="กลางวัน">มื้อกลางวัน</option><option value="เย็น">มื้อเย็น</option><option value="ก่อนนอน">มื้อก่อนนอน</option></select><input type="time" value={editTime} onChange={e => setEditTime(e.target.value)} style={{ padding: '8px', flex: 1 }}/></div><div style={{ display: 'flex', gap: '5px' }}><button onClick={() => handleSaveEdit(m.id)} style={{ flex: 1, background: '#4CAF50', color: 'white', padding: '8px', border: 'none', borderRadius: '5px' }}>บันทึก</button><button onClick={() => setEditingId(null)} style={{ flex: 1, background: '#888', color: 'white', padding: '8px', border: 'none', borderRadius: '5px' }}>ยกเลิก</button></div></div>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div><b>{m.name}</b> <span style={{ color: '#bbb', fontSize: '14px' }}>(ของ: {m.owner})</span> <br/><span style={{ fontSize: '14px', color: '#90CAF9' }}>มื้อ{m.meal || 'เช้า'} - {m.time} น.</span> <br/><span style={{ fontSize: '13px', color: m.status === 'กินแล้ว 💖' ? '#4CAF50' : '#FF9800' }}>{m.status}</span></div><div style={{ display: 'flex', gap: '5px', flexDirection: 'column' }}><button onClick={() => startEdit(m)} style={{ background: '#FFC107', border: 'none', borderRadius: '5px', padding: '5px 15px' }}>✏️ แก้ไข</button><button onClick={() => handleDeleteMed(m.id)} style={{ background: '#ff5252', color: 'white', border: 'none', borderRadius: '5px', padding: '5px 15px' }}>🗑️ ลบ</button></div></div>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <>
            {/* ✨ ปุ่มเปิดแจ้งเตือนสำหรับคนไข้ */}
            {!pushEnabled && (
              <div style={{ background: '#FF9800', padding: '15px', borderRadius: '10px', marginBottom: '20px', textAlign: 'center', color: 'white' }}>
                <p style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>แอปนี้สามารถแจ้งเตือนเวลามียาใหม่ได้</p>
                <button onClick={handleEnablePush} style={{ background: '#333', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>🔔 เปิดรับการแจ้งเตือน</button>
              </div>
            )}
            
            {mealsCategory.map(mealName => {
              const medsInThisMeal = meds.filter(m => (m.meal || 'เช้า') === mealName);
              if (medsInThisMeal.length === 0) return null; 
              return (
                <div key={mealName} style={{ background: '#444', padding: '15px', borderRadius: '15px', marginBottom: '15px' }}>
                  <h3 style={{ margin: '0 0 15px 0', color: '#FFC107', borderBottom: '2px solid #555', paddingBottom: '10px' }}>🍽️ ยามื้อ{mealName}</h3>
                  {medsInThisMeal.map(m => (
                    <div key={m.id} style={{ background: '#333', padding: '15px', borderRadius: '10px', marginBottom: '10px', borderLeft: m.status === 'กินแล้ว 💖' ? '6px solid #4CAF50' : '6px solid #FF9800' }}>
                      <div style={{ fontWeight: 'bold' }}>{m.name} <span style={{ float: 'right' }}>🕒 {m.time} น.</span></div>
                      <div style={{ margin: '10px 0', color: m.status === 'กินแล้ว 💖' ? '#81C784' : '#FFB74D' }}>{m.status}</div>
                      <button onClick={() => handleTakeMed(m.id)} disabled={m.status === 'กินแล้ว 💖'} style={{ width: '100%', padding: '10px', background: m.status === 'กินแล้ว 💖' ? '#555' : '#4CAF50', color: 'white', border: 'none', borderRadius: '5px' }}>{m.status === 'กินแล้ว 💖' ? '✅ กินแล้ว' : 'กดเมื่อกินยา'}</button>
                    </div>
                  ))}
                </div>
              )
            })}
            {meds.length === 0 && <p style={{ textAlign: 'center', color: '#bbb' }}>ไม่มียาที่ต้องกินวันนี้ 🎉</p>}
          </>
        )
      )}
    </div>
  )
}

export default App