import { useState, useEffect } from 'react';
import { db, auth } from './firebase';
import { ref, onValue, set, get, runTransaction, remove } from 'firebase/database';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import './Admin.css';

const getFlagEmoji = (countryCode) => {
    if (!countryCode) return '🌍';
    const codePoints = countryCode.toUpperCase().split('').map(char => 127397 + char.charCodeAt());
    return String.fromCodePoint(...codePoints);
};

function Admin() {
    const [prize, setPrize] = useState('');
    const [newPrize, setNewPrize] = useState('');
    const [prizeUrl, setPrizeUrl] = useState('');
    const [newPrizeUrl, setNewPrizeUrl] = useState('');
    const [winners, setWinners] = useState([]);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [user, setUser] = useState(null);
    const [hp, setHp] = useState(0);
    const [newHp, setNewHp] = useState(0);
    const [round, setRound] = useState(0);
    const [announcement, setAnnouncement] = useState('');
    const [newAnnouncement, setNewAnnouncement] = useState('');
    const [onlineUsers, setOnlineUsers] = useState({});
    const [stats, setStats] = useState({ totalUsers: 0, topCountry: '-' });

    const prizeRef = ref(db, 'prize');
    const prizeUrlRef = ref(db, 'prizeUrl');
    const winnersRef = ref(db, 'winners');
    const hpRef = ref(db, 'eggHP');
    const roundRef = ref(db, 'round');
    const announcementRef = ref(db, 'announcement');
    const usersRef = ref(db, 'onlineUsers');

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!user) return;

        onValue(prizeRef, (snapshot) => {
            setPrize(snapshot.val() || '');
            setNewPrize(snapshot.val() || '');
        });
        onValue(prizeUrlRef, (snapshot) => {
            setPrizeUrl(snapshot.val() || '');
            setNewPrizeUrl(snapshot.val() || '');
        });
        onValue(announcementRef, (snapshot) => {
            setAnnouncement(snapshot.val() || '');
            setNewAnnouncement(snapshot.val() || '');
        });
        onValue(winnersRef, (snapshot) => {
            const data = snapshot.val();
            const winnerList = data ? Object.entries(data).map(([key, value]) => ({ id: key, ...value })) : [];
            // Sort by date descending (newest first)
            winnerList.sort((a, b) => new Date(b.date) - new Date(a.date));
            setWinners(winnerList);
        });
        onValue(hpRef, (snapshot) => {
            const currentHp = snapshot.val() || 0;
            setHp(currentHp);
            setNewHp(currentHp);
        });
        onValue(roundRef, (snapshot) => {
            setRound(snapshot.val() || 1);
        });
        onValue(usersRef, (snapshot) => {
            const data = snapshot.val() || {};
            setOnlineUsers(data);
            
            // Calculate stats
            const userCount = Object.keys(data).length;
            const countryCounts = {};
            Object.values(data).forEach(u => {
                const c = u.country || 'Unknown';
                countryCounts[c] = (countryCounts[c] || 0) + 1;
            });
            const topC = Object.entries(countryCounts).sort((a, b) => b[1] - a[1])[0];
            
            setStats({
                totalUsers: userCount,
                topCountry: topC ? `${topC[0]} (${topC[1]})` : '-'
            });
        });
    }, [user]);

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            alert("로그인 실패: " + error.message);
        }
    };

    const handleLogout = () => {
        signOut(auth);
    };

    const handlePrizeUpdate = () => {
        set(prizeRef, newPrize);
        set(prizeUrlRef, newPrizeUrl)
            .then(() => alert('상품 정보가 업데이트되었습니다!'))
            .catch((error) => alert(error.message));
    };

    const handleAnnouncementUpdate = () => {
        set(announcementRef, newAnnouncement)
            .then(() => alert('공지사항이 업데이트되었습니다!'))
            .catch((error) => alert(error.message));
    };

    const handleHpUpdate = () => {
        const hpValue = parseInt(newHp, 10);
        if (isNaN(hpValue)) {
            alert('올바른 HP 숫자를 입력해주세요.');
            return;
        }
        set(hpRef, hpValue)
            .then(() => alert('HP가 업데이트되었습니다!'))
            .catch((error) => alert(error.message));
    };

    const handleClearUsers = () => {
        if (window.confirm('정말로 모든 접속자를 내보내시겠습니까?')) {
            set(usersRef, null)
                .then(() => alert('모든 접속자가 강제 퇴장되었습니다!'))
                .catch((error) => alert(error.message));
        }
    };

    const handleDeleteWinner = (winnerId) => {
        if(window.confirm('이 우승자 기록을 삭제하시겠습니까?')) {
            remove(ref(db, `winners/${winnerId}`))
                .then(() => alert('우승자 기록이 삭제되었습니다.'))
                .catch(e => alert(e.message));
        }
    };

    const handleStartNewRound = () => {
        if (window.confirm('정말로 새 라운드를 시작하시겠습니까? HP가 초기화됩니다.')) {
            runTransaction(roundRef, (currentRound) => (currentRound || 0) + 1);
            set(hpRef, 1000000)
                .then(() => alert('새로운 라운드가 시작되었습니다! HP가 초기화되었습니다.'))
                .catch((error) => alert(error.message));
        }
    };

    if (!user) {
        return (
            <div className="admin-login-container">
                <div className="admin-login-box">
                    <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', color: '#646cff' }}>관리자 로그인</h2>
                    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <input
                            className="admin-input"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="이메일"
                            required
                        />
                        <input
                            className="admin-input"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="비밀번호"
                            required
                        />
                        <button className="admin-btn" type="submit">로그인</button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-container">
            <header className="admin-header">
                <div style={{display:'flex', alignItems:'center', gap:'1rem'}}>
                    <h1>🥚 관리자 대시보드</h1>
                    <span style={{background: '#333', padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.9rem'}}>
                        라운드: <b>{round}</b>
                    </span>
                </div>
                <button className="admin-logout-btn" onClick={handleLogout}>로그아웃</button>
            </header>

            <div className="admin-dashboard">
                {/* 1. Game State Card */}
                <div className="admin-card">
                    <h2>게임 제어</h2>
                    <div className="stats-grid">
                        <div className="stat-item">
                            <span className="stat-label">체력(HP)</span>
                            <span className="stat-value">{(hp / 1000000 * 100).toFixed(1)}%</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">수치</span>
                            <span className="stat-value">{hp.toLocaleString()}</span>
                        </div>
                    </div>
                    
                    <div className="hp-bar-container">
                        <div className="hp-bar-fill" style={{ width: `${Math.min(100, Math.max(0, (hp / 1000000) * 100))}%` }}></div>
                    </div>

                    <div className="admin-form-group">
                        <label className="admin-label">HP 직접 설정</label>
                        <input
                            className="admin-input"
                            type="number"
                            value={newHp}
                            onChange={(e) => setNewHp(e.target.value)}
                        />
                        <button className="admin-btn" onClick={handleHpUpdate}>HP 수정</button>
                    </div>

                    <hr style={{borderColor: '#404040', margin: '1.5rem 0'}} />
                    
                    <button className="admin-btn success" onClick={handleStartNewRound}>
                        🚀 {round + 1} 라운드 시작
                    </button>
                </div>

                {/* 2. Prize & Announcement Card */}
                <div className="admin-card">
                    <h2>설정</h2>
                    
                    <div className="admin-form-group">
                        <label className="admin-label">현재 상품명</label>
                        <input
                            className="admin-input"
                            type="text"
                            value={newPrize}
                            onChange={(e) => setNewPrize(e.target.value)}
                            placeholder="예: 문화상품권 5만원"
                        />
                    </div>
                    <div className="admin-form-group">
                        <label className="admin-label">상품 이미지 URL</label>
                        <input
                            className="admin-input"
                            type="text"
                            value={newPrizeUrl}
                            onChange={(e) => setNewPrizeUrl(e.target.value)}
                            placeholder="https://..."
                        />
                        <button className="admin-btn" onClick={handlePrizeUpdate}>상품 정보 저장</button>
                    </div>

                    <hr style={{borderColor: '#404040', margin: '1.5rem 0'}} />

                    <div className="admin-form-group">
                        <label className="admin-label">전체 공지사항 (화면 상단)</label>
                        <input
                            className="admin-input"
                            type="text"
                            value={newAnnouncement}
                            onChange={(e) => setNewAnnouncement(e.target.value)}
                            placeholder="비워두면 숨김 처리됩니다."
                        />
                        <button className="admin-btn" onClick={handleAnnouncementUpdate}>공지사항 저장</button>
                    </div>
                </div>

                {/* 3. Live Users Card */}
                <div className="admin-card">
                    <h2>
                        실시간 접속자 
                        <span style={{fontSize: '0.9rem', background: '#4caf50', padding: '2px 6px', borderRadius: '4px', color: 'white', marginLeft: '10px'}}>
                            {stats.totalUsers}명 접속 중
                        </span>
                    </h2>
                    
                    <div style={{marginBottom: '1rem', fontSize: '0.9rem', color: '#ccc'}}>
                        최다 접속 국가: {stats.topCountry}
                    </div>

                    <div className="online-users-grid">
                        {Object.values(onlineUsers).map((u, i) => (
                            <span key={i} className="country-badge" title={new Date(u.lastActive).toLocaleTimeString()}>
                                {getFlagEmoji(u.country)} {u.country}
                            </span>
                        ))}
                    </div>

                    <div style={{marginTop: 'auto', paddingTop: '1rem'}}>
                         <hr style={{borderColor: '#404040', margin: '1rem 0'}} />
                         <label className="admin-label" style={{color: '#ff4444'}}>위험 구역</label>
                         <button className="admin-btn danger" onClick={handleClearUsers}>접속자 초기화</button>
                    </div>
                </div>

                {/* 4. Winners History (Full Width) */}
                <div className="admin-card full-width">
                    <h2>명예의 전당</h2>
                    <ul className="winners-list">
                        {winners.map(winner => (
                            <li key={winner.id} className="winner-item">
                                <div className="winner-info">
                                    <span style={{fontWeight: 'bold', color: '#ffbd00'}}>
                                        👑 {winner.round || '?'} 라운드 우승자
                                    </span>
                                    <span>{winner.email}</span>
                                    <span style={{fontSize: '0.8rem', color: '#888'}}>
                                        {getFlagEmoji(winner.country)} {winner.country} • {new Date(winner.date).toLocaleString()}
                                    </span>
                                </div>
                                <button className="winner-delete" onClick={() => handleDeleteWinner(winner.id)}>
                                    삭제
                                </button>
                            </li>
                        ))}
                        {winners.length === 0 && <li style={{textAlign: 'center', color: '#666'}}>아직 우승자가 없습니다.</li>}
                    </ul>
                </div>
            </div>
        </div>
    );
}

export default Admin;