import React from 'react';
import AdsenseSlot from '../components/AdsenseSlot';

const AboutPage = ({ onBack }) => {
    return (
        <div className="content-page" style={{ padding: '40px 20px', maxWidth: '800px', margin: '0 auto', color: '#5d4037', lineHeight: '1.8' }}>
            <button onClick={onBack} style={{ marginBottom: '20px', padding: '8px 16px', borderRadius: '20px', border: '1px solid #ffb6c1', background: '#fff', cursor: 'pointer', color: '#ff6f61', fontWeight: 'bold' }}>&larr; 돌아가기</button>
            
            <h1 style={{ fontSize: '2.5rem', color: '#ff6f61', marginBottom: '10px' }}>World Egg Breaking</h1>
            <p style={{ fontSize: '1.1rem', color: '#8d6e63', marginBottom: '40px' }}>전 세계가 함께하는 초대형 알 깨기 챌린지!</p>
            
            <div style={{ background: 'rgba(255,255,255,0.6)', padding: '30px', borderRadius: '20px', marginBottom: '30px' }}>
                <h3 style={{ color: '#ff6f61', marginTop: 0 }}>🥚 게임 소개</h3>
                <p>
                    <strong>World Egg Breaking</strong>은 전 세계의 플레이어들이 실시간으로 협동하여 거대한 알을 깨는 
                    <strong>대규모 멀티플레이어 클리커 게임</strong>입니다.
                </p>
                <p>
                    단순한 클릭이 모여 거대한 변화를 만듭니다. 
                    다른 플레이어들과 힘을 합쳐 알의 체력을 깎고, 마지막 일격(막타)을 날려 영광의 주인공이 되어보세요!
                </p>
            </div>

            <AdsenseSlot slotId="1234567890" />

            <div style={{ background: 'rgba(255,255,255,0.6)', padding: '30px', borderRadius: '20px', marginBottom: '30px' }}>
                <h3 style={{ color: '#ff6f61', marginTop: 0 }}>🌟 우리의 미션</h3>
                <p>
                    우리는 국경과 언어를 넘어, 전 세계 사람들이 하나의 목표를 향해 협력하고 경쟁하는 즐거운 경험을 제공하고자 합니다.
                    단순한 게임을 넘어, 함께하는 즐거움을 느낄 수 있는 디지털 놀이터를 만들어 가겠습니다.
                </p>
            </div>
            
            <div style={{ background: 'rgba(255,255,255,0.6)', padding: '30px', borderRadius: '20px' }}>
                <h3 style={{ color: '#ff6f61', marginTop: 0 }}>📮 문의하기</h3>
                <p>
                    게임 이용 중 불편한 점이나 제안하고 싶은 아이디어가 있으신가요?<br/>
                    언제든지 아래 연락처로 문의해 주세요.
                </p>
                <p style={{ fontWeight: 'bold', color: '#333' }}>
                    Email: contact@dorisurararara.com
                </p>
            </div>

            <div style={{ marginTop: '40px', textAlign: 'center', fontSize: '0.9rem', color: '#aaa' }}>
                Version 1.2.0 (Beta)<br/>
                &copy; 2026 Dorisurararara Team.
            </div>
        </div>
    );
};

export default AboutPage;