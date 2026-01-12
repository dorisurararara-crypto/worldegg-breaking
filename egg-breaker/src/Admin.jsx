import React, { useState, useEffect } from 'react';
import './App.css'; // Reuse existing styles (glassmorphism)

// 백엔드 API 주소 (App.jsx와 동일)
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8787/api";

function Admin() {
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Dashboard State
  const [serverState, setServerState] = useState(null);
  
  // Inputs
  const [hpInput, setHpInput] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [prize, setPrize] = useState("");
  const [prizeUrl, setPrizeUrl] = useState("");
  const [adUrl, setAdUrl] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === "egg1234") { // Simple client-side check (also checked on server)
      setIsAuthenticated(true);
      fetchState();
    } else {
      alert("Wrong Password");
    }
  };

  const fetchState = async () => {
    try {
      const res = await fetch(`${API_URL}/state`);
      const data = await res.json();
      setServerState(data);
      // Initialize inputs with current server values
      setHpInput(data.hp);
      setAnnouncement(data.announcement || "");
      setPrize(data.prize || "");
      setPrizeUrl(data.prizeUrl || "");
      setAdUrl(data.adUrl || "");
    } catch (e) {
      console.error("Fetch Error:", e);
    }
  };

  const callAdminApi = async (endpoint, body = {}) => {
    if (!confirm(`Are you sure you want to call ${endpoint}?`)) return;

    try {
      const res = await fetch(`${API_URL}/admin/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': password // Send password as Auth Header
        },
        body: JSON.stringify(body)
      });
      
      if (res.ok) {
        alert("Success!");
        fetchState(); // Refresh UI
      } else {
        alert(`Error: ${res.status}`);
      }
    } catch (e) {
      alert("Network Error");
    }
  };

  if (!isAuthenticated) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#333' }}>
        <form onSubmit={handleLogin} className="glass" style={{ padding: '40px', borderRadius: '20px', textAlign: 'center' }}>
          <h2 style={{ color: '#fff' }}>Admin Access</h2>
          <input 
            type="password" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            placeholder="Enter Password"
            style={{ padding: '10px', fontSize: '16px', borderRadius: '5px', border: 'none', marginBottom: '20px' }}
          />
          <br/>
          <button type="submit" className="send-btn">Login</button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', background: '#222', minHeight: '100vh', color: 'white', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>🛠️ Admin Dashboard</h1>
        <button onClick={() => setIsAuthenticated(false)} style={{ background: 'red', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer' }}>Logout</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        
        {/* 1. Status Panel */}
        <div className="glass" style={{ padding: '20px', borderRadius: '15px', background: 'rgba(255,255,255,0.1)' }}>
          <h3>📊 Live Status</h3>
          {serverState ? (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              <li><strong>Round:</strong> {serverState.round}</li>
              <li><strong>HP:</strong> {serverState.hp.toLocaleString()} / {serverState.maxHp.toLocaleString()}</li>
              <li><strong>Online (Approx):</strong> {serverState.onlineApprox}</li>
              <li><strong>Last Updated:</strong> {new Date().toLocaleTimeString()}</li>
            </ul>
          ) : <p>Loading...</p>}
          
          <button onClick={fetchState} style={{ marginTop: '10px', background: '#444', color: '#fff', border: '1px solid #666', padding: '5px 15px', cursor: 'pointer' }}>Refresh</button>
        </div>

        {/* 2. Game Actions */}
        <div className="glass" style={{ padding: '20px', borderRadius: '15px', background: 'rgba(255,255,255,0.1)' }}>
          <h3>🎮 Game Actions</h3>
          
          <div style={{ marginBottom: '15px' }}>
            <label>Set HP: </label>
            <input 
                type="number" 
                value={hpInput} 
                onChange={e => setHpInput(e.target.value)}
                style={{ width: '100px', padding: '5px', marginRight: '10px' }}
            />
            <button onClick={() => callAdminApi('set-hp', { hp: Number(hpInput) })} style={{ background: '#007bff', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '3px', cursor: 'pointer' }}>Apply HP</button>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => callAdminApi('reset-round')} style={{ background: '#dc3545', color: 'white', border: 'none', padding: '10px', borderRadius: '5px', cursor: 'pointer' }}>
                🚨 Next Round (Reset HP)
            </button>
            <button onClick={() => callAdminApi('reset-users')} style={{ background: '#ffc107', color: 'black', border: 'none', padding: '10px', borderRadius: '5px', cursor: 'pointer' }}>
                👥 Reset Online Count
            </button>
          </div>
        </div>

        {/* 3. Configuration (No Cost!) */}
        <div className="glass" style={{ padding: '20px', borderRadius: '15px', background: 'rgba(255,255,255,0.1)', gridColumn: '1 / -1' }}>
          <h3>⚙️ Global Configuration (Free & Realtime)</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
             <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>📢 Announcement Text:</label>
                <input 
                    type="text" 
                    value={announcement} 
                    onChange={e => setAnnouncement(e.target.value)}
                    style={{ width: '100%', padding: '10px' }} 
                />
             </div>
             
             <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>📺 Ad URL (Google/Link):</label>
                <input 
                    type="text" 
                    value={adUrl} 
                    onChange={e => setAdUrl(e.target.value)}
                    style={{ width: '100%', padding: '10px' }} 
                />
             </div>

             <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>🎁 Prize Name:</label>
                <input 
                    type="text" 
                    value={prize} 
                    onChange={e => setPrize(e.target.value)}
                    style={{ width: '100%', padding: '10px' }} 
                />
             </div>

             <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>🔗 Prize URL:</label>
                <input 
                    type="text" 
                    value={prizeUrl} 
                    onChange={e => setPrizeUrl(e.target.value)}
                    style={{ width: '100%', padding: '10px' }} 
                />
             </div>
          </div>
          
          <button 
            onClick={() => callAdminApi('config', { announcement, prize, prizeUrl, adUrl })} 
            style={{ marginTop: '20px', width: '100%', background: '#28a745', color: 'white', border: 'none', padding: '15px', fontSize: '1.2rem', fontWeight: 'bold', borderRadius: '5px', cursor: 'pointer' }}
          >
            💾 Save All Config
          </button>
        </div>

      </div>
    </div>
  );
}

export default Admin;
