const fs = require('fs');
const path = require('path');

const PRIZES_DIR = path.join(__dirname, '..', 'public', 'prizes');
const MAX_FILES = 100;

function cleanup() {
    if (!fs.existsSync(PRIZES_DIR)) {
        console.log('Prizes directory does not exist. Skipping cleanup.');
        return;
    }

    const files = fs.readdirSync(PRIZES_DIR)
        .filter(file => !file.startsWith('.')) // 숨김 파일 제외
        .map(file => {
            const filePath = path.join(PRIZES_DIR, file);
            return {
                name: file,
                path: filePath,
                time: fs.statSync(filePath).mtime.getTime()
            };
        });

    // 수정 시간순으로 정렬 (최신이 뒤로)
    files.sort((a, b) => a.time - b.time);

    if (files.length > MAX_FILES) {
        const filesToDelete = files.slice(0, files.length - MAX_FILES);
        console.log(`Cleaning up ${filesToDelete.length} old prize images...`);
        
        filesToDelete.forEach(file => {
            try {
                fs.unlinkSync(file.path);
                console.log(`Deleted: ${file.name}`);
            } catch (err) {
                console.error(`Error deleting ${file.name}:`, err);
            }
        });
    } else {
        console.log(`Total prize images: ${files.length}. No cleanup needed.`);
    }
}

cleanup();
