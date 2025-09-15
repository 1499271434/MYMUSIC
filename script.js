// --- 最终更新 ---
// 请将下面的网址替换成您自己部署好的、专属的网易云API的Vercel网址！
const API_BASE_URL = 'https://nhyx.zone.id'; // <--- ！！！请务必修改这里 ！！！

// 我们在网上随便找一个看起来真实的IP地址
const REAL_IP = '116.25.146.177';

// 1. 获取HTML元素 (不变)
const searchButton = document.getElementById('searchButton');
const searchInput = document.getElementById('searchInput');
const resultsList = document.getElementById('resultsList');
const audioPlayer = document.getElementById('audioPlayer');
const nowPlaying = document.getElementById('nowPlaying');

// 2. 搜索按钮的点击事件 (添加了 realIP 参数)
searchButton.addEventListener('click', async () => {
    const keyword = searchInput.value;
    if (keyword === '') {
        alert('请输入歌曲或歌手名！');
        return;
    }

    resultsList.innerHTML = '<li>正在搜索并过滤可播放歌曲，请稍候...</li>';

    try {
        // --- 最终更新 ---
        // 在请求URL的末尾加上 &realIP=...
        const searchResponse = await fetch(`${API_BASE_URL}/search?keywords=${keyword}&realIP=${REAL_IP}`);
        const searchData = await searchResponse.json();

        if (searchData.result && searchData.result.songs) {
            const songs = searchData.result.songs;
            let playableSongs = [];

            await Promise.all(songs.map(async (song) => {
                // --- 最终更新 ---
                // 在请求URL的末尾加上 &realIP=...
                const checkResponse = await fetch(`${API_BASE_URL}/check/music?id=${song.id}&realIP=${REAL_IP}`);
                const checkData = await checkResponse.json();
                if (checkData.success) {
                    playableSongs.push(song);
                }
            }));

            resultsList.innerHTML = '';

            if (playableSongs.length > 0) {
                playableSongs.forEach(song => {
                    const listItem = document.createElement('li');
                    listItem.textContent = `${song.name} - ${song.artists[0].name}`;
                    listItem.addEventListener('click', () => {
                        playSong(song.id, `${song.name} - ${song.artists[0].name}`);
                    });
                    resultsList.appendChild(listItem);
                });
            } else {
                resultsList.innerHTML = '<li>未找到可播放的歌曲（可能均为VIP或无版权）。</li>';
            }
        } else {
            resultsList.innerHTML = '<li>没有找到相关歌曲。</li>';
        }
    } catch (error) {
        console.error('搜索或检查过程中出错了:', error);
        resultsList.innerHTML = '<li>搜索失败，请检查网络或稍后再试。</li>';
    }
});

// 3. 播放歌曲的函数 (添加了 realIP 参数)
function playSong(songId, songName) {
    nowPlaying.textContent = `正在加载: ${songName}`;
    // --- 最终更新 ---
    // 在请求URL的末尾加上 &realIP=...
    fetch(`${API_BASE_URL}/song/url?id=${songId}&realIP=${REAL_IP}`)
        .then(response => response.json())
        .then(data => {
            if (data.data && data.data[0].url) {
                const songUrl = data.data[0].url;
                audioPlayer.src = songUrl;
                audioPlayer.play();
                nowPlaying.textContent = `正在播放: ${songName}`;
            } else {
                alert('获取歌曲播放地址失败！');
                nowPlaying.textContent = `无法播放: ${songName}`;
            }
        })
        .catch(error => {
            console.error('获取播放地址出错了:', error);
            alert('播放失败，请检查网络或稍后再试。');
        });
}