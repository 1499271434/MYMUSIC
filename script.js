// --- 重大改动 ---
// 请将下面的网址替换成您自己部署好的酷狗API的Vercel网址！
const API_BASE_URL = 'https://www.nhyx.zone.id'; // <--- ！！！请务必修改这里 ！！！

// 1. 获取HTML元素 (这部分不变)
const searchButton = document.getElementById('searchButton');
const searchInput = document.getElementById('searchInput');
const resultsList = document.getElementById('resultsList');
const audioPlayer = document.getElementById('audioPlayer');
const nowPlaying = document.getElementById('nowPlaying');

// 2. 搜索按钮的点击事件 (逻辑已完全重写以适配酷狗API)
searchButton.addEventListener('click', () => {
    const keyword = searchInput.value;
    if (keyword === '') {
        alert('请输入歌曲或歌手名！');
        return;
    }

    resultsList.innerHTML = '<li>正在搜索，请稍候...</li>';

    // --- 重大改动 ---
    // 请求酷狗API的搜索接口
    fetch(`${API_BASE_URL}/search?keyword=${keyword}`)
        .then(response => response.json())
        .then(data => {
            resultsList.innerHTML = ''; // 清空列表

            // --- 重大改动 ---
            // 根据酷狗API返回的数据结构来解析
            // 注意：这里我们假设返回的数据在 data.data.info 中，如果不对，需要根据实际情况调整
            if (data.data && data.data.info && data.data.info.length > 0) {
                const songs = data.data.info;
                songs.forEach(song => {
                    const listItem = document.createElement('li');
                    // 酷狗API返回的歌曲信息字段是 SongName, SingerName 等
                    listItem.textContent = `${song.songname_original} - ${song.singername}`;

                    // --- 重大改动 ---
                    // 播放时需要传递歌曲的 hash 和 album_id
                    listItem.addEventListener('click', () => {
                        // 我们需要从song对象里拿到FileHash和AlbumID
                        playSong(song.hash, song.album_id, `${song.songname_original} - ${song.singername}`);
                    });
                    resultsList.appendChild(listItem);
                });
            } else {
                resultsList.innerHTML = '<li>没有找到相关歌曲。</li>';
            }
        })
        .catch(error => {
            console.error('搜索出错了:', error);
            resultsList.innerHTML = '<li>搜索失败，请检查网络或API是否正常。</li>';
        });
});

// 3. 播放歌曲的函数 (逻辑已完全重写以适配酷狗API)
function playSong(hash, albumId, songName) {
    nowPlaying.textContent = `正在加载: ${songName}`;

    // --- 重大改动 ---
    // 请求酷狗API的获取URL接口，它需要 hash 和 album_id
    // 注意：文档里有多个获取URL的接口，这里我们尝试使用/song/url/v2
    fetch(`${API_BASE_URL}/song/url/v2?hash=${hash}&album_mid=${albumId}`)
        .then(response => response.json())
        .then(data => {
            // --- 重大改动 ---
            // 根据酷狗API返回的URL数据结构来解析
            if (data.data && data.data.play_url) {
                const songUrl = data.data.play_url;
                audioPlayer.src = songUrl;
                audioPlayer.play();
                nowPlaying.textContent = `正在播放: ${songName}`;
            } else {
                // 如果播放失败，可以提示更详细的信息
                console.log('获取播放地址失败返回的数据:', data); // 在控制台打印失败信息，方便排查
                alert('获取歌曲播放地址失败！可能是VIP歌曲或需要付费。');
                nowPlaying.textContent = `无法播放: ${songName}`;
            }
        })
        .catch(error => {
            console.error('获取播放地址出错了:', error);
            alert('播放失败，请检查网络或API是否正常。');
        });
}