import { useState, useEffect } from 'react'
import Swal from 'sweetalert2'

function App() {
  const [meds, setMeds] = useState([])
  const [newName, setNewName] = useState('')
  const [newTime, setNewTime] = useState('')
  const [targetPatient, setTargetPatient] = useState('') // ✨ สำหรับ Admin ระบุชื่อคนไข้
  const [token, setToken] = useState(localStorage.getItem('token') || '')
  const [username, setUsername] = useState(localStorage.getItem('username') || '')
  const [authUsername, setAuthUsername] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [isLoginMode, setIsLoginMode] = useState(true)

  const API_URL = 'https://yajai-api.onrender.com/api';

  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  })

  // ดึงข้อมูลยา
  const fetchMeds = () => {
    fetch(`${API_URL}/meds`, { headers: getAuthHeaders() })
      .then(res => { if (!res.ok) throw new Error(); return res.json(); })
      .then(data => setMeds(data))
      .catch(() => handleLogout())
  }

  useEffect(() => {
    if (token) fetchMeds();
  }, [token])

  // --- Logic สำหรับ ADMIN (สั่งยาให้คนไข้ระบุชื่อ) ---
  const handleAddMed = (e) => {
    e.preventDefault();
    if (!newName || !newTime || !targetPatient) return Swal.fire('กรุณาระบุชื่อคนไข้ ชื่อยา และเวลา');

    fetch(`${API_URL}/meds`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        name: newName,
        time: newTime,
        patientName: targetPatient // ✨ ส่งชื่อคนไข้ไปให้หลังบ้านบันทึก
      })
    }).then(res => res.json()).then(data => {
      setMeds([...meds, data.medicine]);
      setNewName(''); setNewTime(''); setTargetPatient('');
      Swal.fire('สำเร็จ', `สั่งยาให้คุณ ${targetPatient} เรียบร้อย`, 'success');
    })
  }

  const handleDeleteMed = (id) => {
    Swal.fire({ title: 'ลบรายการยา?', icon: 'warning', showCancelButton: true }).then(res => {
      if (res.isConfirmed) fetch(`${API_URL}/meds/${id}`, { method: 'DELETE', headers: getAuthHeaders() }).then(() => setMeds(meds.filter(m => m.id !== id)))
    })
  }

  // --- Logic สำหรับ USER (กินยา & แจ้งเตือน) ---
  const handleTakeMed = (id) => {
    fetch(`${API_URL}/meds/${id}`, { method: 'PUT', headers: getAuthHeaders() })
      .then(() => {
        setMeds(meds.map(med => med.id === id ? { ...med, status: 'กินแล้ว 💖' } : med));
        Swal.fire({ icon: 'success', title: 'กินยาเรียบร้อย!', timer: 1000, showConfirmButton: false });
      })
  }

  const handleSendLine = () => {
    const total = meds.length;
    const taken = meds.filter(m => m.status === 'กินแล้ว 💖').length;
    const percent = total === 0 ? 0 : Math.round((taken / total) * 100);

    const message = `🔔 รายงานจากแอป YaJai:\nคนไข้: คุณ ${username}\nสถานะ: กินยาแล้ว ${taken}/${total} รายการ (${percent}%)\nส่งเมื่อ: ${new Date().toLocaleTimeString('th-TH')} น.`;

    fetch(`${API_URL}/notify`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ message })
    }).then(() => Swal.fire('ส่งสำเร็จ!', 'ส่งข้อมูลเข้า LINE ผู้ดูแลแล้ว', 'success'))
  }

  // --- ระบบ Auth ---
  const handleAuth = (e) => {
    e.preventDefault()
    fetch(`${API_URL}${isLoginMode ? '/login' : '/register'}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: authUsername, password: authPassword })
    }).then(res => res.json()).then(data => {
      if (data.token) {
        setToken(data.token); setUsername(data.username);
        localStorage.setItem('token', data.token); localStorage.setItem('username', data.username);
      } else { Swal.fire(data.message || 'เกิดข้อผิดพลาด'); }
    })
  }

  const handleLogout = () => {
    setToken(''); setUsername('');
    localStorage.clear(); setMeds([]);
  }

  const totalMeds = meds.length;
  const takenMeds = meds.filter(m => m.status === 'กินแล้ว 💖').length;
  const progressPercent = totalMeds === 0 ? 0 : Math.round((takenMeds / totalMeds) * 100);

  // --- หน้า Login ---
  if (!token) {
    return (
      <div style={{ padding: '20px', maxWidth: '400px', margin: '50px auto', background: '#333', borderRadius: '15px', textAlign: 'center', color: 'white', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
        <h2 style={{ marginBottom: '20px' }}>{isLoginMode ? '🔐 เข้าสู่ระบบ YaJai' : '📝 ลงทะเบียนใหม่'}</h2>
        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input type="text" placeholder="ชื่อผู้ใช้" value={authUsername} onChange={e => setAuthUsername(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: 'none' }} />
          <input type="password" placeholder="รหัสผ่าน" value={authPassword} onChange={e => setAuthPassword(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: 'none' }} />
          <button type="submit" style={{ padding: '12px', background: '#2196F3', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
            {isLoginMode ? 'ล็อกอิน' : 'สมัครสมาชิก'}
          </button>
        </form>
        <p onClick={() => setIsLoginMode(!isLoginMode)} style={{ cursor: 'pointer', color: '#64B5F6', marginTop: '15px', fontSize: '14px' }}>
          {isLoginMode ? 'ยังไม่มีบัญชี? สมัครที่นี่' : 'มีบัญชีแล้ว? กลับไปล็อกอิน'}
        </p>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto', fontFamily: 'sans-serif', color: 'white' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
        <h1 style={{ margin: 0, fontSize: '28px', color: '#90CAF9' }}>YaJai 💊</h1>
        <div style={{ textAlign: 'right' }}>
          <span style={{ marginRight: '10px', fontWeight: 'bold' }}>👤 {username} {username === 'admin' && <span style={{ color: '#FFC107' }}>(Admin)</span>}</span>
          <button onClick={handleLogout} style={{ background: '#ff4d4d', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>ออก</button>
        </div>
      </div>

      {username === 'admin' ? (
        /* ======================== [ ADMIN VIEW ] ======================== */
        <>
          <div style={{ background: '#303f9f', padding: '20px', borderRadius: '15px', marginBottom: '25px', boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }}>
            <h3 style={{ marginTop: 0, color: '#FFC107' }}>➕ สั่งยาให้คนไข้</h3>
            <form onSubmit={handleAddMed} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input type="text" placeholder="ระบุชื่อคนไข้ (เช่น userA)" value={targetPatient} onChange={e => setTargetPatient(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: 'none' }} />
              <input type="text" placeholder="ชื่อยา" value={newName} onChange={e => setNewName(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: 'none' }} />
              <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: 'none' }} />
              <button type="submit" style={{ background: '#FFC107', color: '#333', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>บันทึกลงตารางคนไข้</button>
            </form>
          </div>

          <div style={{ background: '#444', padding: '20px', borderRadius: '15px' }}>
            <h3 style={{ marginTop: 0, color: '#90CAF9' }}>📋 รายการยาทั้งหมดที่สั่ง</h3>
            {meds.length === 0 ? <p style={{ textAlign: 'center', color: '#bbb' }}>ยังไม่ได้สั่งยาให้ใคร</p> :
              meds.map(m => (
                <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #555', padding: '15px 0' }}>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '17px', color: 'white' }}>{m.name} <span style={{ color: '#FFC107', fontSize: '14px' }}>(ให้คุณ {m.owner})</span></div>
                    <div style={{ fontSize: '14px', color: '#bbb' }}>เวลา: {m.time} น. | สถานะ: {m.status}</div>
                  </div>
                  <button onClick={() => handleDeleteMed(m.id)} style={{ background: '#ff5252', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '5px', cursor: 'pointer' }}>ลบ</button>
                </div>
              ))
            }
          </div>
        </>
      ) : (
        /* ======================== [ USER VIEW ] ======================== */
        <>
          <div style={{ background: '#444', padding: '20px', borderRadius: '15px', marginBottom: '25px', boxShadow: '0 4px 15px rgba(0,0,0,0.3)', textAlign: 'center' }}>
            <h3 style={{ marginTop: 0, color: 'white' }}>📊 ความคืบหน้าการกินยา</h3>
            <div style={{ background: '#222', height: '22px', borderRadius: '11px', overflow: 'hidden', margin: '15px 0' }}>
              <div style={{ width: `${progressPercent}%`, background: '#4CAF50', height: '100%', transition: '0.8s ease-in-out' }}></div>
            </div>
            <p style={{ fontWeight: 'bold', color: '#81C784', fontSize: '20px', margin: '10px 0' }}>{progressPercent}% <span style={{ fontSize: '14px', color: 'white' }}>(กินแล้ว {takenMeds}/{totalMeds})</span></p>
            <button onClick={handleSendLine} style={{ width: '100%', background: '#00B900', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px', fontSize: '16px' }}>📱 ส่งรายงานเข้า LINE ผู้ดูแล</button>
          </div>

          <div style={{ background: '#444', padding: '20px', borderRadius: '15px' }}>
            <h3 style={{ marginTop: 0, color: '#90CAF9' }}>💊 รายการยาที่คุณต้องกิน</h3>
            {meds.length === 0 ? <p style={{ textAlign: 'center', color: '#bbb' }}>ไม่มีรายการยา (รอผู้ดูแลสั่งยาให้)</p> :
              {/* ก๊อปส่วนนี้ไปวางทับใน App.jsx ตรงส่วนที่ Error นะครับ */ }
meds.map(m => (
            <div key={m.id} style={{ background: '#333', padding: '15px', borderRadius: '12px', marginBottom: '12px', borderLeft: m.status === 'กินแล้ว 💖' ? '6px solid #4CAF50' : '6px solid #FF9800' }}>
              <div style={{ fontWeight: 'bold', fontSize: '19px', color: 'white' }}>{m.name} <span style={{ float: 'right', fontSize: '15px', color: '#90CAF9' }}>🕒 {m.time} น.</span></div>
              <div style={{ color: m.status === 'กินแล้ว 💖' ? '#81C784' : '#FFB74D', margin: '10px 0', fontSize: '15px', fontWeight: '500' }}>สถานะ: {m.status}</div>
              <button
                onClick={() => handleTakeMed(m.id)}
                disabled={m.status === 'กินแล้ว 💖'}
                style={{ width: '100%', padding: '12px', background: m.status === 'กินแล้ว 💖' ? '#555' : '#4CAF50', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: m.status === 'กินแล้ว 💖' ? 'default' : 'pointer', fontSize: '16px' }}>
                {m.status === 'กินแล้ว 💖' ? 'กินยาแล้วเรียบร้อย' : 'กดเพื่อยืนยันการกินยา'}
              </button>
            </div>
            ))