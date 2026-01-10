import { useState, useEffect } from 'react';
import { db } from './firebase';
import { ref, onValue, set, get, runTransaction } from 'firebase/database';

function Admin() {
    const [prize, setPrize] = useState('');
    const [newPrize, setNewPrize] = useState('');
    const [winners, setWinners] = useState([]);
    const [password, setPassword] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [hp, setHp] = useState(0);
    const [newHp, setNewHp] = useState(0);
    const [round, setRound] = useState(0);

    const prizeRef = ref(db, 'prize');
    const winnersRef = ref(db, 'winners');
    const hpRef = ref(db, 'eggHP');
    const roundRef = ref(db, 'round');

    useEffect(() => {
        if (!isAuthenticated) return;

        onValue(prizeRef, (snapshot) => {
            setPrize(snapshot.val() || '');
            setNewPrize(snapshot.val() || '');
        });
        onValue(winnersRef, (snapshot) => {
            const data = snapshot.val();
            const winnerList = data ? Object.entries(data).map(([key, value]) => ({ id: key, ...value })) : [];
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
    }, [isAuthenticated]);

    const handlePasswordSubmit = () => {
        // In a real app, use a more secure authentication method.
        if (password === 'admin123') {
            setIsAuthenticated(true);
        } else {
            alert('Wrong password');
        }
    };

    const handlePrizeUpdate = () => {
        set(prizeRef, newPrize)
            .then(() => alert('Prize updated!'))
            .catch((error) => alert(error.message));
    };

    const handleHpUpdate = () => {
        const hpValue = parseInt(newHp, 10);
        if (isNaN(hpValue)) {
            alert('Please enter a valid number for HP.');
            return;
        }
        set(hpRef, hpValue)
            .then(() => alert('HP updated!'))
            .catch((error) => alert(error.message));
    };

    const handleClearUsers = () => {
        const onlineUsersRef = ref(db, 'onlineUsers');
        if (window.confirm('Are you sure you want to clear all online users? This will kick everyone.')) {
            set(onlineUsersRef, null)
                .then(() => alert('Online users cleared!'))
                .catch((error) => alert(error.message));
        }
    };

    const handleStartNewRound = () => {
        if (window.confirm('Are you sure you want to start a new round? This will reset the HP.')) {
            runTransaction(roundRef, (currentRound) => (currentRound || 0) + 1);
            set(hpRef, 1000000)
                .then(() => alert('New round started! HP has been reset.'))
                .catch((error) => alert(error.message));
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="admin-login">
                <h2>Admin Login</h2>
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                />
                <button onClick={handlePasswordSubmit}>Login</button>
            </div>
        );
    }

    return (
        <div className="admin-container">
            <h1>Admin Page</h1>

            <div className="admin-section">
                <h2>Current Round Prize</h2>
                <p>Current: {prize}</p>
                <input
                    type="text"
                    value={newPrize}
                    onChange={(e) => setNewPrize(e.target.value)}
                />
                <button onClick={handlePrizeUpdate}>Update Prize</button>
            </div>

            <div className="admin-section">
                <h2>Egg HP</h2>
                <p>Current: {hp}</p>
                <input
                    type="number"
                    value={newHp}
                    onChange={(e) => setNewHp(e.target.value)}
                />
                <button onClick={handleHpUpdate}>Update HP</button>
            </div>
            
            <div className="admin-section">
                <h2>Round Control</h2>
                <p>Current Round: {round}</p>
                <button onClick={handleStartNewRound}>Start New Round</button>
            </div>

            <div className="admin-section">
                <h2>Winners</h2>
                <ul>
                    {winners.map(winner => (
                        <li key={winner.id}>
                           [Round {winner.round || 'N/A'}] {winner.email} - {winner.date} - {winner.country}
                        </li>
                    ))}
                </ul>
            </div>

            <div className="admin-section">
                <h2>Danger Zone</h2>
                <button onClick={handleClearUsers}>Clear Online Users</button>
            </div>
        </div>
    );
}

export default Admin;
