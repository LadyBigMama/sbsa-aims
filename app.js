const STORAGE_KEY = "sbsa-aims-board-action-tracker-v1";

const defaultState = {
  directors: [
    {
      id: "president",
      name: "President",
      role: "Board leadership",
      email: "",
      area: "Meeting agenda, executive follow-up, and final accountability"
    },
    {
      id: "membership",
      name: "Membership Director",
      role: "Membership",
      email: "",
      area: "Member recruitment, renewals, and retention"
    },
    {
      id: "events",
      name: "Events Director",
      role: "Events",
      email: "",
      area: "Association events, venues, and attendance"
    },
    {
      id: "finance",
      name: "Finance Director",
      role: "Finance",
      email: "",
      area: "Budget, financial reporting, and approvals"
    },
    {
      id: "safety",
      name: "Safety Director",
      role: "Safety",
      email: "",
      area: "Risk management, incident follow-up, and safety notices"
    }
  ],
  tasks: [
    {
      id: "task-renewal-email",
      title: "Prepare renewal email",
      ownerId: "membership",
      dueDate: "2026-05-30",
      priority: "High",
      status: "In progress",
      blocker: "",
      expectedOutcome: "Draft renewal message ready for board review",
      sourceMeeting: "Prototype seed",
      createdAt: "2026-05-22",
      lastReminderAt: "",
      updates: [
        {
          date: "2026-05-22",
          body: "Initial task added from the project outline."
        }
      ]
    },
    {
      id: "task-venue",
      title: "Confirm annual meeting venue",
      ownerId: "events",
      dueDate: "2026-06-15",
      priority: "Normal",
      status: "Waiting",
      blocker: "Budget approval",
      expectedOutcome: "Venue selected and reservation details shared",
      sourceMeeting: "Prototype seed",
      createdAt: "2026-05-22",
      lastReminderAt: "",
      updates: []
    },
    {
      id: "task-budget",
      title: "Review event budget",
      ownerId: "finance",
      dueDate: "2026-06-05",
      priority: "Normal",
      status: "Not started",
      blocker: "Awaiting venue quote",
      expectedOutcome: "Budget recommendation ready for next BOD packet",
      sourceMeeting: "Prototype seed",
      createdAt: "2026-05-22",
      lastReminderAt: "",
      updates: []
    }
  ],
  meetings: [],
  meetingDraftActions: [],
  settings: {
    reminderCadenceDays: 7
  }
};

let state = loadState();
let activeView = "dashboard";
let speechRecognition = null;
let dictationStopRequested = false;
let toastTimer = null;

const els = {
  viewTitle: document.getElementById("viewTitle"),
  metricGrid: document.getElementById("metricGrid"),
  weeklyUpdateList: document.getElementById("weeklyUpdateList"),
  riskList: document.getElementById("riskList"),
  taskForm: document.getElementById("taskForm"),
  taskOwner: document.getElementById("taskOwner"),
  taskTableBody: document.getElementById("taskTableBody"),
  ownerFilter: document.getElementById("ownerFilter"),
  statusFilter: document.getElementById("statusFilter"),
  taskSearch: document.getElementById("taskSearch"),
  meetingDate: document.getElementById("meetingDate"),
  meetingTitle: document.getElementById("meetingTitle"),
  meetingAttendees: document.getElementById("meetingAttendees"),
  meetingAgenda: document.getElementById("meetingAgenda"),
  meetingTranscript: document.getElementById("meetingTranscript"),
  meetingMinutes: document.getElementById("meetingMinutes"),
  micNotice: document.getElementById("micNotice"),
  speakerSelect: document.getElementById("speakerSelect"),
  speakerOther: document.getElementById("speakerOther"),
  meetingActionForm: document.getElementById("meetingActionForm"),
  meetingActionOwner: document.getElementById("meetingActionOwner"),
  meetingActionList: document.getElementById("meetingActionList"),
  reminderQueue: document.getElementById("reminderQueue"),
  replyForm: document.getElementById("replyForm"),
  replyTaskSelect: document.getElementById("replyTaskSelect"),
  directorForm: document.getElementById("directorForm"),
  directorList: document.getElementById("directorList"),
  boardReport: document.getElementById("boardReport"),
  toast: document.getElementById("toast"),
  importFile: document.getElementById("importFile")
};

document.addEventListener("DOMContentLoaded", init);

function init() {
  els.meetingDate.value = todayISO();
  clearMicNotice();
  bindEvents();
  render();
}

function bindEvents() {
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.view));
  });

  document.querySelectorAll("[data-view-jump]").forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.viewJump));
  });

  els.taskForm.addEventListener("submit", addTaskFromForm);
  els.ownerFilter.addEventListener("change", renderTasks);
  els.statusFilter.addEventListener("change", renderTasks);
  els.taskSearch.addEventListener("input", renderTasks);
  els.taskTableBody.addEventListener("change", handleTaskChange);
  els.taskTableBody.addEventListener("click", handleTaskClick);

  document.getElementById("extractActionsButton").addEventListener("click", extractActionsFromTranscript);
  document.getElementById("draftMinutesButton").addEventListener("click", draftMinutes);
  document.getElementById("saveMeetingButton").addEventListener("click", saveMeeting);
  document.getElementById("copyMinutesButton").addEventListener("click", () => copyText(els.meetingMinutes.value, "Minutes copied."));
  document.getElementById("startTranscriptButton").addEventListener("click", startDictation);
  document.getElementById("checkMicButton").addEventListener("click", checkMicrophone);
  document.getElementById("stopTranscriptButton").addEventListener("click", stopDictation);
  document.getElementById("insertSpeakerButton").addEventListener("click", insertSpeakerTurn);
  els.meetingActionForm.addEventListener("submit", addMeetingActionFromForm);
  els.meetingActionList.addEventListener("click", handleMeetingActionClick);

  document.getElementById("copyDigestButton").addEventListener("click", () => copyText(buildWeeklyDigest(), "Weekly digest copied."));
  els.reminderQueue.addEventListener("click", handleReminderClick);
  els.replyForm.addEventListener("submit", saveReply);

  els.directorForm.addEventListener("submit", addDirectorFromForm);
  els.directorList.addEventListener("click", handleDirectorClick);

  document.getElementById("copyReportButton").addEventListener("click", () => copyText(buildBoardReport(), "Board report copied."));
  document.getElementById("printReportButton").addEventListener("click", () => window.print());
  document.getElementById("exportDataButton").addEventListener("click", exportData);
  document.getElementById("resetDemoButton").addEventListener("click", resetDemoData);
  els.importFile.addEventListener("change", importData);
}

