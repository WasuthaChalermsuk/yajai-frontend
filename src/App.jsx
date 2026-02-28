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
    if (token) {
      fetch(`${API_URL}/meds`, { headers: getAuthHeaders() })
        .then(res => {
          if (!res.ok) throw new Error('Expired');
          return res.json();
        })
        .then(data => setMeds(data))
        .catch(() => handleLogout(true))
    }
  }, [token])

  // --- ฟังก์ชันจัดการยา ---
  const handleTakeMed = (id) => {
    fetch(`${API_URL}/meds/${id}`, { method: 'PUT', headers: getAuthHeaders() })
      .then(() => {
        setMeds(meds.map(med => med.id === id ? { ...med, status: 'กินแล้ว 💖' } : med))
        Swal.fire({ icon: 'success', title: 'เก่งมาก!', timer: 1000, showConfirmButton: false })
      })
  }

  const handleDeleteMed = (id) => {
    Swal.fire({
      title: 'ลบยานี้?', icon: 'warning', showCancelButton: true, confirmButtonText: 'ลบเลย'
    }).then((result) => {
      if (result.isConfirmed) {
        fetch(`${API_URL}/meds/${id}`, { method: 'DELETE', headers: getAuthHeaders() })
          .then(() => setMeds(meds.filter(m => m.id !== id)))
      }
    })
  }

  const handleAddMed = (e) => {
    e.preventDefault();
    if (!newName || !newTime) return Swal.fire('กรอกข้อมูลให้ครบ');
    fetch(`${API_URL}/meds`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name: newName, time: newTime })
    }).then(res => res.json()).then(data => {
      setMeds([...meds, data.medicine]);
      setNewName(''); setNewTime('');
    })
  }

  const handleResetDay = () => {
    Swal.fire({
      title: 'เริ่มวันใหม่?', text: 'รีเซ็ตสถานะยาเป็นยังไม่ได้กินทั้งหมด', icon: 'question', showCancelButton: true
    }).then(res => {
      if (res.isConfirmed) {
        fetch(`${API_URL}/meds-reset`, { method: 'PUT', headers: getAuthHeaders() })
          .then(() => {
            setMeds(meds.map(m => ({ ...m, status: 'ยังไม่ได้กิน' })));
            Swal.fire('สำเร็จ', 'เริ่มวันใหม่อย่างสดใส!', 'success');
          })
      }
    })
  }

  // --- ฟังก์ชัน LINE Bot ---
  const handleSendLine = () => {
    const message = `🔔 แจ้งเตือนจากแอป YaJai:\nผู้ป่วยชื่อ: คุณ ${username}\nกินยาไปแล้ว ${takenMeds}/${totalMeds} รายการ (${progressPercent}%)\nส่งเมื่อ: ${new Date().toLocaleTimeString('th-TH')} น.`;
    fetch(`${API_URL}/notify`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ message })
    }).then(() => Swal.fire('ส่งสำเร็จ!', 'รายงานไปถึงผู้ดูแลใน LINE แล้ว', 'success'))
      .catch(() => Swal.fire('Error', 'ส่งไม่สำเร็จ', 'error'))
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
      } else {
        Swal.fire(data.message);
        if (!isLoginMode) setIsLoginMode(true);
      }
    })
  }

  const handleLogout = (force = false) => {
    setToken(''); setUsername('');
    localStorage.clear(); setMeds([]);
  }

  // --- คำนวณ % ---
  const totalMeds = meds.length;
  const takenMeds = meds.filter(m => m.status === 'กินแล้ว 💖').length;
  const progressPercent = totalMeds === 0 ? 0 : Math.round((takenMeds / totalMeds) * 100);

  if (!token) {
    return (
      <div style={{ padding: '20px', maxWidth: '400px', margin: '50px auto', background: 'white', borderRadius: '15px', textAlign: 'center' }}>
        <h2>{isLoginMode ? '🔐 เข้าสู่ระบบ' : '📝 สมัครสมาชิก'}</h2>
        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input type="text" placeholder="Username" value={authUsername} onChange={e => setAuthUsername(e.target.value)} style={{ padding: '10px' }} />
          <input type="password" placeholder="Password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} style={{ padding: '10px' }} />
          <button type="submit" style={{ padding: '10px', background: '#2196F3', color: 'white', border: 'none', borderRadius: '5px' }}>ตกลง</button>
        </form>
        <p onClick={() => setIsLoginMode(!isLoginMode)} style={{ cursor: 'pointer', color: 'blue', marginTop: '10px' }}>{isLoginMode ? 'ยังไม่มีบัญชี? สมัครที่นี่' : 'มีบัญชีแล้ว? ล็อกอิน'}</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', color: 'white' }}>
        <h1 style={{ margin: 0 }}>YaJai 💊</h1>
        <div>
          <span style={{ marginRight: '10px' }}>👤 {username}</span>
          <button onClick={() => handleLogout()} style={{ background: '#ff4d4d', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '5px' }}>ออก</button>
        </div>
      </div>

      {/* --- แบ่งหน้า Admin / User --- */}
      {username === 'admin' ? (
        <div style={{ background: 'white', padding: '20px', borderRadius: '15px', textAlign: 'center' }}>
          <h2 style={{ color: '#2196F3' }}>👨‍⚕️ หน้าผู้ดูแล (Admin)</h2>
          <div style={{ background: '#f9f9f9', padding: '15px', borderRadius: '10px', marginTop: '10px' }}>
            <p>สถานะระบบ: 🟢 ออนไลน์</p>
            <p>LINE Bot: 📱 เชื่อมต่อแล้ว</p>
            <hr />
            <p>เมื่อคนไข้กดปุ่มส่งรายงาน ข้อความจะเด้งเข้า LINE ของคุณทันที</p>
          </div>
        </div>
      ) : (
        <>
          <div style={{ background: 'white', padding: '15px', borderRadius: '10px', marginBottom: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h3 style={{ margin: 0 }}>📊 ความคืบหน้า</h3>
              <div>
                <button onClick={handleResetDay} style={{ background: '#FF9800', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '5px', fontSize: '12px' }}>🌅 เริ่มวันใหม่</button>
                <button onClick={handleSendLine} style={{ background: '#00B900', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '5px', fontSize: '12px', marginLeft: '5px' }}>📱 ส่ง LINE</button>
              </div>
            </div>
            <div style={{ background: '#eee', height: '20px', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ width: `${progressPercent}%`, background: '#4CAF50', height: '100%', transition: '0.5s' }}></div>
            </div>
            <p style={{ textAlign: 'center', fontWeight: 'bold', marginTop: '5px' }}>{progressPercent}%</p>
          </div>

          <div style={{ background: '#e3f2fd', padding: '15px', borderRadius: '10px', marginBottom: '20px' }}>
            <h3>➕ เพิ่มยา</h3>
            <form onSubmit={handleAddMed} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input type="text" placeholder="ชื่อยา" value={newName} onChange={e => setNewName(e.target.value)} style={{ padding: '8px' }} />
              <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} style={{ padding: '8px' }} />
              <button type="submit" style={{ background: '#2196F3', color: 'white', border: 'none', padding: '10px', borderRadius: '5px' }}>บันทึก</button>
            </form>
          </div>

          <div style={{ background: '#fff', padding: '15px', borderRadius: '10px' }}>
            <h3>💊 รายการยาวันนี้</h3>
            {meds.map(m => (
              <div key={m.id} style={{ borderBottom: '1px solid #eee', padding: '10px 0' }}>
                <div style={{ fontWeight: 'bold', fontSize: '18px' }}>{m.name} - {m.time} น.</div>
                <div style={{ color: m.status === 'กินแล้ว 💖' ? 'green' : 'orange' }}>{m.status}</div>
                <button onClick={() => handleTakeMed(m.id)} disabled={m.status === 'กินแล้ว 💖'} style={{ width: '100%', marginTop: '5px', padding: '8px', background: m.status === 'กินแล้ว 💖' ? '#ccc' : '#4CAF50', color: 'white', border: 'none', borderRadius: '5px' }}>กินแล้ว</button>
                <button onClick={() => handleDeleteMed(m.id)} style={{ width: '100%', marginTop: '5px', padding: '5px', background: 'none', color: 'red', border: 'none', fontSize: '12px' }}>ลบยา</button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
export default App