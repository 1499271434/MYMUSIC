// 用户认证和收藏管理系统
class UserManager {
    constructor() {
        // Upstash Redis 配置
        this.redisUrl = 'https://pleasing-osprey-64320.upstash.io';
        this.redisToken = 'AftAAAIncDE5NmQ0YTUyOWQ1MTU0MTk4YTM0YjFiMGZiMWFmN2NmZHAxNjQzMjA';
        
        // 当前用户信息
        this.currentUser = null;
        this.isLoggedIn = false;
        
        // 用户收藏的歌曲
        this.userFavorites = [];
        
        this.initializeElements();
        this.bindEvents();
        // 延迟执行登录状态检查，确保DOM完全加载
        setTimeout(() => {
            this.checkLoginStatus();
        }, 100);
    }
    
    initializeElements() {
        // 登录相关元素
        this.loginBtn = document.getElementById('loginBtn');
        this.loginText = document.getElementById('loginText');
        this.loginModal = document.getElementById('loginModal');
        this.closeLoginModal = document.getElementById('closeLoginModal');
        this.usernameInput = document.getElementById('usernameInput');
        this.passwordInput = document.getElementById('passwordInput');
        this.loginSubmitBtn = document.getElementById('loginSubmitBtn');
        this.registerBtn = document.getElementById('registerBtn');
        
        // 收藏相关元素
        this.favoritesContainer = document.getElementById('favoritesContainer');
        this.favoritesMessage = document.getElementById('favoritesMessage');
        this.clearFavoritesBtn = document.getElementById('clearFavoritesBtn');
    }
    