function loadState() {
  if (new URLSearchParams(window.location.search).get("reset") === "1") {
    localStorage.removeItem(STORAGE_KEY);
    window.history.replaceState(null, "", window.location.pathname);
  }

  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    return structuredClone(defaultState);
  }

  try {
    return normalizeState(JSON.parse(saved));
  } catch (error) {
    console.warn(error);
    return structuredClone(defaultState);
  }
}

function normalizeState(nextState) {
  return {
    directors: Array.isArray(nextState.directors) ? nextState.directors : structuredClone(defaultState.directors),
    tasks: Array.isArray(nextState.tasks) ? nextState.tasks : [],
    meetings: Array.isArray(nextState.meetings) ? nextState.meetings : [],
    meetingDraftActions: Array.isArray(nextState.meetingDraftActions) ? nextState.meetingDraftActions : [],
    settings: {
      ...defaultState.settings,
      ...(nextState.settings || {})
    }
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function render() {
  renderDirectorOptions();
  renderDashboard();
  renderTasks();
  renderMeetingActions();
  renderReminders();
  renderDirectors();
  renderReports();
}

function switchView(view) {
  activeView = view;
  document.querySelectorAll(".view").forEach((section) => {
    section.classList.toggle("is-active", section.id === `${view}View`);
  });
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === view);
  });
  els.viewTitle.textContent = titleCase(view);
  if (view === "reports") {
    renderReports();
  }
  if (view === "tasks") {
    document.getElementById("taskTitle").focus();
  }
}

function renderDirectorOptions() {
  const selectedSpeaker = els.speakerSelect.value || state.directors[0]?.id || "guest";
  const options = state.directors
    .map((director) => `<option value="${escapeHtml(director.id)}">${escapeHtml(director.name)}</option>`)
    .join("");

  els.taskOwner.innerHTML = options;
  els.meetingActionOwner.innerHTML = options;
  els.speakerSelect.innerHTML = `${options}<option value="guest">Guest / other</option>`;
  els.speakerSelect.value = state.directors.some((director) => director.id === selectedSpeaker) ? selectedSpeaker : "guest";

  const ownerFilterValue = els.ownerFilter.value || "all";
  els.ownerFilter.innerHTML = `<option value="all">All owners</option>${options}`;
  els.ownerFilter.value = state.directors.some((director) => director.id === ownerFilterValue) ? ownerFilterValue : "all";
}

function renderDashboard() {
  const metrics = getMetrics();
  els.metricGrid.innerHTML = [
    metricCard("Active tasks", metrics.active, "blue"),
    metricCard("Overdue", metrics.overdue, "red"),
    metricCard("Blocked", metrics.blocked, "amber"),
    metricCard("Done", metrics.done, "green")
  ].join("");

  const needsUpdate = getTasksNeedingUpdate().slice(0, 6);
  renderList(els.weeklyUpdateList, needsUpdate, (task) => taskListItem(task, { includeReminder: true }));

  const riskTasks = getRiskTasks().slice(0, 6);
  renderList(els.riskList, riskTasks, (task) => taskListItem(task, { includeBlocker: true }));
}

function metricCard(label, value, tone) {
  return `
    <article class="metric" data-tone="${tone}">
      <span>${escapeHtml(label)}</span>
      <strong>${value}</strong>
    </article>
  `;
}

function renderTasks() {
  const ownerFilter = els.ownerFilter.value || "all";
  const statusFilter = els.statusFilter.value || "all";
  const query = (els.taskSearch.value || "").trim().toLowerCase();

  const filtered = state.tasks
    .filter((task) => ownerFilter === "all" || task.ownerId === ownerFilter)
    .filter((task) => statusFilter === "all" || task.status === statusFilter)
    .filter((task) => {
      if (!query) return true;
      const owner = getDirector(task.ownerId);
      return [task.title, task.blocker, task.expectedOutcome, owner.name, owner.role]
        .join(" ")
        .toLowerCase()
        .includes(query);
    })
    .sort(sortTasks);

  if (!filtered.length) {
    els.taskTableBody.innerHTML = `
      <tr>
        <td colspan="7">${emptyState("No tasks match the current filters.")}</td>
      </tr>
    `;
    renderReplyOptions();
    return;
  }

  els.taskTableBody.innerHTML = filtered.map(taskRow).join("");
  renderReplyOptions();
}

function taskRow(task) {
  const owner = getDirector(task.ownerId);
  const latest = getLatestUpdate(task);
  const dueBadge = dueStatusBadge(task);
  const blockerText = task.blocker ? escapeHtml(task.blocker) : '<span class="muted">None</span>';
  const updateText = latest
    ? `${escapeHtml(latest.body)}<br><span class="muted">${formatDate(latest.date)}</span>`
    : '<span class="muted">No update recorded</span>';

  return `
    <tr data-task-id="${escapeHtml(task.id)}">
      <td class="task-title-cell">
        <strong>${escapeHtml(task.title)}</strong>
        <span>${escapeHtml(task.expectedOutcome || "No expected outcome recorded")}</span>
        <div class="badge-row">${dueBadge}<span class="badge">${escapeHtml(task.priority)}</span></div>
      </td>
      <td>${escapeHtml(owner.name)}<br><span class="muted">${escapeHtml(owner.role || owner.area || "")}</span></td>
      <td>${formatDate(task.dueDate)}</td>
      <td>
        <select class="inline-control" data-task-field="status">
          ${statusOptions(task.status)}
        </select>
      </td>
      <td>
        <input class="inline-control" data-task-field="blocker" value="${escapeAttribute(task.blocker || "")}" placeholder="No blocker">
      </td>
      <td>${updateText}</td>
      <td class="actions-cell">
        <button class="icon-button" type="button" title="Add update" data-task-action="quick-update">
          <svg viewBox="0 0 24 24"><path d="M5 5h14v10H7l-2 2V5Zm2 2v5.2l1.2-1.2H17V7H7Zm-2 12h14v2H5v-2Z"></path></svg>
        </button>
        <button class="icon-button" type="button" title="Delete task" data-task-action="delete">
          <svg viewBox="0 0 24 24"><path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-2 6h10l-.8 12H7.8L7 9Z"></path></svg>
        </button>
      </td>
    </tr>
  `;
}

