import { useState, useEffect } from 'react'
import Swal from 'sweetalert2' 

function App() {
  const [meds, setMeds] = useState([])
  const [newName, setNewName] = useState('')
  const [newTime, setNewTime] = useState('')
  const [targetPatient, setTargetPatient] = useState('')
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

  const fetchMeds = () => {
    fetch(`${API_URL}/meds`, { headers: getAuthHeaders() })
      .then(res => { if (!res.ok) throw new Error(); return res.json(); })
      .then(data => setMeds(data))
      .catch(() => handleLogout())
  }

  useEffect(() => {
    if (token) fetchMeds();
  }, [token])

  const handleAddMed = (e) => {
    e.preventDefault();
    if (!newName || !newTime || !targetPatient) return Swal.fire('กรุณาระบุชื่อคนไข้ ชื่อยา และเวลา');
    
    fetch(`${API_URL}/meds`, { 
      method: 'POST', 
      headers: getAuthHeaders(), 
      body: JSON.stringify({ 
        name: newName, 
        time: newTime, 
        patientName: targetPatient.trim() 
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
    fetch(`${API_URL}/notify`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ message }) })
      .then(() => Swal.fire('ส่งสำเร็จ!', 'ส่งข้อมูลเข้า LINE ผู้ดูแลแล้ว', 'success'))
  }

  const handleAuth = (e) => {
    e.preventDefault()
    fetch(`${API_URL}${isLoginMode ? '/login' : '/register'}`, { 
      method: 'POST', headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ username: authUsername, password: authPassword }) 
    }).then(res => res.json()).then(data => {
      if (data.token) { 
        setToken(data.token); setUsername(data.username); 
        localStorage.setItem('token', data.token); localStorage.setItem('username', data.username); 
      } else { Swal.fire(data.message || 'เกิดข้อผิดพลาด'); }
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
        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input type="text" placeholder="ชื่อผู้ใช้" value={authUsername} onChange={e => setAuthUsername(e.target.value)} style={{ padding: '12px', borderRadius: '8px' }} />
          <input type="password" placeholder="รหัสผ่าน" value={authPassword} onChange={e => setAuthPassword(e.target.value)} style={{ padding: '12px', borderRadius: '8px' }} />
          <button type="submit" style={{ padding: '12px', background: '#2196F3', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>{isLoginMode ? 'ล็อกอิน' : 'สมัคร'}</button>
        </form>
        <p onClick={() => setIsLoginMode(!isLoginMode)} style={{ cursor: 'pointer', color: '#64B5F6', marginTop: '15px' }}>{isLoginMode ? 'สร้างบัญชีใหม่' : 'มีบัญชีแล้ว'}</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto', fontFamily: 'sans-serif', color: 'white' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
        <h1 style={{ margin: 0, color: '#90CAF9' }}>YaJai 💊</h1>
        <div style={{ textAlign: 'right' }}>
          <span style={{ marginRight: '10px' }}>👤 {username} {username === 'admin' && '(Admin)'}</span>
          <button onClick={handleLogout} style={{ background: '#ff4d4d', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px' }}>ออก</button>
        </div>
      </div>

      {username === 'admin' ? (
        <>
          <div style={{ background: '#303f9f', padding: '20px', borderRadius: '15px', marginBottom: '20px' }}>
            <h3 style={{ marginTop: 0 }}>➕ สั่งยาให้คนไข้</h3>
            <form onSubmit={handleAddMed} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input type="text" placeholder="ชื่อคนไข้ (เช่น userA)" value={targetPatient} onChange={e => setTargetPatient(e.target.value)} style={{ padding: '10px', borderRadius: '5px' }} />
              <input type="text" placeholder="ชื่อยา" value={newName} onChange={e => setNewName(e.target.value)} style={{ padding: '10px', borderRadius: '5px' }} />
              <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} style={{ padding: '10px', borderRadius: '5px' }} />
              <button type="submit" style={{ background: '#FFC107', color: '#333', padding: '10px', border: 'none', borderRadius: '5px', fontWeight: 'bold' }}>บันทึก</button>
            </form>
          </div>
          <div style={{ background: '#444', padding: '20px', borderRadius: '15px' }}>
            <h3>📋 รายการยาที่สั่ง</h3>
            {meds.map(m => (
              <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #555', padding: '10px 0' }}>
                <div><b>{m.name}</b> (ให้ {m.owner}) - {m.time}</div>
                <button onClick={() => handleDeleteMed(m.id)} style={{ background: '#ff5252', color: 'white', border: 'none', borderRadius: '5px', padding: '5px' }}>ลบ</button>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div style={{ background: '#444', padding: '20px', borderRadius: '15px', marginBottom: '20px', textAlign: 'center' }}>
            <h3>📊 สรุปการกินยา</h3>
            <div style={{ background: '#222', height: '20px', borderRadius: '10px', overflow: 'hidden', margin: '15px 0' }}>
              <div style={{ width: `${progressPercent}%`, background: '#4CAF50', height: '100%' }}></div>
            </div>
            <p style={{ color: '#81C784', fontWeight: 'bold' }}>{progressPercent}% (กินแล้ว {takenMeds}/{totalMeds})</p>
            <button onClick={handleSendLine} style={{ width: '100%', background: '#00B900', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold' }}>📱 ส่งรายงานเข้า LINE</button>
          </div>
          <div style={{ background: '#444', padding: '20px', borderRadius: '15px' }}>
            <h3>💊 รายการยาของคุณ</h3>
            {meds.length === 0 ? <p style={{ textAlign: 'center', color: '#bbb' }}>ไม่มีรายการยา</p> : 
              meds.map(m => (
                <div key={m.id} style={{ background: '#333', padding: '15px', borderRadius: '10px', marginBottom: '10px', borderLeft: m.status === 'กินแล้ว 💖' ? '6px solid #4CAF50' : '6px solid #FF9800' }}>
                  <div style={{ fontWeight: 'bold' }}>{m.name} <span style={{ float: 'right' }}>🕒 {m.time} น.</span></div>
                  <div style={{ margin: '10px 0', color: m.status === 'กินแล้ว 💖' ? '#81C784' : '#FFB74D' }}>{m.status}</div>
                  <button onClick={() => handleTakeMed(m.id)} disabled={m.status === 'กินแล้ว 💖'} style={{ width: '100%', padding: '10px', background: m.status === 'กินแล้ว 💖' ? '#555' : '#4CAF50', color: 'white', border: 'none', borderRadius: '5px' }}>
                    {m.status === 'กินแล้ว 💖' ? 'กินแล้ว' : 'กดเมื่อกินยา'}
                  </button>
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