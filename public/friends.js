const userId = 1; // Replace with actual session user ID
let receiverId = null;
let currentFriendName = null;

function loadFriendRequests() {
  fetch(`/api/friend-requests/${userId}`)
    .then(res => res.json())
    .then(data => {
      const container = document.getElementById('requestsContainer');
      container.innerHTML = '';
      if (data.length === 0) {
        container.innerHTML = "<p class='text-gray-500 italic'>No pending requests</p>";
        return;
      }
      data.forEach(req => {
        const div = document.createElement('div');
        div.className = "flex items-center justify-between bg-white p-4 rounded shadow-sm border";
        div.innerHTML = `
          <div class="flex items-center gap-4">
            <img src="${req.profile_photo || 'default-avatar.png'}" class="w-10 h-10 rounded-full object-cover" />
            <span class="font-medium text-gray-800">${req.username}</span>
          </div>
          <button class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
            data-accept="${req.id}">Accept</button>
        `;
        container.appendChild(div);
      });
      container.querySelectorAll('[data-accept]').forEach(btn => {
        btn.addEventListener('click', function() {
          acceptRequest(this.getAttribute('data-accept'));
        });
      });
    });
}

function acceptRequest(id) {
  fetch('/api/friend-requests/accept', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requestId: id })
  }).then(() => {
    alert("Friend request accepted!");
    loadFriendRequests();
    loadUsers();
    loadFriends();
  });
}

function loadUsers() {
  fetch(`/api/users/all-except/${userId}`)
    .then(res => res.json())
    .then(users => {
      const list = document.getElementById('usersList');
      list.innerHTML = '';
      users.forEach(user => {
        const wrapper = document.createElement('div');
        wrapper.className = "flex items-center justify-between bg-white p-4 rounded shadow border";
        wrapper.innerHTML = `
          <div class="flex items-center gap-4">
            <img src="${user.profile_image || 'default-avatar.png'}" class="w-10 h-10 rounded-full object-cover" />
            <span class="text-gray-900 font-medium">${user.username}</span>
          </div>
          <button class="text-white px-4 py-2 rounded ${
            user.status === 'not_friends' ? 'bg-blue-600 hover:bg-blue-700' :
            user.status === 'requested' ? 'bg-yellow-500 cursor-not-allowed' :
            'bg-gray-400 cursor-default'
          }" ${user.status !== 'not_friends' ? 'disabled' : ''} 
          data-add-id="${user.id}">
            ${
              user.status === 'not_friends' ? 'Add Friend' :
              user.status === 'requested' ? 'Requested' :
              'Friend'
            }
          </button>
        `;
        list.appendChild(wrapper);
      });
      document.querySelectorAll('[data-add-id]').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-add-id');
          fetch('/api/friend-requests/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sender_id: userId, receiver_id: id })
          }).then(() => {
            alert('Friend request sent');
            loadUsers();
          });
        });
      });
    });
}

function loadFriends() {
  fetch(`/api/friends/${userId}`)
    .then(res => res.json())
    .then(data => {
      const list = document.getElementById('friendsList');
      list.innerHTML = '';
      data.forEach(friend => {
        const div = document.createElement('div');
        div.className = "flex items-center gap-4 p-3 bg-white rounded shadow hover:bg-gray-50 cursor-pointer";
        div.innerHTML = `
          <img src="${friend.profile_image || 'default-avatar.png'}" class="w-10 h-10 rounded-full object-cover" />
          <span class="text-gray-900 font-medium">${friend.username}</span>
        `;
        div.addEventListener('click', () => {
          receiverId = friend.id;
          currentFriendName = friend.username;
          document.getElementById('chatTitle').textContent = `Chat with ${currentFriendName}`;
          document.getElementById('chatWindow').classList.remove('hidden');
          loadMessages();
        });
        list.appendChild(div);
      });
    });
}

function closeChat() {
  document.getElementById('chatWindow').classList.add('hidden');
  receiverId = null;
  currentFriendName = null;
}

function loadMessages() {
  if (!receiverId) return;
  fetch(`/api/messages/${userId}/${receiverId}`)
    .then(res => res.json())
    .then(messages => {
      const box = document.getElementById('messages');
      box.innerHTML = '';
      messages.forEach(m => {
        const isMe = m.sender_id == userId;
        const msgDiv = document.createElement('div');
        msgDiv.className = `flex ${isMe ? 'justify-end' : 'justify-start'}`;
        msgDiv.innerHTML = `
          <div class="max-w-xs px-4 py-2 rounded-lg shadow ${
            isMe ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'
          }">
            ${m.message}
          </div>
        `;
        box.appendChild(msgDiv);
      });
      box.scrollTop = box.scrollHeight;
    });
}

document.getElementById("chatForm").addEventListener("submit", function(e) {
  e.preventDefault();
  const msg = document.getElementById("chatInput").value.trim();
  if (!msg || !receiverId) return;
  fetch('/api/messages/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sender_id: userId, receiver_id: receiverId, message: msg })
  }).then(() => {
    document.getElementById("chatInput").value = '';
    loadMessages();
  });
});

// Initial load
loadFriendRequests();
loadUsers();
loadFriends();