function renderMeetingActions() {
  renderList(els.meetingActionList, state.meetingDraftActions, (action) => {
    const owner = getDirector(action.ownerId);
    const inferredDueBadge = action.inferredDueDate ? '<span class="badge amber">Due inferred</span>' : "";
    const ruleBadge = action.extractionRule ? `<span class="badge teal">${escapeHtml(action.extractionRule)}</span>` : "";
    const note = action.expectedOutcome ? `<p class="small-text">${escapeHtml(action.expectedOutcome)}</p>` : "";
    const source = action.sourceLine ? `<p class="small-text"><strong>Source:</strong> ${escapeHtml(action.sourceLine)}</p>` : "";
    return `
      <article class="list-item" data-action-id="${escapeHtml(action.id)}">
        <div class="list-item-header">
          <div class="list-item-title">
            ${escapeHtml(action.title)}
            <span>${escapeHtml(owner.name)} due ${formatDate(action.dueDate)}</span>
          </div>
          <div class="badge-row">${ruleBadge}${inferredDueBadge}</div>
          <button class="icon-button" type="button" title="Remove action" data-meeting-action="delete">
            <svg viewBox="0 0 24 24"><path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-2 6h10l-.8 12H7.8L7 9Z"></path></svg>
          </button>
        </div>
        ${note}
        ${source}
      </article>
    `;
  }, "No meeting actions drafted yet.");
}

function renderReminders() {
  const tasks = getTasksNeedingUpdate();
  renderList(els.reminderQueue, tasks, (task) => {
    const owner = getDirector(task.ownerId);
    const reminder = buildReminder(task);
    return `
      <article class="list-item" data-task-id="${escapeHtml(task.id)}">
        <div class="list-item-header">
          <div class="list-item-title">
            ${escapeHtml(owner.name)}
            <span>${escapeHtml(task.title)} due ${formatDate(task.dueDate)}</span>
          </div>
          ${dueStatusBadge(task)}
        </div>
        <p class="small-text">${escapeHtml(reminder.body)}</p>
        <div class="button-row">
          <button class="secondary-button" type="button" data-reminder-action="copy">Copy reminder</button>
          <button class="ghost-button" type="button" data-reminder-action="email">Open email</button>
          <button class="ghost-button" type="button" data-reminder-action="mark">Mark reminded</button>
        </div>
      </article>
    `;
  }, "No active tasks need a weekly reminder right now.");
  renderReplyOptions();
}

function renderReplyOptions() {
  const activeTasks = state.tasks.filter((task) => task.status !== "Done").sort(sortTasks);
  els.replyTaskSelect.innerHTML = activeTasks.length
    ? activeTasks.map((task) => `<option value="${escapeHtml(task.id)}">${escapeHtml(getDirector(task.ownerId).name)}: ${escapeHtml(task.title)}</option>`).join("")
    : '<option value="">No active tasks</option>';
}

function renderDirectors() {
  if (!state.directors.length) {
    els.directorList.innerHTML = emptyState("Add directors before assigning work.");
    return;
  }

  els.directorList.innerHTML = state.directors.map((director) => {
    const taskCount = state.tasks.filter((task) => task.ownerId === director.id && task.status !== "Done").length;
    return `
      <article class="director-card" data-director-id="${escapeHtml(director.id)}">
        <div class="list-item-header">
          <div>
            <h4>${escapeHtml(director.name)}</h4>
            <p class="muted">${escapeHtml(director.role || "No role listed")}</p>
          </div>
          <span class="badge ${taskCount ? "blue" : ""}">${taskCount} active</span>
        </div>
        <dl>
          <dt>Email</dt>
          <dd>${director.email ? escapeHtml(director.email) : '<span class="muted">Not set</span>'}</dd>
          <dt>Responsibility</dt>
          <dd>${escapeHtml(director.area || "Not set")}</dd>
        </dl>
        <button class="ghost-button" type="button" data-director-action="delete">Remove director</button>
      </article>
    `;
  }).join("");
}

function renderReports() {
  els.boardReport.textContent = buildBoardReport();
}

function addTaskFromForm(event) {
  event.preventDefault();
  const form = new FormData(els.taskForm);
  const title = form.get("title").trim();
  if (!title) return;

  state.tasks.push({
    id: makeId("task"),
    title,
    ownerId: form.get("ownerId"),
    dueDate: form.get("dueDate"),
    priority: form.get("priority"),
    status: "Not started",
    blocker: "",
    expectedOutcome: form.get("expectedOutcome").trim(),
    sourceMeeting: "Manual entry",
    createdAt: todayISO(),
    lastReminderAt: "",
    updates: []
  });

  saveState();
  els.taskForm.reset();
  els.taskOwner.value = state.directors[0]?.id || "";
  render();
  showToast("Task added.");
}

function handleTaskChange(event) {
  const row = event.target.closest("[data-task-id]");
  const field = event.target.dataset.taskField;
  if (!row || !field) return;

  const task = state.tasks.find((item) => item.id === row.dataset.taskId);
  if (!task) return;

  task[field] = event.target.value;
  if (field === "status") {
    task.updates.push({
      date: todayISO(),
      body: `Status changed to ${event.target.value}.`
    });
  }

  saveState();
  render();
}

function handleTaskClick(event) {
  const actionButton = event.target.closest("[data-task-action]");
  if (!actionButton) return;

  const row = actionButton.closest("[data-task-id]");
  const task = state.tasks.find((item) => item.id === row.dataset.taskId);
  if (!task) return;

  if (actionButton.dataset.taskAction === "delete") {
    if (!confirm(`Delete task "${task.title}"?`)) return;
    state.tasks = state.tasks.filter((item) => item.id !== task.id);
    saveState();
    render();
    showToast("Task deleted.");
    return;
  }

  if (actionButton.dataset.taskAction === "quick-update") {
    const update = prompt("Progress update");
    if (!update) return;
    task.updates.push({ date: todayISO(), body: update.trim() });
    saveState();
    render();
    showToast("Update recorded.");
  }
}

function addMeetingActionFromForm(event) {
  event.preventDefault();
  const title = document.getElementById("meetingActionTitle").value.trim();
  const ownerId = document.getElementById("meetingActionOwner").value;
  const dueDate = document.getElementById("meetingActionDue").value;

  if (!title || !ownerId || !dueDate) {
    showToast("Action, owner, and due date are required.");
    return;
  }

  state.meetingDraftActions.push({
    id: makeId("action"),
    title,
    ownerId,
    dueDate,
    priority: "Normal",
    expectedOutcome: ""
  });

  saveState();
  els.meetingActionForm.reset();
  renderMeetingActions();
  showToast("Meeting action added.");
}

function handleMeetingActionClick(event) {
  const button = event.target.closest("[data-meeting-action]");
  if (!button) return;

  const item = button.closest("[data-action-id]");
  state.meetingDraftActions = state.meetingDraftActions.filter((action) => action.id !== item.dataset.actionId);
  saveState();
  renderMeetingActions();
}

function extractActionsFromTranscript() {
  const transcript = els.meetingTranscript.value;
  const extracted = parseActionLines(transcript);
  const newActions = extracted.filter((candidate) => {
    return !state.meetingDraftActions.some((existing) => {
      return existing.title.toLowerCase() === candidate.title.toLowerCase() && existing.ownerId === candidate.ownerId;
    });
  });

  state.meetingDraftActions.push(...newActions);
  saveState();
  renderMeetingActions();
  showToast(newActions.length ? `${newActions.length} action item(s) extracted.` : "No new action lines found.");
}

