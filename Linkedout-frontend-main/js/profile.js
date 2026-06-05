/* =============================================
   LinkedOut – Candidate Profile (backed by API)
   ============================================= */

const me = API.requireAuth('candidate');

let profile = null;
let skills = [];

const $ = (id) => document.getElementById(id);
const setText = (id, val, emptyText) => {
  const el = $(id); if (!el) return;
  const has = val !== undefined && val !== null && String(val).trim() !== '';
  el.textContent = has ? val : (emptyText || 'Not provided');
  el.classList.toggle('empty', !has);
};

// ── Load profile into the page ──
function hydrate() {
  const c = profile;
  const contact = c.contactInfo || {};

  // Identity card
  setText('profileAvatarLg', c.initials || 'U');
  setText('profileDisplayName', c.fullName, 'Your name');
  setText('profileDisplayHeadline', c.headline, 'Add a headline');

  // Personal
  setText('viewFullName', c.fullName);
  setText('viewEmail', contact.email);
  setText('viewPhone', contact.phone);
  setText('viewLocation', contact.address);

  // Education & experience
  setText('viewEducation', c.educationLevel);
  setText('viewMajor', c.major);
  setText('viewUniversity', (c.education && c.education[0] && c.education[0].institution) || '');
  setText('viewGradYear', (c.education && c.education[0] && c.education[0].graduationYear) || '');
  setText('viewExperience', (c.yearsOfExperience != null ? c.yearsOfExperience + ' years' : ''));
  setText('viewCurrentRole', c.headline);

  // Skills
  skills = (c.skills || []).slice();
  renderSkills();

  // Resume
  if (c.resumeFile) {
    $('resumeFileName').textContent = c.resumeFile.name;
    $('resumeFileDate').textContent = 'Uploaded ' + new Date(c.resumeFile.uploadedAt).toLocaleDateString();
    $('currentResumeRow').style.display = 'flex';
    $('resumeUploadArea').style.display = 'none';
  } else {
    $('currentResumeRow').style.display = 'none';
    $('resumeUploadArea').style.display = 'block';
  }

  // Preferences
  $('prefLocation').value = c.preferredLocation || '';
  const mode = c.preferredWorkingMode || 'Remote';
  document.querySelectorAll('.pref-opt').forEach(o => o.classList.toggle('active', o.dataset.pref === mode));
  $('workModePrefValue').value = mode;
}

async function load() {
  try {
    const data = await API.candidates.me();
    profile = data.profile;
    hydrate();
  } catch (err) {
    showToast('Could not load profile: ' + err.message, '#c0392b');
  }
}

async function save(patch, msg) {
  try {
    const data = await API.candidates.save(patch);
    profile = data.profile;
    hydrate();
    if (msg) showToast(msg, '#1e5c3a');
  } catch (err) {
    showToast(err.message, '#c0392b');
  }
}

// ── Skills ──
function renderSkills() {
  const container = $('skillsContainer');
  container.innerHTML = '';
  skills.forEach(skill => {
    const span = document.createElement('span');
    span.className = 'skill-tag';
    span.innerHTML = `${skill} <button class="skill-remove" data-skill="${skill}" type="button" aria-label="Remove ${skill}">×</button>`;
    container.appendChild(span);
  });
}

$('skillsContainer').addEventListener('click', (e) => {
  const btn = e.target.closest('.skill-remove');
  if (!btn) return;
  skills = skills.filter(s => s !== btn.dataset.skill);
  renderSkills();
  save({ skills });
});

$('addSkillBtn').addEventListener('click', () => {
  const input = $('skillInput');
  const val = input.value.trim();
  if (!val) return;
  if (skills.some(s => s.toLowerCase() === val.toLowerCase())) { showToast('Skill already added', '#374151'); return; }
  skills.push(val);
  renderSkills();
  input.value = '';
  save({ skills }, `Added "${val}" ✓`);
});
$('skillInput').addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); $('addSkillBtn').click(); } });

