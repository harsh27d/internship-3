// Load posts and profile info on page load
window.onload = () => {
  fetchPosts();
  loadSidebarProfile();
  loadPostUserPhoto(); // NEW
};

// Load Posts from Server
async function fetchPosts() {
  const res = await fetch('/api/posts');
  const posts = await res.json();
  const user = JSON.parse(localStorage.getItem('user'));

  const feed = document.getElementById('feed');
  feed.innerHTML = '';

  posts.forEach(post => {
    const div = document.createElement('div');
    div.className = "bg-white p-4 rounded shadow";

    div.innerHTML = `
      <!-- Post Header -->
      <div class="flex gap-3 items-center mb-2">
        <img src="uploads/${post.profile_image}" class="rounded-full w-10 h-10" alt="User">
        <div>
          <strong>${post.username}</strong><br>
          <small class="text-gray-500">${new Date(post.created_at).toLocaleString()}</small>
        </div>
      </div>

      <!-- Post Content -->
      <p class="text-gray-800 mb-2">${post.content}</p>

      <!-- Like/Comment Bar -->
      <div class="flex gap-6 text-blue-500 text-sm cursor-pointer mb-2">
        <span>👍 Like</span>
        <span onclick="document.getElementById('comment-input-${post.id}').focus()">💬 Comment</span>
      </div>

      <!-- Comments Section -->
      <div id="comments-${post.id}" class="ml-4 mb-2 text-sm text-gray-700 space-y-1"></div>

      <!-- Add Comment -->
      ${
        user ? `
          <input type="text" id="comment-input-${post.id}" class="border rounded p-1 w-full mb-2" placeholder="Write a comment..." />
          <button onclick="postComment(${post.id})" class="bg-blue-500 text-white text-sm px-3 py-1 rounded">Post Comment</button>
        ` : '<p class="text-sm text-gray-400 italic">Login to comment</p>'
      }
    `;

    feed.appendChild(div);
    loadComments(post.id);
  });
}

// Create a new Post
async function createPost() {
  const content = document.getElementById('postContent').value.trim();
  const user = JSON.parse(localStorage.getItem('user'));

  if (!user) return alert('Login required');
  if (!content) return alert('Post content cannot be empty');

  const res = await fetch('/api/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: user.id, content })
  });

  const msg = await res.text();
  alert(msg);
  document.getElementById('postContent').value = '';
  fetchPosts();
}

// Post a Comment
async function postComment(postId) {
  const commentInput = document.getElementById(`comment-input-${postId}`);
  const comment = commentInput.value.trim();
  const user = JSON.parse(localStorage.getItem('user'));

  if (!user) return alert('Login required');
  if (!comment) return alert('Comment cannot be empty');

  await fetch('/api/comments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ post_id: postId, user_id: user.id, comment })
  });

  commentInput.value = '';
  loadComments(postId);
}

// Load Comments
async function loadComments(postId) {
  const res = await fetch(`/api/comments/${postId}`);
  const comments = await res.json();
  const container = document.getElementById(`comments-${postId}`);
  container.innerHTML = '';

  comments.forEach(c => {
    const p = document.createElement('p');
    p.innerHTML = `<strong>${c.username}:</strong> ${c.comment}`;
    container.appendChild(p);
  });
}

// Load Sidebar User Profile
function loadSidebarProfile() {
  const user = JSON.parse(localStorage.getItem('user'));
  if (user && user.profile_image) {
    document.getElementById('sidebarProfileImage').src = `uploads/${user.profile_image}`;
    document.getElementById('sidebarProfileName').textContent = user.username;
  }
}

// Load Post User Photo (top left of textarea)
function loadPostUserPhoto() {
  const user = JSON.parse(localStorage.getItem('user'));
  if (user && user.profile_image) {
    const postPhoto = document.getElementById('postUserPhoto');
    if (postPhoto) {
      postPhoto.src = `uploads/${user.profile_image}`;
    }
  }
}
