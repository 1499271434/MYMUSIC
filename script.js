// 使用新的免费API
const API_BASE_URL = 'https://netease-cloud-music-api-beta-lyart.vercel.app';

const searchButton = document.getElementById('searchButton');
const searchInput = document.getElementById('searchInput');
const resultsList = document.getElementById('resultsList');
const audioPlayer = document.getElementById('audioPlayer');
const nowPlaying = document.getElementById('nowPlaying');

searchButton.addEventListener('click', () => {
    const keyword = searchInput.value;
    if (keyword === '') {
        alert('请输入歌曲或歌手名！');
        return;
    }
    resultsList.innerHTML = '<li>正在搜索，请稍候...</li>';
    fetch(`${API_BASE_URL}/search?keywords=${keyword}`)
        .then(response => response.json())
        .then(data => {
            resultsList.innerHTML = '';
            if (data.result && data.result.songs) {
                data.result.songs.forEach(song => {
                    const listItem = document.createElement('li');
                    listItem.textContent = `${song.name} - ${song.artists[0].name}`;
                    listItem.addEventListener('click', () => {
                        playSong(song.id, `${song.name} - ${song.artists[0].name}`);
                    });
                    resultsList.appendChild(listItem);
                });
            } else {
                resultsList.innerHTML = '<li>没有找到相关歌曲。</li>';
            }
        })
        .catch(error => {
            console.error('搜索出错了:', error);
            resultsList.innerHTML = '<li>搜索失败，请检查网络或稍后再试。</li>';
        });
});

function playSong(songId, songName) {
    nowPlaying.textContent = `正在播放: ${songName}`;
    fetch(`${API_BASE_URL}/song/url?id=${songId}`)
        .then(response => response.json())
        .then(data => {
            if (data.data && data.data[0].url) {
                const songUrl = data.data[0].url;
                audioPlayer.src = songUrl;
                audioPlayer.play();
            } else {
                alert('获取歌曲播放地址失败！这可能是一首付费歌曲。');
                nowPlaying.textContent = `无法播放: ${songName}`;
            }
        })
        .catch(error => {
            console.error('获取播放地址出错了:', error);
            alert('播放失败，请检查网络或稍后再试。');
        });
}