function parseActionLines(text) {
  const actions = [];
  const seen = new Set();

  splitActionCandidates(text).flatMap(splitCompoundActionCandidate).forEach((sourceLine) => {
    const action = parseActionCandidate(sourceLine);
    if (!action) return;

    const dedupeKey = `${action.ownerId}:${action.title.toLowerCase()}`;
    if (!seen.has(dedupeKey)) {
      seen.add(dedupeKey);
      actions.push(action);
    }
  });

  return actions.filter(Boolean);
}

function parseActionCandidate(sourceLine) {
  const speakerTurn = parseSpeakerTurn(sourceLine);
  const line = normalizeActionText(speakerTurn.text);
  if (!line || isNonActionDiscussion(line)) return null;

  const explicit = line.match(/^action(?:\s+item)?\s*:\s*(?:for\s+)?(.+?)\s*(?:-|:)\s*(.+)$/i);
  if (explicit) {
    return actionFromParts(explicit[1], explicit[2], sourceLine, "Action label");
  }

  const explicitOwnerTo = line.match(/^(?:the\s+)?action item(?:\s+is)?\s+(?:for\s+)?(?:the\s+)?(.+?)\s+to\s+(.+)$/i)
    || line.match(/^action(?:\s+item)?\s*:\s*(?:the\s+)?(.+?)\s+to\s+(.+)$/i);
  if (explicitOwnerTo) {
    return actionFromParts(explicitOwnerTo[1], explicitOwnerTo[2], sourceLine, "Action label");
  }

  const selfAssigned = line.match(/^(?:i(?:['’]ll| will| shall| should| need to| have to| can| am going to)|i['’]m going to|i agreed to|i volunteered to|i committed to)\s+(.+)$/i);
  if (selfAssigned && speakerTurn.owner) {
    return actionFromOwner(speakerTurn.owner, selfAssigned[1], sourceLine, "Speaker self-assignment");
  }

  if (speakerTurn.owner && startsWithActionVerb(line)) {
    return actionFromOwner(speakerTurn.owner, line, sourceLine, "Speaker action");
  }

  const passive = line.match(/^(?:the\s+)?(.+?)\s+(?:was|were|is|are|has been|have been)\s+(?:told|asked|assigned|directed|tasked)\s+to\s+(.+)$/i);
  if (passive) {
    return actionFromParts(passive[1], passive[2], sourceLine, "Passive assignment");
  }

  const requested = line.match(/^.+?\s+(?:asked|told|assigned|directed|tasked|reminded)\s+(?:the\s+)?(.+?)\s+to\s+(.+)$/i);
  if (requested) {
    return actionFromParts(requested[1], requested[2], sourceLine, "Requested assignment");
  }

  const boardNeed = line.match(/^(?:we|the board|board|bod|the committee|committee|they|someone)\s+(?:need|needs|want|wants|would like|agreed|decided)\s+(?:for\s+)?(?:the\s+)?(.+?)\s+to\s+(.+)$/i);
  if (boardNeed) {
    return actionFromParts(boardNeed[1], boardNeed[2], sourceLine, "Board assignment");
  }

  const letsHave = line.match(/^(?:let(?:'|’)s|lets|we should|we need to|we are going to|we're going to)\s+have\s+(?:the\s+)?(.+?)\s+(.+)$/i);
  if (letsHave) {
    return actionFromParts(letsHave[1], letsHave[2], sourceLine, "Board assignment");
  }

  const question = line.match(/^(?:can|could|would|will|should)\s+(?:the\s+)?(.+?)\s+(.+)$/i);
  if (question) {
    return actionFromParts(question[1], question[2], sourceLine, "Question assignment");
  }

  const directAddress = line.match(/^(?:the\s+)?(.+?),\s*(?:please\s+)?(.+)$/i);
  if (directAddress && startsWithActionVerb(directAddress[2])) {
    return actionFromParts(directAddress[1], directAddress[2], sourceLine, "Direct request");
  }

  const responsible = line.match(/^(?:the\s+)?(.+?)\s+(?:is|are|will be|should be)\s+responsible\s+for\s+(.+)$/i);
  if (responsible) {
    return actionFromParts(responsible[1], responsible[2], sourceLine, "Responsibility");
  }

  const owns = line.match(/^(?:the\s+)?(.+?)\s+(?:owns|will own|takes|will take|is taking)\s+(.+)$/i);
  if (owns) {
    return actionFromParts(owns[1], owns[2], sourceLine, "Ownership");
  }

  const active = line.match(/^(?:the\s+)?(.+?)\s+(?:will|shall|should|needs to|need to|has to|have to|is going to|are going to|agreed to|volunteered to|committed to|to)\s+(.+)$/i);
  if (active) {
    return actionFromParts(active[1], active[2], sourceLine, "Owner assignment");
  }

  return null;
}

function splitActionCandidates(text) {
  const candidates = [];
  let pending = null;

  const flushPending = () => {
    if (!pending) return;
    candidates.push(formatActionCandidate(pending));
    pending = null;
  };

  text
    .split(/\n+/)
    .flatMap(splitTranscriptLineIntoCandidates)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[-*]\s+/, ""))
    .forEach((line) => {
      const turn = parseSpeakerTurn(line);
      const fragment = normalizeActionText(turn.text);
      if (!fragment) return;

      if (pending && shouldJoinTranscriptFragment(pending, turn, fragment)) {
        pending.text = joinTranscriptText(pending.text, fragment);
        return;
      }

      flushPending();
      pending = {
        speakerName: turn.speakerName,
        text: fragment
      };
    });

  flushPending();
  return candidates;
}

function splitTranscriptLineIntoCandidates(line) {
  const cleanLine = line.trim();
  if (!cleanLine) return [];

  const turn = parseSpeakerTurn(cleanLine);
  const fragments = turn.text.split(/[.!?]\s+/).map((fragment) => fragment.trim()).filter(Boolean);
  if (!turn.speakerName) return fragments;

  return fragments.map((fragment) => `${turn.speakerName}: ${fragment}`);
}

function shouldJoinTranscriptFragment(pending, nextTurn, nextText) {
  if (pending.speakerName !== nextTurn.speakerName) return false;
  if (isDueDateFragment(nextText)) return true;
  return endsWithContinuationCue(pending.text);
}

function joinTranscriptText(baseText, nextText) {
  const cleanBase = baseText.trim();
  const cleanNext = nextText.trim();
  const nextFragment = endsWithContinuationCue(cleanBase) ? lowercaseFirstLetter(cleanNext) : cleanNext;
  return `${cleanBase} ${nextFragment}`;
}

