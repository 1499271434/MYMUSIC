class MusicPlayer {
    constructor() {
        this.apiBase = 'https://www.nhmusic.zone.id';
        this.currentSong = null;
        this.playlist = [];
        this.currentIndex = 0;
        this.isPlaying = false;
        this.isShuffled = false;
        this.isRepeating = false;
        this.volume = 0.7;
        this.currentTime = 0;
        this.duration = 0;
        this.lyrics = [];
        this.currentLyricIndex = 0;
        
        // 搜索翻页相关变量
        this.currentSearchQuery = '';
        this.currentPage = 1;
        this.itemsPerPage = 20;
        this.totalResults = 0;
        
        // 无限随机播放相关变量
        this.isInfiniteRandomMode = false;
        this.playedSongs = new Set(); // 记录已播放的歌曲ID，避免重复
        this.randomKeywords = [
            '周杰伦', '邓紫棋', '陈奕迅', '林俊杰', '张学友', '王菲', '刘德华', '李荣浩',
            '薛之谦', '毛不易', '华晨宇', '张碧晨', '汪苏泷', '胡彦斌', '许嵩', '汪峰',
            '田馥甄', '蔡依林', '梁静茹', '孙燕姿', '张韶涵', '容祖儿', '莫文蔚', '那英',
            '五月天', 'Beyond', '羽泉', '凤凰传奇', 'SHE', 'F4', '飞儿乐团', '信乐团',
            '流行', '摇滚', '民谣', '电子', '爵士', '古风', '说唱', '轻音乐'
        ];
        this.currentKeywordIndex = 0;
        
        this.initializeElements();
        this.bindEvents();
        this.setupAudioEvents();
        
        // 显示简洁的欢迎界面
        this.displayWelcomeContent();
    }

    initializeElements() {
        // 音频元素
        this.audio = document.getElementById('audioPlayer');
        
        // 导航元素
        this.navItems = document.querySelectorAll('.nav-item');
        this.contentSections = document.querySelectorAll('.content-section');
        
        // 搜索相关
        this.searchInput = document.getElementById('searchInput');
        this.searchBtn = document.getElementById('searchBtn');
        this.searchModal = document.getElementById('searchModal');
        this.searchResults = document.getElementById('searchResults');
        this.closeSearchModal = document.getElementById('closeSearchModal');
        
        // 翻页相关元素
        this.paginationContainer = document.getElementById('paginationContainer');
        this.prevPageBtn = document.getElementById('prevPageBtn');
        this.nextPageBtn = document.getElementById('nextPageBtn');
        this.pageInfo = document.getElementById('pageInfo');
        
        // 播放器控制
        this.playBtn = document.getElementById('playBtn');
        this.prevBtn = document.getElementById('prevBtn');
        this.nextBtn = document.getElementById('nextBtn');
        this.shuffleBtn = document.getElementById('shuffleBtn');
        this.repeatBtn = document.getElementById('repeatBtn');
        
        // 进度条
        this.progressBar = document.querySelector('.progress-bar');
        this.progressFill = document.getElementById('progressBarFill');
        this.progressHandle = document.getElementById('progressBarHandle');
        this.currentTimeEl = document.getElementById('currentTime');
        this.totalTimeEl = document.getElementById('totalTime');
        
        // 音量控制
        this.volumeSlider = document.getElementById('volumeSlider');
        this.muteBtn = document.getElementById('muteBtn');
        
        // 当前歌曲显示
        this.currentCover = document.getElementById('currentCover');
        this.currentTitle = document.getElementById('currentTitle');
        this.currentArtist = document.getElementById('currentArtist');
        this.favoriteBtn = document.getElementById('favoriteBtn');
        
        // 内容容器
        this.songGrid = document.getElementById('songGrid');
        this.playlistContainer = document.getElementById('playlistContainer');
        this.lyricsContainer = document.getElementById('lyricsContainer');
        
        // 操作按钮
        this.randomPlayBtn = document.getElementById('randomPlayBtn');
        this.clearPlaylistBtn = document.getElementById('clearPlaylistBtn');
        this.playlistToggle = document.getElementById('playlistToggle');
        
        // 加载覆盖层
        this.loadingOverlay = document.getElementById('loadingOverlay');
    }

    bindEvents() {
        // 导航事件
        this.navItems.forEach(item => {
            item.addEventListener('click', (e) => this.switchSection(e.target.closest('.nav-item').dataset.section));
        });

        // 搜索事件
        this.searchBtn.addEventListener('click', () => this.performSearch());
        this.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.performSearch();
        });
        this.closeSearchModal.addEventListener('click', () => this.closeModal());
        
        // 翻页事件
        this.prevPageBtn.addEventListener('click', () => this.goToPreviousPage());
        this.nextPageBtn.addEventListener('click', () => this.goToNextPage());

        // 播放器控制事件
        this.playBtn.addEventListener('click', () => this.togglePlay());
        this.prevBtn.addEventListener('click', () => this.previousSong());
        this.nextBtn.addEventListener('click', () => this.nextSong());
        this.shuffleBtn.addEventListener('click', () => this.toggleShuffle());
        this.repeatBtn.addEventListener('click', () => this.toggleRepeat());

        // 进度条事件
        this.progressBar.addEventListener('click', (e) => this.seekTo(e));
        this.progressBar.addEventListener('mouseenter', () => {
            this.progressHandle.style.opacity = '1';
        });
        this.progressBar.addEventListener('mouseleave', () => {
            this.progressHandle.style.opacity = '0';
        });

        // 音量事件
        this.volumeSlider.addEventListener('input', (e) => this.setVolume(e.target.value / 100));
        this.muteBtn.addEventListener('click', () => this.toggleMute());

        // 其他控制事件
        this.favoriteBtn.addEventListener('click', () => this.toggleFavorite());
        this.randomPlayBtn.addEventListener('click', () => this.playRandomSongs());
        this.clearPlaylistBtn.addEventListener('click', () => this.clearPlaylist());
        this.playlistToggle.addEventListener('click', () => this.switchSection('playlist'));

        // 模态框关闭
        this.searchModal.addEventListener('click', (e) => {
            if (e.target === this.searchModal) this.closeModal();
        });
    }

    setupAudioEvents() {
        this.audio.addEventListener('timeupdate', () => this.updateProgress());
        this.audio.addEventListener('loadedmetadata', () => this.updateDuration());
        this.audio.addEventListener('ended', () => this.onSongEnd());
        this.audio.addEventListener('play', () => this.onPlay());
        this.audio.addEventListener('pause', () => this.onPause());
        this.audio.addEventListener('error', (e) => this.onAudioError(e));
    }

    async loadHotSongs() {
        try {
            this.showLoading(true);
            
            // 加载一些流行歌曲，通过搜索流行关键词
            const keywords = ['周杰伦', '邓紫棋', '陈奕迅', '林俊杰', '张学友', '王菲', '刘德华', '李荣浩'];
            const allSongs = [];
            
            for (let i = 0; i < 3; i++) { // 从3个随机艺人加载歌曲
                const keyword = keywords[Math.floor(Math.random() * keywords.length)];
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时
                    
                    const response = await fetch(`${this.apiBase}/search?keywords=${encodeURIComponent(keyword)}&limit=10`, {
                        signal: controller.signal,
                        mode: 'cors'
                    });
                    clearTimeout(timeoutId);
                    
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}`);
                    }
                    
                    const data = await response.json();
                    
                    if (data.result && data.result.songs) {
                        allSongs.push(...data.result.songs.slice(0, 6));
                    }
                } catch (error) {
                    if (error.name === 'AbortError') {
                        console.warn(`加载 ${keyword} 的歌曲超时`);
                    } else {
                        console.warn(`加载 ${keyword} 的歌曲失败:`, error.message);
                    }
                }
            }
            
            if (allSongs.length === 0) {
                // 如果没有加载到任何歌曲，显示一些默认内容
                this.displayDefaultContent();
                return;
            }
            
            // 去重并限制为20首歌
            const uniqueSongs = allSongs.filter((song, index, self) => 
                index === self.findIndex(s => s.id === song.id)
            ).slice(0, 20);
            
            this.displaySongs(uniqueSongs);
            this.playlist = [...uniqueSongs];
            
        } catch (error) {
            console.error('加载热门歌曲失败:', error);
            this.displayDefaultContent();
        } finally {
            this.showLoading(false);
        }
    }

    displayWelcomeContent() {
        this.songGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: rgba(255, 255, 255, 0.7);">
                <i class="fas fa-music" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5; animation: pulse 2s infinite;"></i>
                <h3>🎵 欢迎使用奈何音乐</h3>
                <p style="margin: 1rem 0; font-size: 1.1rem;">点击下方"随机播放"开始您的音乐之旅</p>
                <p style="font-size: 0.9rem; opacity: 0.8; margin-top: 2rem;">
                    ✨ 无限随机播放：永不重复，发现更多好音乐
                </p>
                <p style="font-size: 0.9rem; opacity: 0.6; margin-top: 1rem;">
                    或使用上方搜索框查找特定歌曲
                </p>
            </div>
        `;
        
        // 添加动画效果
        if (!document.getElementById('welcome-styles')) {
            const style = document.createElement('style');
            style.id = 'welcome-styles';
            style.textContent = `
                @keyframes pulse {
                    0%, 100% { opacity: 0.5; transform: scale(1); }
                    50% { opacity: 0.8; transform: scale(1.05); }
                }
            `;
            document.head.appendChild(style);
        }
    }

    displayDefaultContent() {
        this.displayWelcomeContent();
    }

    displaySongs(songs) {
        this.songGrid.innerHTML = '';
        
        songs.forEach(song => {
            const songCard = this.createSongCard(song);
            this.songGrid.appendChild(songCard);
        });
    }

    createSongCard(song) {
        const card = document.createElement('div');
        card.className = 'song-card';
        card.innerHTML = `
            <div class="song-card-header">
                <div class="song-info">
                    <h3>${this.escapeHtml(song.name)}</h3>
                    <p>${this.escapeHtml(song.artists?.map(a => a.name).join(', ') || '未知歌手')}</p>
                </div>
                <button class="play-icon" onclick="musicPlayer.playSong(${song.id})">
                    <i class="fas fa-play"></i>
                </button>
            </div>
            <div class="song-meta">
                <span>${this.escapeHtml(song.album?.name || '未知专辑')}</span>
                <span>${this.formatDuration(song.duration)}</span>
            </div>
        `;
        
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.play-icon')) {
                this.addToPlaylist(song);
            }
        });
        
        return card;
    }

    async performSearch(page = 1) {
        const query = this.searchInput.value.trim();
        if (!query) return;

        // 如果是新的搜索查询，重置页码
        if (query !== this.currentSearchQuery) {
            this.currentPage = 1;
            this.currentSearchQuery = query;
        } else {
            this.currentPage = page;
        }

        try {
            this.showLoading(true);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15秒超时
            
            const offset = (this.currentPage - 1) * this.itemsPerPage;
            const response = await fetch(`${this.apiBase}/search?keywords=${encodeURIComponent(query)}&limit=${this.itemsPerPage}&offset=${offset}`, {
                signal: controller.signal,
                mode: 'cors'
            });
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`搜索请求失败 (HTTP ${response.status})`);
            }
            
            const data = await response.json();
            
            if (data.result && data.result.songs && data.result.songs.length > 0) {
                this.totalResults = data.result.songCount || 0;
                this.displaySearchResults(data.result.songs);
                this.updatePagination();
                this.showModal();
            } else {
                this.showError('未找到相关歌曲，请尝试其他关键词');
                this.hidePagination();
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                this.showError('搜索超时，请检查网络连接');
            } else {
                console.warn('搜索失败:', error.message);
                this.showError('搜索失败，请稍后重试');
            }
            this.hidePagination();
        } finally {
            this.showLoading(false);
        }
    }

    displaySearchResults(songs) {
        this.searchResults.innerHTML = '';
        
        songs.forEach(song => {
            const item = document.createElement('div');
            item.className = 'search-result-item';
            
            // 创建封面元素
            const coverDiv = document.createElement('div');
            coverDiv.className = 'song-cover';
            const img = document.createElement('img');
            img.alt = '封面';
            img.onerror = () => {
                img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiBmaWxsPSIjMUExQTFBIi8+Cjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0iY2VudHJhbCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI0ZGRiIgZm9udC1zaXplPSIyMCI+4pmqPC90ZXh0Pgo8L3N2Zz4K';
            };
            // 使用默认图片或API提供的图片
            if (song.album?.picUrl) {
                img.src = song.album.picUrl;
            } else {
                img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiBmaWxsPSIjMUExQTFBIi8+Cjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0iY2VudHJhbCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI0ZGRiIgZm9udC1zaXplPSIyMCI+4pmqPC90ZXh0Pgo8L3N2Zz4K';
            }
            coverDiv.appendChild(img);
            
            // 创建歌曲信息元素
            const infoDiv = document.createElement('div');
            infoDiv.className = 'playlist-item-info';
            const title = document.createElement('h4');
            title.textContent = song.name;
            const subtitle = document.createElement('p');
            subtitle.textContent = `${song.artists?.map(a => a.name).join(', ') || '未知歌手'} - ${song.album?.name || '未知专辑'}`;
            infoDiv.appendChild(title);
            infoDiv.appendChild(subtitle);
            
            // 创建控制按钮
            const controlsDiv = document.createElement('div');
            controlsDiv.className = 'playlist-item-controls';
            
            const playBtn = document.createElement('button');
            playBtn.title = '播放';
            playBtn.innerHTML = '<i class="fas fa-play"></i>';
            playBtn.onclick = () => this.playSong(song.id);
            
            const addBtn = document.createElement('button');
            addBtn.title = '添加到播放列表';
            addBtn.innerHTML = '<i class="fas fa-plus"></i>';
            addBtn.onclick = () => this.addToPlaylist(song);
            
            controlsDiv.appendChild(playBtn);
            controlsDiv.appendChild(addBtn);
            
            // 组装元素
            item.appendChild(coverDiv);
            item.appendChild(infoDiv);
            item.appendChild(controlsDiv);
            
            this.searchResults.appendChild(item);
        });
    }

    // 翻页相关方法
    updatePagination() {
        const totalPages = Math.ceil(this.totalResults / this.itemsPerPage);
        
        // 显示翻页容器
        this.paginationContainer.style.display = 'flex';
        
        // 更新页面信息
        this.pageInfo.textContent = `第 ${this.currentPage} 页 / 共 ${totalPages} 页`;
        
        // 更新按钮状态
        this.prevPageBtn.disabled = this.currentPage <= 1;
        this.nextPageBtn.disabled = this.currentPage >= totalPages;
    }

    hidePagination() {
        this.paginationContainer.style.display = 'none';
    }

    async goToPreviousPage() {
        if (this.currentPage > 1) {
            await this.performSearch(this.currentPage - 1);
        }
    }

    async goToNextPage() {
        const totalPages = Math.ceil(this.totalResults / this.itemsPerPage);
        if (this.currentPage < totalPages) {
            await this.performSearch(this.currentPage + 1);
        }
    }

    async playSong(songId) {
        try {
            this.showLoading(true);
            
            // 获取歌曲URL
            const urlResponse = await fetch(`${this.apiBase}/song/url?id=${songId}`);
            const urlData = await urlResponse.json();
            
            if (!urlData.data || !urlData.data[0] || !urlData.data[0].url) {
                throw new Error('无法获取歌曲播放链接');
            }
            
            const songUrl = urlData.data[0].url;
            
            // 获取歌曲详情
            const detailResponse = await fetch(`${this.apiBase}/song/detail?ids=${songId}`);
            const detailData = await detailResponse.json();
            
            if (!detailData.songs || !detailData.songs[0]) {
                throw new Error('无法获取歌曲详情');
            }
            
            const song = detailData.songs[0];
            this.currentSong = {
                id: song.id,
                name: song.name,
                artists: song.artists || song.ar,
                album: song.album || song.al,
                duration: song.duration || song.dt,
                url: songUrl
            };
            
            // 更新播放列表中的当前索引
            const playlistIndex = this.playlist.findIndex(s => s.id === songId);
            if (playlistIndex !== -1) {
                this.currentIndex = playlistIndex;
            }
            
            this.audio.src = songUrl;
            this.audio.load();
            
            await this.audio.play();
            this.updateCurrentSongDisplay();
            this.loadLyrics(songId);
            this.closeModal();
            
        } catch (error) {
            console.error('播放歌曲失败:', error);
            this.showError(error.message || '播放失败，请稍后重试');
        } finally {
            this.showLoading(false);
        }
    }

    async loadLyrics(songId) {
        try {
            const response = await fetch(`${this.apiBase}/lyric?id=${songId}`);
            const data = await response.json();
            
            if (data.lrc && data.lrc.lyric) {
                this.parseLyrics(data.lrc.lyric);
                this.displayLyrics();
            } else {
                this.lyrics = [];
                this.displayNoLyrics();
            }
        } catch (error) {
            console.error('加载歌词失败:', error);
            this.lyrics = [];
            this.displayNoLyrics();
        }
    }

    parseLyrics(lrcText) {
        const lines = lrcText.split('\n');
        this.lyrics = [];
        
        lines.forEach(line => {
            const match = line.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/);
            if (match) {
                const minutes = parseInt(match[1]);
                const seconds = parseInt(match[2]);
                const milliseconds = parseInt(match[3].padEnd(3, '0'));
                const time = minutes * 60 + seconds + milliseconds / 1000;
                const text = match[4].trim();
                
                if (text) {
                    this.lyrics.push({ time, text });
                }
            }
        });
        
        this.lyrics.sort((a, b) => a.time - b.time);
    }

    displayLyrics() {
        if (this.lyrics.length === 0) {
            this.displayNoLyrics();
            return;
        }
        
        this.lyricsContainer.innerHTML = '<div class="lyrics-content"></div>';
        const lyricsContent = this.lyricsContainer.querySelector('.lyrics-content');
        
        this.lyrics.forEach((lyric, index) => {
            const line = document.createElement('div');
            line.className = 'lyric-line';
            line.textContent = lyric.text;
            line.addEventListener('click', () => {
                this.audio.currentTime = lyric.time;
            });
            lyricsContent.appendChild(line);
        });
    }

    displayNoLyrics() {
        this.lyricsContainer.innerHTML = `
            <div class="no-lyrics">
                <i class="fas fa-music"></i>
                <p>暂无歌词</p>
            </div>
        `;
    }

    updateCurrentSongDisplay() {
        if (!this.currentSong) return;
        
        // 设置封面图片
        this.currentCover.onerror = () => {
            this.currentCover.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjMUExQTFBIi8+Cjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0iY2VudHJhbCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI0ZGRiIgZm9udC1zaXplPSIyNCI+4pmqPC90ZXh0Pgo8L3N2Zz4K';
        };
        
        if (this.currentSong.album?.picUrl) {
            this.currentCover.src = this.currentSong.album.picUrl;
        } else {
            this.currentCover.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjMUExQTFBIi8+Cjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0iY2VudHJhbCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI0ZGRiIgZm9udC1zaXplPSIyNCI+4pmqPC90ZXh0Pgo8L3N2Zz4K';
        }
        
        this.currentTitle.textContent = this.currentSong.name;
        this.currentArtist.textContent = this.currentSong.artists?.map(a => a.name).join(', ') || '未知歌手';
        
        // 更新收藏按钮状态
        if (userManager && userManager.isLoggedIn) {
            const isFavorited = userManager.isFavorited(this.currentSong.id);
            this.favoriteBtn.classList.toggle('active', isFavorited);
        } else {
            this.favoriteBtn.classList.remove('active');
        }
        
        // 更新文档标题
        document.title = `${this.currentSong.name} - ${this.currentArtist.textContent} | 音乐播放器`;
    }

    togglePlay() {
        if (!this.currentSong) {
            if (this.playlist.length > 0) {
                this.playSong(this.playlist[0].id);
            } else {
                // 如果没有播放列表，启动无限随机播放
                this.playRandomSongs();
            }
            return;
        }
        
        if (this.isPlaying) {
            this.audio.pause();
        } else {
            this.audio.play();
        }
    }

    previousSong() {
        if (this.isInfiniteRandomMode) {
            // 无限随机模式：播放另一首随机歌曲
            this.playNextRandomSong();
            return;
        }
        
        if (this.playlist.length === 0) return;
        
        if (this.isShuffled) {
            this.currentIndex = Math.floor(Math.random() * this.playlist.length);
        } else {
            this.currentIndex = this.currentIndex > 0 ? this.currentIndex - 1 : this.playlist.length - 1;
        }
        
        this.playSong(this.playlist[this.currentIndex].id);
    }

    nextSong() {
        if (this.isInfiniteRandomMode) {
            // 无限随机模式：播放下一首随机歌曲
            this.playNextRandomSong();
            return;
        }
        
        if (this.playlist.length === 0) return;
        
        if (this.isShuffled) {
            this.currentIndex = Math.floor(Math.random() * this.playlist.length);
        } else {
            this.currentIndex = this.currentIndex < this.playlist.length - 1 ? this.currentIndex + 1 : 0;
        }
        
        this.playSong(this.playlist[this.currentIndex].id);
    }

    onSongEnd() {
        if (this.isRepeating) {
            this.audio.currentTime = 0;
            this.audio.play();
        } else if (this.isInfiniteRandomMode) {
            // 无限随机模式：播放下一首随机歌曲
            this.playNextRandomSong();
        } else {
            this.nextSong();
        }
    }

    toggleShuffle() {
        if (this.isInfiniteRandomMode) {
            // 如果正在无限随机播放，则停止
            this.stopInfiniteRandom();
        } else {
            // 普通随机播放切换
            this.isShuffled = !this.isShuffled;
            this.shuffleBtn.classList.toggle('active', this.isShuffled);
            
            if (this.isShuffled) {
                this.showNotification('已开启随机播放');
            } else {
                this.showNotification('已关闭随机播放');
            }
        }
    }

    stopInfiniteRandom() {
        this.isInfiniteRandomMode = false;
        this.isShuffled = false;
        this.shuffleBtn.classList.remove('active');
        this.showNotification('已停止无限随机播放');
    }

    toggleRepeat() {
        this.isRepeating = !this.isRepeating;
        this.repeatBtn.classList.toggle('active', this.isRepeating);
        
        if (this.isRepeating) {
            this.showNotification('已开启单曲循环');
        } else {
            this.showNotification('已关闭单曲循环');
        }
    }

    async playRandomSongs() {
        this.isInfiniteRandomMode = true;
        this.isShuffled = true;
        this.shuffleBtn.classList.add('active');
        
        // 清空播放列表，因为我们要无限随机播放
        this.playlist = [];
        this.currentIndex = 0;
        
        this.showNotification('🎵 开始无限随机播放');
        
        // 开始播放第一首随机歌曲
        await this.playNextRandomSong();
    }

    async playNextRandomSong() {
        try {
            this.showLoading(true);
            
            // 获取随机歌曲
            const randomSong = await this.getRandomSong();
            if (randomSong) {
                await this.playSong(randomSong.id);
                // 将歌曲添加到已播放列表
                this.playedSongs.add(randomSong.id);
                
                // 如果已播放歌曲太多，清理一些旧的记录（保留最近1000首）
                if (this.playedSongs.size > 1000) {
                    const songsArray = Array.from(this.playedSongs);
                    this.playedSongs = new Set(songsArray.slice(-800)); // 保留最近800首
                }
            } else {
                this.showError('暂时无法获取随机歌曲，请稍后重试');
                this.isInfiniteRandomMode = false;
            }
        } catch (error) {
            console.error('播放随机歌曲失败:', error);
            this.showError('播放失败，正在尝试下一首');
            // 继续尝试下一首
            if (this.isInfiniteRandomMode) {
                setTimeout(() => this.playNextRandomSong(), 2000);
            }
        } finally {
            this.showLoading(false);
        }
    }

    async getRandomSong() {
        const maxAttempts = 10; // 最多尝试10次找到未播放的歌曲
        
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            try {
                // 随机选择关键词
                const randomKeyword = this.randomKeywords[Math.floor(Math.random() * this.randomKeywords.length)];
                
                // 随机选择偏移量，获取不同位置的歌曲
                const randomOffset = Math.floor(Math.random() * 100);
                
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 8000);
                
                const response = await fetch(`${this.apiBase}/search?keywords=${encodeURIComponent(randomKeyword)}&limit=20&offset=${randomOffset}`, {
                    signal: controller.signal,
                    mode: 'cors'
                });
                clearTimeout(timeoutId);
                
                if (!response.ok) continue;
                
                const data = await response.json();
                
                if (data.result && data.result.songs && data.result.songs.length > 0) {
                    // 过滤掉已播放的歌曲
                    const unplayedSongs = data.result.songs.filter(song => !this.playedSongs.has(song.id));
                    
                    if (unplayedSongs.length > 0) {
                        // 随机选择一首未播放的歌曲
                        const randomSong = unplayedSongs[Math.floor(Math.random() * unplayedSongs.length)];
                        return randomSong;
                    }
                }
            } catch (error) {
                console.warn(`获取随机歌曲失败 (尝试 ${attempt + 1}):`, error.message);
                continue;
            }
        }
        
        return null; // 如果所有尝试都失败了
    }

    addToPlaylist(song) {
        // 检查歌曲是否已经在播放列表中
        const exists = this.playlist.find(s => s.id === song.id);
        if (exists) {
            this.showNotification('歌曲已在播放列表中');
            return;
        }
        
        this.playlist.push(song);
        this.updatePlaylistDisplay();
        this.showNotification(`已添加 "${song.name}" 到播放列表`);
    }

    removeFromPlaylist(index) {
        if (index < 0 || index >= this.playlist.length) return;
        
        const song = this.playlist[index];
        this.playlist.splice(index, 1);
        
        // 如果需要，调整当前索引
        if (this.currentIndex >= index) {
            this.currentIndex = Math.max(0, this.currentIndex - 1);
        }
        
        this.updatePlaylistDisplay();
        this.showNotification(`已从播放列表移除 "${song.name}"`);
    }

    clearPlaylist() {
        this.playlist = [];
        this.currentIndex = 0;
        this.updatePlaylistDisplay();
        this.showNotification('播放列表已清空');
    }

    updatePlaylistDisplay() {
        this.playlistContainer.innerHTML = '';
        
        if (this.playlist.length === 0) {
            this.playlistContainer.innerHTML = `
                <div class="no-lyrics">
                    <i class="fas fa-list"></i>
                    <p>播放列表为空</p>
                </div>
            `;
            return;
        }
        
        this.playlist.forEach((song, index) => {
            const item = document.createElement('div');
            item.className = `playlist-item ${this.currentSong && song.id === this.currentSong.id ? 'playing' : ''}`;
            
            // 创建封面元素
            const coverDiv = document.createElement('div');
            coverDiv.className = 'song-cover';
            const img = document.createElement('img');
            img.alt = '封面';
            img.onerror = () => {
                img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiBmaWxsPSIjMUExQTFBIi8+Cjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0iY2VudHJhbCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI0ZGRiIgZm9udC1zaXplPSIyMCI+4pmqPC90ZXh0Pgo8L3N2Zz4K';
            };
            if (song.album?.picUrl) {
                img.src = song.album.picUrl;
            } else {
                img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiBmaWxsPSIjMUExQTFBIi8+Cjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0iY2VudHJhbCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI0ZGRiIgZm9udC1zaXplPSIyMCI+4pmqPC90ZXh0Pgo8L3N2Zz4K';
            }
            coverDiv.appendChild(img);
            
            // 创建歌曲信息
            const infoDiv = document.createElement('div');
            infoDiv.className = 'playlist-item-info';
            const title = document.createElement('h4');
            title.textContent = song.name;
            const subtitle = document.createElement('p');
            subtitle.textContent = song.artists?.map(a => a.name).join(', ') || '未知歌手';
            infoDiv.appendChild(title);
            infoDiv.appendChild(subtitle);
            
            // 创建控制按钮
            const controlsDiv = document.createElement('div');
            controlsDiv.className = 'playlist-item-controls';
            
            const playBtn = document.createElement('button');
            playBtn.title = '播放';
            playBtn.innerHTML = '<i class="fas fa-play"></i>';
            playBtn.onclick = () => this.playSong(song.id);
            
            const removeBtn = document.createElement('button');
            removeBtn.title = '移除';
            removeBtn.innerHTML = '<i class="fas fa-trash"></i>';
            removeBtn.onclick = () => this.removeFromPlaylist(index);
            
            controlsDiv.appendChild(playBtn);
            controlsDiv.appendChild(removeBtn);
            
            // 组装元素
            item.appendChild(coverDiv);
            item.appendChild(infoDiv);
            item.appendChild(controlsDiv);
            
            this.playlistContainer.appendChild(item);
        });
    }

    updateProgress() {
        if (!this.audio.duration) return;
        
        this.currentTime = this.audio.currentTime;
        const progress = (this.currentTime / this.audio.duration) * 100;
        
        this.progressFill.style.width = `${progress}%`;
        this.progressHandle.style.left = `${progress}%`;
        this.currentTimeEl.textContent = this.formatTime(this.currentTime);
        
        // 更新歌词
        this.updateCurrentLyric();
    }

    updateCurrentLyric() {
        if (this.lyrics.length === 0) return;
        
        let currentLyricIndex = -1;
        for (let i = 0; i < this.lyrics.length; i++) {
            if (this.lyrics[i].time <= this.currentTime) {
                currentLyricIndex = i;
            } else {
                break;
            }
        }
        
        if (currentLyricIndex !== this.currentLyricIndex && currentLyricIndex >= 0) {
            this.currentLyricIndex = currentLyricIndex;
            
            // 更新歌词显示
            const lyricLines = this.lyricsContainer.querySelectorAll('.lyric-line');
            lyricLines.forEach((line, index) => {
                line.classList.toggle('active', index === currentLyricIndex);
            });
            
            // 滚动到当前歌词
            if (lyricLines[currentLyricIndex]) {
                lyricLines[currentLyricIndex].scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center' 
                });
            }
        }
    }

    updateDuration() {
        this.duration = this.audio.duration || 0;
        this.totalTimeEl.textContent = this.formatTime(this.duration);
    }

    seekTo(e) {
        if (!this.audio.duration) return;
        
        const rect = this.progressBar.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        const seekTime = percent * this.audio.duration;
        
        this.audio.currentTime = seekTime;
    }

    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        this.audio.volume = this.volume;
        
        // 更新音量图标
        const icon = this.muteBtn.querySelector('i');
        if (this.volume === 0) {
            icon.className = 'fas fa-volume-mute';
        } else if (this.volume < 0.5) {
            icon.className = 'fas fa-volume-down';
        } else {
            icon.className = 'fas fa-volume-up';
        }
    }

    toggleMute() {
        if (this.audio.volume > 0) {
            this.audio.volume = 0;
            this.volumeSlider.value = 0;
            this.muteBtn.querySelector('i').className = 'fas fa-volume-mute';
        } else {
            this.audio.volume = this.volume;
            this.volumeSlider.value = this.volume * 100;
            this.setVolume(this.volume);
        }
    }

    async toggleFavorite() {
        if (!this.currentSong) {
            this.showNotification('请先选择一首歌曲', 'error');
            return;
        }
        
        // 检查用户是否登录
        if (!userManager || !userManager.isLoggedIn) {
            this.showNotification('请先登录以收藏歌曲', 'error');
            return;
        }
        
        const isFavorited = userManager.isFavorited(this.currentSong.id);
        
        if (isFavorited) {
            // 取消收藏
            await userManager.removeFromFavorites(this.currentSong.id);
            this.favoriteBtn.classList.remove('active');
        } else {
            // 添加到收藏
            const success = await userManager.addToFavorites(this.currentSong);
            if (success) {
                this.favoriteBtn.classList.add('active');
            }
        }
    }

    onPlay() {
        this.isPlaying = true;
        this.playBtn.querySelector('i').className = 'fas fa-pause';
    }

    onPause() {
        this.isPlaying = false;
        this.playBtn.querySelector('i').className = 'fas fa-play';
    }

    onAudioError(e) {
        console.error('音频错误:', e);
        this.showError('播放出错，正在尝试下一首');
        setTimeout(() => this.nextSong(), 2000);
    }

    switchSection(section) {
        console.log('Switching to section:', section); // 调试信息
        
        // 更新导航
        this.navItems.forEach(item => {
            item.classList.toggle('active', item.dataset.section === section);
        });
        
        // 更新内容区域
        this.contentSections.forEach(sectionEl => {
            sectionEl.classList.toggle('active', sectionEl.id === section);
        });
        
        // 加载特定区域的内容
        if (section === 'playlist') {
            this.updatePlaylistDisplay();
        } else if (section === 'lyrics') {
            // 移除对currentSong的依赖，始终显示歌词界面
            if (this.currentSong) {
                this.displayLyrics();
            } else {
                this.displayNoLyrics();
            }
        } else if (section === 'favorites' && userManager) {
            userManager.updateFavoritesDisplay();
        }
    }

    showModal() {
        this.searchModal.classList.add('active');
    }

    closeModal() {
        this.searchModal.classList.remove('active');
        this.hidePagination();
    }

    showLoading(show) {
        this.loadingOverlay.classList.toggle('active', show);
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 1rem 2rem;
            border-radius: 10px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        notification.textContent = message;
        
        if (!document.getElementById('notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    showError(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(255, 70, 87, 0.9);
            color: white;
            padding: 1rem 2rem;
            border-radius: 10px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 4000);
    }

    formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }

    formatDuration(milliseconds) {
        if (!milliseconds) return '0:00';
        return this.formatTime(milliseconds / 1000);
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
}

