// ====================== CONFIG ======================
const SUPABASE_URL = "https://nianlnujdqnkzlesnlbp.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pYW5sbnVqZHFua3psZXNubGJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MDg2NDQsImV4cCI6MjA5MzI4NDY0NH0.YDu4ejDYnW82Wj1LUBSCwFKHyZA0LLaiif0zTegceW4";

const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ====================== DOM ELEMENTS ======================
const resourceContainer = document.getElementById("resourceContainer");
const featuredResources = document.getElementById("featuredResources");
const loadingSkeleton = document.getElementById("loadingSkeleton");

const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const subjectFilter = document.getElementById("subjectFilter");
const levelFilter = document.getElementById("levelFilter");
const typeFilter = document.getElementById("typeFilter");
const loadMoreBtn = document.getElementById("loadMoreBtn");
const refreshResourcesBtn = document.getElementById("refreshResourcesBtn");

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

// ====================== STATE ======================
let allResources = [];          // used for featured + stats
let currentPage = 1;
const PAGE_SIZE = 12;
let currentFilters = {
  search: "",
  subject: "",
  level: "",
  type: "",
  category: "all"
};
let isLoading = false;
let hasMore = true;
let currentResourceId = null;

// ====================== HELPERS ======================
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

function createResourceCard(resource) {
  const card = document.createElement("div");
  card.className = "resource-card";

  card.innerHTML = `
    <div class="file-icon">
      <i class="${getFileIcon(resource.file_type)}"></i>
    </div>

    <h3>${resource.title || "Untitled Resource"}</h3>
    <p>${resource.description || "No description available."}</p>

    <div class="resource-meta">
      <span><i class="fa-solid fa-book"></i> ${resource.subject || "General"}</span>
      <span><i class="fa-solid fa-layer-group"></i> ${resource.level || "All Levels"}</span>
      <span><i class="fa-solid fa-file"></i> ${resource.file_type || "FILE"}</span>
    </div>

    <div class="resource-stats">
      <span><i class="fa-solid fa-download"></i> ${resource.downloads || 0}</span>
      <span><i class="fa-solid fa-heart"></i> ${resource.likes || 0}</span>
    </div>

    <div class="resource-actions">
      <button class="download-btn" onclick="downloadResource('${resource.id}', '${resource.file_url}', '${resource.file_name || "resource"}')">
        <i class="fa-solid fa-download"></i> Download
      </button>

      <button class="preview-btn" onclick="location.href='resource.html?id=${resource.id}'">
        <i class="fa-solid fa-eye"></i> Preview
      </button>

      <button class="like-btn" onclick="likeResource('${resource.id}', ${resource.likes || 0})">
        <i class="fa-solid fa-heart"></i>
      </button>

      <button class="comment-btn" onclick="openComments('${resource.id}', \`${resource.title?.replace(/`/g, "") || "Resource"}\`)">
        <i class="fa-solid fa-comment"></i>
      </button>

      <button class="share-btn" onclick="shareResource('${resource.id}', \`${resource.title?.replace(/`/g, "") || "Resource"}\`)">
        <i class="fa-solid fa-share-nodes"></i>
      </button>
    </div>
  `;
  return card;
}

function showSkeleton(count = 6) {
  if (!loadingSkeleton) return;
  loadingSkeleton.innerHTML = "";
  loadingSkeleton.style.display = "grid";

  for (let i = 0; i < count; i++) {
    const sk = document.createElement("div");
    sk.className = "resource-card skeleton-card";
    sk.innerHTML = `
      <div class="skeleton-icon"></div>
      <div class="skeleton-line title"></div>
      <div class="skeleton-line"></div>
      <div class="skeleton-line short"></div>
      <div class="skeleton-meta"></div>
    `;
    loadingSkeleton.appendChild(sk);
  }
}

function hideSkeleton() {
  if (loadingSkeleton) {
    loadingSkeleton.style.display = "none";
    loadingSkeleton.innerHTML = "";
  }
}

