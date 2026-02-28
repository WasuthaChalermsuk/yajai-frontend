import { useState, useEffect } from 'react'

function App() {
  const [meds, setMeds] = useState([])
  const [newName, setNewName] = useState('')
  const [newTime, setNewTime] = useState('')

  // ลิงก์จาก Render.com ของคุณ
  const API_URL = 'https://yajai-api.onrender.com/api/meds';

  useEffect(() => {
    fetch(API_URL)
      .then(res => res.json())
      .then(data => setMeds(data))
      .catch(err => console.log("เชื่อมต่อ Backend ไม่ได้", err))
  }, [])

  const handleTakeMed = (id) => {
    fetch(`${API_URL}/${id}`, { method: 'PUT' })
      .then(res => res.json())
      .then(() => {
        setMeds(meds.map(med => 
          med.id === id ? { ...med, status: 'กินแล้ว 💖' } : med
        ))
      })
  }

  // ฟังก์ชันสำหรับกดปุ่มลบยา
  const handleDeleteMed = (id) => {
    // มี Popup ถามย้ำเพื่อความชัวร์ (กันคนแก่เผลอกดโดน)
    if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบยานี้? 🗑️')) {
      fetch(`${API_URL}/${id}`, { method: 'DELETE' })
        .then(res => res.json())
        .then(() => {
          // คัดเอายาตัวที่ถูกลบออกจากการแสดงผลหน้าจอ
          setMeds(meds.filter(med => med.id !== id));
        })
        .catch(err => console.log("ลบไม่ได้:", err));
    }
  }

  const handleAddMed = (e) => {
    e.preventDefault();
    if (!newName || !newTime) return alert('กรุณากรอกชื่อยาและเวลาให้ครบถ้วน!');

    fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, time: newTime })
    })
      .then(res => res.json())
      .then(data => {
        setMeds([...meds, data.medicine])
        setNewName('')
        setNewTime('')
      })
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '500px', margin: '0 auto', color: '#333' }}>
      <h1 style={{ color: 'white' }}>แอป YaJai: ยาของฉัน 💊</h1>

      <div style={{ background: '#e3f2fd', padding: '15px', borderRadius: '10px', marginBottom: '20px' }}>
        <h3 style={{ marginTop: 0 }}>➕ เพิ่มยาใหม่</h3>
        <form onSubmit={handleAddMed} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input 
            type="text" 
            placeholder="ชื่อยา เช่น ยาดม" 
            value={newName} 
            onChange={(e) => setNewName(e.target.value)}
            style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc', fontSize: '16px' }}
          />
          <input 
            type="time" 
            value={newTime} 
            onChange={(e) => setNewTime(e.target.value)}
            style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc', fontSize: '16px' }}
          />
          <button type="submit" style={{ background: '#2196F3', color: 'white', border: 'none', padding: '10px', borderRadius: '5px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}>
            บันทึก
          </button>
        </form>
      </div>
      
      <div style={{ background: '#f0f0f0', padding: '15px', borderRadius: '10px' }}>
        <h3>รายการยาวันนี้</h3>
        <ul style={{ listStyleType: 'none', padding: 0 }}>
          {meds.map(med => (
            <li key={med.id} style={{ marginBottom: '15px', padding: '15px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: '20px', color: '#000', marginBottom: '5px' }}>
                <strong>{med.name}</strong>
              </div>
              <div style={{ color: '#555', marginBottom: '15px' }}>
                เวลา: {med.time} | สถานะ: <strong style={{ color: med.status === 'กินแล้ว 💖' ? 'green' : 'orange' }}>{med.status}</strong>
              </div>
              <button 
                onClick={() => handleTakeMed(med.id)}
                disabled={med.status === 'กินแล้ว 💖'}
                style={{ 
                  background: med.status === 'กินแล้ว 💖' ? '#ccc' : '#4CAF50', 
                  color: 'white', border: 'none', padding: '12px 15px', 
                  borderRadius: '5px', cursor: med.status === 'กินแล้ว 💖' ? 'not-allowed' : 'pointer', 
                  fontSize: '16px', width: '100%', fontWeight: 'bold'
                }}>
                {med.status === 'กินแล้ว 💖' ? '✅ กินยานี้เรียบร้อย' : '✅ ฉันกินยานี้แล้ว'}
              </button>
              {/* ปุ่มลบยา */}
              <button 
                onClick={() => handleDeleteMed(med.id)}
                style={{ 
                  background: '#ff4d4d', color: 'white', border: 'none', 
                  padding: '8px 15px', borderRadius: '5px', cursor: 'pointer', 
                  fontSize: '14px', width: '100%', fontWeight: 'bold', marginTop: '10px'
                }}>
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