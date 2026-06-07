// 注册页面逻辑
document.addEventListener('DOMContentLoaded', () => {
    const registerBtn = document.getElementById('registerBtn');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const confirmInput = document.getElementById('confirmPassword');
    
    async function handleRegister() {
        const username = usernameInput.value.trim();
        const password = passwordInput.value;
        const confirm = confirmInput.value;
        
        if (!username || !password || !confirm) {
            showError('请填写完整信息');
            return;
        }
        if (username.length < 2) {
            showError('用户名至少2个字符');
            return;
        }
        if (password.length < 4) {
            showError('密码至少4个字符');
            return;
        }
        if (password !== confirm) {
            showError('两次输入的密码不一致');
            return;
        }
        
        try {
            const response = await fetch(`${BASE_URL}/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const result = await response.json();
            
            if (result.success) {
                showSuccess('注册成功！即将跳转登录页');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1500);
            } else {
                showError(result.message || '注册失败');
            }
        } catch (error) {
            showError('网络异常，请检查后端服务');
        }
    }
    
    registerBtn.addEventListener('click', handleRegister);
    
    // 回车注册
    [usernameInput, passwordInput, confirmInput].forEach(input => {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleRegister();
        });
    });
    
    // 如果已登录，直接跳转
    if (isLoggedIn()) {
        window.location.href = 'bill.html';
    }
});