// ====================== LOAD RESOURCES (with pagination) ======================
async function loadResources(reset = false) {
  if (isLoading) return;
  isLoading = true;

  if (reset) {
    currentPage = 1;
    hasMore = true;
    resourceContainer.innerHTML = "";
    showSkeleton(6);
  }

  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = client
    .from("resources")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  // Apply filters server-side
  if (currentFilters.subject) query = query.eq("subject", currentFilters.subject);
  if (currentFilters.level) query = query.eq("level", currentFilters.level);
  if (currentFilters.type) query = query.eq("file_type", currentFilters.type);
  if (currentFilters.category && currentFilters.category !== "all") {
    query = query.or(`category.eq.${currentFilters.category},subject.eq.${currentFilters.category}`);
  }
  if (currentFilters.search) {
    const s = currentFilters.search;
    query = query.or(`title.ilike.%${s}%,description.ilike.%${s}%,subject.ilike.%${s}%`);
  }

  const { data, error, count } = await query;

  isLoading = false;
  hideSkeleton();

  if (error) {
    console.error(error);
    resourceContainer.innerHTML = `<div class="empty-state"><h3>Failed to load resources</h3></div>`;
    return;
  }

  const resources = data || [];

  if (reset && resources.length === 0) {
    resourceContainer.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-magnifying-glass"></i>
        <h3>No resources found</h3>
        <p>Try another keyword or clear your filters.</p>
      </div>
    `;
    loadMoreBtn.style.display = "none";
    return;
  }

  resources.forEach((r) => {
    resourceContainer.appendChild(createResourceCard(r));
  });

  // Update hasMore
  const totalLoaded = currentPage * PAGE_SIZE;
  hasMore = totalLoaded < (count || 0);
  loadMoreBtn.style.display = hasMore ? "block" : "none";

  // Also refresh stats & featured on first load
  if (reset) {
    // For stats we still need all resources (or you can make a separate count query)
    loadStatsAndFeatured();
  }
}

// Load stats + featured (separate lighter call)
async function loadStatsAndFeatured() {
  const { data } = await client
    .from("resources")
    .select("id, title, description, file_type, file_url, file_name, downloads, likes, featured, subject")
    .order("created_at", { ascending: false });

  allResources = data || [];
  loadStats(allResources);
  loadFeatured(allResources);
}

function loadStats(resources) {
  totalResources.textContent = resources.length;
  const downloads = resources.reduce((sum, item) => sum + Number(item.downloads || 0), 0);
  totalDownloads.textContent = downloads;
  const subjects = new Set(resources.map((i) => i.subject).filter(Boolean));
  totalSubjects.textContent = subjects.size;
}

function loadFeatured(resources) {
  if (!featuredResources) return;
  featuredResources.innerHTML = "";

  const featured = resources.filter((i) => i.featured === true).slice(0, 3);

  if (featured.length === 0) {
    featuredResources.innerHTML = `<p style="grid-column:1/-1;opacity:0.7">No featured resources yet.</p>`;
    return;
  }

  featured.forEach((resource) => {
    featuredResources.appendChild(createResourceCard(resource));
  });
}

// ====================== ACTIONS ======================
async function downloadResource(id, fileUrl, fileName = "resource") {
  if (!fileUrl) {
    alert("File link not found.");
    return;
  }

  // Optimistic update
  const cardStats = document.querySelectorAll(".resource-stats");
  // (optional: you can update the specific card if you want)

  await client
    .from("resources")
    .update({ downloads: (allResources.find(r => r.id === id)?.downloads || 0) + 1 })
    .eq("id", id);

  const link = document.createElement("a");
  link.href = `${fileUrl}?download=`;
  link.download = fileName;
  link.target = "_blank";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Refresh stats quietly
  loadStatsAndFeatured();
}

async function likeResource(id, currentLikes) {
  const newLikes = currentLikes + 1;
  const { error } = await client
    .from("resources")
    .update({ likes: newLikes })
    .eq("id", id);

  if (error) {
    alert("Failed to like resource.");
    return;
  }
  // Re-load current page to reflect new like count
  loadResources(true);
}

function shareResource(id, title) {
  const url = `${window.location.origin}/resource.html?id=${id}`;
  if (navigator.share) {
    navigator.share({ title, text: `Check this educational resource: ${title}`, url });
  } else {
    navigator.clipboard.writeText(url);
    alert("Resource link copied!");
  }
}

// ====================== COMMENTS ======================
async function openComments(id, title) {
  currentResourceId = id;
  modalResourceTitle.textContent = title;
  commentModal.style.display = "flex";
  loadComments(id);
}

async function loadComments(resourceId) {
  commentsList.innerHTML = `<p>Loading comments...</p>`;
  const { data, error } = await client
    .from("comments")
    .select("*")
    .eq("resource_id", resourceId)
    .order("created_at", { ascending: false });

  if (error) {
    commentsList.innerHTML = `<p>Failed to load comments.</p>`;
    return;
  }

  commentsList.innerHTML = "";
  if (!data.length) {
    commentsList.innerHTML = `<p>No comments yet. Be the first!</p>`;
    return;
  }

  data.forEach((c) => {
    const div = document.createElement("div");
    div.className = "comment-item";
    div.innerHTML = `<strong>${c.name}</strong><p>${c.comment}</p>`;
    commentsList.appendChild(div);
  });
}

commentForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentResourceId) return;

  const { error } = await client.from("comments").insert([{
    resource_id: currentResourceId,
    name: commentName.value.trim(),
    comment: commentText.value.trim(),
  }]);

  if (error) {
    alert("Failed to post comment.");
    return;
  }

  commentName.value = "";
  commentText.value = "";
  loadComments(currentResourceId);
});

closeModal.addEventListener("click", () => commentModal.style.display = "none");
window.addEventListener("click", (e) => {
  if (e.target === commentModal) commentModal.style.display = "none";
});

// ====================== FILTERS & SEARCH ======================
function applyFilters() {
  currentFilters.search = searchInput.value.trim().toLowerCase();
  currentFilters.subject = subjectFilter.value;
  currentFilters.level = levelFilter.value;
  currentFilters.type = typeFilter.value;
  loadResources(true); // reset to page 1
}

searchBtn.addEventListener("click", applyFilters);
searchInput.addEventListener("keyup", (e) => {
  if (e.key === "Enter") applyFilters();
});
subjectFilter.addEventListener("change", applyFilters);
levelFilter.addEventListener("change", applyFilters);
typeFilter.addEventListener("change", applyFilters);

// Category buttons
document.querySelectorAll(".category-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".category-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilters.category = btn.dataset.category;
    loadResources(true);
  });
});

// Load More
loadMoreBtn.addEventListener("click", () => {
  if (!hasMore || isLoading) return;
  currentPage++;
  loadResources(false); // append
});

// Refresh
if (refreshResourcesBtn) {
  refreshResourcesBtn.addEventListener("click", () => loadResources(true));
}

// ====================== THEME ======================
const themeToggle = document.getElementById("themeToggle");
const savedTheme = localStorage.getItem("theme");

if (savedTheme === "light") {
  document.body.classList.add("light-theme");
  themeToggle.textContent = "☀️";
}

themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("light-theme");
  const isLight = document.body.classList.contains("light-theme");
  themeToggle.textContent = isLight ? "☀️" : "🌙";
  localStorage.setItem("theme", isLight ? "light" : "dark");
});

// ====================== START ======================
loadResources(true);
