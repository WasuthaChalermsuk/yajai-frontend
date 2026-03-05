import { useState, useEffect } from 'react'
import Swal from 'sweetalert2' 

function App() {
  const [meds, setMeds] = useState([])
  const [patients, setPatients] = useState([]) 
  const [newName, setNewName] = useState('')
  const [newTime, setNewTime] = useState('')
  const [newMeal, setNewMeal] = useState('เช้า') // ✨ เก็บค่ามื้ออาหาร
  const [targetPatient, setTargetPatient] = useState('')
  const [token, setToken] = useState(localStorage.getItem('token') || '')
  const [username, setUsername] = useState(localStorage.getItem('username') || '')
  const [authUsername, setAuthUsername] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [isLoginMode, setIsLoginMode] = useState(true)

  // ✨ State สำหรับการแก้ไขยา
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editTime, setEditTime] = useState('')
  const [editMeal, setEditMeal] = useState('เช้า')

  const API_URL = 'https://yajai-api.onrender.com/api'; 

  const getAuthHeaders = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` })

  const fetchMeds = () => {
    fetch(`${API_URL}/meds`, { headers: getAuthHeaders() })
      .then(res => { if (!res.ok) throw new Error(); return res.json(); })
      .then(data => setMeds(data))
      .catch(() => handleLogout())
  }

  const fetchPatients = () => {
    fetch(`${API_URL}/users`, { headers: getAuthHeaders() })
      .then(res => res.json()).then(data => { if(Array.isArray(data)) setPatients(data); })
  }

  useEffect(() => { if (token) { fetchMeds(); if (username === 'admin') fetchPatients(); } }, [token, username])

  const handleAddMed = (e) => {
    e.preventDefault();
    if (!newName || !newTime || !targetPatient) return Swal.fire('กรุณากรอกข้อมูลให้ครบ');
    fetch(`${API_URL}/meds`, { 
      method: 'POST', headers: getAuthHeaders(), 
      body: JSON.stringify({ name: newName, time: newTime, meal: newMeal, patientName: targetPatient }) 
    }).then(res => res.json()).then(data => { 
      setMeds([...meds, data.medicine]); 
      setNewName(''); setNewTime(''); setNewMeal('เช้า');
      Swal.fire('สำเร็จ', `สั่งยาให้คุณ ${targetPatient} เรียบร้อย`, 'success');
    })
  }

  const handleDeleteMed = (id) => {
    Swal.fire({ title: 'ลบรายการยา?', icon: 'warning', showCancelButton: true }).then(res => {
      if (res.isConfirmed) fetch(`${API_URL}/meds/${id}`, { method: 'DELETE', headers: getAuthHeaders() }).then(() => setMeds(meds.filter(m => m.id !== id)))
    })
  }

  // ✨ ฟังก์ชันเปิดโหมดแก้ไข
  const startEdit = (med) => {
    setEditingId(med.id); setEditName(med.name); setEditTime(med.time); setEditMeal(med.meal || 'เช้า');
  }

  // ✨ ฟังก์ชันบันทึกการแก้ไข
  const handleSaveEdit = (id) => {
    fetch(`${API_URL}/meds/edit/${id}`, {
      method: 'PUT', headers: getAuthHeaders(),
      body: JSON.stringify({ name: editName, time: editTime, meal: editMeal })
    }).then(res => res.json()).then(updatedMed => {
      setMeds(meds.map(m => m.id === id ? updatedMed : m));
      setEditingId(null);
      Swal.fire({ icon: 'success', title: 'อัปเดตยาเรียบร้อย', timer: 1000, showConfirmButton: false });
    })
  }

  const handleTakeMed = (id) => {
    fetch(`${API_URL}/meds/${id}`, { method: 'PUT', headers: getAuthHeaders() })
      .then(() => {
        setMeds(meds.map(med => med.id === id ? { ...med, status: 'กินแล้ว 💖' } : med));
        Swal.fire({ icon: 'success', title: 'เยี่ยมมาก!', timer: 1000, showConfirmButton: false });
      })
  }

  const handleResetMeds = () => {
    Swal.fire({ title: 'เริ่มวันใหม่?', text: "สถานะยาทุกคนจะกลับเป็น 'ยังไม่ได้กิน'", icon: 'question', showCancelButton: true }).then(res => {
      if (res.isConfirmed) {
        fetch(`${API_URL}/meds/reset/all`, { method: 'PUT', headers: getAuthHeaders() }).then(() => { fetchMeds(); Swal.fire('สำเร็จ', 'รีเซ็ตสถานะแล้ว', 'success'); })
      }
    })
  }

  const handleSendLine = () => {
    const total = meds.length; const taken = meds.filter(m => m.status === 'กินแล้ว 💖').length;
    const message = `🔔 แจ้งเตือน:\nคุณ ${username}\nกินยาแล้ว ${taken}/${total} รายการ\nเวลา: ${new Date().toLocaleTimeString('th-TH')} น.`;
    fetch(`${API_URL}/notify`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ message }) })
      .then(() => Swal.fire('ส่งสำเร็จ!', 'ส่งเข้า LINE แล้ว', 'success'))
  }

  const handleAuth = (e) => {
    e.preventDefault()
    fetch(`${API_URL}${isLoginMode ? '/login' : '/register'}`, { 
      method: 'POST', headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ username: authUsername, password: authPassword }) 
    }).then(res => res.json()).then(data => {
      if (data.token) { setToken(data.token); setUsername(data.username); localStorage.setItem('token', data.token); localStorage.setItem('username', data.username); } 
      else { Swal.fire(data.message || 'เกิดข้อผิดพลาด'); }
    })
  }

  const handleLogout = () => { setToken(''); setUsername(''); localStorage.clear(); setMeds([]); }

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

  // ✨ จัดกลุ่มยาตามมื้ออาหาร (สำหรับหน้าคนไข้)
  const mealsCategory = ['เช้า', 'กลางวัน', 'เย็น', 'ก่อนนอน'];

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
              <select value={targetPatient} onChange={e => setTargetPatient(e.target.value)} style={{ padding: '10px', borderRadius: '5px' }}>
                <option value="">-- เลือกคนไข้ --</option>
                {patients.map(p => <option key={p} value={p}>คุณ {p}</option>)}
              </select>
              <input type="text" placeholder="ชื่อยา" value={newName} onChange={e => setNewName(e.target.value)} style={{ padding: '10px', borderRadius: '5px' }} />
              <div style={{ display: 'flex', gap: '10px' }}>
                <select value={newMeal} onChange={e => setNewMeal(e.target.value)} style={{ padding: '10px', borderRadius: '5px', flex: 1 }}>
                  {mealsCategory.map(meal => <option key={meal} value={meal}>มื้อ{meal}</option>)}
                </select>
                <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} style={{ padding: '10px', borderRadius: '5px', flex: 1 }} />
              </div>
              <button type="submit" style={{ background: '#FFC107', color: '#333', padding: '10px', border: 'none', borderRadius: '5px', fontWeight: 'bold' }}>บันทึก</button>
            </form>
          </div>
          
          <div style={{ background: '#444', padding: '20px', borderRadius: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0 }}>📋 จัดการยาทั้งหมด</h3>
              <button onClick={handleResetMeds} style={{ background: '#2196F3', color: 'white', border: 'none', padding: '8px', borderRadius: '5px', cursor: 'pointer' }}>🔄 เริ่มวันใหม่</button>
            </div>

            {meds.map(m => (
              <div key={m.id} style={{ borderBottom: '1px solid #555', padding: '15px 0' }}>
                {editingId === m.id ? (
                  // โหมดแก้ไข
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <input type="text" value={editName} onChange={e => setEditName(e.target.value)} style={{ padding: '8px' }}/>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <select value={editMeal} onChange={e => setEditMeal(e.target.value)} style={{ padding: '8px', flex: 1 }}>
                        {mealsCategory.map(meal => <option key={meal} value={meal}>มื้อ{meal}</option>)}
                      </select>
                      <input type="time" value={editTime} onChange={e => setEditTime(e.target.value)} style={{ padding: '8px', flex: 1 }}/>
                    </div>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button onClick={() => handleSaveEdit(m.id)} style={{ flex: 1, background: '#4CAF50', color: 'white', padding: '8px', border: 'none', borderRadius: '5px' }}>บันทึก</button>
                      <button onClick={() => setEditingId(null)} style={{ flex: 1, background: '#888', color: 'white', padding: '8px', border: 'none', borderRadius: '5px' }}>ยกเลิก</button>
                    </div>
                  </div>
                ) : (
                  // โหมดแสดงผลปกติ
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <b>{m.name}</b> <span style={{ color: '#bbb', fontSize: '14px' }}>(ของ: {m.owner})</span> <br/>
                      <span style={{ fontSize: '14px', color: '#90CAF9' }}>มื้อ{m.meal || 'เช้า'} - {m.time} น.</span> <br/>
                      <span style={{ fontSize: '13px', color: m.status === 'กินแล้ว 💖' ? '#4CAF50' : '#FF9800' }}>{m.status}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '5px', flexDirection: 'column' }}>
                      <button onClick={() => startEdit(m)} style={{ background: '#FFC107', border: 'none', borderRadius: '5px', padding: '5px 15px', cursor: 'pointer' }}>✏️ แก้ไข</button>
                      <button onClick={() => handleDeleteMed(m.id)} style={{ background: '#ff5252', color: 'white', border: 'none', borderRadius: '5px', padding: '5px 15px', cursor: 'pointer' }}>🗑️ ลบ</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div style={{ background: '#444', padding: '20px', borderRadius: '15px', marginBottom: '20px', textAlign: 'center' }}>
            <button onClick={handleSendLine} style={{ width: '100%', background: '#00B900', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold' }}>📱 ส่งรายงานการกินยาเข้า LINE</button>
          </div>
          
          {/* แสดงผลแยกตามมื้ออาหาร */}
          {mealsCategory.map(mealName => {
            const medsInThisMeal = meds.filter(m => (m.meal || 'เช้า') === mealName);
            if (medsInThisMeal.length === 0) return null; // ถ้ามื้อไหนไม่มียา ไม่ต้องแสดง

            return (
              <div key={mealName} style={{ background: '#444', padding: '15px', borderRadius: '15px', marginBottom: '15px' }}>
                <h3 style={{ margin: '0 0 15px 0', color: '#FFC107', borderBottom: '2px solid #555', paddingBottom: '10px' }}>
                  🍽️ ยามื้อ{mealName}
                </h3>
                {medsInThisMeal.map(m => (
                  <div key={m.id} style={{ background: '#333', padding: '15px', borderRadius: '10px', marginBottom: '10px', borderLeft: m.status === 'กินแล้ว 💖' ? '6px solid #4CAF50' : '6px solid #FF9800' }}>
                    <div style={{ fontWeight: 'bold' }}>{m.name} <span style={{ float: 'right' }}>🕒 {m.time} น.</span></div>
                    <div style={{ margin: '10px 0', color: m.status === 'กินแล้ว 💖' ? '#81C784' : '#FFB74D' }}>{m.status}</div>
                    <button onClick={() => handleTakeMed(m.id)} disabled={m.status === 'กินแล้ว 💖'} style={{ width: '100%', padding: '10px', background: m.status === 'กินแล้ว 💖' ? '#555' : '#4CAF50', color: 'white', border: 'none', borderRadius: '5px', cursor: m.status === 'กินแล้ว 💖' ? 'default' : 'pointer' }}>
                      {m.status === 'กินแล้ว 💖' ? '✅ กินแล้ว' : 'กดเมื่อกินยา'}
                    </button>
                  </div>
                ))}
              </div>
            )
          })}
          {meds.length === 0 && <p style={{ textAlign: 'center', color: '#bbb' }}>ไม่มียาที่ต้องกินวันนี้ 🎉</p>}
        </>
      )}
    </div>
  )
}

export default App