// 当DOM加载完成后初始化音乐播放器
document.addEventListener('DOMContentLoaded', () => {
    window.musicPlayer = new MusicPlayer();
});

// 处理浏览器前进/后退按钮
window.addEventListener('popstate', () => {
    if (window.musicPlayer && window.musicPlayer.searchModal.classList.contains('active')) {
        window.musicPlayer.closeModal();
    }
});

// 移动端优化功能
class MobileOptimizer {
    constructor() {
        this.initMobileFeatures();
    }

    initMobileFeatures() {
        // 检测是否为移动设备
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (this.isMobile) {
            this.setupTouchGestures();
            this.preventScrollBounce();
            this.optimizeViewport();
        }
    }

    setupTouchGestures() {
        let startX = 0;
        let startY = 0;
        let isVerticalScroll = false;

        // 在播放器区域添加滑动手势
        const playerContainer = document.querySelector('.player-container');
        if (playerContainer) {
            playerContainer.addEventListener('touchstart', (e) => {
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
                isVerticalScroll = false;
            }, { passive: true });

            playerContainer.addEventListener('touchmove', (e) => {
                if (!startX || !startY) return;

                const currentX = e.touches[0].clientX;
                const currentY = e.touches[0].clientY;
                const diffX = Math.abs(currentX - startX);
                const diffY = Math.abs(currentY - startY);

                // 判断是否为垂直滚动
                if (diffY > diffX && diffY > 10) {
                    isVerticalScroll = true;
                }
            }, { passive: true });

            playerContainer.addEventListener('touchend', (e) => {
                if (!startX || !startY || isVerticalScroll) {
                    startX = 0;
                    startY = 0;
                    return;
                }

                const endX = e.changedTouches[0].clientX;
                const diffX = startX - endX;

                // 滑动阈值
                const threshold = 50;

                if (Math.abs(diffX) > threshold) {
                    if (diffX > 0) {
                        // 向左滑动 - 下一首
                        if (window.musicPlayer) {
                            window.musicPlayer.nextSong();
                        }
                    } else {
                        // 向右滑动 - 上一首
                        if (window.musicPlayer) {
                            window.musicPlayer.prevSong();
                        }
                    }
                }

                startX = 0;
                startY = 0;
            }, { passive: true });
        }
    }