function lowercaseFirstLetter(text) {
  return text ? `${text.charAt(0).toLowerCase()}${text.slice(1)}` : "";
}

function formatActionCandidate(candidate) {
  return candidate.speakerName ? `${candidate.speakerName}: ${candidate.text}` : candidate.text;
}

function isDueDateFragment(text) {
  return /^(?:by|before|due(?:\s+by)?|no later than|deadline(?:\s+is)?|on)\s+.+$/i.test(text.trim());
}

function endsWithContinuationCue(text) {
  return /(?:-|:|\b(?:will|shall|should|needs to|need to|has to|have to|is going to|are going to|agreed to|volunteered to|committed to|to|for|by|before|due|on|the|a|an|and|of|in|with))\s*$/i.test(text.trim());
}

function splitCompoundActionCandidate(sourceLine) {
  const turn = parseSpeakerTurn(sourceLine);
  const markers = findOwnerActionMarkers(turn.text);
  if (markers.length <= 1) return [sourceLine];

  const prefix = turn.speakerName ? `${turn.speakerName}: ` : "";
  return markers.map((marker, index) => {
    const nextMarker = markers[index + 1];
    return `${prefix}${turn.text.slice(marker.index, nextMarker ? nextMarker.index : undefined).trim()}`;
  });
}

function findOwnerActionMarkers(text) {
  const markers = [];
  const assignmentVerb = "(?:will|shall|should|needs to|need to|has to|have to|is going to|are going to|agreed to|volunteered to|committed to)";
  const aliasPattern = getDirectorAliasPattern();
  if (!aliasPattern) return markers;

  const pattern = new RegExp(`(?:^|\\s)(?:the\\s+)?(${aliasPattern})\\s+${assignmentVerb}\\b`, "gi");
  let match;

  while ((match = pattern.exec(text)) !== null) {
    const ownerText = match[1].trim();
    if (findDirectorByText(ownerText)) {
      const leadingWhitespace = match[0].match(/^\s/) ? 1 : 0;
      markers.push({ index: match.index + leadingWhitespace });
    }
  }

  return markers;
}

function getDirectorAliasPattern() {
  const aliases = getDirectorAliases();
  return aliases.map(escapeRegExp).join("|");
}

function getDirectorAliases() {
  const aliases = new Set([
    "president",
    "membership director",
    "membership coordinator",
    "event director",
    "events director",
    "event coordinator",
    "events coordinator",
    "finance director",
    "financial director",
    "treasurer",
    "safety director",
    "safety coordinator"
  ]);

  state.directors.forEach((director) => {
    addDirectorAlias(aliases, director.name);
    addDirectorAlias(aliases, director.role);
    const role = director.role || director.name.replace(/\bdirector\b/i, "");
    addDirectorAlias(aliases, `${role} director`);
    addDirectorAlias(aliases, `${role} coordinator`);
  });

  return [...aliases].filter(Boolean).sort((a, b) => b.length - a.length);
}

function addDirectorAlias(aliases, value) {
  const cleanValue = String(value || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  if (!cleanValue) return;

  aliases.add(cleanValue);
  aliases.add(singularizeWords(cleanValue));
}

function singularizeWords(text) {
  return text
    .split(/\s+/)
    .map((word) => word.length > 3 ? word.replace(/s$/, "") : word)
    .join(" ");
}

function normalizeActionText(text) {
  return text
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^(okay|ok|so|well|also|and)\s*,?\s+/i, "")
    .replace(/[.;,]\s*$/, "");
}

