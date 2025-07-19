document.getElementById('registerForm').addEventListener('submit', e => {
  e.preventDefault();

  const form = e.target;
  const formData = new FormData(form); // includes the image file automatically

  fetch('/api/register', {
    method: 'POST',
    body: formData // send formData directly
  })
  .then(res => {
    if (res.ok) {
      alert('Registration successful!');
      window.location.href = 'login.html';
    } else {
      return res.text().then(msg => alert(msg));
    }
  })
  .catch(err => {
    console.error('Error:', err);
    alert('Something went wrong. Please try again.');
  });
});
