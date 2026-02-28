import { useState, useEffect } from 'react'

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

  // ✨ สร้าง Headers ที่แนบ Token ไว้ใช้ตอนยิง API
  const getAuthHeaders = () => {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}` // <--- ยื่นตั๋วให้ยามดูตรงนี้!
    }
  }

  useEffect(() => {
    if (token) {
      fetch(`${API_URL}/meds`, { headers: getAuthHeaders() }) // ✨ แนบ Headers
        .then(res => {
          if (!res.ok) throw new Error('Token อาจจะหมดอายุ');
          return res.json();
        })
        .then(data => setMeds(data))
        .catch(err => {
          console.log("กรุณาล็อกอินใหม่", err);
          handleLogout(); // ถ้าตั๋วมีปัญหา ให้เด้งออกไปหน้าล็อกอิน
        })
    }
  }, [token])

  const handleTakeMed = (id) => {
    fetch(`${API_URL}/meds/${id}`, { 
      method: 'PUT',
      headers: getAuthHeaders() // ✨ แนบ Headers
    })
      .then(res => res.json())
      .then(() => {
        setMeds(meds.map(med => med.id === id ? { ...med, status: 'กินแล้ว 💖' } : med))
      })
  }

  const handleDeleteMed = (id) => {
    if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบยานี้? 🗑️')) {
      fetch(`${API_URL}/meds/${id}`, { 
        method: 'DELETE',
        headers: getAuthHeaders() // ✨ แนบ Headers
      })
        .then(res => res.json())
        .then(() => {
          setMeds(meds.filter(med => med.id !== id));
        })
        .catch(err => console.log("ลบไม่ได้:", err));
    }
  }

  const handleAddMed = (e) => {
    e.preventDefault();
    if (!newName || !newTime) return alert('กรุณากรอกชื่อยาและเวลาให้ครบถ้วน!');

    fetch(`${API_URL}/meds`, {
      method: 'POST',
      headers: getAuthHeaders(), // ✨ แนบ Headers
      body: JSON.stringify({ name: newName, time: newTime })
    })
      .then(res => res.json())
      .then(data => {
        setMeds([...meds, data.medicine])
        setNewName('')
        setNewTime('')
      })
  }

  const handleAuth = (e) => {
    e.preventDefault()
    const endpoint = isLoginMode ? '/login' : '/register'
    
    fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: authUsername, password: authPassword })
    })
    .then(res => res.json())
    .then(data => {
      if (data.token) {
        setToken(data.token)
        setUsername(data.username)
        localStorage.setItem('token', data.token)
        localStorage.setItem('username', data.username)
        setAuthUsername('')
        setAuthPassword('')
      } else {
        alert(data.message)
        if (!isLoginMode && data.message === 'สมัครสมาชิกสำเร็จ!') {
          setIsLoginMode(true)
        }
      }
    })
    .catch(err => alert('เชื่อมต่อระบบสมาชิกไม่ได้'))
  }

  const handleLogout = () => {
    if (window.confirm('ต้องการออกจากระบบใช่หรือไม่?')) {
      setToken('')
      setUsername('')
      localStorage.removeItem('token')
      localStorage.removeItem('username')
      setMeds([])
    }
  }

  if (!token) {
    return (
      <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '400px', margin: '50px auto', background: 'white', borderRadius: '10px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
        <h2 style={{ textAlign: 'center', color: '#333', marginTop: 0 }}>
          {isLoginMode ? '🔐 เข้าสู่ระบบ YaJai' : '📝 สมัครสมาชิกใหม่'}
        </h2>
        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input type="text" placeholder="ชื่อผู้ใช้ (Username)" value={authUsername} onChange={e => setAuthUsername(e.target.value)} required style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc', fontSize: '16px' }} />
          <input type="password" placeholder="รหัสผ่าน (Password)" value={authPassword} onChange={e => setAuthPassword(e.target.value)} required style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc', fontSize: '16px' }} />
          <button type="submit" style={{ background: isLoginMode ? '#4CAF50' : '#2196F3', color: 'white', padding: '12px', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}>
            {isLoginMode ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: '15px', cursor: 'pointer', color: '#0066cc', textDecoration: 'underline' }} onClick={() => setIsLoginMode(!isLoginMode)}>
          {isLoginMode ? 'ยังไม่มีบัญชี? สมัครสมาชิกที่นี่' : 'มีบัญชีแล้ว? กลับไปเข้าสู่ระบบ'}
        </p>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '500px', margin: '0 auto', color: '#333' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ color: 'white', margin: 0 }}>แอป YaJai 💊</h1>
        <div style={{ textAlign: 'right' }}>
          <span style={{ color: 'white', marginRight: '10px', fontWeight: 'bold' }}>👤 {username}</span>
          <button onClick={handleLogout} style={{ background: '#ff4d4d', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>ออกจากระบบ</button>
        </div>
      </div>

      <div style={{ background: '#e3f2fd', padding: '15px', borderRadius: '10px', marginBottom: '20px' }}>
        <h3 style={{ marginTop: 0 }}>➕ เพิ่มยาใหม่</h3>
        <form onSubmit={handleAddMed} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input type="text" placeholder="ชื่อยา เช่น ยาดม" value={newName} onChange={(e) => setNewName(e.target.value)} style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc', fontSize: '16px' }} />
          <input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc', fontSize: '16px' }} />
          <button type="submit" style={{ background: '#2196F3', color: 'white', border: 'none', padding: '10px', borderRadius: '5px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}>บันทึก</button>
        </form>
      </div>
      
      <div style={{ background: '#f0f0f0', padding: '15px', borderRadius: '10px' }}>
        <h3>รายการยาวันนี้</h3>
        {meds.length === 0 ? <p style={{ textAlign: 'center', color: '#888' }}>ยังไม่มียาในระบบของคุณครับ 💊</p> : null}
        <ul style={{ listStyleType: 'none', padding: 0 }}>
          {meds.map(med => (
            <li key={med.id} style={{ marginBottom: '15px', padding: '15px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: '20px', color: '#000', marginBottom: '5px' }}><strong>{med.name}</strong></div>
              <div style={{ color: '#555', marginBottom: '15px' }}>เวลา: {med.time} | สถานะ: <strong style={{ color: med.status === 'กินแล้ว 💖' ? 'green' : 'orange' }}>{med.status}</strong></div>
              <button onClick={() => handleTakeMed(med.id)} disabled={med.status === 'กินแล้ว 💖'} style={{ background: med.status === 'กินแล้ว 💖' ? '#ccc' : '#4CAF50', color: 'white', border: 'none', padding: '12px 15px', borderRadius: '5px', cursor: med.status === 'กินแล้ว 💖' ? 'not-allowed' : 'pointer', fontSize: '16px', width: '100%', fontWeight: 'bold' }}>
                {med.status === 'กินแล้ว 💖' ? '✅ กินยานี้เรียบร้อย' : '✅ ฉันกินยานี้แล้ว'}
              </button>
              <button onClick={() => handleDeleteMed(med.id)} style={{ background: '#ff4d4d', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer', fontSize: '14px', width: '100%', fontWeight: 'bold', marginTop: '10px' }}>
                🗑️ ลบยานี้ทิ้ง
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default App