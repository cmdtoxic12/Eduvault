import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

/* FIREBASE CONFIG */
const firebaseConfig = {
  apiKey: "AIzaSyCp0KbklA4vyL-4LMSY3y_SFU_W8yCspgU",
  authDomain: "c-licon-data-bank.firebaseapp.com",
  projectId: "c-licon-data-bank",
  storageBucket: "c-licon-data-bank.firebasestorage.app",
  messagingSenderId: "499812180714",
  appId: "1:499812180714:web:9b039bafe3b9477a732d93",
  measurementId: "G-8BECNP16T2",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

/* ALLOWED ADMIN EMAIL */
const allowedAdmins = ["vifapromise@gmail.com"];

/* SUPABASE CONFIG */
const SUPABASE_URL = "https://nianlnujdqnkzlesnlbp.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pYW5sbnVqZHFua3psZXNubGJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MDg2NDQsImV4cCI6MjA5MzI4NDY0NH0.YDu4ejDYnW82Wj1LUBSCwFKHyZA0LLaiif0zTegceW4";

const client = window.supabase
  ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

/* PAGE CHECK */
const isLoginPage = location.pathname.includes("login.html");
const isDashboardPage = location.pathname.includes("dashboard.html");

/* LOGIN */
const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("adminEmail").value.trim();
    const password = document.getElementById("adminPassword").value.trim();

    loginMessage.textContent = "Logging in...";

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const user = userCredential.user;

      if (!allowedAdmins.includes(user.email)) {
        await signOut(auth);
        loginMessage.textContent = "Access denied. Admin only.";
        return;
      }

      location.href = "dashboard.html";
    } catch (error) {
      loginMessage.textContent = error.message;
    }
  });
}

/* PROTECT ADMIN DASHBOARD */
onAuthStateChanged(auth, async (user) => {
  if (isDashboardPage) {
    if (!user) {
      location.href = "login.html";
      return;
    }

    if (!allowedAdmins.includes(user.email)) {
      await signOut(auth);
      location.href = "login.html";
      return;
    }

    loadAdminResources();
  }

  if (isLoginPage && user && allowedAdmins.includes(user.email)) {
    location.href = "dashboard.html";
  }
});

/* LOGOUT */
const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
    location.href = "login.html";
  });
}

/* UPLOAD RESOURCE */
const uploadForm = document.getElementById("uploadForm");
const uploadMessage = document.getElementById("uploadMessage");

if (uploadForm) {
  uploadForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    uploadMessage.textContent = "Uploading resource...";

    const title = document.getElementById("title").value.trim();
    const description = document.getElementById("description").value.trim();
    const subject = document.getElementById("subject").value;
    const level = document.getElementById("level").value;
    const category = document.getElementById("category").value;
    const fileType = document.getElementById("fileType").value;
    const featured = document.getElementById("featured").checked;
    const file = document.getElementById("resourceFile").files[0];

    if (!file) {
      uploadMessage.textContent = "Please select a file.";
      return;
    }

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${title}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      const { error: uploadError } = await client.storage
        .from("resources")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = client.storage
        .from("resources")
        .getPublicUrl(filePath);

      const fileUrl = publicUrlData.publicUrl;

      const { error: insertError } = await client.from("resources").insert([
        {
          title,
          description,
          subject,
          level,
          category,
          file_type: fileType,
          file_name: file.name,
          file_url: fileUrl,
          featured,
          downloads: 0,
          likes: 0,
        },
      ]);

      if (insertError) throw insertError;

      uploadMessage.textContent = "Resource uploaded successfully!";
      uploadForm.reset();
      loadAdminResources();
    } catch (error) {
      console.error(error);
      uploadMessage.textContent = error.message;
    }
  });
}

/* LOAD ADMIN RESOURCES */
async function loadAdminResources() {
  const adminResourceList = document.getElementById("adminResourceList");

  if (!adminResourceList || !client) return;

  adminResourceList.innerHTML = "Loading resources...";

  const { data, error } = await client
    .from("resources")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    adminResourceList.innerHTML = "Failed to load resources.";
    return;
  }

  if (!data || data.length === 0) {
    adminResourceList.innerHTML = "No resources uploaded yet.";
    return;
  }

  adminResourceList.innerHTML = "";

  data.forEach((resource) => {
    const card = document.createElement("div");
    card.className = "admin-resource-card";

    card.innerHTML = `
      <h3>${resource.title}</h3>

      <p>${resource.description || "No description"}</p>

      <div class="admin-resource-meta">
        ${resource.subject || "General"} |
        ${resource.level || "All Levels"} |
        ${resource.category || "No Category"} |
        ${resource.file_type || "File"}
      </div>

      <div class="admin-resource-meta">
        Downloads: ${resource.downloads || 0} |
        Likes: ${resource.likes || 0}
      </div>

      <button class="delete-btn" onclick="deleteResource('${resource.id}', '${resource.file_url}')">
        Delete
      </button>
    `;

    adminResourceList.appendChild(card);
  });
}

/* DELETE RESOURCE */
window.deleteResource = async function (id, fileUrl) {
  const confirmDelete = confirm(
    "Are you sure you want to delete this resource?",
  );

  if (!confirmDelete) return;

  try {
    const { error } = await client.from("resources").delete().eq("id", id);

    if (error) throw error;

    alert("Resource deleted.");
    loadAdminResources();
  } catch (error) {
    console.error(error);
    alert(error.message);
  }
};
