// script.js / app.js

const SUPABASE_URL = "https://nianlnujdqnkzlesnlbp.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pYW5sbnVqZHFua3psZXNubGJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MDg2NDQsImV4cCI6MjA5MzI4NDY0NH0.YDu4ejDYnW82Wj1LUBSCwFKHyZA0LLaiif0zTegceW4";

const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const resourceContainer = document.getElementById("resourceContainer");
const featuredResources = document.getElementById("featuredResources");

const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");

const subjectFilter = document.getElementById("subjectFilter");
const levelFilter = document.getElementById("levelFilter");
const typeFilter = document.getElementById("typeFilter");

const totalResources = document.getElementById("totalResources");
const totalDownloads = document.getElementById("totalDownloads");
const totalSubjects = document.getElementById("totalSubjects");

const commentModal = document.getElementById("commentModal");
const closeModal = document.getElementById("closeModal");
const commentsList = document.getElementById("commentsList");
const commentForm = document.getElementById("commentForm");
const commentName = document.getElementById("commentName");
const commentText = document.getElementById("commentText");
const modalResourceTitle = document.getElementById("modalResourceTitle");

const refreshResourcesBtn = document.getElementById("refreshResourcesBtn");

if (refreshResourcesBtn) {
  refreshResourcesBtn.addEventListener("click", () => {
    loadResources();
  });
}

let currentResourceId = null;
let allResources = [];

// LOAD RESOURCES
async function loadResources() {
  resourceContainer.innerHTML = `<p>Loading resources...</p>`;

  const { data, error } = await client
    .from("resources")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    resourceContainer.innerHTML = `<p>Failed to load resources.</p>`;
    return;
  }

  allResources = data || [];
  displayResources(allResources);
  loadStats(allResources);
  loadFeatured(allResources);
}

// DISPLAY RESOURCE CARDS
function displayResources(resources) {
  resourceContainer.innerHTML = "";

 if (!resources || resources.length === 0) {
  resourceContainer.innerHTML = `
    <div class="empty-state">
      <i class="fa-solid fa-magnifying-glass"></i>
      <h3>No resources found</h3>
      <p>Try another keyword or clear your search.</p>
    </div>
  `;
  return;
}

  resources.forEach((resource) => {
    const card = document.createElement("div");
    card.className = "resource-card";

    card.innerHTML = `
      <div class="file-icon">
        <i class="${getFileIcon(resource.file_type)}"></i>
      </div>

      <h3>${resource.title || "Untitled Resource"}</h3>

      <p>${resource.description || "No description available."}</p>

      <div class="resource-meta">
        <span>${resource.subject || "General"}</span>
        <span>${resource.level || "All Levels"}</span>
        <span>${resource.file_type || "FILE"}</span>
      </div>

      <div class="resource-stats">
        <span>Downloads: ${resource.downloads || 0}</span>
        <span>Likes: ${resource.likes || 0}</span>
      </div>

      <div class="resource-actions">
        <button class="download-btn" onclick="downloadResource('${resource.id}', '${resource.file_url}')">
          Download
        </button>

        <button class="like-btn" onclick="likeResource('${resource.id}', ${resource.likes || 0})">
         <i class="fa fa-heart" aria-hidden="true"></i>

        </button>

        <button class="comment-btn" onclick="openComments('${resource.id}', '${resource.title}')">
          <i class="fa fa-comments" aria-hidden="true"></i>
        </button>

        <button class="share-btn" onclick="shareResource('${resource.id}', '${resource.title}')">
         <i class="fa fa-share-alt" aria-hidden="true"></i>
        </button>
      </div>
    `;

    resourceContainer.appendChild(card);
  });
}
// FILE ICONS
function getFileIcon(type) {
  if (!type) return "fa-solid fa-file";

  type = type.toLowerCase();

  if (type.includes("pdf")) return "fa-solid fa-file-pdf";
  if (type.includes("doc")) return "fa-solid fa-file-word";
  if (type.includes("ppt")) return "fa-solid fa-file-powerpoint";
  if (type.includes("zip")) return "fa-solid fa-file-zipper";
  if (type.includes("video")) return "fa-solid fa-file-video";
  if (type.includes("image")) return "fa-solid fa-file-image";

  return "fa-solid fa-file";
}

// DOWNLOAD RESOURCE
async function downloadResource(id, fileUrl) {
  const resource = allResources.find((item) => item.id === id);
  const newDownloads = (resource?.downloads || 0) + 1;

  await client
    .from("resources")
    .update({ downloads: newDownloads })
    .eq("id", id);

  window.open(fileUrl, "_blank");

  loadResources();
}

// LIKE RESOURCE
async function likeResource(id, currentLikes) {
  const newLikes = currentLikes + 1;

  const { error } = await client
    .from("resources")
    .update({ likes: newLikes })
    .eq("id", id);

  if (error) {
    console.error(error);
    alert("Failed to like resource.");
    return;
  }

  loadResources();
}

// SHARE RESOURCE
function shareResource(id, title) {
  const url = `${window.location.origin}/resource.html?id=${id}`;

  if (navigator.share) {
    navigator.share({
      title: title,
      text: `Check this educational resource: ${title}`,
      url: url,
    });
  } else {
    navigator.clipboard.writeText(url);
    alert("Resource link copied!");
  }
}

