document.getElementById('loginForm').addEventListener('submit', e => {
  e.preventDefault();

  const formData = new FormData(e.target);
  const data = {
    email: formData.get('email'),
    password: formData.get('password')
  };

  fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  .then(res => {
    if (res.ok) {
      return res.json();
    } else {
      return res.text().then(msg => { throw new Error(msg) });
    }
  })
  .then(userData => {
    // Optional: save to localStorage
    localStorage.setItem('user', JSON.stringify(userData.user));
    window.location.href = 'home.html';
  })
  .catch(err => alert(err.message));
});