function isNonActionDiscussion(text) {
  return /^(i think|i feel|i believe|maybe|perhaps|what if|why don't we discuss|we discussed|there was discussion|for information|fyi)\b/i.test(text);
}

function startsWithActionVerb(text) {
  return /^(reach out|follow up|set up|look into|check on|call|email|contact|send|review|prepare|book|schedule|arrange|confirm|get|ask|talk to|coordinate|organize|publish|file|submit|create|write|draft|meet|investigate|report|update|collect|share|bring|find|verify|circulate|incorporate)\b/i.test(text.trim());
}

function parseSpeakerTurn(line) {
  const speakerMatch = line.match(/^([^:]{2,80}):\s*(.+)$/);
  if (!speakerMatch || /^(action|decision)$/i.test(speakerMatch[1].trim())) {
    return {
      text: line,
      speakerName: "",
      owner: null
    };
  }

  const speakerName = speakerMatch[1].trim();
  return {
    text: speakerMatch[2].trim(),
    speakerName,
    owner: findDirectorByText(speakerName)
  };
}

function formatTranscriptSummaryLine(entry, text) {
  const cleanText = text.trim();
  if (!entry.speakerName) return cleanText;
  return `${entry.speakerName}: ${cleanText}`;
}

function actionFromParts(ownerText, titleText, sourceLine, extractionRule) {
  return actionFromOwner(findDirectorByText(ownerText), titleText, sourceLine, extractionRule);
}

function actionFromOwner(owner, titleText, sourceLine, extractionRule) {
  const dueInfo = extractDueDateFromTask(titleText);
  const dueDate = dueInfo.dueDate || defaultActionDueDate();
  const inferredDueDate = !dueInfo.dueDate;
  const title = cleanTaskTitle(dueInfo.taskText);

  if (!owner || !dueDate || !title) {
    return null;
  }

  const noteParts = [];
  if (inferredDueDate) {
    noteParts.push("No due date was spoken. Defaulted to next weekly follow-up.");
  }
  if (extractionRule) {
    noteParts.push(`Extracted by rule: ${extractionRule}.`);
  }

  return {
    id: makeId("action"),
    title,
    ownerId: owner.id,
    dueDate,
    priority: "Normal",
    expectedOutcome: noteParts.join(" "),
    inferredDueDate,
    extractionRule,
    sourceLine
  };
}

function extractDueDateFromTask(text) {
  const cleanText = normalizeActionText(text);
  const eventDateMatch = cleanText.match(/^(.*?)(?:\s+(?:the\s+)?(?:party|event|meeting|booking|deadline|due date)\s+(?:will be|is|was)\s+on\s+(.+))$/i);

  if (eventDateMatch) {
    const dueDate = parseDateToISO(eventDateMatch[2]);
    if (dueDate) {
      return {
        taskText: eventDateMatch[1],
        dueDate
      };
    }
  }

  const dueMatch = cleanText.match(/^(.*?)(?:\s+(?:by|before|due(?:\s+by)?|no later than|deadline(?:\s+is)?|on)\s+(.+))$/i);

  if (dueMatch) {
    const dueDate = parseDateToISO(dueMatch[2]);
    if (dueDate) {
      return {
        taskText: dueMatch[1],
        dueDate
      };
    }
  }

  return {
    taskText: cleanText,
    dueDate: ""
  };
}

function cleanTaskTitle(text) {
  return cleanSentence(text)
    .replace(/^To\s+/i, "")
    .replace(/^Be responsible for\s+/i, "")
    .trim();
}

function draftMinutes() {
  const title = els.meetingTitle.value.trim() || "Board Meeting";
  const date = els.meetingDate.value || todayISO();
  const attendees = els.meetingAttendees.value.trim() || "Not recorded";
  const agenda = splitLines(els.meetingAgenda.value);
  const transcript = splitLines(els.meetingTranscript.value);
  const transcriptEntries = transcript.map((line) => ({
    raw: line,
    ...parseSpeakerTurn(line)
  }));
  const decisions = transcriptEntries
    .filter((entry) => /^decision:/i.test(entry.text))
    .map((entry) => formatTranscriptSummaryLine(entry, entry.text.replace(/^decision:\s*/i, "")));
  const discussion = transcriptEntries
    .filter((entry) => !/^action:|^decision:/i.test(entry.text))
    .slice(0, 8)
    .map((entry) => formatTranscriptSummaryLine(entry, entry.text));
  const actionLines = state.meetingDraftActions.map((action) => {
    const owner = getDirector(action.ownerId);
    const inferred = action.inferredDueDate ? " | Due date inferred" : "";
    return `- ${action.title} | Owner: ${owner.name} | Due: ${formatDate(action.dueDate)}${inferred}`;
  });

  const minutes = [
    `# ${title}`,
    `Date: ${formatDate(date)}`,
    `Attendees: ${attendees}`,
    "",
    "## Agenda",
    agenda.length ? agenda.map((item) => `- ${item}`).join("\n") : "- Not recorded",
    "",
    "## Discussion Summary",
    discussion.length ? discussion.map((item) => `- ${cleanSentence(item)}`).join("\n") : "- Discussion summary needs review.",
    "",
    "## Decisions",
    decisions.length ? decisions.map((item) => `- ${cleanSentence(item)}`).join("\n") : "- No formal decisions marked.",
    "",
    "## Action Items",
    actionLines.length ? actionLines.join("\n") : "- No action items captured.",
    "",
    "## Open Blockers",
    state.meetingDraftActions.length ? "- Review blockers after assigning tasks." : "- None recorded."
  ].join("\n");

  els.meetingMinutes.value = minutes;
  showToast("Minutes drafted for review.");
}

function saveMeeting() {
  if (!els.meetingMinutes.value.trim()) {
    draftMinutes();
  }

  const meetingId = makeId("meeting");
  const actionIds = [];

  state.meetingDraftActions.forEach((action) => {
    const taskId = makeId("task");
    actionIds.push(taskId);
    state.tasks.push({
      id: taskId,
      title: action.title,
      ownerId: action.ownerId,
      dueDate: action.dueDate,
      priority: action.priority || "Normal",
      status: "Not started",
      blocker: "",
      expectedOutcome: action.expectedOutcome || "",
      sourceMeeting: meetingId,
      createdAt: todayISO(),
      lastReminderAt: "",
      updates: [
        {
          date: todayISO(),
          body: "Created from meeting minutes."
        }
      ]
    });
  });

  state.meetings.push({
    id: meetingId,
    title: els.meetingTitle.value.trim() || "Board Meeting",
    date: els.meetingDate.value || todayISO(),
    attendees: els.meetingAttendees.value.trim(),
    agenda: els.meetingAgenda.value.trim(),
    transcript: els.meetingTranscript.value.trim(),
    minutes: els.meetingMinutes.value.trim(),
    actionIds
  });

  state.meetingDraftActions = [];
  saveState();
  render();
  showToast("Meeting saved and action items added to the task board.");
}

function insertSpeakerTurn() {
  els.meetingTranscript.value = appendTranscriptLine(els.meetingTranscript.value, `${currentSpeakerName()}:`);
  els.meetingTranscript.focus();
}

function currentSpeakerName() {
  if (els.speakerSelect.value === "guest") {
    return els.speakerOther.value.trim() || "Guest";
  }

  return getDirector(els.speakerSelect.value).name;
}

function formatSpeakerLine(text) {
  const cleanText = text.trim();
  if (!cleanText) return "";
  return `${currentSpeakerName()}: ${cleanSentence(cleanText)}`;
}

function appendTranscriptLine(baseText, line) {
  const cleanBase = (baseText || "").trim();
  const cleanLine = (line || "").trim();
  if (!cleanLine) return cleanBase;
  return cleanBase ? `${cleanBase}\n${cleanLine}` : cleanLine;
}

async function startDictation() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    showMicNotice("Dictation is not supported in this browser.", "Open this page in Chrome or Safari, or paste a transcript into the notes box.");
    return;
  }

  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    try {
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStream.getTracks().forEach((track) => track.stop());
    } catch (error) {
      showMicNotice("Microphone permission was not allowed.", "Allow microphone access for this browser in macOS Privacy & Security settings, then reload the page. If you are using the Codex in-app browser, open http://localhost:8000/ in Chrome or Safari instead.");
      return;
    }
  }

  dictationStopRequested = false;
  speechRecognition = new SpeechRecognition();
  speechRecognition.continuous = true;
  speechRecognition.interimResults = true;
  speechRecognition.lang = "en-US";

  let committedText = els.meetingTranscript.value.trim();

  speechRecognition.onresult = (event) => {
    let interim = "";
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const transcript = event.results[index][0].transcript.trim();
      if (event.results[index].isFinal) {
        committedText = appendTranscriptLine(committedText, formatSpeakerLine(transcript));
      } else {
        interim = formatSpeakerLine(transcript);
      }
    }
    els.meetingTranscript.value = appendTranscriptLine(committedText, interim);
  };

  speechRecognition.onerror = (event) => {
    if (dictationStopRequested || event.error === "aborted") {
      return;
    }

    if (event.error === "not-allowed" || event.error === "service-not-allowed") {
      showMicNotice("Microphone access is blocked.", "Allow microphone access for this browser, reload the page, and try again. You can still paste notes or a transcript into the meeting box.");
      stopDictation();
      return;
    }

    showToast("Dictation stopped.");
    stopDictation();
  };

  speechRecognition.onend = () => {
    document.getElementById("startTranscriptButton").disabled = false;
    document.getElementById("stopTranscriptButton").disabled = true;
  };

  speechRecognition.start();
  document.getElementById("startTranscriptButton").disabled = true;
  document.getElementById("stopTranscriptButton").disabled = false;
  clearMicNotice();
  showToast("Dictation started.");
}