// OPEN COMMENTS
async function openComments(id, title) {
  currentResourceId = id;
  modalResourceTitle.textContent = title;
  commentModal.style.display = "flex";

  loadComments(id);
}

// LOAD COMMENTS
async function loadComments(resourceId) {
  commentsList.innerHTML = `<p>Loading comments...</p>`;

  const { data, error } = await client
    .from("comments")
    .select("*")
    .eq("resource_id", resourceId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    commentsList.innerHTML = `<p>Failed to load comments.</p>`;
    return;
  }

  commentsList.innerHTML = "";

  if (!data.length) {
    commentsList.innerHTML = `<p>No comments yet.</p>`;
    return;
  }

  data.forEach((comment) => {
    const div = document.createElement("div");
    div.className = "comment-item";

    div.innerHTML = `
      <strong>${comment.name}</strong>
      <p>${comment.comment}</p>
    `;

    commentsList.appendChild(div);
  });
}

// POST COMMENT
commentForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!currentResourceId) return;

  const { error } = await client.from("comments").insert([
    {
      resource_id: currentResourceId,
      name: commentName.value.trim(),
      comment: commentText.value.trim(),
    },
  ]);

  if (error) {
    console.error(error);
    alert("Failed to post comment.");
    return;
  }

  commentName.value = "";
  commentText.value = "";

  loadComments(currentResourceId);
});

// CLOSE MODAL
closeModal.addEventListener("click", () => {
  commentModal.style.display = "none";
});

window.addEventListener("click", (e) => {
  if (e.target === commentModal) {
    commentModal.style.display = "none";
  }
});

// SEARCH
searchBtn.addEventListener("click", filterResources);

searchInput.addEventListener("keyup", () => {
  filterResources();
});

// FILTERS
subjectFilter.addEventListener("change", filterResources);
levelFilter.addEventListener("change", filterResources);
typeFilter.addEventListener("change", filterResources);

function filterResources() {
  const searchValue = searchInput.value.toLowerCase();
  const subjectValue = subjectFilter.value;
  const levelValue = levelFilter.value;
  const typeValue = typeFilter.value;

  const filtered = allResources.filter((resource) => {
    const matchesSearch =
      resource.title?.toLowerCase().includes(searchValue) ||
      resource.description?.toLowerCase().includes(searchValue) ||
      resource.subject?.toLowerCase().includes(searchValue) ||
      resource.level?.toLowerCase().includes(searchValue);

    const matchesSubject =
      subjectValue === "" || resource.subject === subjectValue;
    const matchesLevel = levelValue === "" || resource.level === levelValue;
    const matchesType = typeValue === "" || resource.file_type === typeValue;

    return matchesSearch && matchesSubject && matchesLevel && matchesType;
  });
    console.log("Search:", searchValue);
console.log("Resources:", allResources);
console.log("Filtered:", filtered);
  displayResources(filtered);
}

// CATEGORY BUTTONS
document.querySelectorAll(".category-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document
      .querySelectorAll(".category-btn")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    const category = btn.dataset.category;

    if (category === "all") {
      displayResources(allResources);
      return;
    }

    const filtered = allResources.filter((resource) => {
      return resource.category === category || resource.subject === category;
    });

    displayResources(filtered);
  });
});

// STATS
function loadStats(resources) {
  totalResources.textContent = resources.length;

  const downloads = resources.reduce((sum, item) => {
    return sum + Number(item.downloads || 0);
  }, 0);

  totalDownloads.textContent = downloads;

  const subjects = new Set(
    resources.map((item) => item.subject).filter(Boolean),
  );
  totalSubjects.textContent = subjects.size;
}

// FEATURED
function loadFeatured(resources) {
  if (!featuredResources) return;

  featuredResources.innerHTML = "";

  const featured = resources
    .filter((item) => item.featured === true)
    .slice(0, 3);

  if (!featured.length) {
    featuredResources.innerHTML = `<p>No featured resources yet.</p>`;
    return;
  }

  featured.forEach((resource) => {
    const card = document.createElement("div");
    card.className = "resource-card";

    card.innerHTML = `
      <div class="file-icon">
        <i class="${getFileIcon(resource.file_type)}"></i>
      </div>

      <h3>${resource.title}</h3>
      <p>${resource.description || "No description available."}</p>

      <div class="resource-actions">
        <button class="download-btn" onclick="downloadResource('${resource.id}', '${resource.file_url}')">
          Download
        </button>
      </div>
    `;

    featuredResources.appendChild(card);
  });
}

const themeToggle = document.getElementById("themeToggle");

const savedTheme = localStorage.getItem("theme");

if (savedTheme === "light") {
  document.body.classList.add("light-theme");
  themeToggle.textContent = "☀️";
}

themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("light-theme");

  const isLight =
    document.body.classList.contains("light-theme");

  themeToggle.textContent = isLight ? "☀️" : "🌙";

  localStorage.setItem(
    "theme",
    isLight ? "light" : "dark"
  );
});

// START
loadResources();