    preventScrollBounce() {
        // 防止iOS Safari的弹性滚动影响播放器
        document.body.addEventListener('touchmove', (e) => {
            // 如果触摸目标是播放器容器，阻止默认滚动
            if (e.target.closest('.player-container')) {
                e.preventDefault();
            }
        }, { passive: false });
    }

    optimizeViewport() {
        // 监听屏幕方向变化
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                // 重新计算播放器位置
                this.adjustPlayerPosition();
            }, 100);
        });

        // 监听虚拟键盘显示/隐藏
        window.addEventListener('resize', () => {
            this.handleVirtualKeyboard();
        });
    }

    adjustPlayerPosition() {
        const playerContainer = document.querySelector('.player-container');
        if (playerContainer && this.isMobile) {
            // 确保播放器始终在可视区域内
            playerContainer.style.bottom = '0';
        }
    }

    handleVirtualKeyboard() {
        const playerContainer = document.querySelector('.player-container');
        if (playerContainer && this.isMobile) {
            const viewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
            const windowHeight = window.innerHeight;
            
            // 如果视口高度明显小于窗口高度，说明虚拟键盘显示了
            if (viewportHeight < windowHeight * 0.75) {
                playerContainer.style.display = 'none';
            } else {
                playerContainer.style.display = 'grid';
            }
        }
    }
}

// 初始化移动端优化
document.addEventListener('DOMContentLoaded', () => {
    new MobileOptimizer();
});