async function checkMicrophone() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const hasMediaDevices = Boolean(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

  if (!SpeechRecognition) {
    showMicNotice("This browser does not support built-in speech dictation.", "Use Chrome or Safari for live dictation, or paste a transcript into the notes box.");
    return;
  }

  if (!hasMediaDevices) {
    showMicNotice("This browser is not exposing microphone devices to the page.", "Open http://localhost:8000/ in Chrome or Safari. The Codex in-app browser may not be able to pass microphone access through to local pages.");
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    showMicNotice("Microphone access is available.", "Click Start dictation when you are ready to capture meeting notes.");
  } catch (error) {
    showMicNotice("Microphone access is blocked.", "Allow microphone access for this browser in macOS Privacy & Security settings, then reload the page. If the prompt never appears, open the same localhost URL in Chrome or Safari.");
  }
}

function showMicNotice(title, body) {
  els.micNotice.hidden = false;
  els.micNotice.innerHTML = `<strong>${escapeHtml(title)}</strong><span>${escapeHtml(body)}</span>`;
  showToast(title);
}

function clearMicNotice() {
  els.micNotice.hidden = true;
  els.micNotice.innerHTML = "";
}

function stopDictation() {
  dictationStopRequested = true;
  clearMicNotice();
  if (speechRecognition) {
    speechRecognition.stop();
  }
  document.getElementById("startTranscriptButton").disabled = false;
  document.getElementById("stopTranscriptButton").disabled = true;
}

function handleReminderClick(event) {
  const button = event.target.closest("[data-reminder-action]");
  if (!button) return;

  const item = button.closest("[data-task-id]");
  const task = state.tasks.find((candidate) => candidate.id === item.dataset.taskId);
  if (!task) return;

  const reminder = buildReminder(task);

  if (button.dataset.reminderAction === "copy") {
    copyText(`${reminder.subject}\n\n${reminder.body}`, "Reminder copied.");
  }

  if (button.dataset.reminderAction === "email") {
    const owner = getDirector(task.ownerId);
    const href = `mailto:${encodeURIComponent(owner.email || "")}?subject=${encodeURIComponent(reminder.subject)}&body=${encodeURIComponent(reminder.body)}`;
    window.location.href = href;
  }

  if (button.dataset.reminderAction === "mark") {
    task.lastReminderAt = todayISO();
    saveState();
    render();
    showToast("Reminder date recorded.");
  }
}

function saveReply(event) {
  event.preventDefault();
  const task = state.tasks.find((candidate) => candidate.id === els.replyTaskSelect.value);
  if (!task) return;

  task.status = document.getElementById("replyStatus").value;
  task.blocker = document.getElementById("replyBlocker").value.trim();
  task.updates.push({
    date: todayISO(),
    body: document.getElementById("replyBody").value.trim()
  });

  saveState();
  els.replyForm.reset();
  render();
  showToast("Reply saved.");
}

function addDirectorFromForm(event) {
  event.preventDefault();
  const name = document.getElementById("directorName").value.trim();
  if (!name) return;

  state.directors.push({
    id: makeId("director"),
    name,
    role: document.getElementById("directorRole").value.trim(),
    email: document.getElementById("directorEmail").value.trim(),
    area: document.getElementById("directorArea").value.trim()
  });

  saveState();
  els.directorForm.reset();
  render();
  showToast("Director added.");
}

function handleDirectorClick(event) {
  const button = event.target.closest("[data-director-action]");
  if (!button) return;

  const card = button.closest("[data-director-id]");
  const directorId = card.dataset.directorId;
  const hasTasks = state.tasks.some((task) => task.ownerId === directorId);

  if (hasTasks) {
    showToast("Reassign or delete that director's tasks before removing them.");
    return;
  }

  state.directors = state.directors.filter((director) => director.id !== directorId);
  saveState();
  render();
  showToast("Director removed.");
}

function buildReminder(task) {
  const owner = getDirector(task.ownerId);
  const subject = `Weekly SBSA task update: ${task.title}`;
  const due = formatDate(task.dueDate);
  const latest = getLatestUpdate(task);
  const latestText = latest ? ` Latest recorded update: ${latest.body}` : "";
  const blocker = task.blocker ? ` Current blocker: ${task.blocker}.` : "";
  const body = [
    `Hi ${owner.name},`,
    "",
    `Please send a short status update for this SBSA task before the weekly check-in:`,
    "",
    `Task: ${task.title}`,
    `Due: ${due}`,
    `Current status: ${task.status}`,
    `Expected outcome: ${task.expectedOutcome || "Not recorded"}`,
    `${blocker}${latestText}`.trim(),
    "",
    "Reply with: done, in progress, waiting on someone, blocker, or new due date.",
    "",
    "Thanks."
  ].filter(Boolean).join("\n");

  return { subject, body };
}

function buildWeeklyDigest() {
  const tasks = getTasksNeedingUpdate();
  if (!tasks.length) {
    return "No active SBSA tasks need a weekly update right now.";
  }

  return tasks.map((task) => {
    const reminder = buildReminder(task);
    return `${reminder.subject}\n${reminder.body}`;
  }).join("\n\n---\n\n");
}

