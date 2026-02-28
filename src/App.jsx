import { useState, useEffect } from 'react'
import Swal from 'sweetalert2' 

function App() {
  const [meds, setMeds] = useState([])
  const [newName, setNewName] = useState('')
  const [newTime, setNewTime] = useState('')
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

  useEffect(() => {
    if (token && username !== 'admin') {
      fetch(`${API_URL}/meds`, { headers: getAuthHeaders() })
        .then(res => { if (!res.ok) throw new Error(); return res.json(); })
        .then(data => setMeds(data))
        .catch(() => handleLogout())
    }
  }, [token, username])

  const handleTakeMed = (id) => {
    fetch(`${API_URL}/meds/${id}`, { method: 'PUT', headers: getAuthHeaders() })
      .then(() => setMeds(meds.map(med => med.id === id ? { ...med, status: 'กินแล้ว 💖' } : med)))
  }

  const handleDeleteMed = (id) => {
    Swal.fire({ title: 'ลบยานี้?', icon: 'warning', showCancelButton: true }).then(res => {
      if (res.isConfirmed) fetch(`${API_URL}/meds/${id}`, { method: 'DELETE', headers: getAuthHeaders() }).then(() => setMeds(meds.filter(m => m.id !== id)))
    })
  }

  const handleAddMed = (e) => {
    e.preventDefault();
    if (!newName || !newTime) return Swal.fire('กรอกข้อมูลให้ครบ');
    fetch(`${API_URL}/meds`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ name: newName, time: newTime }) })
      .then(res => res.json()).then(data => { setMeds([...meds, data.medicine]); setNewName(''); setNewTime(''); })
  }

  const handleResetDay = () => {
    Swal.fire({ title: 'เริ่มวันใหม่?', icon: 'question', showCancelButton: true }).then(res => {
      if (res.isConfirmed) fetch(`${API_URL}/meds-reset`, { method: 'PUT', headers: getAuthHeaders() }).then(() => setMeds(meds.map(m => ({ ...m, status: 'ยังไม่ได้กิน' }))))
    })
  }

  const handleSendLine = () => {
    const message = `🔔 แจ้งเตือนจากแอป YaJai:\nผู้ป่วยชื่อ: คุณ ${username}\nกินยาไปแล้ว ${takenMeds}/${totalMeds} รายการ (${progressPercent}%)`;
    fetch(`${API_URL}/notify`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ message }) })
      .then(() => Swal.fire('ส่งสำเร็จ!', 'รายงานไปถึงผู้ดูแลใน LINE แล้ว', 'success'))
  }

  const handleAuth = (e) => {
    e.preventDefault()
    fetch(`${API_URL}${isLoginMode ? '/login' : '/register'}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: authUsername, password: authPassword }) })
      .then(res => res.json()).then(data => {
        if (data.token) { setToken(data.token); setUsername(data.username); localStorage.setItem('token', data.token); localStorage.setItem('username', data.username); }
        else { Swal.fire(data.message); if (!isLoginMode) setIsLoginMode(true); }
      })
  }

  const handleLogout = () => { setToken(''); setUsername(''); localStorage.clear(); setMeds([]); }

  const totalMeds = meds.length;
  const takenMeds = meds.filter(m => m.status === 'กินแล้ว 💖').length;
  const progressPercent = totalMeds === 0 ? 0 : Math.round((takenMeds / totalMeds) * 100);

  if (!token) {
    return (
      <div style={{ padding: '20px', maxWidth: '400px', margin: '50px auto', background: '#333', borderRadius: '15px', textAlign: 'center', color: 'white' }}>
        <h2>{isLoginMode ? '🔐 เข้าสู่ระบบ' : '📝 สมัครสมาชิก'}</h2>
        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input type="text" placeholder="Username" value={authUsername} onChange={e => setAuthUsername(e.target.value)} style={{ padding: '10px', borderRadius: '5px' }} />
          <input type="password" placeholder="Password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} style={{ padding: '10px', borderRadius: '5px' }} />
          <button type="submit" style={{ padding: '10px', background: '#2196F3', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>ตกลง</button>
        </form>
        <p onClick={() => setIsLoginMode(!isLoginMode)} style={{ cursor: 'pointer', color: '#64B5F6', marginTop: '10px' }}>{isLoginMode ? 'สมัครสมาชิก' : 'ล็อกอิน'}</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto', fontFamily: 'sans-serif', color: 'white' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ margin: 0 }}>แอป YaJai 💊</h1>
        <div style={{ textAlign: 'right' }}>
          <span style={{ marginRight: '10px', fontWeight: 'bold' }}>👤 {username}</span>
          <button onClick={handleLogout} style={{ background: '#ff4d4d', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer' }}>ออก</button>
        </div>
      </div>

      {username === 'admin' ? (
        <div style={{ background: '#444', padding: '30px', borderRadius: '15px', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', color: 'white' }}>
          <h2 style={{ color: '#64B5F6', marginBottom: '20px' }}>👨‍⚕️ ระบบจัดการผู้ดูแล</h2>
          <div style={{ background: '#222', padding: '20px', borderRadius: '12px', border: '2px dashed #64B5F6' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#64B5F6' }}>📢 สถานะการเชื่อมต่อ</h4>
            <div style={{ fontSize: '14px', textAlign: 'left', lineHeight: '1.6' }}>
              <p>✅ <b style={{color: '#90CAF9'}}>LINE Bot:</b> เชื่อมต่อที่รหัส <code>@518bjstm</code></p>
              <p>✅ <b style={{color: '#90CAF9'}}>Database:</b> Cloud Online</p>
              <p>✅ <b style={{color: '#90CAF9'}}>Server:</b> Render Active</p>
            </div>
          </div>
          <p style={{ marginTop: '20px', fontSize: '14px', color: '#ccc' }}>กำลังรอรับรายงานการกินยาผ่าน LINE</p>
          <button onClick={() => Swal.fire('ข้อมูลผู้ใช้', 'ระบบเชื่อมต่อสำเร็จ!', 'info')} style={{ background: '#2196F3', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', marginTop: '10px', fontWeight: 'bold' }}>ตรวจสอบฐานข้อมูล</button>
        </div>
      ) : (
        <>
          <div style={{ background: '#444', padding: '20px', borderRadius: '10px', marginBottom: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, color: 'white' }}>📊 สรุปวันนี้</h3>
              <div style={{ display: 'flex', gap: '5px' }}>
                <button onClick={handleResetDay} style={{ background: '#FF9800', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '5px', fontSize: '12px', cursor: 'pointer' }}>🌅 รีเซ็ต</button>
                <button onClick={handleSendLine} style={{ background: '#00B900', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '5px', fontSize: '12px', cursor: 'pointer' }}>📱 LINE</button>
              </div>
            </div>
            <div style={{ background: '#222', height: '15px', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ width: `${progressPercent}%`, background: '#4CAF50', height: '100%', transition: '0.5s' }}></div>
            </div>
            <p style={{ textAlign: 'center', margin: '10px 0 0 0', fontWeight: 'bold', color: '#81C784' }}>กินยาแล้ว {takenMeds}/{totalMeds} ({progressPercent}%)</p>
          </div>

          <div style={{ background: '#303f9f', padding: '15px', borderRadius: '10px', marginBottom: '20px' }}>
            <h3 style={{ marginTop: 0, color: 'white' }}>➕ เพิ่มยาใหม่</h3>
            <form onSubmit={handleAddMed} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <input type="text" placeholder="ชื่อยา" value={newName} onChange={e => setNewName(e.target.value)} style={{ padding: '10px', borderRadius: '5px', border: 'none' }} />
              <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} style={{ padding: '10px', borderRadius: '5px', border: 'none' }} />
              <button type="submit" style={{ background: '#FFC107', color: '#333', border: 'none', padding: '12px', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>บันทึกยา</button>
            </form>
          </div>

          <div style={{ background: '#444', padding: '15px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
            <h3 style={{ marginTop: 0, color: 'white' }}>💊 รายการยาของคุณ</h3>
            {meds.length === 0 ? <p style={{ textAlign: 'center', color: '#bbb' }}>ยังไม่มีรายการยาครับ 💊</p> : 
              meds.map(m => (
                <div key={m.id} style={{ borderBottom: '1px solid #555', padding: '12px 0' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '17px', color: 'white' }}>{m.name} <span style={{ float: 'right', color: '#bbb' }}>🕒 {m.time}</span></div>
                  <div style={{ color: m.status === 'กินแล้ว 💖' ? '#81C784' : '#FFB74D', fontSize: '14px', margin: '5px 0' }}>{m.status}</div>
                  <button onClick={() => handleTakeMed(m.id)} disabled={m.status === 'กินแล้ว 💖'} style={{ width: '100%', padding: '8px', background: m.status === 'กินแล้ว 💖' ? '#666' : '#4CAF50', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>กินแล้ว</button>
                  <button onClick={() => handleDeleteMed(m.id)} style={{ width: '100%', marginTop: '5px', background: 'none', color: '#ff8a80', border: 'none', fontSize: '12px', cursor: 'pointer' }}>ลบรายการนี้</button>
                </div>
              ))
            }
          </div>
        </>
      )}
    </div>
  )
}
export default App