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

  const getAuthHeaders = () => {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }

  useEffect(() => {
    if (token) {
      fetch(`${API_URL}/meds`, { headers: getAuthHeaders() })
        .then(res => {
          if (!res.ok) throw new Error('Token อาจจะหมดอายุ');
          return res.json();
        })
        .then(data => setMeds(data))
        .catch(err => {
          console.log("กรุณาล็อกอินใหม่", err);
          handleLogout(true);
        })
    }
  }, [token])

  const handleTakeMed = (id) => {
    fetch(`${API_URL}/meds/${id}`, { 
      method: 'PUT',
      headers: getAuthHeaders()
    })
      .then(res => res.json())
      .then(() => {
        setMeds(meds.map(med => med.id === id ? { ...med, status: 'กินแล้ว 💖' } : med))
        Swal.fire({
          icon: 'success',
          title: 'เก่งมาก!',
          text: 'บันทึกการกินยาเรียบร้อยแล้ว 💖',
          timer: 1500,
          showConfirmButton: false
        })
      })
  }

  const handleDeleteMed = (id) => {
    Swal.fire({
      title: 'แน่ใจหรือไม่?',
      text: "คุณต้องการลบยานี้ทิ้งใช่ไหม! 🗑️",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ff4d4d',
      cancelButtonColor: '#aaa',
      confirmButtonText: 'ใช่, ลบเลย!',
      cancelButtonText: 'ยกเลิก'
    }).then((result) => {
      if (result.isConfirmed) {
        fetch(`${API_URL}/meds/${id}`, { 
          method: 'DELETE',
          headers: getAuthHeaders()
        })
          .then(res => res.json())
          .then(() => {
            setMeds(meds.filter(med => med.id !== id));
            Swal.fire('ลบแล้ว!', 'ยาถูกลบออกจากระบบแล้ว', 'success');
          })
          .catch(err => Swal.fire('เกิดข้อผิดพลาด', 'ลบยาไม่สำเร็จ', 'error'));
      }
    })
  }

  const handleAddMed = (e) => {
    e.preventDefault();
    if (!newName || !newTime) {
      return Swal.fire({
        icon: 'warning',
        title: 'ข้อมูลไม่ครบ',
        text: 'กรุณากรอกชื่อยาและเวลาให้ครบถ้วน!'
      });
    }

    fetch(`${API_URL}/meds`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name: newName, time: newTime })
    })
      .then(res => res.json())
      .then(data => {
        setMeds([...meds, data.medicine])
        setNewName('')
        setNewTime('')
        Swal.fire({ icon: 'success', title: 'เพิ่มยาสำเร็จ', showConfirmButton: false, timer: 1500 })
      })
  }

  // ✨ ฟีเจอร์ใหม่: ฟังก์ชันสำหรับปุ่มเริ่มวันใหม่ (Reset ยา)
  const handleResetDay = () => {
    Swal.fire({
      title: 'เริ่มวันใหม่? 🌅',
      text: "ระบบจะรีเซ็ตสถานะยาเป็น 'ยังไม่ได้กิน' ทั้งหมด",
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#FF9800',
      cancelButtonColor: '#aaa',
      confirmButtonText: 'ใช่, เริ่มวันใหม่เลย!',
      cancelButtonText: 'ยกเลิก'
    }).then((result) => {
      if (result.isConfirmed) {
        fetch(`${API_URL}/meds-reset`, { 
          method: 'PUT',
          headers: getAuthHeaders()
        })
          .then(res => res.json())
          .then(() => {
            setMeds(meds.map(med => ({ ...med, status: 'ยังไม่ได้กิน' })));
            Swal.fire('สำเร็จ!', 'เริ่มต้นวันใหม่อย่างสดใสครับ ☀️', 'success');
          })
          .catch(err => Swal.fire('เกิดข้อผิดพลาด', 'รีเซ็ตข้อมูลไม่สำเร็จ', 'error'));
      }
    });
  }

  // ✨ ฟังก์ชันใหม่: ส่งรายงานเข้า LINE
  const handleSendLine = () => {
    // สร้างข้อความสรุปที่จะส่งไปในแชท
    const message = `💊 รายงานแอป YaJai:\nคุณ ${username} กินยาไปแล้ว ${takenMeds}/${totalMeds} รายการ\nคิดเป็นความคืบหน้า ${progressPercent}% ครับ! 💖`;

    fetch(`${API_URL}/notify`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ message })
    })
    .then(res => {
      if(!res.ok) throw new Error('ส่งไม่สำเร็จ');
      return res.json();
    })
    .then(() => {
      Swal.fire('ส่งสำเร็จ!', 'เช็คข้อความใน LINE ได้เลย 📱', 'success');
    })
    .catch(err => Swal.fire('อ๊ะ!', 'ตั้งค่าหลังบ้านยังไม่สมบูรณ์ หรือ Server ยังไม่อัปเดต', 'error'));
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
        Swal.fire({ icon: 'success', title: 'เข้าสู่ระบบสำเร็จ!', showConfirmButton: false, timer: 1500 })
      } else {
        const isSuccess = data.message === 'สมัครสมาชิกสำเร็จ!';
        Swal.fire({ icon: isSuccess ? 'success' : 'error', title: data.message });
        if (!isLoginMode && isSuccess) {
          setIsLoginMode(true)
        }
      }
    })
    .catch(err => Swal.fire('เกิดข้อผิดพลาด', 'เชื่อมต่อระบบไม่ได้', 'error'))
  }

  const handleLogout = (force = false) => {
    if (force) {
      executeLogout();
      return;
    }
    Swal.fire({
      title: 'ต้องการออกจากระบบ?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#ff4d4d',
      cancelButtonColor: '#aaa',
      confirmButtonText: 'ออกจากระบบ',
      cancelButtonText: 'ยกเลิก'
    }).then((result) => {
      if (result.isConfirmed) {
        executeLogout();
      }
    })
  }

  const executeLogout = () => {
    setToken('')
    setUsername('')
    localStorage.removeItem('token')
    localStorage.removeItem('username')
    setMeds([])
  }

  const totalMeds = meds.length;
  const takenMeds = meds.filter(med => med.status === 'กินแล้ว 💖').length;
  const progressPercent = totalMeds === 0 ? 0 : Math.round((takenMeds / totalMeds) * 100);

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
          <button onClick={() => handleLogout()} style={{ background: '#ff4d4d', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>ออกจากระบบ</button>
        </div>
      </div>

      <div style={{ background: 'white', padding: '15px', borderRadius: '10px', marginBottom: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        {/* ✨ เพิ่มปุ่มเริ่มวันใหม่ ไว้ข้างๆ หัวข้อกราฟ */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ margin: 0, color: '#333' }}>📊 สรุปความคืบหน้าวันนี้</h3>
          <button 
            onClick={handleResetDay} 
            style={{ background: '#FF9800', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
            🌅 เริ่มวันใหม่
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ margin: 0, color: '#333' }}>📊 สรุปความคืบหน้าวันนี้</h3>
          <div>
            <button 
              onClick={handleResetDay} 
              style={{ background: '#FF9800', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
              🌅 เริ่มวันใหม่
            </button>
            {/* ปุ่ม LINE เพิ่มเข้ามาตรงนี้ */}
            <button 
              onClick={handleSendLine} 
              style={{ background: '#00B900', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', marginLeft: '10px' }}>
              📱 ส่งรายงานเข้า LINE
            </button>
          </div>
        </div>
         
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
          <span style={{ color: '#555' }}>กินยาไปแล้ว: <strong>{takenMeds} / {totalMeds}</strong> รายการ</span>
          <span style={{ fontWeight: 'bold', color: progressPercent === 100 ? '#4CAF50' : '#2196F3' }}>
            {progressPercent}%
          </span>
        </div>

        <div style={{ background: '#e0e0e0', borderRadius: '10px', height: '20px', width: '100%', overflow: 'hidden' }}>
          <div style={{ 
            background: progressPercent === 100 ? '#4CAF50' : 'linear-gradient(90deg, #2196F3, #64b5f6)', 
            height: '100%', 
            width: `${progressPercent}%`,
            transition: 'width 0.5s ease-in-out'
          }}></div>
        </div>

        {progressPercent === 100 && totalMeds > 0 ? (
          <p style={{ textAlign: 'center', margin: '10px 0 0 0', color: '#4CAF50', fontWeight: 'bold' }}>
            🎉 เก่งมากครับ! วันนี้คุณกินยาครบถ้วนแล้ว! 💖
          </p>
        ) : null}
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