function buildBoardReport() {
  const metrics = getMetrics();
  const activeTasks = state.tasks.filter((task) => task.status !== "Done").sort(sortTasks);
  const grouped = groupBy(activeTasks, (task) => getDirector(task.ownerId).name);
  const lines = [
    "SBSA AIMS Board Action Report",
    `Generated: ${formatDate(todayISO())}`,
    "",
    "Summary",
    `- Active tasks: ${metrics.active}`,
    `- Overdue tasks: ${metrics.overdue}`,
    `- Blocked tasks: ${metrics.blocked}`,
    `- Completed tasks: ${metrics.done}`,
    "",
    "Director Workload"
  ];

  Object.keys(grouped).sort().forEach((ownerName) => {
    lines.push(`\n${ownerName}`);
    grouped[ownerName].forEach((task) => {
      const latest = getLatestUpdate(task);
      const blocker = task.blocker ? ` | Blocker: ${task.blocker}` : "";
      const update = latest ? ` | Latest: ${latest.body}` : " | Latest: no update recorded";
      lines.push(`- ${task.title} | ${task.status} | Due: ${formatDate(task.dueDate)}${blocker}${update}`);
    });
  });

  if (!activeTasks.length) {
    lines.push("- No active tasks.");
  }

  lines.push("", "Recent Meetings");
  state.meetings.slice(-5).reverse().forEach((meeting) => {
    lines.push(`- ${meeting.title} | ${formatDate(meeting.date)} | Actions added: ${meeting.actionIds.length}`);
  });

  if (!state.meetings.length) {
    lines.push("- No meetings saved yet.");
  }

  return lines.join("\n");
}

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `sbsa-aims-export-${todayISO()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      state = normalizeState(JSON.parse(reader.result));
      saveState();
      render();
      showToast("Data imported.");
    } catch (error) {
      console.warn(error);
      showToast("Import failed. Use a valid SBSA AIMS JSON export.");
    } finally {
      event.target.value = "";
    }
  };
  reader.readAsText(file);
}

function resetDemoData() {
  if (!confirm("Reset local data to the starter demo?")) return;
  state = structuredClone(defaultState);
  saveState();
  render();
  showToast("Demo data restored.");
}

function getMetrics() {
  const active = state.tasks.filter((task) => task.status !== "Done").length;
  const done = state.tasks.filter((task) => task.status === "Done").length;
  const overdue = state.tasks.filter((task) => task.status !== "Done" && daysUntil(task.dueDate) < 0).length;
  const blocked = state.tasks.filter((task) => task.status !== "Done" && task.blocker).length;
  return { active, done, overdue, blocked };
}

function getTasksNeedingUpdate() {
  return state.tasks
    .filter((task) => task.status !== "Done")
    .filter((task) => {
      const latest = getLatestUpdate(task);
      if (!latest) return true;
      return daysBetween(latest.date, todayISO()) >= state.settings.reminderCadenceDays;
    })
    .sort(sortTasks);
}

function getRiskTasks() {
  return state.tasks
    .filter((task) => task.status !== "Done")
    .filter((task) => task.blocker || daysUntil(task.dueDate) < 0)
    .sort(sortTasks);
}

function taskListItem(task, options = {}) {
  const owner = getDirector(task.ownerId);
  const latest = getLatestUpdate(task);
  const blocker = options.includeBlocker && task.blocker ? `<span class="badge amber">Blocked</span>` : "";
  const reminder = options.includeReminder ? `<span class="badge teal">Needs update</span>` : "";
  return `
    <article class="list-item">
      <div class="list-item-header">
        <div class="list-item-title">
          ${escapeHtml(task.title)}
          <span>${escapeHtml(owner.name)} due ${formatDate(task.dueDate)}</span>
        </div>
        <div class="badge-row">${dueStatusBadge(task)}${blocker}${reminder}</div>
      </div>
      <p class="small-text">${latest ? escapeHtml(latest.body) : "No update recorded yet."}</p>
    </article>
  `;
}

function dueStatusBadge(task) {
  if (task.status === "Done") {
    return '<span class="badge green">Done</span>';
  }
  const days = daysUntil(task.dueDate);
  if (days < 0) {
    return `<span class="badge red">${Math.abs(days)}d overdue</span>`;
  }
  if (days <= 7) {
    return `<span class="badge amber">${days}d left</span>`;
  }
  return `<span class="badge blue">${days}d left</span>`;
}

function statusOptions(current) {
  return ["Not started", "In progress", "Waiting", "Done"]
    .map((status) => `<option${status === current ? " selected" : ""}>${status}</option>`)
    .join("");
}

function getDirector(id) {
  return state.directors.find((director) => director.id === id) || {
    id: "unknown",
    name: "Unassigned",
    role: "",
    email: "",
    area: ""
  };
}

function findDirectorByText(text) {
  const normalized = normalizeLookupText(text);
  return state.directors.find((director) => {
    const directorText = normalizeLookupText([director.name, director.role, director.area].join(" "));
    const directorName = normalizeLookupText(director.name);
    return directorText.includes(normalized) || normalized.includes(directorName);
  });
}

function normalizeLookupText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map(normalizeLookupWord)
    .join(" ");
}

function normalizeLookupWord(word) {
  const normalized = word.length > 3 ? word.replace(/s$/, "") : word;
  return {
    coordinator: "director",
    financial: "finance",
    treasurer: "finance"
  }[normalized] || normalized;
}

function getLatestUpdate(task) {
  return [...(task.updates || [])].sort((a, b) => b.date.localeCompare(a.date))[0];
}

function sortTasks(a, b) {
  const dueCompare = a.dueDate.localeCompare(b.dueDate);
  if (dueCompare !== 0) return dueCompare;
  return priorityRank(a.priority) - priorityRank(b.priority);
}

function priorityRank(priority) {
  return { High: 0, Normal: 1, Low: 2 }[priority] ?? 1;
}

function groupBy(items, keyFn) {
  return items.reduce((groups, item) => {
    const key = keyFn(item);
    groups[key] = groups[key] || [];
    groups[key].push(item);
    return groups;
  }, {});
}

function renderList(container, items, renderItem, emptyMessage) {
  container.innerHTML = items.length
    ? items.map(renderItem).join("")
    : emptyState(emptyMessage || "No items yet.");
}

function emptyState(message) {
  return `
    <div class="empty-state">
      <strong>No items</strong>
      <span>${escapeHtml(message)}</span>
    </div>
  `;
}

function copyText(text, successMessage) {
  if (!text) {
    showToast("Nothing to copy yet.");
    return;
  }

  navigator.clipboard.writeText(text)
    .then(() => showToast(successMessage))
    .catch(() => showToast("Copy failed. Select the text and copy manually."));
}

function showToast(message) {
  clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.classList.add("is-visible");
  toastTimer = setTimeout(() => els.toast.classList.remove("is-visible"), 2600);
}

function makeId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function todayISO() {
  return toLocalISO(new Date());
}

function defaultActionDueDate() {
  return toLocalISO(addDays(new Date(), 7));
}

function addDays(date, days) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function daysUntil(date) {
  return daysBetween(todayISO(), date);
}

function daysBetween(fromDate, toDate) {
  const from = new Date(`${fromDate}T00:00:00`);
  const to = new Date(`${toDate}T00:00:00`);
  return Math.round((to - from) / 86400000);
}

function parseDateToISO(value) {
  const trimmed = value.trim().replace(/[.,]$/, "");
  if (!trimmed) return "";

  const isoDate = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDate) {
    return `${isoDate[1]}-${isoDate[2]}-${isoDate[3]}`;
  }

  const hasYear = /\b\d{4}\b/.test(trimmed);
  const dateText = hasYear ? trimmed : `${trimmed} ${new Date().getFullYear()}`;
  const date = new Date(dateText);
  if (!Number.isNaN(date.valueOf())) {
    return toLocalISO(date);
  }
  return "";
}

function toLocalISO(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(value) {
  if (!value) return "No date";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.valueOf())) return value;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function splitLines(text) {
  return text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
}

function cleanSentence(text) {
  const trimmed = text.trim().replace(/[.;,]\s*$/, "");
  if (!trimmed) return "";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function titleCase(text) {
  return text.replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