    bindEvents() {
        // 登录按钮事件
        this.loginBtn.addEventListener('click', () => {
            if (this.isLoggedIn) {
                this.showUserMenu();
            } else {
                this.showLoginModal();
            }
        });
        
        // 登录模态框事件
        this.closeLoginModal.addEventListener('click', () => this.hideLoginModal());
        this.loginModal.addEventListener('click', (e) => {
            if (e.target === this.loginModal) this.hideLoginModal();
        });
        
        // 登录表单事件
        this.loginSubmitBtn.addEventListener('click', () => this.handleLogin());
        this.registerBtn.addEventListener('click', () => this.handleRegister());
        
        // 回车键登录
        this.usernameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleLogin();
        });
        this.passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleLogin();
        });
        
        // 清空收藏按钮
        this.clearFavoritesBtn.addEventListener('click', () => this.clearFavorites());
    }
    
    // 检查本地存储的登录状态
    async checkLoginStatus() {
        const savedUser = localStorage.getItem('musicApp_user');
        if (savedUser) {
            try {
                this.currentUser = JSON.parse(savedUser);
                this.isLoggedIn = true;
                console.log('从本地存储恢复用户:', this.currentUser); // 调试日志
                this.updateLoginUI();
                await this.loadUserFavorites(); // 确保等待收藏数据加载完成
            } catch (error) {
                console.error('解析用户信息失败:', error);
                localStorage.removeItem('musicApp_user');
                this.isLoggedIn = false;
                this.currentUser = null;
            }
        }
    }
    
    // 显示登录模态框
    showLoginModal() {
        this.loginModal.classList.add('active');
        this.usernameInput.focus();
    }
    
    // 隐藏登录模态框
    hideLoginModal() {
        this.loginModal.classList.remove('active');
        this.clearLoginForm();
    }
    
    // 清空登录表单
    clearLoginForm() {
        this.usernameInput.value = '';
        this.passwordInput.value = '';
    }
    
    // 处理登录
    async handleLogin() {
        const username = this.usernameInput.value.trim();
        const password = this.passwordInput.value.trim();
        
        if (!username || !password) {
            this.showNotification('请输入用户名和密码', 'error');
            return;
        }
        
        try {
            this.showLoading(true);
            
            // 从Redis获取用户信息
            const userData = await this.getFromRedis(`user:${username}`);
            console.log('获取到的用户数据:', userData); // 调试日志
            
            if (!userData) {
                this.showNotification('用户不存在，请先注册', 'error');
                return;
            }
            
            // 确保userData是对象格式
            let userInfo = userData;
            if (typeof userData === 'string') {
                try {
                    userInfo = JSON.parse(userData);
                } catch (e) {
                    console.error('用户数据格式错误:', e);
                    this.showNotification('用户数据格式错误', 'error');
                    return;
                }
            }
            
            // 验证密码（这里使用简单的明文比较，实际应用中应该使用加密）
            if (userInfo.password !== password) {
                console.log('密码比较:', userInfo.password, '!=', password); // 调试日志
                this.showNotification('密码错误', 'error');
                return;
            }
            
            // 登录成功
            this.currentUser = {
                username: userInfo.username || username,
                loginTime: new Date().toISOString()
            };
            this.isLoggedIn = true;
            
            // 保存到本地存储
            localStorage.setItem('musicApp_user', JSON.stringify(this.currentUser));
            
            this.updateLoginUI();
            this.hideLoginModal();
            await this.loadUserFavorites(); // 确保等待收藏数据加载完成
            this.showNotification(`欢迎回来，${username}！`, 'success');
            
        } catch (error) {
            console.error('登录失败:', error);
            this.showNotification('登录失败，请稍后重试', 'error');
        } finally {
            this.showLoading(false);
        }
    }
    
    // 处理注册
    async handleRegister() {
        const username = this.usernameInput.value.trim();
        const password = this.passwordInput.value.trim();
        
        if (!username || !password) {
            this.showNotification('请输入用户名和密码', 'error');
            return;
        }
        
        if (username.length < 3) {
            this.showNotification('用户名至少需要3个字符', 'error');
            return;
        }
        
        if (password.length < 6) {
            this.showNotification('密码至少需要6个字符', 'error');
            return;
        }
        
        try {
            this.showLoading(true);
            
            // 检查用户是否已存在
            const existingUser = await this.getFromRedis(`user:${username}`);
            if (existingUser) {
                this.showNotification('用户名已存在，请选择其他用户名', 'error');
                return;
            }
            
            // 创建新用户
            const newUser = {
                username: username,
                password: password, // 实际应用中应该加密存储
                createdAt: new Date().toISOString(),
                favorites: []
            };
            
            // 保存到Redis
            await this.saveToRedis(`user:${username}`, newUser);
            
            // 自动登录
            this.currentUser = {
                username: username,
                loginTime: new Date().toISOString()
            };
            this.isLoggedIn = true;
            
            // 保存到本地存储
            localStorage.setItem('musicApp_user', JSON.stringify(this.currentUser));
            
            this.updateLoginUI();
            this.hideLoginModal();
            this.loadUserFavorites();
            this.showNotification(`注册成功，欢迎 ${username}！`, 'success');
            
        } catch (error) {
            console.error('注册失败:', error);
            this.showNotification('注册失败，请稍后重试', 'error');
        } finally {
            this.showLoading(false);
        }
    }
    
    // 显示用户菜单
    showUserMenu() {
        const menu = document.createElement('div');
        menu.className = 'user-menu';
        menu.innerHTML = `
            <div class="user-menu-content">
                <div class="user-info">
                    <i class="fas fa-user"></i>
                    <span>${this.currentUser.username}</span>
                </div>
                <button class="menu-item" onclick="userManager.switchToFavorites()">
                    <i class="fas fa-heart"></i> 我的收藏
                </button>
                <button class="menu-item" onclick="userManager.logout()">
                    <i class="fas fa-sign-out-alt"></i> 退出登录
                </button>
            </div>
        `;
        
        // 移除现有菜单
        const existingMenu = document.querySelector('.user-menu');
        if (existingMenu) {
            existingMenu.remove();
        }
        
        document.body.appendChild(menu);
        
        // 点击其他地方关闭菜单
        setTimeout(() => {
            document.addEventListener('click', function closeMenu(e) {
                if (!menu.contains(e.target) && !this.loginBtn.contains(e.target)) {
                    menu.remove();
                    document.removeEventListener('click', closeMenu);
                }
            }.bind(this));
        }, 100);
    }
    
    // 切换到收藏页面
    switchToFavorites() {
        // 移除用户菜单
        const menu = document.querySelector('.user-menu');
        if (menu) menu.remove();
        
        // 切换到收藏页面
        if (window.musicPlayer) {
            window.musicPlayer.switchSection('favorites');
        }
    }
    
    // 退出登录
    logout() {
        this.currentUser = null;
        this.isLoggedIn = false;
        this.userFavorites = [];
        
        // 清除本地存储
        localStorage.removeItem('musicApp_user');
        
        // 更新UI
        this.updateLoginUI();
        this.updateFavoritesDisplay();
        
        // 移除用户菜单
        const menu = document.querySelector('.user-menu');
        if (menu) menu.remove();
        
        this.showNotification('已退出登录', 'info');
    }
    
    // 更新登录UI
    updateLoginUI() {
        if (this.isLoggedIn && this.currentUser) {
            this.loginText.textContent = this.currentUser.username;
            this.loginBtn.classList.add('logged-in');
        } else {
            this.loginText.textContent = '登录';
            this.loginBtn.classList.remove('logged-in');
        }
    }
    
    // 添加歌曲到收藏
    async addToFavorites(song) {
        if (!this.isLoggedIn) {
            this.showNotification('请先登录以收藏歌曲', 'error');
            return false;
        }
        
        // 检查是否已收藏
        const isAlreadyFavorited = this.userFavorites.some(fav => fav.id === song.id);
        if (isAlreadyFavorited) {
            this.showNotification('歌曲已在收藏列表中', 'info');
            return false;
        }
        
        try {
            // 添加到本地收藏列表
            const favoriteItem = {
                id: song.id,
                name: song.name,
                artists: song.artists,
                album: song.album,
                duration: song.duration,
                addedAt: new Date().toISOString()
            };
            
            this.userFavorites.push(favoriteItem);
            
            // 保存到Redis
            await this.saveUserFavorites();
            
            this.updateFavoritesDisplay();
            this.showNotification(`已收藏 "${song.name}"`, 'success');
            return true;
            
        } catch (error) {
            console.error('收藏失败:', error);
            this.showNotification('收藏失败，请稍后重试', 'error');
            return false;
        }
    }
    
    // 从收藏中移除歌曲
    async removeFromFavorites(songId) {
        if (!this.isLoggedIn) return;
        
        try {
            const songIndex = this.userFavorites.findIndex(fav => fav.id === songId);
            if (songIndex === -1) return;
            
            const song = this.userFavorites[songIndex];
            this.userFavorites.splice(songIndex, 1);
            
            // 保存到Redis
            await this.saveUserFavorites();
            
            this.updateFavoritesDisplay();
            this.showNotification(`已取消收藏 "${song.name}"`, 'info');
            
        } catch (error) {
            console.error('取消收藏失败:', error);
            this.showNotification('取消收藏失败', 'error');
        }
    }
    
    // 检查歌曲是否已收藏
    isFavorited(songId) {
        return this.userFavorites.some(fav => fav.id === songId);
    }
    
    // 清空收藏
    async clearFavorites() {
        if (!this.isLoggedIn || this.userFavorites.length === 0) return;
        
        if (!confirm('确定要清空所有收藏吗？此操作不可撤销。')) {
            return;
        }
        
        try {
            this.userFavorites = [];
            await this.saveUserFavorites();
            this.updateFavoritesDisplay();
            this.showNotification('已清空收藏列表', 'info');
        } catch (error) {
            console.error('清空收藏失败:', error);
            this.showNotification('清空收藏失败', 'error');
        }
    }
    
    // 加载用户收藏
    async loadUserFavorites() {
        if (!this.isLoggedIn || !this.currentUser) return;
        
        try {
            console.log('开始加载用户收藏:', this.currentUser.username); // 调试日志
            const favorites = await this.getFromRedis(`favorites:${this.currentUser.username}`);
            console.log('获取到的收藏数据:', favorites); // 调试日志
            
            // 确保favorites是数组格式
            if (Array.isArray(favorites)) {
                this.userFavorites = favorites;
            } else if (favorites && typeof favorites === 'string') {
                try {
                    this.userFavorites = JSON.parse(favorites);
                } catch (e) {
                    console.error('收藏数据解析失败:', e);
                    this.userFavorites = [];
                }
            } else {
                this.userFavorites = [];
            }
            
            console.log('最终收藏数据:', this.userFavorites); // 调试日志
            this.updateFavoritesDisplay();
        } catch (error) {
            console.error('加载收藏失败:', error);
            this.userFavorites = [];
            this.updateFavoritesDisplay();
        }
    }
    
    // 保存用户收藏到Redis
    async saveUserFavorites() {
        if (!this.isLoggedIn || !this.currentUser) return;
        
        await this.saveToRedis(`favorites:${this.currentUser.username}`, this.userFavorites);
    }
    
    // 更新收藏显示
    updateFavoritesDisplay() {
        if (!this.isLoggedIn) {
            this.favoritesContainer.innerHTML = `
                <div class="no-favorites">
                    <i class="fas fa-heart"></i>
                    <p>请先登录以查看收藏的歌曲</p>
                </div>
            `;
            this.clearFavoritesBtn.style.display = 'none';
            return;
        }
        
        if (this.userFavorites.length === 0) {
            this.favoritesContainer.innerHTML = `
                <div class="no-favorites">
                    <i class="fas fa-heart"></i>
                    <p>还没有收藏任何歌曲</p>
                    <p class="hint">点击歌曲播放器中的爱心按钮来收藏歌曲</p>
                </div>
            `;
            this.clearFavoritesBtn.style.display = 'none';
            return;
        }
        
        // 显示收藏的歌曲
        this.favoritesContainer.innerHTML = '';
        this.clearFavoritesBtn.style.display = 'block';
        
        this.userFavorites.forEach(song => {
            const item = document.createElement('div');
            item.className = 'favorite-item';
            
            item.innerHTML = `
                <div class="song-cover">
                    <img src="${song.album?.picUrl || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiBmaWxsPSIjMUExQTFBIi8+Cjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0iY2VudHJhbCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI0ZGRiIgZm9udC1zaXplPSIyMCI+4pmqPC90ZXh0Pgo8L3N2Zz4K'}" alt="封面" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiBmaWxsPSIjMUExQTFBIi8+Cjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0iY2VudHJhbCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI0ZGRiIgZm9udC1zaXplPSIyMCI+4pmqPC90ZXh0Pgo8L3N2Zz4K'">
                </div>
                <div class="favorite-item-info">
                    <h4>${this.escapeHtml(song.name)}</h4>
                    <p>${this.escapeHtml(song.artists?.map(a => a.name).join(', ') || '未知歌手')}</p>
                    <span class="added-time">收藏于 ${new Date(song.addedAt).toLocaleDateString()}</span>
                </div>
                <div class="favorite-item-controls">
                    <button title="播放" onclick="window.musicPlayer && window.musicPlayer.playSong(${song.id})">
                        <i class="fas fa-play"></i>
                    </button>
                    <button title="添加到播放列表" onclick="userManager.addSongToPlaylist(${song.id})">
                        <i class="fas fa-plus"></i>
                    </button>
                    <button title="取消收藏" onclick="userManager.removeFromFavorites(${song.id})">
                        <i class="fas fa-heart-broken"></i>
                    </button>
                </div>
            `;
            
            this.favoritesContainer.appendChild(item);
        });
    }
    
    // Redis操作方法
    async saveToRedis(key, data) {
        try {
            console.log('保存到Redis:', key, data); // 调试日志
            
            const response = await fetch(`${this.redisUrl}/set/${key}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.redisToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Redis保存失败响应:', errorText);
                throw new Error(`Redis保存失败: ${response.status} - ${errorText}`);
            }
            
            const result = await response.json();
            console.log('Redis保存成功:', result); // 调试日志
            return result;
        } catch (error) {
            console.error('Redis保存操作失败:', error);
            throw error;
        }
    }
    
    async getFromRedis(key) {
        try {
            console.log('正在从Redis获取数据:', key); // 调试日志
            
            const response = await fetch(`${this.redisUrl}/get/${key}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.redisToken}`
                }
            });
            
            console.log('Redis响应状态:', response.status); // 调试日志
            
            if (response.status === 404) {
                console.log('Redis键不存在:', key);
                return null; // 键不存在
            }
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Redis获取失败:', response.status, errorText);
                throw new Error(`Redis获取失败: ${response.status} - ${errorText}`);
            }
            
            const data = await response.json();
            console.log('Redis原始响应数据:', JSON.stringify(data, null, 2)); // 调试日志
            
            // Upstash Redis REST API返回的数据格式
            if (data.result !== undefined && data.result !== null) {
                // 如果result是字符串，尝试解析为JSON
                if (typeof data.result === 'string') {
                    try {
                        const parsed = JSON.parse(data.result);
                        console.log('成功解析JSON数据:', parsed); // 调试日志
                        return parsed;
                    } catch (parseError) {
                        console.log('数据不是JSON格式，返回原始字符串:', data.result);
                        return data.result; // 如果不是JSON，直接返回原始数据
                    }
                } else {
                    // 如果result本身就是对象，直接返回
                    console.log('返回对象数据:', data.result);
                    return data.result;
                }
            }
            
            console.log('Redis返回空数据');
            return null;
        } catch (error) {
            console.error('Redis获取数据失败:', error);
            return null;
        }
    }
    
    // 添加收藏歌曲到播放列表
    addSongToPlaylist(songId) {
        const song = this.userFavorites.find(fav => fav.id === songId);
        if (song && window.musicPlayer) {
            window.musicPlayer.addToPlaylist(song);
        }
    }
    
    // 工具方法
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
    
    showLoading(show) {
        if (window.musicPlayer) {
            window.musicPlayer.showLoading(show);
        }
    }
    
    showNotification(message, type = 'info') {
        if (window.musicPlayer) {
            if (type === 'error') {
                window.musicPlayer.showError(message);
            } else {
                window.musicPlayer.showNotification(message);
            }
        }
    }
}

// 全局用户管理器实例
let userManager;

// 当DOM加载完成后初始化用户管理器
document.addEventListener('DOMContentLoaded', () => {
    userManager = new UserManager();
});
