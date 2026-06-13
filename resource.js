const SUPABASE_URL = "https://nianlnujdqnkzlesnlbp.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pYW5sbnVqZHFua3psZXNubGJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MDg2NDQsImV4cCI6MjA5MzI4NDY0NH0.YDu4ejDYnW82Wj1LUBSCwFKHyZA0LLaiif0zTegceW4";


const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const resourcePreview = document.getElementById("resourcePreview");

const params = new URLSearchParams(window.location.search);
const resourceId = params.get("id");

async function loadResourcePreview() {
  if (!resourceId) {
    resourcePreview.innerHTML = "Resource not found.";
    return;
  }

  const { data: resource, error } = await client
    .from("resources")
    .select("*")
    .eq("id", resourceId)
    .single();

  if (error || !resource) {
    resourcePreview.innerHTML = "Failed to load resource.";
    return;
  }

  resourcePreview.innerHTML = `
    <div class="preview-card">
      <h1>${resource.title}</h1>
      <p>${resource.description || "No description available."}</p>

      <div class="resource-meta">
        <span>${resource.subject || "General"}</span>
        <span>${resource.level || "All Levels"}</span>
        <span>${resource.file_type || "File"}</span>
      </div>

      <div class="preview-box">
        ${getPreview(resource)}
      </div>

      <button class="download-btn"
        onclick="downloadResource('${resource.id}', '${resource.file_url}', '${resource.file_name}')">
        Download Resource
      </button>
    </div>
  `;
}

function getPreview(resource) {
  const type = (resource.file_type || "").toLowerCase();
  const url = resource.file_url;

  if (type.includes("pdf")) {
    return `<iframe src="${url}" class="preview-frame"></iframe>`;
  }

  if (type.includes("image")) {
    return `<img src="${url}" class="preview-image">`;
  }

  if (type.includes("video")) {
    return `
      <video controls class="preview-video">
        <source src="${url}">
      </video>
    `;
  }

  return `
    <div class="no-preview">
      <h3>Preview not available</h3>
      <p>This file type cannot be previewed directly. Please download it.</p>
    </div>
  `;
}

async function downloadResource(id, fileUrl, fileName = "resource") {
  const { data } = await client
    .from("resources")
    .select("downloads")
    .eq("id", id)
    .single();

  const newDownloads = Number(data?.downloads || 0) + 1;

  await client
    .from("resources")
    .update({ downloads: newDownloads })
    .eq("id", id);

  const link = document.createElement("a");
  link.href = `${fileUrl}?download=`;
  link.download = fileName || "resource";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

loadResourcePreview();