// ── Edit sections (view <-> form) ──
function setupEditSection(editBtnId, viewId, formId, saveBtnId, cancelBtnId, fill, collect, msg) {
  const editBtn = $(editBtnId), viewMode = $(viewId), editForm = $(formId);
  $(editBtnId).addEventListener('click', () => {
    fill();
    viewMode.classList.add('hidden');
    editForm.classList.add('active');
    editBtn.style.display = 'none';
  });
  $(cancelBtnId).addEventListener('click', () => {
    editForm.classList.remove('active');
    viewMode.classList.remove('hidden');
    editBtn.style.display = '';
  });
  $(saveBtnId).addEventListener('click', async () => {
    await save(collect(), msg);
    editForm.classList.remove('active');
    viewMode.classList.remove('hidden');
    editBtn.style.display = '';
  });
}

setupEditSection('editPersonalBtn', 'personalViewMode', 'personalEditForm', 'savePersonalBtn', 'cancelPersonalBtn',
  () => {
    $('inputFullName').value = profile.fullName || '';
    $('inputEmail').value = (profile.contactInfo || {}).email || '';
    $('inputPhone').value = (profile.contactInfo || {}).phone || '';
    $('inputLocation').value = (profile.contactInfo || {}).address || '';
  },
  () => ({
    fullName: $('inputFullName').value.trim(),
    contactInfo: {
      ...(profile.contactInfo || {}),
      email: $('inputEmail').value.trim(),
      phone: $('inputPhone').value.trim(),
      address: $('inputLocation').value.trim(),
    },
  }),
  'Personal info saved ✓');

setupEditSection('editEducationBtn', 'educationViewMode', 'educationEditForm', 'saveEducationBtn', 'cancelEducationBtn',
  () => {
    $('inputEducation').value = profile.educationLevel || '';
    $('inputMajor').value = profile.major || '';
    $('inputUniversity').value = (profile.education && profile.education[0] && profile.education[0].institution) || '';
    $('inputGradYear').value = (profile.education && profile.education[0] && profile.education[0].graduationYear) || '';
    $('inputExperience').value = profile.yearsOfExperience || '';
    $('inputCurrentRole').value = profile.headline || '';
  },
  () => {
    const level = $('inputEducation').value;
    const institution = $('inputUniversity').value.trim();
    const gradYear = $('inputGradYear').value;
    return {
      educationLevel: level,
      major: $('inputMajor').value.trim(),
      yearsOfExperience: Number($('inputExperience').value) || 0,
      headline: $('inputCurrentRole').value.trim(),
      education: [{ degree: level, institution, graduationYear: gradYear ? Number(gradYear) : undefined }],
    };
  },
  'Education & experience saved ✓');

// ── Resume upload ──
$('replaceResumeBtn') && $('replaceResumeBtn').addEventListener('click', () => {
  $('currentResumeRow').style.display = 'none';
  $('resumeUploadArea').style.display = 'block';
});
$('resumeFileInput').addEventListener('change', async function () {
  if (!this.files[0]) return;
  try {
    await API.candidates.uploadResume(this.files[0]);
    showToast('Resume uploaded ✓', '#1e5c3a');
    await load();
  } catch (err) { showToast(err.message, '#c0392b'); }
});

// ── Work-mode preference ──
document.querySelectorAll('.pref-opt').forEach(opt => {
  opt.addEventListener('click', function () {
    document.querySelectorAll('.pref-opt').forEach(o => o.classList.remove('active'));
    this.classList.add('active');
    $('workModePrefValue').value = this.dataset.pref;
  });
});
$('savePreferencesBtn').addEventListener('click', () => {
  save({
    preferredWorkingMode: $('workModePrefValue').value,
    preferredLocation: $('prefLocation').value.trim(),
  }, 'Preferences saved ✓');
});

// ── Nav ──
$('homeNavBtn') && $('homeNavBtn').addEventListener('click', () => window.location.href = 'dashboard.html');
$('applicationsNavBtn') && $('applicationsNavBtn').addEventListener('click', () => window.location.href = 'applications.html');
$('profileLogoutBtn') && $('profileLogoutBtn').addEventListener('click', (e) => { e.preventDefault(); API.logout(); });

load();
